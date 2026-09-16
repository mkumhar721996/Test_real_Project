summary: |
  The repository is currently empty (only a `README.md` and `.env`; no package.json,
  no server or client source). This plan implements Story-017, "Role-Based Defect List
  with Filters," from scratch: a small Express + TypeScript API that exposes
  `GET /api/defects`, enforcing role-based visibility (Reporter sees only defects they
  created, Developer sees only defects assigned to them, Admin sees all) and applying
  status/severity/assignee/date-range filters on top of that visibility scope; and a
  React + TypeScript client that fetches the list, shows a loading indicator while a
  request is in flight, and shows an empty-state message when no defects match. Because
  there is no existing stack to follow, minimal project scaffolding (package.json,
  tsconfig, Vite, Vitest) is included as a prerequisite — every acceptance criterion is
  otherwise implemented test-first, in the order AC1 -> AC6.

scope:
  - description: |
      Scaffold a minimal runnable TypeScript project: root `package.json` with
      scripts (`test`, `dev:server`, `dev:client`), `tsconfig.json`, a Vitest config
      that uses the `jsdom` environment for client tests and `node` for server tests,
      and a Vite config for the client dev server (proxying `/api` to the backend on
      `ARC_DEV_PORT`, serving on `ARC_WEB_PORT`).

      ```ts
      // vitest.config.ts
      import { defineConfig } from 'vitest/config';
      import react from '@vitejs/plugin-react';

      export default defineConfig({
        plugins: [react()],
        test: {
          environmentMatchGlobs: [
            ['src/client/**/*.test.tsx', 'jsdom'],
            ['src/server/**/*.test.ts', 'node'],
          ],
          globals: true,
        },
      });
      ```
    files:
      - package.json
      - tsconfig.json
      - vite.config.ts
      - vitest.config.ts
      - index.html
    rationale: |
      There is no existing codebase or convention to fit into (repo has only
      README.md/.env). Nothing else in this plan can run without a package
      manifest, a test runner, and a dev server, so this is a hard prerequisite
      rather than speculative work.

  - description: |
      Add shared domain types used by both the server filtering logic and the
      client UI/tests, so both sides agree on shapes without duplication.

      ```ts
      // src/shared/types/defect.ts
      export type Role = 'REPORTER' | 'DEVELOPER' | 'ADMIN';

      export interface AuthUser {
        id: string;
        role: Role;
      }

      export type DefectStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
      export type DefectSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

      export interface Defect {
        id: string;
        title: string;
        status: DefectStatus;
        severity: DefectSeverity;
        createdBy: string;
        assignee: string | null;
        createdAt: string; // ISO 8601
      }

      export interface DefectFilters {
        status?: DefectStatus;
        severity?: DefectSeverity;
        assignee?: string;
        dateFrom?: string; // ISO 8601, inclusive
        dateTo?: string;   // ISO 8601, inclusive
      }
      ```
    files:
      - src/shared/types/defect.ts
    rationale: |
      Single source of truth for the data shapes referenced by every other
      scope item below (server domain functions, route, client hook/components,
      and all their tests).

  - description: |
      Implement role-based visibility as a pure function, tested independently
      of HTTP/Express, covering AC1-AC3.

      ```ts
      // src/server/domain/defectVisibility.ts
      import { AuthUser, Defect } from '../../shared/types/defect';

      export function visibleDefectsFor(user: AuthUser, defects: Defect[]): Defect[] {
        switch (user.role) {
          case 'ADMIN':
            return defects;
          case 'DEVELOPER':
            return defects.filter((d) => d.assignee === user.id);
          case 'REPORTER':
            return defects.filter((d) => d.createdBy === user.id);
        }
      }
      ```
    files:
      - src/server/domain/defectVisibility.ts
      - src/server/domain/defectVisibility.test.ts
    rationale: |
      Keeping role scoping as a small pure function (rather than inline in the
      route handler) lets AC1-AC3 be tested directly against fixture data,
      without spinning up HTTP, and guarantees the route can't accidentally
      bypass it.

  - description: |
      Implement filter application as a pure function composed after
      `visibleDefectsFor`, covering AC4's "matches all active filters" behavior.

      ```ts
      // src/server/domain/defectFilters.ts
      import { Defect, DefectFilters } from '../../shared/types/defect';

      export function applyDefectFilters(defects: Defect[], filters: DefectFilters): Defect[] {
        return defects.filter((d) => {
          if (filters.status && d.status !== filters.status) return false;
          if (filters.severity && d.severity !== filters.severity) return false;
          if (filters.assignee && d.assignee !== filters.assignee) return false;
          if (filters.dateFrom && d.createdAt < filters.dateFrom) return false;
          if (filters.dateTo && d.createdAt > filters.dateTo) return false;
          return true;
        });
      }
      ```
    files:
      - src/server/domain/defectFilters.ts
      - src/server/domain/defectFilters.test.ts
    rationale: |
      Filters must compose with (never widen) the role-based visibility scope;
      keeping them as a separate function applied strictly after
      `visibleDefectsFor` makes that ordering explicit and independently
      testable.

  - description: |
      Wire an in-memory defects store, a minimal auth stub middleware, and the
      Express route that composes visibility + filters, covering AC1-AC4 at the
      HTTP layer.

      ```ts
      // src/server/middleware/authStub.ts
      import { Request, Response, NextFunction } from 'express';
      import { AuthUser, Role } from '../../shared/types/defect';

      export function attachUser(req: Request, _res: Response, next: NextFunction) {
        const id = req.header('x-user-id');
        const role = req.header('x-user-role') as Role | undefined;
        (req as Request & { user?: AuthUser }).user = id && role ? { id, role } : undefined;
        next();
      }
      ```

      ```ts
      // src/server/routes/defects.ts
      import { Router } from 'express';
      import { visibleDefectsFor } from '../domain/defectVisibility';
      import { applyDefectFilters } from '../domain/defectFilters';
      import { defectsStore } from '../data/defectsStore';
      import { AuthUser, DefectFilters } from '../../shared/types/defect';

      export const defectsRouter = Router();

      defectsRouter.get('/api/defects', (req, res) => {
        const user = (req as typeof req & { user?: AuthUser }).user;
        if (!user) return res.status(401).json({ error: 'unauthenticated' });

        const filters: DefectFilters = {
          status: req.query.status as DefectFilters['status'],
          severity: req.query.severity as DefectFilters['severity'],
          assignee: req.query.assignee as string | undefined,
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
        };

        const visible = visibleDefectsFor(user, defectsStore.all());
        res.json(applyDefectFilters(visible, filters));
      });
      ```
    files:
      - src/server/data/defectsStore.ts
      - src/server/middleware/authStub.ts
      - src/server/routes/defects.ts
      - src/server/routes/defects.test.ts
      - src/server/app.ts
      - src/server/index.ts
    rationale: |
      This is the security boundary for AC1-AC3 (role visibility must be
      enforced server-side, not just hidden in the UI) and the integration
      point for AC4 (query-string filters combined with role scope). The auth
      stub reads identity/role from request headers as a placeholder for a
      real session/JWT auth story that hasn't landed yet in this repo.

  - description: |
      Client data-fetching hook that calls the API and exposes
      loading/data/empty state, covering the state machine AC5 and AC6 render
      against.

      ```ts
      // src/client/hooks/useDefects.ts
      import { useEffect, useState } from 'react';
      import { Defect, DefectFilters } from '../../shared/types/defect';
      import { fetchDefects } from '../api/defectsApi';

      export interface UseDefectsResult {
        defects: Defect[];
        isLoading: boolean;
      }

      export function useDefects(filters: DefectFilters): UseDefectsResult {
        const [defects, setDefects] = useState<Defect[]>([]);
        const [isLoading, setIsLoading] = useState(true);

        useEffect(() => {
          let cancelled = false;
          setIsLoading(true);
          fetchDefects(filters).then((result) => {
            if (!cancelled) {
              setDefects(result);
              setIsLoading(false);
            }
          });
          return () => {
            cancelled = true;
          };
        }, [JSON.stringify(filters)]);

        return { defects, isLoading };
      }
      ```
    files:
      - src/client/api/defectsApi.ts
      - src/client/hooks/useDefects.ts
      - src/client/hooks/useDefects.test.tsx
    rationale: |
      Isolating fetch/loading/data state in a hook (rather than inline in the
      list component) lets AC5's loading-indicator test drive the state
      machine directly, and lets `DefectList` stay a thin render of
      `{ defects, isLoading }`.

  - description: |
      Client UI: a filters bar and the defect list itself, rendering a loading
      indicator while `isLoading` is true and an empty-state message when
      `isLoading` is false and `defects` is empty, covering AC4 (filter
      controls), AC5, and AC6.

      ```tsx
      // src/client/components/DefectList.tsx
      export function DefectList({ currentUser }: { currentUser: AuthUser }) {
        const [filters, setFilters] = useState<DefectFilters>({});
        const { defects, isLoading } = useDefects(filters);

        return (
          <div>
            <DefectFilters value={filters} onChange={setFilters} />
            {isLoading ? (
              <div role="status" aria-label="Loading defects">Loading…</div>
            ) : defects.length === 0 ? (
              <p>No defects match the current filters.</p>
            ) : (
              <ul>
                {defects.map((d) => <li key={d.id}>{d.title}</li>)}
              </ul>
            )}
          </div>
        );
      }
      ```
    files:
      - src/client/components/DefectFilters.tsx
      - src/client/components/DefectList.tsx
      - src/client/components/DefectList.test.tsx
      - src/client/App.tsx
      - src/client/main.tsx
    rationale: |
      Renders the state produced by `useDefects` per AC5/AC6, and exposes the
      status/severity/assignee/date-range controls that drive AC4's filter
      combinations; `App.tsx`/`main.tsx` are the minimal mount points needed
      to make `DefectList` reachable in the running app.

tests:
  - |
    AC1 — `src/server/domain/defectVisibility.test.ts`:
    ```ts
    it('returns only defects created by the reporter', () => {
      const reporter: AuthUser = { id: 'u1', role: 'REPORTER' };
      const result = visibleDefectsFor(reporter, fixtureDefects);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((d) => d.createdBy === 'u1')).toBe(true);
    });
    ```
    Write this first against a `visibleDefectsFor` that doesn't exist yet (or
    returns everything) so it fails, then implement the `REPORTER` branch to
    pass it.
  - |
    AC2 — `src/server/domain/defectVisibility.test.ts`:
    ```ts
    it('returns only defects assigned to the developer', () => {
      const developer: AuthUser = { id: 'u2', role: 'DEVELOPER' };
      const result = visibleDefectsFor(developer, fixtureDefects);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((d) => d.assignee === 'u2')).toBe(true);
    });
    ```
    Fails until the `DEVELOPER` branch filters on `assignee`.
  - |
    AC3 — `src/server/domain/defectVisibility.test.ts`:
    ```ts
    it('returns all defects for an admin', () => {
      const admin: AuthUser = { id: 'u3', role: 'ADMIN' };
      expect(visibleDefectsFor(admin, fixtureDefects)).toEqual(fixtureDefects);
    });
    ```
    Fails until the `ADMIN` branch returns the input unfiltered.
  - |
    AC4 — `src/server/routes/defects.test.ts` (supertest), combining role scope
    with all four filter dimensions:
    ```ts
    it('applies status/severity/assignee/date-range filters within role scope', async () => {
      const res = await request(app)
        .get('/api/defects?status=OPEN&severity=HIGH&assignee=u2&dateFrom=2026-01-01&dateTo=2026-12-31')
        .set('x-user-id', 'u2')
        .set('x-user-role', 'DEVELOPER');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(
        res.body.every(
          (d: Defect) => d.status === 'OPEN' && d.severity === 'HIGH' && d.assignee === 'u2'
        )
      ).toBe(true);
    });
    ```
    Also add `src/server/domain/defectFilters.test.ts` unit tests for each
    individual filter dimension before wiring the route. Fails until
    `applyDefectFilters` is implemented and the route composes it after
    `visibleDefectsFor`.
  - |
    AC5 — `src/client/components/DefectList.test.tsx`:
    ```tsx
    it('shows a loading indicator while defects are being fetched', () => {
      vi.spyOn(defectsApi, 'fetchDefects').mockReturnValue(new Promise(() => {}));
      render(<DefectList currentUser={{ id: 'u1', role: 'REPORTER' }} />);
      expect(screen.getByRole('status', { name: /loading defects/i })).toBeInTheDocument();
    });
    ```
    Fails until `useDefects` starts with `isLoading: true` and `DefectList`
    renders the `role="status"` element for that state.
  - |
    AC6 — `src/client/components/DefectList.test.tsx`:
    ```tsx
    it('shows an empty-state message when no defects match the filters', async () => {
      vi.spyOn(defectsApi, 'fetchDefects').mockResolvedValue([]);
      render(<DefectList currentUser={{ id: 'u1', role: 'REPORTER' }} />);
      expect(await screen.findByText(/no defects match the current filters/i)).toBeInTheDocument();
    });
    ```
    Fails until `DefectList` renders the empty-state paragraph when
    `!isLoading && defects.length === 0`.

assumptions_or_open_questions:
  - "Repo is greenfield (only README.md/.env exist), so a Node/TypeScript + Express backend and a React/TypeScript + Vite frontend were chosen as a conventional, minimal default — no existing stack was there to match. If the team has already decided on a different stack elsewhere, this scaffolding step should be swapped out."
  - "No authentication/session system exists yet in this repo. `attachUser` reads identity/role from `x-user-id`/`x-user-role` request headers as a stand-in; this should be replaced by whatever the real login story produces (session/JWT) without changing `visibleDefectsFor`'s signature."
  - "No persistence layer exists yet; `defectsStore` is an in-memory, seeded array for this story. A real database is assumed to be a separate story in the parent epic (dashboard/CSV export also reference 'defect data' generally)."
  - "Date-range filtering is assumed to apply to `Defect.createdAt` (inclusive on both ends) since the AC doesn't specify which date field; if the product intent is a different field (e.g. last-updated), only `applyDefectFilters` needs to change."
  - "'Loading indicator (spinner or skeleton)' is implemented as a simple `role=\"status\"` text node rather than a visual spinner graphic, since the AC accepts either and this is the simplest testable form; can be restyled without changing the test contract (the accessible role/name)."

package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: Backend HTTP framework hosting the GET /api/defects endpoint and auth-stub middleware.
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: Renders DefectList/DefectFilters components (AC4-AC6).
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: DOM renderer required alongside react for mounting the app and for React Testing Library.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: All source in this plan (server and client) is written in TypeScript per the concrete signatures above.
  - name: vite
    version: ^5.4.8
    ecosystem: npm
    rationale: Client dev server (serving on ARC_WEB_PORT) and build tool for the React app.
  - name: "@vitejs/plugin-react"
    version: ^4.3.1
    ecosystem: npm
    rationale: Enables JSX/Fast Refresh support in Vite and is reused as the Vitest plugin for component tests.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for both the server domain/route unit-and-integration tests and the client component/hook tests.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: HTTP-level assertions against the Express app for the AC4 route integration test.
  - name: "@testing-library/react"
    version: ^16.0.0
    ecosystem: npm
    rationale: Render and query DefectList/DefectFilters in the AC5/AC6 component tests.
  - name: "@testing-library/jest-dom"
    version: ^6.4.8
    ecosystem: npm
    rationale: Provides the toBeInTheDocument matcher used in the AC5/AC6 assertions.
  - name: jsdom
    version: ^24.1.1
    ecosystem: npm
    rationale: DOM environment Vitest uses to run the React component tests.
  - name: "@types/express"
    version: ^4.17.21
    ecosystem: npm
    rationale: TypeScript types for Express Request/Response used in the route and middleware code.
  - name: "@types/supertest"
    version: ^6.0.2
    ecosystem: npm
    rationale: TypeScript types for supertest used in the AC4 integration test.
  - name: "@types/react"
    version: ^18.3.5
    ecosystem: npm
    rationale: TypeScript types for React used across the client components/hooks.
  - name: "@types/react-dom"
    version: ^18.3.0
    ecosystem: npm
    rationale: TypeScript types for react-dom used in main.tsx's client mount.

notes: |
  This is a from-scratch implementation: the repository currently contains only
  `README.md` and `.env` (no package.json, no src). The module graph below shows
  every file this plan touches and how it's called, since the plan spans both
  layers (client fetch -> HTTP -> server route -> domain functions -> store) and
  more than three files; every node is new/touched since there is no pre-existing
  code to contrast against.

  ```mermaid
  flowchart TD
    App["client/App.tsx"] --> DefectList["client/components/DefectList.tsx"]
    DefectList -- "filter controls (AC4)" --> DefectFilters["client/components/DefectFilters.tsx"]
    DefectList -- "loading/empty state (AC5, AC6)" --> useDefects["client/hooks/useDefects.ts"]
    useDefects --> defectsApi["client/api/defectsApi.ts"]
    defectsApi -- "HTTP GET /api/defects" --> route["server/routes/defects.ts"]
    route -- "who is asking" --> authStub["server/middleware/authStub.ts"]
    route -- "role scope (AC1-AC3)" --> visibility["server/domain/defectVisibility.ts"]
    route -- "filters within scope (AC4)" --> filters["server/domain/defectFilters.ts"]
    route -- "reads all defects" --> store["server/data/defectsStore.ts"]
    shared["shared/types/defect.ts"] -.-> useDefects
    shared -.-> defectsApi
    shared -.-> visibility
    shared -.-> filters
    shared -.-> route

    classDef touched fill:#f96,color:#000
    class App,DefectList,DefectFilters,useDefects,defectsApi,route,authStub,visibility,filters,store,shared touched
  ```

  TDD order follows AC1 -> AC6: domain functions (`defectVisibility.ts`,
  `defectFilters.ts`) are unit-tested and implemented first with plain fixture
  arrays, then the Express route composes and is integration-tested with
  supertest (AC4), then the client hook and components are built outward from
  that API (AC5, AC6). Nothing here anticipates the dashboard or CSV-export
  stories from the parent epic beyond the shared `Defect`/`DefectFilters`
  types, which those stories would naturally reuse.
