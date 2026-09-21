summary: |
  Implement Admin-only permanent deletion of a defect and its comments, at any status
  including terminal ones (Won't Fix, Closed), as a pure, in-memory domain operation plus a
  presentational `DeleteDefectButton` component that gates the action behind an explicit
  confirm/cancel step. This replaces an earlier draft of this plan that incorrectly assumed the
  repository was empty and needed a new Express/Prisma/Postgres backend and Vitest — reading the
  actual repo shows it already has a React + TypeScript + Jest stack landed by a prior story
  (TEST-REAL-PROJECT-STORY-009): `src/domain/roles.ts` (`Role = 'Admin' | 'Reporter' |
  'Developer'`), `src/domain/defect.ts` (`createDefect`), `src/components/DefectForm.tsx`, and
  Jest/RTL test tooling (`package.json`, `jest.config.js`, `tsconfig.json`,
  `src/setupTests.ts`). There is still no HTTP/API layer, no database, and no `DefectList` or
  `DefectDetail` view anywhere in the repo — only a creation form exists. This story follows the
  same precedent STORY-009 set (pure domain function + presentational component, no
  persistence, no auth system) rather than inventing a server that nothing else in the repo
  uses. The approved design prototype
  (`.arc/designs/TEST-REAL-PROJECT-STORY-015-design.html`) was read in full; its Backlog and
  Detail screens for Admin, Developer, and Reporter drive the component's markup, classes,
  copy, and ARIA semantics below.
scope:
  - description: |
      Add a pure, role-gated `deleteDefect` domain function that removes a defect and its
      comments from in-memory collections, regardless of status. No defect/comment domain type
      with an `id` exists yet (the existing `Defect`/`DefectInput` in `src/domain/defect.ts` only
      has `title`/`assigneeId`, from the creation-only STORY-009 scope), so this introduces
      minimal local shapes (`DeletableDefect`, `DeletableComment`) rather than extending the
      existing `Defect` interface, to avoid colliding with whatever the sibling "status
      transitions"/"comments" stories will eventually add to those types.

      ```ts
      import { Role } from './roles';

      export interface DeletableDefect {
        id: string;
        status: string;
      }

      export interface DeletableComment {
        id: string;
        defectId: string;
      }

      export class NotAuthorizedError extends Error {}

      export function deleteDefect(
        defects: DeletableDefect[],
        comments: DeletableComment[],
        defectId: string,
        role: Role
      ): { defects: DeletableDefect[]; comments: DeletableComment[] } {
        if (role !== 'Admin') {
          throw new NotAuthorizedError('Only Admins can permanently delete defects.');
        }
        return {
          defects: defects.filter((d) => d.id !== defectId),
          comments: comments.filter((c) => c.defectId !== defectId),
        };
      }
      ```
    files:
      - src/domain/deleteDefect.ts
    rationale: |
      AC1 ("permanently removed") and AC3 ("succeeds at any status, including terminal ones")
      reduce to "filter the row out of both collections, and never branch on `status`" — the
      function simply never reads `status`, which is what makes AC3 true by construction rather
      than as a special case. AC4 ("Developer/Reporter rejected") is enforced here too, as
      defense-in-depth, mirroring how STORY-009 put the Admin-only assignee gate in the pure
      `createDefect` function and not only in the form component.
  - description: |
      Add a `DeleteDefectButton` component implementing the confirm/cancel/reject flow shown in
      the approved design's four screens. The design (read in full) shows this control in two
      contexts that share identical gating logic but different markup: a small icon-button
      trigger in the Backlog table row (`.btn-icon`, 🗑, `aria-label="Delete ${id} permanently"`)
      and a full labeled button in the Detail header (`.btn-danger`, "🗑 Delete permanently").
      Non-Admins (Backlog — Developer, Detail — Reporter screens) see a visually restricted
      equivalent (`.btn-icon[aria-disabled="true"]` with 🔒, or `.btn-restricted` with "🔒 Delete
      permanently") that is deliberately `aria-disabled`, not natively `disabled` — the design's
      own annotation explains this keeps it keyboard/screen-reader reachable per WCAG rather than
      disappearing silently. Activating the restricted control shows the exact denial copy from
      the design's toast: "🔒 Only Admins can permanently delete defects." Confirming deletion
      (Admin only) opens a modal matching the design's `modal-overlay`/`modal-card` structure:
      title `Delete ${defectId} permanently?`, a body sentence, and a `.modal-consequence` line
      naming the exact comment count to be removed (`This will also permanently delete all N
      comment(s) on this defect.`, pluralized exactly as the design's script does), with
      `.btn.btn-secondary` "Cancel" and `.btn-danger` "🗑 Delete permanently" actions. Confirming
      calls `deleteDefect` (Admin path only, so its internal role check is unreachable in
      practice) and reports the result upward; cancelling closes the modal and calls nothing.

      ```tsx
      export interface DeleteDefectButtonProps {
        defectId: string;
        defectTitle?: string;
        defects: DeletableDefect[];
        comments: DeletableComment[];
        role: Role;
        variant?: 'icon' | 'button';
        onDeleted: (result: { defects: DeletableDefect[]; comments: DeletableComment[] }) => void;
      }
      export function DeleteDefectButton(props: DeleteDefectButtonProps): JSX.Element
      ```
    files:
      - src/components/DeleteDefectButton.tsx
    rationale: |
      AC4 must be visible and inert at the UI layer, not just rejected deep in a function
      (design explicitly renders a restricted control plus a rejection message rather than
      hiding the control). AC5 is inherently a client-side confirm/cancel interaction — the
      domain function is never even reached unless the Admin clicks confirm, so "cancel means no
      deletion" has to be verified at the component level. Calling `deleteDefect` directly from
      the component (rather than leaving it fully disconnected) mirrors exactly how
      `DefectForm.tsx` calls `createDefect` internally before invoking its `onSubmit` prop —
      keeping this story consistent with the one existing convention in the repo.
tests:
  - |
    AC1 — deleting removes the defect and its comments (domain layer), in
    `src/domain/deleteDefect.test.ts`:
    ```ts
    test('permanently removes the defect and its comments', () => {
      const defects = [{ id: 'DEF-1', status: 'Open' }];
      const comments = [{ id: 'C-1', defectId: 'DEF-1' }, { id: 'C-2', defectId: 'DEF-2' }];
      const result = deleteDefect(defects, comments, 'DEF-1', 'Admin');
      expect(result.defects.find((d) => d.id === 'DEF-1')).toBeUndefined();
      expect(result.comments.filter((c) => c.defectId === 'DEF-1')).toHaveLength(0);
    });
    ```
    Minimal code to pass: `deleteDefect` filters both arrays by id/defectId as shown in scope
    item 1.
  - |
    AC1 (UI wiring) — confirming as Admin actually invokes the deletion, in
    `src/components/DeleteDefectButton.test.tsx`:
    ```tsx
    test('deletes the defect and its comments when an Admin confirms', () => {
      const onDeleted = jest.fn();
      render(
        <DeleteDefectButton
          defectId="DEF-1"
          defects={[{ id: 'DEF-1', status: 'Open' }]}
          comments={[{ id: 'C-1', defectId: 'DEF-1' }]}
          role="Admin"
          onDeleted={onDeleted}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: /delete permanently/i }));
      expect(onDeleted).toHaveBeenCalledWith({ defects: [], comments: [] });
    });
    ```
    Minimal code to pass: the confirm button in the modal calls `deleteDefect(...)` and passes
    the result to `onDeleted`.
  - |
    AC2 — the defect no longer exists in the collection any list/detail view would render from,
    in `src/domain/deleteDefect.test.ts`:
    ```ts
    test('the returned defect collection no longer contains the deleted defect', () => {
      const defects = [{ id: 'DEF-1', status: 'Open' }, { id: 'DEF-2', status: 'Open' }];
      const result = deleteDefect(defects, [], 'DEF-1', 'Admin');
      expect(result.defects.map((d) => d.id)).toEqual(['DEF-2']);
    });
    ```
    Minimal code to pass: same filter as AC1; no separate "visibility" logic is needed since
    there is nothing left to render. See the open question below about how this maps to an
    actual list/detail screen, since neither exists in the repo yet.
  - |
    AC3 — deletion succeeds for defects in terminal statuses, in `src/domain/deleteDefect.test.ts`:
    ```ts
    test.each(["Won't Fix", 'Closed'])(
      'allows deleting a defect in terminal status %s',
      (status) => {
        const result = deleteDefect([{ id: 'DEF-1', status }], [], 'DEF-1', 'Admin');
        expect(result.defects).toHaveLength(0);
      }
    );
    ```
    Minimal code to pass: no status check anywhere in `deleteDefect`.
  - |
    AC4 — Developer/Reporter rejected (domain layer), in `src/domain/deleteDefect.test.ts`:
    ```ts
    test.each(['Reporter', 'Developer'] as const)(
      'rejects deletion attempted by a %s',
      (role) => {
        expect(() =>
          deleteDefect([{ id: 'DEF-1', status: 'Open' }], [], 'DEF-1', role)
        ).toThrow(NotAuthorizedError);
      }
    );
    ```
    Minimal code to pass: the `role !== 'Admin'` guard shown in scope item 1.
  - |
    AC4 — Developer/Reporter rejected and shown a denial message (UI layer), in
    `src/components/DeleteDefectButton.test.tsx`:
    ```tsx
    test.each(['Reporter', 'Developer'] as const)(
      'rejects deletion attempted by a %s without deleting anything',
      (role) => {
        const onDeleted = jest.fn();
        render(
          <DeleteDefectButton
            defectId="DEF-1"
            defects={[{ id: 'DEF-1', status: 'Open' }]}
            comments={[]}
            role={role}
            onDeleted={onDeleted}
          />
        );
        fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
        expect(screen.getByRole('status')).toHaveTextContent(/only admins can permanently delete/i);
        expect(onDeleted).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      }
    );
    ```
    Minimal code to pass: for non-Admin roles, the trigger renders `.btn-icon[aria-disabled]` or
    `.btn-restricted`, never opens the modal, and clicking it renders a `role="status"` element
    with the design's denial copy instead of calling `onDeleted`.
  - |
    AC5 — cancelling the confirmation does not delete the defect, in
    `src/components/DeleteDefectButton.test.tsx`:
    ```tsx
    test('does not delete the defect when the Admin cancels the confirmation', () => {
      const onDeleted = jest.fn();
      render(
        <DeleteDefectButton
          defectId="DEF-1"
          defects={[{ id: 'DEF-1', status: 'Open' }]}
          comments={[]}
          role="Admin"
          onDeleted={onDeleted}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: /cancel/i }));
      expect(onDeleted).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: the modal's Cancel button (`.btn.btn-secondary`) only closes the modal
    and never calls `deleteDefect` or `onDeleted`.
assumptions_or_open_questions:
  - |
    CORRECTION TO AN EARLIER DRAFT: a prior version of this plan assumed the repository was
    completely empty and proposed bootstrapping an Express/Prisma/Postgres backend with Vitest.
    That was wrong — the repo already contains a React + TypeScript + Jest stack landed by
    TEST-REAL-PROJECT-STORY-009 (`package.json`, `tsconfig.json`, `jest.config.js`,
    `src/setupTests.ts`, `src/domain/roles.ts`, `src/domain/defect.ts`,
    `src/components/DefectForm.tsx` and their tests). This revision reads and builds on that
    real code instead.
  - |
    There is still no HTTP/API layer, database, or persisted state anywhere in the repo, and no
    `DefectList` or `DefectDetail` view component exists — only the defect-creation form does.
    Per the epic, status transitions/editing/reassignment/comments are explicitly sibling
    stories' responsibility. This plan therefore models deletion the same way STORY-009 modeled
    creation: a pure in-memory domain function plus a presentational component, with no
    persistence layer invented for this story alone.
  - |
    OPEN QUESTION: because no list/detail view exists yet, AC2 ("no longer appears in any list
    or detail view") is verified at the data layer — the `defects`/`comments` arrays
    `deleteDefect` returns are the one source of truth any future list/detail view would render
    from, so the row is structurally gone before any such view is built. Please confirm this is
    sufficient, or say if you'd rather this story also scaffold a minimal `DefectList`/
    `DefectDetail` shell — building those in full would duplicate a lot of what the sibling
    status/editing/comments stories still need to add (status chips, assignee columns, comment
    authoring/rendering), so I've deliberately not built them here.
  - |
    No `Comment` domain type exists yet anywhere in the repo. This plan introduces the minimal
    shape needed to prove cascading deletion (`{ id, defectId }`); a future "comments" story may
    define a richer type (body, author, timestamps) that should be reconciled with this shape
    rather than duplicated.
  - |
    No defect `status` field/type exists yet either. `deleteDefect` intentionally never reads
    `status` (that's what makes AC3 true without a special case), so this plan does not define a
    status enum — test fixtures use a plain `status: string` purely for narrative fidelity to
    AC3, leaving the real enum to the sibling "status transitions" story.
  - |
    The approved design shows presentational polish beyond what any AC requires: a "Deleting…"
    loading state on the confirm button with a simulated ~350ms delay, animated row removal
    (`row-deleting`/`row-gone` classes), an auto-dismissing positioned toast region, and
    Escape-key/backdrop-click modal dismissal. None of these are required by AC5 (which only
    requires an explicit Cancel click to no-op), so this plan implements the design's classes,
    copy, and ARIA semantics faithfully but does not implement that timing/animation/auto-dismiss
    chrome. Flagging this explicitly rather than silently picking a side.
  - |
    The design's rejection feedback is a positioned, auto-dismissing toast
    (`#*-toast-region`/`.toast`). This plan renders the same copy in a plain `role="status"`
    element instead, since only the message's presence is testable against AC4, not its
    positioning or animation.
  - |
    Assumed `role: Role` and the `defects`/`comments` collections continue to be supplied by
    whatever caller renders `DeleteDefectButton` — consistent with STORY-009's same assumption
    that no login/session/role-resolution mechanism exists in the repo yet.
package_dependencies: []
notes: |
  Design source read in full: `.arc/designs/TEST-REAL-PROJECT-STORY-015-design.html` (4
  clickthrough screens: Backlog—Admin, Backlog—Developer, Defect Detail—Admin (Closed), Defect
  Detail—Reporter (Won't Fix)). The design's own inline comment explains there is no
  `color-danger` token in `src/design-system/tokens.json`, so the danger button intentionally
  uses the inverted `--color-fg`/`--color-bg` pair (`.btn-danger`) rather than a hardcoded red —
  this plan reuses that exact class rather than introducing a new color.

  ```mermaid
  flowchart TD
    RolesTS[src/domain/roles.ts<br/>Role type — existing]
    DeleteDefectTS[src/domain/deleteDefect.ts<br/>deleteDefect — new]
    DeleteBtn[src/components/DeleteDefectButton.tsx<br/>new]
    DefectForm[src/components/DefectForm.tsx<br/>existing, unmodified]

    RolesTS --> DeleteDefectTS
    RolesTS --> DefectForm
    DeleteBtn -->|"on Admin confirm: calls deleteDefect (AC1/AC2)"| DeleteDefectTS
    DeleteDefectTS -->|"throws NotAuthorizedError for non-Admin (AC4, defense-in-depth)"| DeleteBtn

    classDef touched fill:#f96,color:#000
    class DeleteDefectTS,DeleteBtn touched
  ```

  `DefectForm.tsx` is shown only as existing, unmodified context: it already imports `Role` from
  `roles.ts` the same way the new `deleteDefect.ts` will, which is the one real precedent in this
  codebase for how domain logic and a presentational component share the `Role` type.
