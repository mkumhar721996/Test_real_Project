summary: |
  This repo currently has no data-fetching layer, no routing/app shell, and no existing "chart"
  or "dashboard" code — only a `Role` type, a `Defect`/`createDefect` domain module, and a
  presentational `DefectForm` component (mirroring the pattern established in
  TEST-REAL-PROJECT-STORY-009). This plan follows that same pattern: it adds a small pure domain
  module (`src/domain/summary.ts`) that computes open/closed counts and a daily trend from a list
  of defect records, filtered by role-based visibility, plus a presentational
  `SummaryDashboard` component that owns the loading/empty/ready states and renders the output of
  those pure functions. Data loading itself is injected via a `loadDefects` prop (a
  `() => Promise<DefectRecord[]>`), the same way `role` is injected into `DefectForm` today,
  since no HTTP/API/persistence layer exists yet in this repo for the dashboard to call.
  `src/domain/defect.ts` and its existing tests are left untouched: `DefectRecord` is a new type,
  local to `summary.ts`, that extends the existing `Defect` shape with the `status` and
  `createdAt` fields a persisted record has but a creation-time `Defect` does not need. The
  "trend chart" is rendered as a semantically-labelled list of `date: count` points rather than a
  canvas/SVG chart, since no charting library is a dependency today and canvas-based charts are
  unreliable to assert against in jsdom — see assumptions.
scope:
  - description: |
      Add a new pure domain module with the types and functions the dashboard needs, all
      operating on a `DefectRecord` (a `Defect` plus lifecycle fields):

      ```ts
      import { Defect } from './defect';
      import { Role } from './roles';

      export type DefectStatus = 'Open' | 'Closed';

      export interface DefectRecord extends Defect {
        status: DefectStatus;
        createdAt: string; // 'YYYY-MM-DD', date-only (see assumptions)
      }

      export interface DefectCounts {
        open: number;
        closed: number;
      }

      export interface DailyTrendPoint {
        date: string; // 'YYYY-MM-DD'
        count: number;
      }

      export function visibleDefects(
        defects: DefectRecord[],
        role: Role,
        currentUserId: string
      ): DefectRecord[]

      export function countByStatus(defects: DefectRecord[]): DefectCounts

      export function dailyTrend(defects: DefectRecord[]): DailyTrendPoint[]
      ```

      `visibleDefects` is the AC6 enforcement point: `Admin` returns all defects unchanged;
      every other role returns only defects where `assigneeId === currentUserId`.
      `countByStatus` and `dailyTrend` are pure aggregations with no role logic of their own —
      the dashboard always calls them on the already-filtered list from `visibleDefects`, so the
      visibility rule cannot be bypassed by calling them directly on the unfiltered set.
    files:
      - src/domain/summary.ts
    rationale: |
      Keeping this as small, pure, independently-testable functions (rather than one combined
      "getSummary" call) mirrors the existing `createDefect` pattern in `src/domain/defect.ts`
      and lets each AC be pinned down with a direct, deterministic unit test with no React/async
      involved.
  - description: |
      Unit tests for the module above, written before the implementation.
    files:
      - src/domain/summary.test.ts
    rationale: |
      TDD: these are the first tests written, and must fail against an empty/missing
      `summary.ts` before the module above is implemented.
  - description: |
      Add a `SummaryDashboard` presentational component that takes the current role, current
      user id, and a `loadDefects` loader as props; owns a `'loading' | 'ready'` state; and
      renders open/closed counts plus the daily trend once loaded.

      ```tsx
      export interface SummaryDashboardProps {
        role: Role;
        currentUserId: string;
        loadDefects: () => Promise<DefectRecord[]>;
      }

      export function SummaryDashboard(props: SummaryDashboardProps): JSX.Element
      ```

      Render behaviour:
      - While `loadDefects()` has not yet resolved: render a single loading indicator
        (`<p role="status">Loading summary…</p>`) and nothing else.
      - Once resolved: filter with `visibleDefects`, then render `Open: {n}` / `Closed: {n}` from
        `countByStatus`, and either an `aria-label="Defect trend"` list of `date: count` rows
        from `dailyTrend`, or, when that list is empty, an empty-state message
        (`No defect activity to show yet.`) instead of the list — never an error.
    files:
      - src/components/SummaryDashboard.tsx
    rationale: |
      Matches the existing `DefectForm` convention of taking role as an external prop rather
      than resolving auth/session itself (no auth system exists in this repo), and keeps data
      loading as an injected dependency rather than inventing an HTTP client, per
      `assumptions_or_open_questions`.
  - description: |
      Component tests for the dashboard above, written before the implementation, covering all
      six ACs via React Testing Library.
    files:
      - src/components/SummaryDashboard.test.tsx
    rationale: |
      TDD: these tests must fail (component does not exist yet) before
      `SummaryDashboard.tsx` is written, then pass once it is.
tests:
  - |
    AC1 — open/closed counts, `src/domain/summary.test.ts`:
    ```ts
    test('counts open and closed defects', () => {
      const counts = countByStatus([
        { title: 'A', status: 'Open', createdAt: '2026-09-18' },
        { title: 'B', status: 'Open', createdAt: '2026-09-19' },
        { title: 'C', status: 'Closed', createdAt: '2026-09-19' },
      ]);
      expect(counts).toEqual({ open: 2, closed: 1 });
    });
    ```
    and `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('shows open and closed defect counts', async () => {
      render(
        <SummaryDashboard
          role="Admin"
          currentUserId="user-1"
          loadDefects={() => Promise.resolve([
            { title: 'A', status: 'Open', createdAt: '2026-09-18' },
            { title: 'B', status: 'Closed', createdAt: '2026-09-19' },
          ])}
        />
      );
      expect(await screen.findByText(/open:\s*1/i)).toBeInTheDocument();
      expect(screen.getByText(/closed:\s*1/i)).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `countByStatus` reduces over `status`; `SummaryDashboard` calls it
    after load and renders the two numbers.
  - |
    AC2 — daily trend chart, `src/domain/summary.test.ts`:
    ```ts
    test('buckets defects into daily trend points, sorted by date', () => {
      const trend = dailyTrend([
        { title: 'A', status: 'Open', createdAt: '2026-09-19' },
        { title: 'B', status: 'Open', createdAt: '2026-09-18' },
        { title: 'C', status: 'Closed', createdAt: '2026-09-18' },
      ]);
      expect(trend).toEqual([
        { date: '2026-09-18', count: 2 },
        { date: '2026-09-19', count: 1 },
      ]);
    });
    ```
    and `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('renders daily trend points with no granularity control', async () => {
      render(
        <SummaryDashboard
          role="Admin"
          currentUserId="user-1"
          loadDefects={() => Promise.resolve([
            { title: 'A', status: 'Open', createdAt: '2026-09-18' },
            { title: 'B', status: 'Closed', createdAt: '2026-09-18' },
          ])}
        />
      );
      const trend = await screen.findByLabelText(/defect trend/i);
      expect(within(trend).getByText(/2026-09-18:\s*2/)).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: /granularity/i })).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `dailyTrend` groups by the date portion of `createdAt` and sorts
    ascending; `SummaryDashboard` renders one row per point inside the labelled list and never
    renders any granularity control.
  - |
    AC3 — loading indicator, `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('shows a loading indicator while defects are in flight', () => {
      const loadDefects = () => new Promise<DefectRecord[]>(() => {});
      render(<SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={loadDefects} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `SummaryDashboard` starts in a `'loading'` state and renders the
    `role="status"` element until the `loadDefects()` promise resolves.
  - |
    AC4 — zero counts, not an error, when nothing is visible, `src/domain/summary.test.ts`:
    ```ts
    test('reports zero counts for an empty defect list', () => {
      expect(countByStatus([])).toEqual({ open: 0, closed: 0 });
    });
    ```
    and `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('shows zero counts when there are no defects', async () => {
      render(<SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={() => Promise.resolve([])} />);
      expect(await screen.findByText(/open:\s*0/i)).toBeInTheDocument();
      expect(screen.getByText(/closed:\s*0/i)).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `countByStatus([])` returns `{ open: 0, closed: 0 }` via its initial
    accumulator; the component always renders the counts line rather than a conditional error
    branch.
  - |
    AC5 — empty trend state, `src/domain/summary.test.ts`:
    ```ts
    test('returns no trend points for an empty defect list', () => {
      expect(dailyTrend([])).toEqual([]);
    });
    ```
    and `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('shows an empty state for the trend chart when there are no defects', async () => {
      render(<SummaryDashboard role="Admin" currentUserId="user-1" loadDefects={() => Promise.resolve([])} />);
      expect(await screen.findByText(/no defect activity to show yet/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/defect trend/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `SummaryDashboard` renders the empty-state message instead of the
    `aria-label="Defect trend"` list when `dailyTrend(...)` returns `[]`.
  - |
    AC6 — role-based visibility applies to both counts and trend,
    `src/domain/summary.test.ts`:
    ```ts
    test('Admin sees all defects; other roles see only their assigned defects', () => {
      const defects: DefectRecord[] = [
        { title: 'Mine', assigneeId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
        { title: 'Not mine', assigneeId: 'user-2', status: 'Closed', createdAt: '2026-09-18' },
      ];
      expect(visibleDefects(defects, 'Admin', 'user-1')).toHaveLength(2);
      expect(visibleDefects(defects, 'Developer', 'user-1')).toEqual([defects[0]]);
      expect(visibleDefects(defects, 'Reporter', 'user-1')).toEqual([defects[0]]);
    });
    ```
    and `src/components/SummaryDashboard.test.tsx`:
    ```tsx
    test('restricts counts and trend to defects visible to a non-Admin role', async () => {
      const defects: DefectRecord[] = [
        { title: 'Mine', assigneeId: 'user-1', status: 'Open', createdAt: '2026-09-18' },
        { title: 'Not mine', assigneeId: 'user-2', status: 'Closed', createdAt: '2026-09-18' },
      ];
      render(
        <SummaryDashboard role="Developer" currentUserId="user-1" loadDefects={() => Promise.resolve(defects)} />
      );
      expect(await screen.findByText(/open:\s*1/i)).toBeInTheDocument();
      expect(screen.getByText(/closed:\s*0/i)).toBeInTheDocument();
      const trend = screen.getByLabelText(/defect trend/i);
      expect(within(trend).getByText(/2026-09-18:\s*1/)).toBeInTheDocument();
      expect(within(trend).queryByText(/2026-09-18:\s*2/)).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `SummaryDashboard` calls `visibleDefects(all, role, currentUserId)`
    once after load and derives both the counts and the trend from that filtered list, never
    from the unfiltered `all`.
assumptions_or_open_questions:
  - |
    Role-based visibility rule for this dashboard is not specified by any AC or by any existing
    code (the only precedent, `createDefect` in TEST-REAL-PROJECT-STORY-009, only gates whether
    `assigneeId` can be *set*, not who can later *see* a defect). This plan assumes: `Admin` sees
    all defects; `Developer` and `Reporter` each see only defects where
    `assigneeId === currentUserId`. Please confirm this matches the intended rule for the
    "filterable list view" sibling story in the same epic — that story and this one should not
    define two different visibility rules.
  - |
    `currentUserId` is assumed to be supplied to `SummaryDashboard` by whatever
    authentication/session mechanism exists elsewhere in the system, the same way `role` is
    assumed to be supplied to `DefectForm` today. No auth/session code exists in this repo yet
    and none is added by this plan.
  - |
    `DefectRecord.createdAt` is assumed to be a date-only string (`'YYYY-MM-DD'`), not a full
    timestamp, so daily-bucketing in `dailyTrend` is a plain string grouping with no timezone
    conversion. If the real data source instead produces full ISO timestamps, `dailyTrend` will
    need a `.slice(0, 10)` (or equivalent) truncation step added — flagging this now since no AC
    specifies the source data's exact shape.
  - |
    No persistence/API layer exists in this repo (confirmed: no `App`/entry-point file, no
    fetch/HTTP code anywhere in `src`). `loadDefects` is therefore left as an injected
    `() => Promise<DefectRecord[]>` prop, matching how `role` is injected into `DefectForm`
    rather than resolved internally. Wiring a real endpoint is left to a later story.
  - |
    The "trend chart" is implemented as an accessible list of `date: count` rows
    (`aria-label="Defect trend"`), not a canvas/SVG visualization, since no charting library is a
    dependency today and canvas-rendered charts are unreliable to assert against under jsdom.
    If the reviewer wants an actual visual chart (e.g. via a charting library), that is a scope
    change with a new `package_dependencies` entry and should be called out explicitly, since it
    changes how AC2's tests must query the rendered output.
  - |
    `DefectRecord` is defined in the new `summary.ts` module as `Defect & { status; createdAt }`
    rather than adding those fields to `Defect`/`createDefect` in `src/domain/defect.ts`, so that
    module and its existing passing tests are left completely untouched — creation-time defects
    (`Defect`) and the lifecycle-aware records this dashboard reads (`DefectRecord`) are treated
    as related but distinct shapes until a future story defines how a `Defect` becomes a
    persisted `DefectRecord`.
package_dependencies: []
notes: |
  No new third-party dependencies: React, TypeScript, Jest, ts-jest, jest-environment-jsdom,
  @testing-library/react and @testing-library/jest-dom are already installed and cover
  everything this plan needs (async component tests via `findBy*`, plain-object domain tests).

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    classDef context fill:#eee,color:#000

    Roles["src/domain/roles.ts<br/>Role"]:::context
    Defect["src/domain/defect.ts<br/>Defect, createDefect"]:::context
    Summary["src/domain/summary.ts<br/>DefectRecord, visibleDefects,<br/>countByStatus, dailyTrend"]:::touched
    Dashboard["src/components/SummaryDashboard.tsx"]:::touched
    DefectForm["src/components/DefectForm.tsx"]:::context

    Defect -- "DefectRecord extends Defect" --> Summary
    Roles -- "Role param for visibility check" --> Summary
    Summary -- "visibleDefects/countByStatus/dailyTrend" --> Dashboard
    Roles -- "role prop, same pattern as DefectForm" --> Dashboard
    Roles -.-> DefectForm
  ```

  `DefectForm` and its existing role-gating logic are shown only as prior-art context (same
  "role supplied externally" pattern) — this plan does not modify `DefectForm.tsx` or
  `defect.ts`/`defect.test.ts` at all.
