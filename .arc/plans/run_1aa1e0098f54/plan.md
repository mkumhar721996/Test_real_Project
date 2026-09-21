summary: |
  The codebase currently models a `Defect` with only `title` and an Admin-gated `assigneeId`
  (`src/domain/defect.ts`, from STORY-009) and has no concept of status at all. This story adds
  that concept and the state machine that governs it: a `DefectStatus` type
  (`New | In Progress | Fixed | Closed | Won't Fix`), a `status` field on `Defect` that starts at
  `'New'`, and a pure `changeDefectStatus(defect, targetStatus, actor)` function that is the single
  authoritative gate for every legal and illegal transition named in the 13 ACs — who may act
  (assigned Developer or Admin, never a Reporter or an unassigned Developer), which transitions
  are legal from which status, and which two statuses (`Closed`, `Won't Fix`) are terminal (with
  `Closed` carrying the one Admin-only escape hatch of reopening back to `New`). This mirrors the
  domain-first pattern established in STORY-009: the rule lives in a pure, framework-agnostic
  function in `src/domain/defect.ts` so it holds regardless of whether the caller is today's tests
  or a future UI/API layer. All 13 ACs are phrased behaviorally ("changes its status" /
  "attempts a status change"), with no DOM-presence requirement like STORY-009's AC1/AC2 had, so
  this story deliberately stays at the domain layer and does not add or modify any React
  component — a status-control UI is left to a sibling story in the "Defect Management" epic.
scope:
  - description: |
      Add a `DefectStatus` union type and extend `Defect` with a required `status: DefectStatus`
      field. Update `createDefect` so every newly created defect starts at `'New'`, regardless of
      role (the existing Admin-only `assigneeId` gating from STORY-009 is untouched).

      Before → after of the touched types/signature:
      ```ts
      // before
      export interface Defect extends Omit<DefectInput, 'assigneeId'> {
        assigneeId?: string;
      }
      export function createDefect(input: DefectInput, role: Role): Defect

      // after
      export type DefectStatus = 'New' | 'In Progress' | 'Fixed' | 'Closed' | "Won't Fix";

      export interface Defect extends Omit<DefectInput, 'assigneeId'> {
        assigneeId?: string;
        status: DefectStatus;
      }
      export function createDefect(input: DefectInput, role: Role): Defect // now also sets status: 'New'
      ```
    files:
      - src/domain/defect.ts
    rationale: |
      Every AC is phrased as "a defect in X status" — there is no status vocabulary or field to
      transition today, so this is the prerequisite groundwork the state machine builds on.
      Defaulting new defects to `'New'` is required for AC1/AC13, which both assume a freshly
      created defect starts there.
  - description: |
      Add a `StatusChangeActor` interface, an `InvalidStatusTransitionError` class, and a pure
      `changeDefectStatus` function that is the single enforcement point for all 13 ACs. It
      returns a new `Defect` with the updated status on a legal transition, and throws
      `InvalidStatusTransitionError` (leaving the input `defect` object untouched, since the
      function never mutates its argument) on every illegal one — which is how "the defect
      remains in X status" (ACs 6, 9, 10, 11, 12, 13) is satisfied: the caller's existing
      reference to `defect` is simply never replaced.

      Signature:
      ```ts
      export interface StatusChangeActor {
        role: Role;
        userId: string;
      }

      export class InvalidStatusTransitionError extends Error {}

      export function changeDefectStatus(
        defect: Defect,
        targetStatus: DefectStatus,
        actor: StatusChangeActor
      ): Defect
      ```

      Core logic:
      ```ts
      function isTransitionAllowed(
        defect: Defect,
        targetStatus: DefectStatus,
        actor: StatusChangeActor
      ): boolean {
        const isAssignedDeveloper = actor.role === 'Developer' && defect.assigneeId === actor.userId;
        const isAdmin = actor.role === 'Admin';

        if (!isAssignedDeveloper && !isAdmin) return false; // Reporter, unassigned Developer

        if (defect.status === "Won't Fix") return false; // terminal for everyone

        if (targetStatus === "Won't Fix") {
          return isAdmin && defect.status !== 'Closed'; // Admin-only, from any non-terminal status
        }

        switch (defect.status) {
          case 'New':
            return targetStatus === 'In Progress';
          case 'In Progress':
            return targetStatus === 'Fixed';
          case 'Fixed':
            return targetStatus === 'Closed' && isAdmin;
          case 'Closed':
            return targetStatus === 'New' && isAdmin;
          default:
            return false;
        }
      }
      ```
    files:
      - src/domain/defect.ts
    rationale: |
      Centralizing the who-can-act check (assigned Developer or Admin), the terminal-status check
      (Won't Fix always, Closed except for Admin reopen), and the per-status legal-target check in
      one function is what lets every AC be expressed as a single assertion against
      `changeDefectStatus`'s return value or thrown error, instead of scattering role/status
      conditionals across a future UI and API layer.
  - description: |
      Add 13 tests to the existing domain test file, one per AC, each constructing a `Defect`
      fixture at the relevant starting `status` (and `assigneeId` where an assignment check
      matters) and asserting either the resulting status or the thrown error.

      Shared fixture helper to add at the top of the file:
      ```ts
      import { changeDefectStatus, Defect, DefectStatus, InvalidStatusTransitionError } from './defect';

      function defectAt(status: DefectStatus, assigneeId?: string): Defect {
        return { title: 'Bug', status, assigneeId };
      }
      ```
    files:
      - src/domain/defect.test.ts
    rationale: |
      Test-first: these are written before `changeDefectStatus` exists in `defect.ts`, so they
      fail on import/compile first, then fail on behavior once the export exists but the logic is
      wrong, then pass once the implementation above matches all 13 cases.
tests:
  - |
    AC1 — New → In Progress by assigned Developer or Admin:
    ```ts
    test.each([
      { role: 'Developer', userId: 'dev-1' },
      { role: 'Admin', userId: 'admin-1' },
    ] as const)('AC1: New -> In Progress allowed for assigned $role', (actor) => {
      const defect = defectAt('New', 'dev-1');
      const result = changeDefectStatus(defect, 'In Progress', actor);
      expect(result.status).toBe('In Progress');
    });
    ```
    Minimal code to pass: the `'New'` case in `isTransitionAllowed` returning
    `targetStatus === 'In Progress'` for an assigned Developer or Admin.
  - |
    AC2 — In Progress → Fixed by assigned Developer or Admin:
    ```ts
    test.each([
      { role: 'Developer', userId: 'dev-1' },
      { role: 'Admin', userId: 'admin-1' },
    ] as const)('AC2: In Progress -> Fixed allowed for assigned $role', (actor) => {
      const defect = defectAt('In Progress', 'dev-1');
      const result = changeDefectStatus(defect, 'Fixed', actor);
      expect(result.status).toBe('Fixed');
    });
    ```
    Minimal code to pass: the `'In Progress'` case returning `targetStatus === 'Fixed'`.
  - |
    AC3 — Fixed → Closed by Admin only:
    ```ts
    test('AC3: Fixed -> Closed allowed for Admin', () => {
      const defect = defectAt('Fixed', 'dev-1');
      const result = changeDefectStatus(defect, 'Closed', { role: 'Admin', userId: 'admin-1' });
      expect(result.status).toBe('Closed');
    });
    ```
    Minimal code to pass: the `'Fixed'` case returning `targetStatus === 'Closed' && isAdmin`.
  - |
    AC4 — Any non-terminal status → Won't Fix by Admin:
    ```ts
    test.each(['New', 'In Progress', 'Fixed'] as const)(
      "AC4: %s -> Won't Fix allowed for Admin",
      (status) => {
        const defect = defectAt(status, 'dev-1');
        const result = changeDefectStatus(defect, "Won't Fix", { role: 'Admin', userId: 'admin-1' });
        expect(result.status).toBe("Won't Fix");
      }
    );
    ```
    Minimal code to pass: the `targetStatus === "Won't Fix"` branch returning
    `isAdmin && defect.status !== 'Closed'`.
  - |
    AC5 — Closed → New (reopen) by Admin:
    ```ts
    test('AC5: Closed -> New allowed for Admin', () => {
      const defect = defectAt('Closed', 'dev-1');
      const result = changeDefectStatus(defect, 'New', { role: 'Admin', userId: 'admin-1' });
      expect(result.status).toBe('New');
    });
    ```
    Minimal code to pass: the `'Closed'` case returning `targetStatus === 'New' && isAdmin`.
  - |
    AC6 — Won't Fix is terminal for everyone, including Admin:
    ```ts
    test.each([
      { role: 'Admin', userId: 'admin-1' },
      { role: 'Developer', userId: 'dev-1' },
      { role: 'Reporter', userId: 'rep-1' },
    ] as const)("AC6: Won't Fix rejects any change attempt by $role", (actor) => {
      const defect = defectAt("Won't Fix", 'dev-1');
      expect(() => changeDefectStatus(defect, 'New', actor)).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe("Won't Fix");
    });
    ```
    Minimal code to pass: the early `if (defect.status === "Won't Fix") return false;` check.
  - |
    AC7 — Unassigned Developer is always rejected:
    ```ts
    test('AC7: unassigned Developer cannot change status', () => {
      const defect = defectAt('New', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, 'In Progress', { role: 'Developer', userId: 'dev-2' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('New');
    });
    ```
    Minimal code to pass: `isAssignedDeveloper` requiring `defect.assigneeId === actor.userId`.
  - |
    AC8 — Reporter is always rejected:
    ```ts
    test('AC8: Reporter cannot change status', () => {
      const defect = defectAt('New', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, 'In Progress', { role: 'Reporter', userId: 'rep-1' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('New');
    });
    ```
    Minimal code to pass: the `if (!isAssignedDeveloper && !isAdmin) return false;` guard.
  - |
    AC9 — Assigned Developer cannot move Fixed forward:
    ```ts
    test('AC9: assigned Developer cannot change status from Fixed', () => {
      const defect = defectAt('Fixed', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, 'Closed', { role: 'Developer', userId: 'dev-1' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('Fixed');
    });
    ```
    Minimal code to pass: the `'Fixed'` case's `&& isAdmin` conjunct.
  - |
    AC10 — Assigned Developer cannot mark Won't Fix:
    ```ts
    test("AC10: assigned Developer cannot mark a non-terminal defect Won't Fix", () => {
      const defect = defectAt('In Progress', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, "Won't Fix", { role: 'Developer', userId: 'dev-1' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('In Progress');
    });
    ```
    Minimal code to pass: the `targetStatus === "Won't Fix"` branch's `isAdmin` requirement.
  - |
    AC11 — Assigned Developer cannot reopen Closed:
    ```ts
    test('AC11: assigned Developer cannot reopen a Closed defect', () => {
      const defect = defectAt('Closed', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, 'New', { role: 'Developer', userId: 'dev-1' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('Closed');
    });
    ```
    Minimal code to pass: the `'Closed'` case's `&& isAdmin` conjunct.
  - |
    AC12 — Admin cannot mark a Closed defect Won't Fix:
    ```ts
    test("AC12: Admin cannot mark a Closed defect Won't Fix", () => {
      const defect = defectAt('Closed', 'dev-1');
      expect(() =>
        changeDefectStatus(defect, "Won't Fix", { role: 'Admin', userId: 'admin-1' })
      ).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('Closed');
    });
    ```
    Minimal code to pass: the `targetStatus === "Won't Fix"` branch's `defect.status !== 'Closed'`
    conjunct.
  - |
    AC13 — New cannot jump directly to Fixed:
    ```ts
    test.each([
      { role: 'Developer', userId: 'dev-1' },
      { role: 'Admin', userId: 'admin-1' },
    ] as const)('AC13: New cannot move directly to Fixed for $role', (actor) => {
      const defect = defectAt('New', 'dev-1');
      expect(() => changeDefectStatus(defect, 'Fixed', actor)).toThrow(InvalidStatusTransitionError);
      expect(defect.status).toBe('New');
    });
    ```
    Minimal code to pass: the `'New'` case only returning true for `targetStatus === 'In Progress'`,
    never `'Fixed'`.
assumptions_or_open_questions:
  - |
    "Current assignee" is checked as `defect.assigneeId === actor.userId` for role `'Developer'`.
    `actor.userId` is assumed to be supplied by whatever authentication/session mechanism exists
    elsewhere (not implemented in this story), the same assumption STORY-009 made for `role`.
  - |
    Rejection is modeled as a thrown `InvalidStatusTransitionError` rather than a result object
    (e.g. `{ ok: false, reason }`), since no error/result convention exists yet anywhere in this
    codebase. Because `changeDefectStatus` never mutates its `defect` argument, "the defect
    remains in X status" (ACs 6, 9, 10, 11, 12, 13) is verified by asserting the caller's original
    `defect` object is unchanged after the throw, not by inspecting a returned value. Please
    confirm this fits the error-handling convention you want the rest of the "Defect Management"
    epic (editing, reassignment, comments, delete) to follow, since this story is the first to
    need one.
  - |
    AC4's "any non-terminal status" is read as every status except the two terminal ones named
    elsewhere in the ACs (`Closed` in AC3/AC12, `Won't Fix` in AC6) — i.e. `New`, `In Progress`,
    and `Fixed`.
  - |
    No React component is added or modified. All 13 ACs are behavioral ("changes its status" /
    "attempts a status change") with no DOM-presence assertion like STORY-009's AC1/AC2, so this
    story stops at the pure domain function; a status-control UI that calls `changeDefectStatus`
    is left to a sibling story in the "Defect Management" epic per the parent epic description.
  - |
    `changeDefectStatus` takes the `Defect` object directly rather than looking one up by `id`,
    since `Defect` has no `id` field yet and no store/persistence layer exists in this codebase —
    consistent with `createDefect` being an in-memory pure function today.
package_dependencies: []
notes: |
  Diagram omitted: this plan touches a single existing file (`src/domain/defect.ts`) plus its
  co-located test file, purely additively (new type, new fields, new function) with no new
  cross-layer callers/callees to show — the same "skip it" case the instructions call out for a
  small, single-file, purely-additive change.

  Why one function instead of splitting authorization and transition-legality into two: every AC
  is phrased as a single GIVEN/WHEN/THEN over one actor and one target status, so a caller (test
  today, UI/API later) only ever needs one yes/no answer per attempt. Splitting into
  "isAuthorized" + "isLegalTransition" would require the caller to combine both correctly every
  time, reintroducing exactly the kind of scattered conditional this story is trying to centralize.

  This continues the domain-first pattern from STORY-009 (`.arc/plans/run_c183a4e5b113/plan.md`):
  put the authoritative rule in a pure function in `src/domain/defect.ts` first, and let any UI or
  API layer be a thin caller of it later.
