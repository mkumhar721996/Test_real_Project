summary: |
  This repository is currently greenfield: it contains only a README and a
  `.env` with reserved ports, with no application code, no framework, no
  package manifests, and no ADRs. This plan bootstraps a minimal vertical
  slice — an Express API and a React client — to deliver the Summary
  Dashboard (STORY-018): role-visibility-scoped open/closed defect counts
  and a daily trend chart, with explicit loading and empty states. Since no
  defects data model, persistence layer, or authentication exists yet, the
  plan introduces the smallest possible stand-ins (an in-memory defects
  store and a header-based "current user" stub) so the dashboard's counting
  and visibility logic can be built and tested test-first now, and swapped
  for real data/auth wiring by the stories in the epic that own those
  concerns (defect list views, CSV export, auth).

scope:
  - description: |
      Bootstrap a minimal Express server skeleton to host the dashboard
      API: `server/package.json`, `server/src/app.js` (creates and
      configures the Express app, no `listen()` call so it's importable by
      tests), `server/src/server.js` (calls `app.listen(process.env.ARC_DEV_PORT)`
      for local dev).
    files:
      - server/package.json
      - server/src/app.js
      - server/src/server.js
    rationale: |
      There is no server process in the repo at all; every other backend
      scope item needs an Express app to attach routes/middleware to and
      for Supertest to exercise in tests.

  - description: |
      Add a temporary "current user" middleware that reads
      `x-user-role` / `x-user-team` request headers and attaches
      `req.user = { role, teamId }` (defaulting to `{ role: 'member', teamId: null }`
      when headers are absent).
    files:
      - server/src/middleware/currentUser.js
    rationale: |
      AC6 requires role-based visibility, which requires *some* notion of
      the requesting user. No authentication story has landed in this repo
      yet, so this header-based stub unblocks testing the dashboard's
      visibility behavior now; it is explicitly a placeholder for real
      session/JWT-based auth from a future story (see assumptions).

  - description: |
      Add an in-memory defects data source with a `findAll()` accessor,
      seeded via a settable fixture for tests.
    files:
      - server/src/data/defectsRepository.js
    rationale: |
      The dashboard needs *some* source of defect records to count and
      trend. No defects persistence/model exists in this repo yet (that's
      presumably owned by the "filterable list views" story in the same
      epic); this in-memory stand-in keeps this story's scope self-contained
      and swappable later without touching the dashboard service's
      contract.

  - description: |
      Add a `canView(user, defect)` visibility predicate: `role === 'admin'`
      sees everything, any other role only sees defects where
      `defect.teamId === user.teamId`.
    files:
      - server/src/domain/visibility.js
    rationale: |
      AC6 needs a single, testable source of truth for "can this user see
      this defect" that both the counts and the trend chart route through,
      rather than duplicating the check in the service.

  - description: |
      Add the dashboard service: `getDashboardSummary(user, defects)` which
      filters `defects` through `canView`, then returns
      `{ counts: { open, closed }, trend }`, where `trend` is produced by a
      `buildDailyTrend(defects)` helper that returns one
      `{ date, open, closed }` cumulative snapshot per day spanning the
      earliest to latest `reportedAt`/`closedAt` among the (already
      filtered) defects, or `[]` when there are no defects.
    files:
      - server/src/services/dashboardService.js
    rationale: |
      This is the core logic under test for AC1, AC2, AC4, AC5, and AC6 —
      it is deliberately a pure function of `(user, defects)` with no I/O,
      so it can be tested exhaustively without a real database or HTTP
      layer.

  - description: |
      Add `GET /api/dashboard/summary`: reads all defects from
      `defectsRepository.findAll()`, calls
      `getDashboardSummary(req.user, defects)`, and returns the result as
      JSON.
    files:
      - server/src/routes/dashboardRoutes.js
      - server/src/app.js
    rationale: |
      Wires the pure service into an HTTP endpoint the client can call,
      and is where `currentUser` middleware, the repository, and the
      service actually compose — needs its own (lighter) integration test
      on top of the service's unit tests to confirm that composition.

  - description: |
      Bootstrap a minimal Vite + React client skeleton (`client/package.json`,
      `client/index.html`, `client/src/main.jsx`), with Vitest + Testing
      Library configured for component tests.
    files:
      - client/package.json
      - client/index.html
      - client/src/main.jsx
      - client/vite.config.js
      - client/vitest.setup.js
    rationale: |
      There is no frontend at all in the repo; every other client scope
      item needs a React app shell and a test runner to render into.

  - description: |
      Add a thin API client: `fetchDashboardSummary()` that `fetch()`es
      `/api/dashboard/summary` and returns the parsed JSON, throwing on a
      non-OK response.
    files:
      - client/src/api/dashboardApi.js
    rationale: |
      Isolates the network call behind a single function so
      `DashboardPage` tests can mock it directly instead of mocking global
      `fetch`.

  - description: |
      Add `DashboardPage`: on mount, calls `fetchDashboardSummary()`;
      renders a `data-testid="dashboard-loading"` element while the request
      is in flight; on success renders open/closed counts (`0` rendered
      literally, not hidden, when a count is zero) and a `TrendChart`;
      contains no granularity selector control.
    files:
      - client/src/pages/DashboardPage.jsx
    rationale: |
      Directly implements AC1, AC3, AC4, and the "no granularity control"
      half of AC2.

  - description: |
      Add `TrendChart`: renders a `recharts` `LineChart` (open vs. closed
      lines) keyed by `date` when `trend.length > 0`; renders a
      `data-testid="trend-empty-state"` element with visible text (e.g.
      "No trend data yet") when `trend` is `[]`.
    files:
      - client/src/components/TrendChart.jsx
    rationale: |
      Implements the daily-granularity chart rendering (AC2) and its empty
      state (AC5) as an isolated, independently testable component rather
      than inlining chart markup in `DashboardPage`.

tests:
  - |
    AC1 (backend, `server/test/dashboardService.test.js`) — counts only
    reflect visible defects:
    ```js
    test('counts visible open and closed defects', () => {
      const user = { role: 'admin', teamId: null };
      const defects = [
        { id: 1, teamId: 'a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
        { id: 2, teamId: 'a', status: 'closed', reportedAt: '2026-01-01', closedAt: '2026-01-02' },
      ];
      const { counts } = getDashboardSummary(user, defects);
      expect(counts).toEqual({ open: 1, closed: 1 });
    });
    ```
    Minimal code to pass: implement `getDashboardSummary` in
    `server/src/services/dashboardService.js` as described in scope.

  - |
    AC2 (backend trend shape, `server/test/dashboardService.test.js`, plus
    frontend absence-of-control check,
    `client/src/pages/DashboardPage.test.jsx`):
    ```js
    test('buildDailyTrend returns one cumulative snapshot per day in range', () => {
      const defects = [
        { id: 1, teamId: 'a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
        { id: 2, teamId: 'a', status: 'closed', reportedAt: '2026-01-01', closedAt: '2026-01-02' },
      ];
      const { trend } = getDashboardSummary({ role: 'admin' }, defects);
      expect(trend).toEqual([
        { date: '2026-01-01', open: 2, closed: 0 },
        { date: '2026-01-02', open: 1, closed: 1 },
      ]);
    });
    ```
    ```jsx
    test('does not render a granularity control', async () => {
      render(<DashboardPage />);
      await screen.findByTestId('trend-chart');
      expect(screen.queryByLabelText(/granularity/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `buildDailyTrend` in `dashboardService.js`;
    `TrendChart` rendered by `DashboardPage` with no selector markup
    anywhere in the tree.

  - |
    AC3 (frontend, `client/src/pages/DashboardPage.test.jsx`) — loading
    indicator while the request is in flight:
    ```jsx
    test('shows a loading indicator while the summary request is in flight', () => {
      vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockReturnValue(new Promise(() => {}));
      render(<DashboardPage />);
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `DashboardPage` renders the loading element
    whenever its fetch state is `'loading'` (its initial state), before
    the promise settles.

  - |
    AC4 (backend zero-counts, `server/test/dashboardService.test.js`, plus
    frontend rendering, `client/src/pages/DashboardPage.test.jsx`):
    ```js
    test('returns zero counts when no defects are visible', () => {
      const { counts } = getDashboardSummary({ role: 'admin' }, []);
      expect(counts).toEqual({ open: 0, closed: 0 });
    });
    ```
    ```jsx
    test('renders zero counts instead of an error when there are no defects', async () => {
      vi.spyOn(dashboardApi, 'fetchDashboardSummary').mockResolvedValue({ counts: { open: 0, closed: 0 }, trend: [] });
      render(<DashboardPage />);
      expect(await screen.findByText('0')).toBeInTheDocument();
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `getDashboardSummary` must not throw or special-case
    an empty `defects` array; `DashboardPage` must render `counts.open`/
    `counts.closed` literally (including `0`) rather than treating a falsy
    count as "no data".

  - |
    AC5 (backend empty trend, `server/test/dashboardService.test.js`, plus
    frontend empty state, `client/src/components/TrendChart.test.jsx`):
    ```js
    test('trend is empty when there are no defects', () => {
      const { trend } = getDashboardSummary({ role: 'admin' }, []);
      expect(trend).toEqual([]);
    });
    ```
    ```jsx
    test('shows an empty state instead of a chart when there is no trend data', () => {
      render(<TrendChart trend={[]} />);
      expect(screen.getByTestId('trend-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('trend-chart')).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `buildDailyTrend([])` returns `[]`; `TrendChart`
    branches on `trend.length === 0` to render the empty state instead of
    the `recharts` chart.

  - |
    AC6 (backend unit test on the pure service,
    `server/test/dashboardService.test.js`, plus a route-level integration
    test, `server/test/dashboardRoutes.test.js`):
    ```js
    test('a non-admin only sees defects from their own team', () => {
      const user = { role: 'member', teamId: 'team-a' };
      const defects = [
        { id: 1, teamId: 'team-a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
        { id: 2, teamId: 'team-b', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      ];
      const { counts, trend } = getDashboardSummary(user, defects);
      expect(counts).toEqual({ open: 1, closed: 0 });
      expect(trend).toEqual([{ date: '2026-01-01', open: 1, closed: 0 }]);
    });
    ```
    ```js
    test('GET /api/dashboard/summary scopes counts to the requesting user\'s team', async () => {
      defectsRepository.__setAll([
        { id: 1, teamId: 'team-a', status: 'open', reportedAt: '2026-01-01', closedAt: null },
        { id: 2, teamId: 'team-b', status: 'open', reportedAt: '2026-01-01', closedAt: null },
      ]);
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('x-user-role', 'member')
        .set('x-user-team', 'team-a');
      expect(res.body.counts).toEqual({ open: 1, closed: 0 });
    });
    ```
    Minimal code to pass: `visibility.js`'s `canView`, wired into
    `getDashboardSummary`'s filter step, and `currentUser` middleware
    populating `req.user` from the request headers before the route calls
    the service.

assumptions_or_open_questions:
  - |
    The repository has no existing application code, framework, or package
    manifest of any kind (only `README.md` and `.env`). This plan therefore
    picks a stack (Node/Express + Jest/Supertest for the backend; Vite/React
    + Vitest/Testing Library for the frontend) rather than following an
    established convention — flag if a different stack is intended.
  - |
    No defects data model or persistence layer exists yet. This plan adds a
    minimal in-memory `defectsRepository` as a stand-in, assumed to be
    superseded by whatever the "filterable list views" story in the same
    epic delivers. The dashboard service depends only on the shape
    `{ id, teamId, status, reportedAt, closedAt }`, so it should be easy to
    re-point at a real repository later.
  - |
    No authentication exists yet. This plan stubs "current user" via
    `x-user-role`/`x-user-team` request headers rather than a real
    session/JWT. This must be replaced when an auth story lands; the
    dashboard route and service only depend on `req.user = { role, teamId }`,
    so the swap should be isolated to `currentUser.js`.
  - |
    Role-based visibility is assumed to be: `admin` sees all defects;
    every other role sees only defects where `defect.teamId === user.teamId`.
    No ADR or design doc defines the actual role/permission model for this
    epic — confirm this matches the intended visibility rules before/while
    other defect-reporting stories land.
  - |
    "Defect counts over time at daily granularity" is implemented as a
    cumulative open/closed snapshot per calendar day (based on each
    defect's `reportedAt`/`closedAt`), spanning from the earliest to the
    latest relevant date among currently-visible defects — not extended
    forward to "today" if the latest event is in the past. Flag if the
    intended trend should instead show day-over-day deltas or always run
    through the current date.
  - |
    `recharts` is chosen for the trend chart as a common, lightweight React
    charting library; swap for a different library if the team has an
    existing preference (none was found in the repo).
  - |
    Loading and empty states are implemented as plain elements with
    `data-testid`s and minimal copy ("No trend data yet"), since no visual
    design spec was provided.

package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: Backend HTTP framework used to serve the `/api/dashboard/summary` endpoint.
  - name: jest
    version: ^29.7.0
    ecosystem: npm
    rationale: Test runner for the backend unit and integration tests (dashboardService, dashboardRoutes).
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: HTTP assertions against the Express `app` for the route-level integration test (AC6).
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: Frontend framework for DashboardPage and TrendChart.
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: DOM renderer required alongside react.
  - name: vite
    version: ^5.4.0
    ecosystem: npm
    rationale: Dev server/build tool for the client app shell.
  - name: "@vitejs/plugin-react"
    version: ^4.3.1
    ecosystem: npm
    rationale: Enables JSX/Fast Refresh support in the Vite config.
  - name: vitest
    version: ^2.0.0
    ecosystem: npm
    rationale: Test runner for client component tests (DashboardPage, TrendChart).
  - name: "@testing-library/react"
    version: ^16.0.0
    ecosystem: npm
    rationale: Renders and queries React components in tests (loading/empty/count assertions).
  - name: "@testing-library/jest-dom"
    version: ^6.4.0
    ecosystem: npm
    rationale: DOM matchers (toBeInTheDocument, etc.) used across the component tests.
  - name: jsdom
    version: ^24.0.0
    ecosystem: npm
    rationale: DOM environment for Vitest to run component tests outside a real browser.
  - name: recharts
    version: ^2.12.0
    ecosystem: npm
    rationale: Renders the daily trend line chart in TrendChart.

notes: |
  This is a from-scratch vertical slice, not an addition to an existing
  system, so the diagram below shows the full call graph this story
  introduces rather than just its edges into pre-existing code (there is
  none to point to yet).

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000

    ClientMain["client/src/main.jsx"] --> DashboardPage["client/src/pages/DashboardPage.jsx"]
    DashboardPage -->|"fetches summary on mount"| DashboardApi["client/src/api/dashboardApi.js"]
    DashboardPage -->|"renders trend or empty state"| TrendChart["client/src/components/TrendChart.jsx"]
    DashboardApi -->|"GET /api/dashboard/summary"| ServerApp["server/src/app.js"]
    ServerApp --> CurrentUser["server/src/middleware/currentUser.js"]
    ServerApp --> DashboardRoutes["server/src/routes/dashboardRoutes.js"]
    DashboardRoutes -->|"req.user"| CurrentUser
    DashboardRoutes -->|"getDashboardSummary(user, defects)"| DashboardService["server/src/services/dashboardService.js"]
    DashboardRoutes -->|"findAll()"| DefectsRepo["server/src/data/defectsRepository.js"]
    DashboardService -->|"canView(user, defect)"| Visibility["server/src/domain/visibility.js"]

    class ClientMain,DashboardPage,DashboardApi,TrendChart,ServerApp,CurrentUser,DashboardRoutes,DashboardService,DefectsRepo,Visibility touched
  ```

  Suggested layout: `server/` and `client/` as sibling directories at the
  worktree root, each with its own `package.json`, so the API and the
  client have independent dependency trees and test runners
  (`npm test` in `server/` runs Jest; `npm test` in `client/` runs Vitest).
