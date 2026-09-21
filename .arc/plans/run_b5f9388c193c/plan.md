summary: |
  Codebase inspection shows this repo is NOT empty (the prior draft of this plan was wrong on
  that point): `src/domain/defect.ts`/`roles.ts` and `src/components/DefectForm.tsx` already
  implement a pure, framework-agnostic domain layer for defects (STORY-009's Admin-gated
  `assigneeId`, STORY-011's `status` state machine), with Jest + ts-jest + React Testing
  Library already wired up and no HTTP/API layer or persistence store anywhere yet. This story
  is the first one whose ACs require an actual collection of defects (a "list" that a deletion
  must disappear from, and "direct access by id" that must uniformly fail after deletion), so
  it adds the smallest possible in-memory store on top of the existing `Defect` domain type
  rather than inventing a parallel Express/HTTP backend. `getDefectById` returns `undefined`
  identically for a deleted id and a never-existed id (no user/role parameter at all, so its
  behavior cannot vary by caller — satisfying "any user" for AC2), and `deleteDefect` performs
  a real removal from the backing array with no tombstone/deleted flag anywhere, so there is no
  deletion-metadata field that could ever leak (AC3 by construction, mirroring the hard-delete
  reasoning from the earlier draft). Mapping this domain-level "not found" (`undefined`) onto an
  actual HTTP 404 is left to whichever future story introduces an API layer, consistent with how
  STORY-009 and STORY-011 both deferred HTTP/API wiring.
scope:
  - description: |
      Add a new in-memory defect store module that wraps the existing `Defect` domain object
      (from `src/domain/defect.ts`) with the two identity fields it does not have today (`id`,
      `reporterId`), and provides the add/list/get/delete operations the three ACs need.

      Signature:
      ```ts
      import { Defect } from './defect';

      export interface StoredDefect extends Defect {
        id: string;
        reporterId: string;
      }

      export function addDefect(defect: Defect, id: string, reporterId: string): StoredDefect
      export function listDefectsForReporter(reporterId: string): StoredDefect[]
      export function getDefectById(id: string): StoredDefect | undefined
      export function deleteDefect(id: string): void
      export function _reset(): void
      ```

      Implementation is a single module-level `StoredDefect[]` array. `deleteDefect` reassigns
      the array via `.filter(d => d.id !== id)` — a real removal, not a `deleted`/`deletedAt`
      flag — so there is no tombstone field anywhere to accidentally expose. `getDefectById`
      takes no user/role argument, so a deleted id and a never-existed id both simply resolve
      to "not in the array" and return `undefined` through the exact same code path.
    files:
      - src/domain/defectStore.ts
    rationale: |
      `id` and `reporterId` are kept off `Defect`/`createDefect` itself (rather than extending
      `createDefect`'s signature) so this story does not have to touch `DefectForm.tsx`, which
      today calls `createDefect({ title, assigneeId }, role)` with no user-identity parameter at
      all — extending that call chain is outside this story's ACs. A real removal (no flag) is
      what makes AC3 hold by construction: every read (`listDefectsForReporter`, `getDefectById`)
      naturally omits a deleted defect because it is no longer in the underlying array, rather
      than because every read path remembers to filter a flag.
  - description: |
      Write failing tests first for each acceptance criterion against the new store module,
      using `createDefect` (from the existing `src/domain/defect.ts`) to build the `Defect`
      fixture that gets stored.
    files:
      - src/domain/defectStore.test.ts
    rationale: |
      Test-first per the TDD requirement: these fail on import (module doesn't exist yet), then
      fail on behavior once the exports exist but delete/list/get aren't implemented correctly,
      then pass once the implementation above matches all three ACs.
tests:
  - |
    AC1 — a deleted defect no longer appears in the submitting Reporter's list, in
    `src/domain/defectStore.test.ts`:
    ```ts
    import { createDefect } from './defect';
    import { addDefect, deleteDefect, listDefectsForReporter, _reset } from './defectStore';

    beforeEach(() => _reset());

    test('AC1: deleted defect is absent from the submitting reporter list', () => {
      const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
      addDefect(defect, 'defect-1', 'reporter-1');

      deleteDefect('defect-1');

      const list = listDefectsForReporter('reporter-1');
      expect(list.find((d) => d.id === 'defect-1')).toBeUndefined();
    });
    ```
    Minimal code to pass: `deleteDefect` removes the entry from the backing array;
    `listDefectsForReporter` filters that same array by `reporterId`.
  - |
    AC2 — any user, including the submitting Reporter, gets a standard not-found on direct
    access to a deleted defect, in `src/domain/defectStore.test.ts`:
    ```ts
    test('AC2: direct access to a deleted defect resolves to not-found', () => {
      const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
      addDefect(defect, 'defect-1', 'reporter-1');
      deleteDefect('defect-1');

      expect(getDefectById('defect-1')).toBeUndefined();
    });
    ```
    Minimal code to pass: `getDefectById` returns `undefined` when no stored entry has that
    `id`. It takes no caller/user argument, so this single assertion covers every caller by
    construction — there is no per-user branch that could behave differently.
  - |
    AC3 — no deletion notice, tombstone, or other defect data is exposed on direct access; a
    deleted defect's lookup result is indistinguishable from an id that never existed, in
    `src/domain/defectStore.test.ts`:
    ```ts
    test('AC3: deleted-defect lookup reveals nothing and matches a never-existed lookup', () => {
      const defect = createDefect({ title: 'Crash on save' }, 'Reporter');
      addDefect(defect, 'defect-1', 'reporter-1');
      deleteDefect('defect-1');

      const deletedResult = getDefectById('defect-1');
      const neverExistedResult = getDefectById('does-not-exist');

      expect(deletedResult).toBeUndefined();
      expect(deletedResult).toEqual(neverExistedResult);
    });
    ```
    Minimal code to pass: same `getDefectById` implementation as AC2 — since a deleted entry is
    physically removed from the array rather than flagged, there is no field left to compare or
    leak, so this assertion passes for free once AC2's implementation exists.
assumptions_or_open_questions:
  - |
    The prior draft of this plan claimed the repository had "no application code (only
    README.md and .env)". That was false: `git log` shows three prior stories already merged
    (STORY-009, CHORE-020, STORY-011), and `src/domain/defect.ts`, `src/domain/roles.ts`,
    `src/components/DefectForm.tsx`, `package.json`, `jest.config.js`, and `tsconfig.json` all
    already exist and were read while writing this plan. This rewrite follows the established
    domain-first pattern (pure functions in `src/domain/*.ts`, colocated `*.test.ts`, no
    HTTP/API layer) instead of scaffolding a parallel Express backend.
  - |
    `Defect`/`createDefect` (in `src/domain/defect.ts`) have no `id` or `reporterId` field
    today, and `createDefect(input, role)` has no user-identity parameter at all. Rather than
    extending that signature (which would also require updating `DefectForm.tsx`, out of this
    story's ACs), this plan adds `id`/`reporterId` only on a new `StoredDefect` wrapper in the
    store module, supplied by the caller of `addDefect`. Flag if a later story wants `id`
    /`reporterId` to live directly on `Defect` itself.
  - |
    No persistence/store layer exists anywhere in this codebase before this story (STORY-011's
    plan explicitly noted its absence). This plan introduces the smallest one needed to make
    "list" and "direct access after delete" testable: a single module-level in-memory array
    with a test-only `_reset()`. If the real application's persistence actually lives in
    another service/repo not visible here, this plan should be redirected there instead.
  - |
    "Standard not-found response" (AC2) is modeled at the domain layer as `getDefectById`
    returning `undefined` uniformly, since no HTTP/API layer exists yet to return an actual 404
    status — consistent with STORY-009/011 both deferring HTTP/API wiring to future stories.
    Whichever future story adds an API layer on top of this store is expected to map
    `undefined` to a generic 404 response.
  - |
    "Any user, including the submitting Reporter" (AC2/AC3) is satisfied by `getDefectById`
    taking no user/role parameter at all, so its result cannot vary by caller identity; no
    per-caller authorization check is modeled since no auth/session layer exists yet in this
    codebase.
  - |
    `id` and `reporterId` are supplied by the caller of `addDefect` (tests today; a future
    auth/session/id-generation layer later) rather than generated internally by the store,
    consistent with how STORY-011's `StatusChangeActor.userId` is caller-supplied rather than
    looked up.
  - |
    Chose hard delete (`Array#filter` removal) over a soft-delete flag for the same reason the
    superseded draft gave: physical removal satisfies "no tombstone" by construction, rather
    than relying on every read path to remember to filter a `deleted`/`deletedAt` field.
  - |
    Authorization on `deleteDefect` itself (rejecting a non-Admin caller) is out of scope: no
    AC covers who is allowed to call it, so the tests invoke it directly rather than testing an
    Admin-only guard.
package_dependencies: []
notes: |
  This plan supersedes an earlier draft written without reading the repository, which
  incorrectly assumed a greenfield repo and proposed scaffolding a new Express/HTTP backend
  (package.json, src/app.js, src/routes/defects.js) plus new test tooling. That tooling
  (jest, ts-jest, jest-environment-jsdom, React Testing Library) already exists and is already
  used by `src/domain/defect.test.ts` and `src/components/DefectForm.test.tsx`; no HTTP
  framework exists or is needed, since neither of those existing stories added one either.

  Prior plans read for convention (both domain-first, no HTTP layer):
  `.arc/plans/run_1aa1e0098f54/plan.md` (STORY-009, introduced `roles.ts`/`defect.ts`/
  `DefectForm.tsx`) and `.arc/plans/run_c183a4e5b113/plan.md` (STORY-011, added the `status`
  state machine to `defect.ts`). This plan continues that pattern: put the authoritative rule
  in a pure module in `src/domain/`, test it directly, and leave any UI or HTTP/API surface to
  a future story.

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    classDef untouched fill:#eee,color:#000

    defectTs[src/domain/defect.ts]:::untouched
    store[src/domain/defectStore.ts]:::touched
    storeTest[src/domain/defectStore.test.ts]:::touched

    store -->|"wraps Defect from createDefect with id + reporterId"| defectTs
    storeTest -->|"builds fixtures via createDefect"| defectTs
    storeTest -->|"exercises addDefect/listDefectsForReporter/getDefectById/deleteDefect"| store
  ```
