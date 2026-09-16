summary: |
  This repository currently contains no code at all (just a README), so this plan both
  bootstraps a minimal backend and implements role-scoped defect-list visibility on top of it.
  Since no domain model, framework, or auth system exists yet, the plan stands up a small
  TypeScript/Express service with an in-memory defect store, and centers the actual permission
  logic in one pure function, `getVisibleDefects(user, defects)`, that decides what a Reporter,
  Developer, or Admin may see — including every empty-state case from the acceptance criteria —
  before wiring it into a thin `GET /defects` route. The plan is test-first: each acceptance
  criterion becomes a Vitest unit test against the pure filtering function (fast, precise
  assertions on exactly which defects come back) backed by a supertest route test that pins the
  exact JSON response shape, so no count, label, or message can ever leak the existence of
  defects outside a role's permitted scope.

scope:
  - description: |
      Bootstrap a minimal Node.js/TypeScript project: package manifest, TypeScript config, and
      a Vitest test runner. Nothing else in the repo builds or runs tests today, so this is a
      prerequisite for any TDD work.
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
    rationale: |
      There is no `package.json`, build tooling, or test runner anywhere in the repo. TDD
      requires a runnable test command (`npx vitest run`) before the first failing test can be
      written.

  - description: |
      Define the domain types shared by every role-scoping rule: `Role`, `User`, and `Defect`.
    files:
      - src/domain/roles.ts
      - src/domain/user.ts
      - src/domain/defect.ts
    rationale: |
      The visibility rules in the ACs (submitter, assignee, unassigned, role) all hinge on a
      small, explicit shape. Example:
      ```ts
      export type Role = 'reporter' | 'developer' | 'admin';

      export interface User {
        id: string;
        role: Role;
      }

      export interface Defect {
        id: string;
        title: string;
        submittedBy: string;       // user id of the reporter who filed it
        assignedTo: string | null; // user id of the developer, or null if unassigned
        status: string;
      }
      ```

  - description: |
      Implement `getVisibleDefects(user, allDefects)`, the pure function that enforces ACs 1–6.
    files:
      - src/services/defectVisibility.ts
      - test/services/defectVisibility.test.ts
    rationale: |
      Keeping the actual permission decision in one pure, framework-free function makes it
      exhaustively testable with plain object arrays and immune to accidental leakage through
      HTTP/serialization concerns. Signature:
      ```ts
      export function getVisibleDefects(user: User, allDefects: Defect[]): Defect[] {
        switch (user.role) {
          case 'admin':
            return allDefects;
          case 'reporter':
            return allDefects.filter(d => d.submittedBy === user.id);
          case 'developer':
            return allDefects.filter(d => d.assignedTo === user.id);
        }
      }
      ```

  - description: |
      Add an in-memory `DefectRepository` with `findAll()` and a test-only `seed()`/`clear()`
      pair, since there is no database or persistence layer in the project yet.
    files:
      - src/repositories/defectRepository.ts
    rationale: |
      The route needs a source of "all defects" to hand to `getVisibleDefects`. An in-memory
      store is the minimal thing that satisfies the ACs without deciding a database technology
      that hasn't been chosen anywhere else in the codebase.

  - description: |
      Add a minimal identity resolution middleware that attaches `req.user` from trusted
      request headers (`x-user-id`, `x-user-role`), plus an in-memory `UserRepository`.
    files:
      - src/middleware/auth.ts
      - src/repositories/userRepository.ts
    rationale: |
      The ACs assume "a Reporter/Developer/Admin is authenticated," but no login, session, or
      token system exists anywhere in the repo, and building one is not in scope for this
      story. This middleware is an explicit stand-in for "there is an authenticated user with a
      role" so the visibility rule can be tested end-to-end; it is not a real auth
      implementation (see assumptions).

  - description: |
      Wire a thin `GET /defects` route that resolves the authenticated user, loads all defects,
      calls `getVisibleDefects`, and returns `{ defects, count }` — never a total or any other
      field.
    files:
      - src/routes/defects.ts
      - src/app.ts
      - src/server.ts
    rationale: |
      This is the boundary where "list or count" leakage (ACs 1, 2, 4, 5) would actually
      manifest, so the response contract is deliberately minimal: `count` is always
      `visible.length`, computed from the already-filtered array, so it structurally cannot
      reflect the total number of defects in the system.

  - description: |
      Add route-level integration tests asserting the exact JSON body for each role and each
      empty-state scenario, using supertest against the Express app.
    files:
      - test/routes/defects.test.ts
    rationale: |
      The unit tests on `getVisibleDefects` prove the filtering logic is correct; the route
      tests prove the HTTP layer doesn't reintroduce a leak (e.g. an extra `totalDefects` field,
      a debug log, or a message like "no defects assigned to you yet, 4 exist").

tests:
  - |
    AC1 (Reporter sees only their own submissions) — `test/services/defectVisibility.test.ts`:
    ```ts
    it('returns only defects submitted by the reporter', () => {
      const reporter: User = { id: 'u1', role: 'reporter' };
      const defects: Defect[] = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: null, status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      expect(getVisibleDefects(reporter, defects)).toEqual([defects[0]]);
    });
    ```
    Backed by a route test in `test/routes/defects.test.ts` asserting
    `expect(res.body).toEqual({ defects: [seededOwnDefect], count: 1 })` for `u1`, with `d2`
    absent from both the array and the count.

  - |
    AC2 (Developer sees only defects assigned to them, none unassigned or assigned elsewhere) —
    `test/services/defectVisibility.test.ts`:
    ```ts
    it('returns only defects assigned to the developer', () => {
      const developer: User = { id: 'u2', role: 'developer' };
      const defects: Defect[] = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
        { id: 'd3', title: 'C', submittedBy: 'u1', assignedTo: null, status: 'open' },
      ];
      expect(getVisibleDefects(developer, defects)).toEqual([defects[0]]);
    });
    ```

  - |
    AC3 (Admin sees all defects) — `test/services/defectVisibility.test.ts`:
    ```ts
    it('returns every defect for an admin', () => {
      const admin: User = { id: 'u9', role: 'admin' };
      const defects: Defect[] = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      expect(getVisibleDefects(admin, defects)).toEqual(defects);
    });
    ```

  - |
    AC4 (Reporter with no submissions sees an empty list with no hint others exist) —
    `test/services/defectVisibility.test.ts` plus a route-level contract test:
    ```ts
    it('returns an empty array when the reporter has submitted nothing', () => {
      const reporter: User = { id: 'u1', role: 'reporter' };
      const defects: Defect[] = [
        { id: 'd1', title: 'A', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      expect(getVisibleDefects(reporter, defects)).toEqual([]);
    });
    ```
    Route test in `test/routes/defects.test.ts`:
    ```ts
    const res = await request(app)
      .get('/defects')
      .set('x-user-id', 'u1')
      .set('x-user-role', 'reporter');
    expect(res.body).toEqual({ defects: [], count: 0 });
    ```
    asserting deep equality (not just `toContain`) so an added `message`/`totalCount` field
    fails the test.

  - |
    AC5 (Developer with nothing assigned sees an empty list, no hint of unassigned/others'
    defects) — `test/services/defectVisibility.test.ts`:
    ```ts
    it('returns an empty array when the developer has no assigned defects', () => {
      const developer: User = { id: 'u2', role: 'developer' };
      const defects: Defect[] = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: null, status: 'open' },
      ];
      expect(getVisibleDefects(developer, defects)).toEqual([]);
    });
    ```
    Route test asserts `expect(res.body).toEqual({ defects: [], count: 0 })` for `u2`/`developer`
    against the same seeded data, i.e. the same exact-equality contract as AC4.

  - |
    AC6 (Admin sees an appropriate empty state when no defects exist system-wide) —
    `test/services/defectVisibility.test.ts`:
    ```ts
    it('returns an empty array for an admin when no defects exist', () => {
      const admin: User = { id: 'u9', role: 'admin' };
      expect(getVisibleDefects(admin, [])).toEqual([]);
    });
    ```
    Route test in `test/routes/defects.test.ts` with the repository cleared:
    ```ts
    const res = await request(app)
      .get('/defects')
      .set('x-user-id', 'u9')
      .set('x-user-role', 'admin');
    expect(res.body).toEqual({ defects: [], count: 0 });
    ```

assumptions_or_open_questions:
  - |
    The repository has no existing tech stack (no package.json, no framework) anywhere. This
    plan chooses Node.js + TypeScript + Express + Vitest + supertest as the minimal stack to
    implement and test an HTTP-facing defect list. If a different stack is intended for this
    project, this plan needs to be redirected before implementation starts.
  - |
    "Authenticated" in the ACs is treated as "there is a resolved `User { id, role }` on the
    request." Real authentication (login, sessions, tokens, password handling) is assumed to be
    out of scope for this story and left to a separate story/epic; this plan adds only a
    trusted-header stand-in (`x-user-id` / `x-user-role`) so the role-scoping behavior itself
    can be exercised and tested end-to-end.
  - |
    Defect schema is assumed to be the minimal shape needed by the ACs: `id`, `title`,
    `submittedBy`, `assignedTo` (nullable), `status`. No richer schema (priority, timestamps,
    description) is introduced since nothing in the ACs requires it.
  - |
    Persistence is assumed to be in-memory for this story, since no database or ORM exists
    anywhere in the repo yet. A future story is expected to swap `DefectRepository`'s
    implementation without changing `getVisibleDefects` or the route contract.
  - |
    The API response shape `{ defects: Defect[], count: number }` is assumed acceptable since no
    API contract exists elsewhere in the codebase to conform to. `count` is always derived from
    the already-filtered list, never from the total.
  - |
    "Unassigned" is modeled as `assignedTo: null`; no separate "unassigned" status field is
    assumed.

package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: Minimal HTTP framework to expose the `GET /defects` route required by the ACs; nothing else in the repo provides HTTP routing.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: The domain/service/route code and tests are written in TypeScript; no compiler is present in the repo yet.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for the failing-test-first unit tests on `getVisibleDefects`; no test runner exists in the repo yet.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: HTTP-level assertions against the Express app for the route-level empty-state and leakage contract tests.
  - name: "@types/express"
    version: ^4.17.21
    ecosystem: npm
    rationale: Type definitions for express, needed for the TypeScript route and middleware code.
  - name: "@types/supertest"
    version: ^6.0.2
    ecosystem: npm
    rationale: Type definitions for supertest, needed for the TypeScript route-level tests.

notes: |
  This is a greenfield repository (only a README exists), so there are no existing conventions
  to mirror; the module layout below (`domain` / `services` / `repositories` / `routes` /
  `middleware`) is proposed fresh for this story and is intended to be the starting convention
  for the rest of the "User Roles & Permissions" epic, not just this one story.

  Process: after the scaffolding step, run `npx vitest run` to confirm the service/route test
  files fail (red) before writing `defectVisibility.ts`, the repositories, the middleware, and
  the route — then implement just enough to turn them green.

  The diagram below shows the request path the route-level tests exercise, and why each node is
  touched:

  ```mermaid
  flowchart TD
      Client[HTTP client] -->|GET /defects| Router[src/routes/defects.ts]
      Router -->|resolves req.user from headers| AuthMW[src/middleware/auth.ts]
      AuthMW -->|looks up role by id| UserRepo[src/repositories/userRepository.ts]
      Router -->|filters by user.role| VisSvc[src/services/defectVisibility.ts]
      VisSvc -->|reads all defects| DefectRepo[src/repositories/defectRepository.ts]

      classDef touched fill:#f96,color:#000;
      class Router,AuthMW,UserRepo,VisSvc,DefectRepo touched;
  ```
