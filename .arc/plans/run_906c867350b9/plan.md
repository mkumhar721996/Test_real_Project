summary: |
  STORY-009 (already merged) established `src/domain/defect.ts` (`createDefect`, role-gated
  `assigneeId`) and `src/components/DefectForm.tsx` (a `title` input plus a conditional
  `assignee` select). Neither of those yet satisfies STORY-008: the form has no field for a
  defect's `description`, there is no validation that blocks submission when a required field is
  empty, and created records carry no `status` at all. This plan extends the existing domain
  module and form component (rather than creating new ones) to: (1) render every field required
  to create a defect — `title` and `description` — on load, (2) add a pure, testable
  `validateDefectInput` function that the form calls before submitting, blocking submission and
  showing an inline error per missing required field, and (3) make `createDefect` unconditionally
  stamp `status: 'New'` on every record it produces, so a successful submission is never left in
  any intermediate/draft state. The role-gated `assigneeId` behavior from STORY-009 is left
  untouched and remains optional/non-required.
scope:
  - description: |
      Extend the domain model in `defect.ts`:
      - add `description: string` to `DefectInput`
      - add `status: DefectStatus` to `Defect`, where `type DefectStatus = 'New'`
      - add a pure `validateDefectInput(input: DefectInput): DefectValidationErrors` that flags
        empty `title`/`description`
      - change `createDefect` to always set `status: 'New'` on the record it returns

      Before → after signatures:
      ```ts
      // before
      export interface DefectInput {
        title: string;
        assigneeId?: string;
      }
      export interface Defect extends Omit<DefectInput, 'assigneeId'> {
        assigneeId?: string;
      }
      export function createDefect(input: DefectInput, role: Role): Defect

      // after
      export type DefectStatus = 'New';

      export interface DefectInput {
        title: string;
        description: string;
        assigneeId?: string;
      }

      export interface Defect {
        title: string;
        description: string;
        status: DefectStatus;
        assigneeId?: string;
      }

      export type DefectValidationErrors = Partial<Record<'title' | 'description', string>>;

      export function validateDefectInput(input: DefectInput): DefectValidationErrors
      export function createDefect(input: DefectInput, role: Role): Defect
      ```
    files:
      - src/domain/defect.ts
    rationale: |
      AC3 talks about the guarantee that a created defect record has status 'New' "immediately,
      without passing through any intermediate or draft status" — that is a record-creation
      guarantee, not a UI affordance, so it belongs in the same pure domain function that already
      owns the assignee-gating rule from STORY-009 (mirrors that story's own rationale for putting
      enforcement in `createDefect` rather than only in the form). AC2's "required field" check is
      likewise put in a pure, framework-agnostic function so the form and any future API layer
      share one source of truth for what counts as valid.
  - description: |
      Update the existing STORY-009 domain tests to compile against the now-required
      `description` field (every existing `createDefect(...)` call site in this file constructs
      a `DefectInput` literal without `description`, which TS strict mode will reject once it
      becomes a required property), and add new tests for `validateDefectInput` and for the new
      `status` guarantee.
    files:
      - src/domain/defect.test.ts
    rationale: |
      Necessary follow-on of the `defect.ts` signature change above — without updating these
      literals the existing suite fails to type-check, not just fails assertions.
  - description: |
      Add a `description` field (label + textarea) to `DefectForm`, rendered unconditionally
      alongside `title`. On submit, run `validateDefectInput` first: if it returns any errors,
      store them in state, render each as inline text next to its field, and return without
      calling `createDefect`/`onSubmit`. Only call `createDefect(input, role)` and `onSubmit`
      when there are no errors, so every successful submission the form produces already carries
      `status: 'New'`.
    files:
      - src/components/DefectForm.tsx
    rationale: |
      AC1 requires the description field to be present on load; AC2 requires submission to be
      blocked with a visible per-field error when a required field is empty; AC3 requires the
      form's happy path to end in a `status: 'New'` record, which falls out for free once the
      form always routes through the updated `createDefect`.
  - description: |
      Add new tests to `DefectForm.test.tsx` for AC1 (both required fields are present on load),
      AC2 (submitting with either field empty is blocked and shows that field's error, and
      `onSubmit` is never called), and AC3 (submitting with both fields filled calls `onSubmit`
      with a record whose `status` is `'New'`). The existing STORY-009 assignee-visibility tests
      are left as-is since `DefectFormProps` is unchanged and they don't touch `title`/
      `description`.
    files:
      - src/components/DefectForm.test.tsx
    rationale: |
      DOM presence/absence and blocked-submission behavior can only be asserted against a
      rendered component, matching how the existing assignee-visibility tests in this same file
      are written.
tests:
  - |
    AC1 — both required fields are rendered on load, in `src/components/DefectForm.test.tsx`:
    ```tsx
    test('renders fields for all information required to create a defect', () => {
      render(<DefectForm role="Reporter" onSubmit={jest.fn()} />);
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });
    ```
    Minimal code to pass: add a `<label htmlFor="description">Description</label>` +
    `<textarea id="description" ...>` to `DefectForm.tsx`, rendered unconditionally (not inside
    the `role === 'Admin'` branch used for `assignee`).
  - |
    AC2a — empty title blocks submission and shows that field's error, in
    `src/components/DefectForm.test.tsx`:
    ```tsx
    test('blocks submission and shows a validation error when title is empty', () => {
      const handleSubmit = jest.fn();
      render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Repro steps' } });
      fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: `handleSubmit` in `DefectForm.tsx` calls `validateDefectInput(input)`,
    stores the result in an `errors` state slice, renders `errors.title` as text next to the
    title field, and `return`s before calling `createDefect`/`onSubmit` when any error exists.
  - |
    AC2b — empty description blocks submission and shows that field's error (same file):
    ```tsx
    test('blocks submission and shows a validation error when description is empty', () => {
      const handleSubmit = jest.fn();
      render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
      fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: same `errors` state slice from AC2a, rendering `errors.description`
    next to the description field.
  - |
    AC2c — domain-level unit coverage for the validator itself, in `src/domain/defect.test.ts`:
    ```ts
    test('flags an empty title and an empty description', () => {
      expect(validateDefectInput({ title: '', description: 'x' })).toEqual({
        title: 'Title is required.',
      });
      expect(validateDefectInput({ title: 'x', description: '' })).toEqual({
        description: 'Description is required.',
      });
    });

    test('returns no errors when both required fields are filled', () => {
      expect(validateDefectInput({ title: 'x', description: 'y' })).toEqual({});
    });
    ```
    Minimal code to pass: `validateDefectInput` in `defect.ts` returns
    `{ title: 'Title is required.' }` / `{ description: 'Description is required.' }` (or both)
    only for whichever of `title`/`description` is empty/whitespace-only after `.trim()`.
  - |
    AC3a — a full, valid submission is created with status 'New', in
    `src/components/DefectForm.test.tsx`:
    ```tsx
    test('submits a defect with status New once all required fields are filled', () => {
      const handleSubmit = jest.fn();
      render(<DefectForm role="Reporter" onSubmit={handleSubmit} />);
      fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Bug' } });
      fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Repro steps' } });
      fireEvent.click(screen.getByRole('button', { name: /create defect/i }));
      expect(handleSubmit).toHaveBeenCalledWith(expect.objectContaining({ status: 'New' }));
    });
    ```
    Minimal code to pass: once `validateDefectInput` returns no errors, `handleSubmit` calls
    `createDefect(input, role)` and passes the result to `onSubmit`.
  - |
    AC3b — domain-level guarantee that `createDefect` never omits or varies `status`, in
    `src/domain/defect.test.ts`:
    ```ts
    test.each(['Admin', 'Reporter', 'Developer'] as const)(
      'always sets status to New regardless of role (%s)',
      (role) => {
        const defect = createDefect({ title: 'Bug', description: 'Repro steps' }, role);
        expect(defect.status).toBe('New');
      }
    );
    ```
    Minimal code to pass: `createDefect` always includes `status: 'New'` in the object it
    returns, independent of the existing role-based `assigneeId` branch.
assumptions_or_open_questions:
  - |
    Assumed the "information required to create a defect" in AC1/AC2 means exactly `title` and
    `description` — no other field name (severity, priority, steps-to-reproduce, reporter, etc.)
    appears anywhere in the story, the design tokens, or the existing code. This plan implements
    required-field validation for exactly those two fields; if the epic intends a larger required
    field set, please say so and this plan will be revised to add them (the `validateDefectInput`
    shape extends easily — the risk of guessing wrong is adding an unrequested field, not the
    validation mechanism itself).
  - |
    `assigneeId` remains optional and role-gated exactly as STORY-009 left it; it is not treated
    as one of the "required" fields for AC1/AC2 purposes, since the parent epic explicitly
    separates "captures all required defect fields" from "enforces role-based field visibility"
    as two different concerns.
  - |
    `DefectStatus` is modeled as the single-value literal type `'New'` for now. Other statuses
    (In Progress, Resolved, Closed, etc.) belong to other stories in the "Defect Creation"/defect
    lifecycle work and are intentionally not introduced here — AC3 only requires guaranteeing
    immediate `'New'` status with no intermediate/draft status in between, which holds trivially
    if `'New'` is the only value the type can currently take.
  - |
    Validation errors are rendered as plain inline text (implicitly `role="alert"`-worthy, but
    this plan does not add ARIA wiring beyond what's needed for the RTL assertions above) next to
    each field, rather than adopting the CHORE-020 design-system form classes
    (`.form-field`/`.form-label`/`.form-input` from `src/design-system/prototype-utils.css`). No
    AC requires specific styling, and the existing `DefectForm.tsx` doesn't use those classes
    today either. Flag if this story should also adopt the design system now rather than in a
    later pass.
  - |
    Submission blocking is implemented via custom JS validation (checking `validateDefectInput`
    in the submit handler) rather than native HTML5 `required` attributes, so error text is
    deterministic and directly assertable via React Testing Library, and so the exact same
    validation function backs both the UI and any future non-UI caller of `createDefect`.
package_dependencies: []
notes: |
  No new third-party packages are needed — React, TypeScript, Jest, ts-jest, and
  @testing-library/* are already installed and already used by the STORY-009 files this plan
  extends.

  ```mermaid
  flowchart TD
    RolesTS[src/domain/roles.ts]
    DefectTS[src/domain/defect.ts]
    DefectTestTS[src/domain/defect.test.ts]
    DefectFormTSX[src/components/DefectForm.tsx]
    DefectFormTestTSX[src/components/DefectForm.test.tsx]

    RolesTS -->|Role type, unchanged| DefectTS
    RolesTS -->|Role type, unchanged| DefectFormTSX
    DefectTS -->|"description, status, validateDefectInput"| DefectFormTSX
    DefectTestTS -->|new/updated calls exercise| DefectTS
    DefectFormTestTSX -->|new AC1-3 assertions exercise| DefectFormTSX

    classDef touched fill:#f96,color:#000
    class DefectTS,DefectTestTS,DefectFormTSX,DefectFormTestTSX touched
  ```

  Why the `status: 'New'` guarantee and the required-field check both live in `defect.ts` rather
  than only in `DefectForm.tsx`: this mirrors the precedent already set by STORY-009's own plan,
  which put the assignee-gating rule in `createDefect` specifically so the guarantee holds even
  for a future caller that reaches record-creation without going through this rendered form (e.g.
  an API layer added by a later story in the "Defect Creation" epic). Keeping `validateDefectInput`
  pure and separate from `createDefect` also lets the form block submission (AC2) using the same
  rule that will eventually gate persistence, without the validator needing to know about roles at
  all.
