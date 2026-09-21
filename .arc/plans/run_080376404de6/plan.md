summary: |
  Implement Admin-only permanent deletion of a defect and its comments, at any status
  including terminal ones (Won't Fix, Closed), as a pure, in-memory domain operation plus a
  presentational `DeleteDefectButton` component that gates the action behind an explicit
  confirm/cancel step. This revision keeps the previously-agreed correction intact: the repo
  already has a React + TypeScript + Jest stack landed by TEST-REAL-PROJECT-STORY-009
  (`src/domain/roles.ts` with `Role = 'Admin' | 'Reporter' | 'Developer'`,
  `src/domain/defect.ts` with `createDefect`, `src/components/DefectForm.tsx`, and Jest/RTL
  tooling), and there is still no HTTP/API layer, database, or `DefectList`/`DefectDetail`
  view anywhere in the repo. Re-reading `src/domain/roles.ts`, `src/domain/defect.ts`, and
  `src/components/DefectForm.tsx` in this revision confirms none of it has moved or changed.
  This revision's only substantive addition, per reviewer feedback ("add more security
  cases"), is a set of explicit security-hardening tests and scope notes on top of the same
  design and architecture as before: forged/malformed role values, cross-record (IDOR-style)
  isolation between defects, no-mutation-on-rejection, and — most concretely — proving that
  the restricted trigger's `aria-disabled` (chosen over native `disabled` per the design's own
  accessibility rationale) is inert against both a forced click and keyboard activation,
  because `aria-disabled` is a presentational/ARIA attribute only and does not stop the
  browser from firing click/keydown events the way native `disabled` would — the component's
  own handler, not the browser, must be the actual security boundary. The approved design
  prototype (`.arc/designs/TEST-REAL-PROJECT-STORY-015-design.html`) was read in full; its
  Backlog and Detail screens for Admin, Developer, and Reporter still drive the component's
  markup, classes, copy, and ARIA semantics below, unchanged from the prior pass.

scope:
  - description: |
      Add a pure, role-gated `deleteDefect` domain function that removes a defect and its
      comments from in-memory collections, regardless of status, and never mutates its inputs.
      No defect/comment domain type with an `id` exists yet (the existing `Defect`/
      `DefectInput` in `src/domain/defect.ts` only has `title`/`assigneeId`, from the
      creation-only STORY-009 scope), so this introduces minimal local shapes
      (`DeletableDefect`, `DeletableComment`) rather than extending the existing `Defect`
      interface, to avoid colliding with whatever the sibling "status transitions"/"comments"
      stories will eventually add to those types.

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

      Security-relevant properties this function must satisfy, per reviewer feedback: (1) the
      `role !== 'Admin'` check is a strict string comparison against the exact literal
      `'Admin'`, so it rejects near-miss/forged values (`'admin'`, `'ADMIN'`, `''`) the same as
      it rejects `'Developer'`/`'Reporter'` — this matters because `role` crosses a runtime
      boundary (a prop passed down from whatever renders the button) where TypeScript's
      compile-time `Role` union offers no actual runtime protection; (2) rejection happens
      before either array is touched, and the success path uses `.filter()` (never `.splice()`
      or in-place mutation), so a caller's original arrays are never partially or accidentally
      mutated on either the accept or reject path; (3) filtering is by exact `id`/`defectId`
      equality only, so deleting one defect can never remove another defect's row or another
      defect's comments (no cross-record/IDOR-style leakage).
    files:
      - src/domain/deleteDefect.ts
    rationale: |
      AC1 ("permanently removed") and AC3 ("succeeds at any status, including terminal ones")
      reduce to "filter the row out of both collections, and never branch on `status`" — the
      function simply never reads `status`, which is what makes AC3 true by construction
      rather than as a special case. AC4 ("Developer/Reporter rejected") is enforced here too,
      as defense-in-depth, mirroring how STORY-009 put the Admin-only assignee gate in the pure
      `createDefect` function and not only in the form component. The additional
      security-hardening properties above exist because this function is the actual security
      boundary in a repo with no server/auth layer yet: any UI-level gate can be bypassed by
      calling the exported function directly, so it cannot assume `role` was validated
      upstream, cannot assume good-faith input, and must not leave collections in a
      partially-mutated state if it rejects.

  - description: |
      Add a `DeleteDefectButton` component implementing the confirm/cancel/reject flow shown in
      the approved design's four screens. The design (read in full) shows this control in two
      contexts that share identical gating logic but different markup: a small icon-button
      trigger in the Backlog table row (`.btn-icon`, 🗑, `aria-label="Delete ${id}
      permanently"`) and a full labeled button in the Detail header (`.btn-danger`, "🗑 Delete
      permanently"). Non-Admins (Backlog — Developer, Detail — Reporter screens) see a visually
      restricted equivalent (`.btn-icon[aria-disabled="true"]` with 🔒, or `.btn-restricted`
      with "🔒 Delete permanently") that is deliberately `aria-disabled`, not natively
      `disabled` — the design's own annotation explains this keeps it keyboard/screen-reader
      reachable per WCAG rather than disappearing silently. Activating the restricted control
      shows the exact denial copy from the design's toast: "🔒 Only Admins can permanently
      delete defects." Confirming deletion (Admin only) opens a modal matching the design's
      `modal-overlay`/`modal-card` structure: title `Delete ${defectId} permanently?`, a body
      sentence, and a `.modal-consequence` line naming the exact comment count to be removed
      (`This will also permanently delete all N comment(s) on this defect.`, pluralized exactly
      as the design's script does), with `.btn.btn-secondary` "Cancel" and `.btn-danger` "🗑
      Delete permanently" actions. Confirming calls `deleteDefect` (Admin path only, so its
      internal role check is unreachable in practice) and reports the result upward; cancelling
      closes the modal and calls nothing.

      Security-relevant requirement added per reviewer feedback: because the restricted
      trigger is `aria-disabled` rather than natively `disabled`, the browser will still fire
      both `click` and keyboard (`Enter`/`Space`) activation events on it — `aria-disabled` is
      purely a semantic/ARIA signal for assistive tech, not a browser-enforced no-op. The
      component's own click/keydown handler must therefore check `role !== 'Admin'` itself
      (the same string comparison as the domain layer) and short-circuit to the denial message
      *before* ever opening the confirmation modal or calling `deleteDefect`, for both mouse
      and keyboard activation. The visual/ARIA restriction is cosmetic; this in-handler check
      is the real gate at this layer.

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
      domain function is never even reached unless the Admin clicks confirm, so "cancel means
      no deletion" has to be verified at the component level. Calling `deleteDefect` directly
      from the component (rather than leaving it fully disconnected) mirrors exactly how
      `DefectForm.tsx` calls `createDefect` internally before invoking its `onSubmit` prop —
      keeping this story consistent with the one existing convention in the repo. The
      keyboard/mouse-activation guard on the restricted trigger exists because `aria-disabled`
      is explicitly chosen over `disabled` in the approved design for accessibility, which as a
      side effect means the component code — not the DOM attribute — is solely responsible for
      blocking the action; a test that only checks the attribute's presence, without also
      forcing a click/keydown through it, would pass even if that guard were silently missing.

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
    AC2 — the defect no longer exists in the collection any list/detail view would render
    from, in `src/domain/deleteDefect.test.ts`:
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
    AC3 — deletion succeeds for defects in terminal statuses, in
    `src/domain/deleteDefect.test.ts`:
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
    AC4 (security hardening, new) — forged or malformed role values that are not the exact
    Admin literal are rejected at the domain boundary, simulating a caller that bypasses
    TypeScript's compile-time `Role` union (e.g. an untyped prop, deserialized data), in
    `src/domain/deleteDefect.test.ts`:
    ```ts
    test.each(['admin', 'ADMIN', '', 'SuperAdmin'] as unknown as Role[])(
      'rejects a forged or malformed role value %p at the domain boundary',
      (role) => {
        expect(() =>
          deleteDefect([{ id: 'DEF-1', status: 'Open' }], [], 'DEF-1', role)
        ).toThrow(NotAuthorizedError);
      }
    );
    ```
    Minimal code to pass: no change beyond scope item 1's strict `role !== 'Admin'` check —
    this test proves that check is a strict-equality string comparison, not a case-insensitive
    or truthy check.

  - |
    AC4 (security hardening, new) — a rejected deletion attempt does not mutate the caller's
    original arrays, so a rejected call can never leave data in a partially-deleted state, in
    `src/domain/deleteDefect.test.ts`:
    ```ts
    test('leaves the original defects and comments arrays untouched when rejected', () => {
      const defects = [{ id: 'DEF-1', status: 'Open' }];
      const comments = [{ id: 'C-1', defectId: 'DEF-1' }];
      expect(() => deleteDefect(defects, comments, 'DEF-1', 'Reporter')).toThrow(
        NotAuthorizedError
      );
      expect(defects).toHaveLength(1);
      expect(comments).toHaveLength(1);
    });
    ```
    Minimal code to pass: the guard clause throws before any `.filter()` call runs, and
    `.filter()` itself never mutates its source array.

  - |
    AC1/AC2 (security hardening, new) — deleting one defect never removes another defect's row
    or another defect's comments (cross-record / IDOR-style isolation), in
    `src/domain/deleteDefect.test.ts`:
    ```ts
    test('does not remove defects or comments belonging to a different defect id', () => {
      const defects = [{ id: 'DEF-1', status: 'Open' }, { id: 'DEF-2', status: 'Open' }];
      const comments = [{ id: 'C-1', defectId: 'DEF-1' }, { id: 'C-2', defectId: 'DEF-2' }];
      const result = deleteDefect(defects, comments, 'DEF-1', 'Admin');
      expect(result.defects.map((d) => d.id)).toEqual(['DEF-2']);
      expect(result.comments.map((c) => c.id)).toEqual(['C-2']);
    });
    ```
    Minimal code to pass: exact `id`/`defectId` equality filtering as already shown in scope
    item 1; no substring or prefix matching.

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
    Minimal code to pass: for non-Admin roles, the trigger renders `.btn-icon[aria-disabled]`
    or `.btn-restricted`, never opens the modal, and clicking it renders a `role="status"`
    element with the design's denial copy instead of calling `onDeleted`.

  - |
    AC4 (security hardening, new) — forcing a `click` event through the `aria-disabled`
    restricted trigger still does not open the modal or delete, proving the JS handler (not
    the ARIA attribute) is the actual gate, in `src/components/DeleteDefectButton.test.tsx`:
    ```tsx
    test('forcing a click on the aria-disabled restricted trigger still blocks deletion', () => {
      const onDeleted = jest.fn();
      render(
        <DeleteDefectButton
          defectId="DEF-1"
          defects={[{ id: 'DEF-1', status: 'Open' }]}
          comments={[]}
          role="Developer"
          onDeleted={onDeleted}
        />
      );
      const trigger = screen.getByRole('button', { name: /delete permanently/i });
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(trigger);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onDeleted).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: the trigger's `onClick` handler itself checks `role !== 'Admin'` and
    short-circuits to the denial message, rather than relying on `aria-disabled` to suppress
    the event (it does not).

  - |
    AC4 (security hardening, new) — keyboard activation (Enter) of the restricted trigger is
    also inert, since an `aria-disabled` element remains focusable and keyboard-operable by
    design, in `src/components/DeleteDefectButton.test.tsx`:
    ```tsx
    test('keyboard activation (Enter) of the restricted trigger does not delete', () => {
      const onDeleted = jest.fn();
      render(
        <DeleteDefectButton
          defectId="DEF-1"
          defects={[{ id: 'DEF-1', status: 'Open' }]}
          comments={[]}
          role="Reporter"
          onDeleted={onDeleted}
        />
      );
      const trigger = screen.getByRole('button', { name: /delete permanently/i });
      trigger.focus();
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
      expect(onDeleted).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: the same `role !== 'Admin'` short-circuit runs on keyboard
    activation as on click (a native `<button>` fires `click` from Enter/Space
    automatically, so this mainly guards against a future refactor to a non-button element
    losing that behavior, and documents the requirement explicitly).

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
    Minimal code to pass: the modal's Cancel button (`.btn.btn-secondary`) only closes the
    modal and never calls `deleteDefect` or `onDeleted`.

assumptions_or_open_questions:
  - |
    CORRECTION carried over from the prior pass: an earlier draft of this plan assumed the
    repository was completely empty and proposed bootstrapping an Express/Prisma/Postgres
    backend with Vitest. That was wrong — the repo already contains a React + TypeScript +
    Jest stack landed by TEST-REAL-PROJECT-STORY-009 (`package.json`, `tsconfig.json`,
    `jest.config.js`, `src/setupTests.ts`, `src/domain/roles.ts`, `src/domain/defect.ts`,
    `src/components/DefectForm.tsx` and their tests). This revision re-read all of those files
    again and confirms they are unchanged.
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
    `DefectDetail` shell.
  - |
    No `Comment` domain type exists yet anywhere in the repo. This plan introduces the minimal
    shape needed to prove cascading deletion (`{ id, defectId }`); a future "comments" story may
    define a richer type (body, author, timestamps) that should be reconciled with this shape
    rather than duplicated.
  - |
    No defect `status` field/type exists yet either. `deleteDefect` intentionally never reads
    `status` (that's what makes AC3 true without a special case), so this plan does not define
    a status enum — test fixtures use a plain `status: string` purely for narrative fidelity to
    AC3, leaving the real enum to the sibling "status transitions" story.
  - |
    The approved design shows presentational polish beyond what any AC requires: a "Deleting…"
    loading state on the confirm button with a simulated ~350ms delay, animated row removal
    (`row-deleting`/`row-gone` classes), an auto-dismissing positioned toast region, and
    Escape-key/backdrop-click modal dismissal. None of these are required by AC5, so this plan
    implements the design's classes, copy, and ARIA semantics faithfully but does not implement
    that timing/animation/auto-dismiss chrome.
  - |
    The design's rejection feedback is a positioned, auto-dismissing toast
    (`#*-toast-region`/`.toast`). This plan renders the same copy in a plain `role="status"`
    element instead, since only the message's presence is testable against AC4, not its
    positioning or animation.
  - |
    Assumed `role: Role` and the `defects`/`comments` collections continue to be supplied by
    whatever caller renders `DeleteDefectButton` — consistent with STORY-009's same assumption
    that no login/session/role-resolution mechanism exists in the repo yet.
  - |
    SECURITY CAVEAT (new, per reviewer feedback): because there is no server/API/auth layer in
    this repo yet, the `role !== 'Admin'` checks in `deleteDefect` and `DeleteDefectButton` are
    the only enforcement that exists anywhere, and both live entirely in client-side code that
    ships to the browser. This plan's added tests prove those checks are strict, forgery-
    resistant, non-mutating on rejection, and not bypassable via a forced click/keydown on the
    `aria-disabled` trigger — but they cannot make client-side authorization equivalent to a
    real trust boundary. A real deployment must eventually enforce the same Admin-only check
    server-side (e.g. in whatever API a future story adds for persistence), since a malicious
    client could in principle load its own script and call an exported `deleteDefect` (or an
    eventual HTTP endpoint) directly, bypassing `DeleteDefectButton` entirely. Flagging this
    explicitly rather than implying client-side gating alone is sufficient for production.

package_dependencies: []

notes: |
  Design source read in full: `.arc/designs/TEST-REAL-PROJECT-STORY-015-design.html` (4
  clickthrough screens: Backlog—Admin, Backlog—Developer, Defect Detail—Admin (Closed), Defect
  Detail—Reporter (Won't Fix)). The design's own inline comment explains there is no
  `color-danger` token in `src/design-system/tokens.json`, so the danger button intentionally
  uses the inverted `--color-fg`/`--color-bg` pair (`.btn-danger`) rather than a hardcoded red
  — this plan reuses that exact class rather than introducing a new color.

  This revision's changes versus the prior pass are scoped entirely to reviewer feedback ("add
  more security cases"): no files, signatures, or design citations changed. Re-verified against
  the current repo that `src/domain/roles.ts`, `src/domain/defect.ts`, and
  `src/components/DefectForm.tsx` are unchanged from the prior pass (read again in full this
  turn). Added five new tests (three domain-layer, two component-layer) and expanded both
  scope items' rationale with the security properties those tests check: strict/forgery-
  resistant role comparison, no mutation on the reject path, cross-record (IDOR-style)
  isolation between defects, and — the most concrete addition — proof that the restricted
  trigger's `aria-disabled` attribute (chosen over native `disabled` for accessibility, per the
  design's own annotation) does not itself block a click or keydown event, so the component's
  own handler must be the actual gate. Also added an explicit open-question entry stating that
  client-side role gating cannot be a full trust boundary without a server layer, which does
  not exist yet in this repo.

  ```mermaid
  flowchart TD
    RolesTS[src/domain/roles.ts<br/>Role type — existing]
    DeleteDefectTS[src/domain/deleteDefect.ts<br/>deleteDefect — new]
    DeleteBtn[src/components/DeleteDefectButton.tsx<br/>new]
    DefectForm[src/components/DefectForm.tsx<br/>existing, unmodified]

    RolesTS --> DeleteDefectTS
    RolesTS --> DefectForm
    DeleteBtn -->|"on Admin confirm: calls deleteDefect (AC1/AC2)"| DeleteDefectTS
    DeleteDefectTS -->|"throws NotAuthorizedError for non-Admin, incl. forged role values (AC4, defense-in-depth)"| DeleteBtn
    DeleteBtn -->|"click/keydown handler blocks restricted trigger before deleteDefect is ever reachable (AC4)"| DeleteBtn

    classDef touched fill:#f96,color:#000
    class DeleteDefectTS,DeleteBtn touched
  ```

  `DefectForm.tsx` is shown only as existing, unmodified context: it already imports `Role`
  from `roles.ts` the same way the new `deleteDefect.ts` will, which is the one real precedent
  in this codebase for how domain logic and a presentational component share the `Role` type.
