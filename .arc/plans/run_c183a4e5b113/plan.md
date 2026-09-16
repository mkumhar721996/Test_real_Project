summary: |
  This repository is currently empty apart from a README (no package.json, no source tree, no
  test runner). This story therefore has to introduce the minimal scaffolding needed to build
  and test a role-gated "assignee" field for the defect creation form, rather than modifying an
  existing form. The plan implements the rule in two places, mirroring the two places it is
  observable in the acceptance criteria: (1) a presentational `DefectForm` component that omits
  the assignee control entirely for Reporter/Developer and renders it enabled for Admin, and (2)
  a pure `createDefect` domain function that strips any submitted `assigneeId` unless the
  submitting role is Admin, so the rule is enforced at the record-creation boundary and not just
  hidden client-side. Both are driven by a single `Role` type so there is one source of truth
  for "who is Admin." Scope is deliberately narrow: no auth system, no HTTP/API layer, no
  database, and no other defect fields are implemented here — those belong to sibling stories in
  the "Defect Creation" epic.
scope:
  - description: |
      Add a shared `Role` type used by both the form and the domain layer.
    files:
      - src/domain/roles.ts
    rationale: |
      Both the component (AC1/AC2) and the creation function (AC3/AC4) need to agree on what
      "Admin" means; a single exported type avoids stringly-typed drift between the two.
  - description: |
      Add a pure `createDefect(input, role)` domain function that is the authoritative
      assignee-gating logic: it copies `assigneeId` onto the resulting record only when
      `role === 'Admin'`, and drops it otherwise — regardless of what the caller (form, future
      API layer, or a malicious client bypassing the UI) sent.

      Signature:
      ```ts
      export interface DefectInput {
        title: string;
        assigneeId?: string;
      }

      export interface Defect extends Omit<DefectInput, 'assigneeId'> {
        assigneeId?: string;
      }

      export function createDefect(input: DefectInput, role: Role): Defect
      ```
    files:
      - src/domain/defect.ts
    rationale: |
      AC3/AC4 talk about what is "saved on the defect record" when a defect "is created" — that
      is a server/domain-level guarantee, not just a UI affordance. Putting the gate in a pure
      function that a future API/persistence story will call keeps the enforcement point
      framework-agnostic and testable without inventing a database in this story.
  - description: |
      Add a `DefectForm` React component that renders a `title` field always, and an `assignee`
      `<select>` only when `role === 'Admin'`. On submit it calls `createDefect(values, role)`
      and passes the result to the `onSubmit` prop, so the same gating rule that protects the
      record also governs what a successful submission produces.

      Signature:
      ```ts
      export interface DefectFormProps {
        role: Role;
        onSubmit: (defect: Defect) => void;
      }

      export function DefectForm(props: DefectFormProps): JSX.Element
      ```
    files:
      - src/components/DefectForm.tsx
    rationale: |
      AC1/AC2 are explicitly about DOM presence ("not present anywhere on the form" /
      "visible and editable"), which requires a real rendered component to assert against, not
      just a boolean helper function.
  - description: |
      Introduce minimal project tooling: `package.json`, `tsconfig.json`, and a Jest config
      (with `ts-jest` and `jest-environment-jsdom`) so the tests below can actually run.
    files:
      - package.json
      - tsconfig.json
      - jest.config.js
      - src/setupTests.ts
    rationale: |
      There is no build/test tooling in the repo at all yet; without it none of the tests in
      this plan can execute.
tests:
  - |
    AC1 — Reporter/Developer never see the assignee field, in `src/components/DefectForm.test.tsx`:
    ```tsx
    test.each(['Reporter', 'Developer'] as const)(
      'does not render an assignee field for %s',
      (role) => {
        render(<DefectForm role={role} onSubmit={jest.fn()} />);
        expect(screen.queryByLabelText(/assignee/i)).not.toBeInTheDocument();
      }
    );
    ```
    Minimal code to pass: in `DefectForm.tsx`, wrap the assignee `<label>`/`<select>` in
    `{role === 'Admin' && (...)}` so it is not just hidden via CSS but absent from the DOM.
  - |
    AC2 — Admin sees an editable assignee field, in `src/components/DefectForm.test.tsx`:
    ```tsx
    test('renders an editable assignee field for Admin', () => {
      render(<DefectForm role="Admin" onSubmit={jest.fn()} />);
      const field = screen.getByLabelText(/assignee/i);
      expect(field).toBeInTheDocument();
      expect(field).toBeEnabled();
    });
    ```
    Minimal code to pass: the same conditional render from AC1, this time exercising the
    `role === 'Admin'` branch; ensure the `<select>` has no `disabled` attribute.
  - |
    AC3 — Admin submission persists the assignee, in `src/domain/defect.test.ts`:
    ```ts
    test('keeps assigneeId when created by an Admin', () => {
      const defect = createDefect({ title: 'Bug', assigneeId: 'user-42' }, 'Admin');
      expect(defect.assigneeId).toBe('user-42');
    });
    ```
    Minimal code to pass: `createDefect` copies `assigneeId` through when `role === 'Admin'`.
  - |
    AC4 — Reporter/Developer submission never sets an assignee, in `src/domain/defect.test.ts`:
    ```ts
    test.each(['Reporter', 'Developer'] as const)(
      'drops assigneeId when created by a %s',
      (role) => {
        const defect = createDefect({ title: 'Bug', assigneeId: 'user-42' }, role);
        expect(defect.assigneeId).toBeUndefined();
      }
    );
    ```
    Minimal code to pass: `createDefect` omits `assigneeId` from the returned object for any
    role other than `'Admin'`, even if the caller supplied one (defends against a client that
    bypasses the hidden form field).
assumptions_or_open_questions:
  - |
    The repository currently contains only a README — no package.json, source tree, or test
    runner. This plan introduces the minimal scaffolding (package.json, tsconfig.json,
    jest.config.js) needed to implement and test this one story; it does not attempt to decide
    the epic's overall architecture.
  - |
    Assumed React + TypeScript + Jest + React Testing Library as the stack, since AC1/AC2
    require asserting DOM presence and nothing in the repo specifies a framework yet. Please
    confirm this matches the intended stack for the rest of the "Defect Creation" epic — if a
    different framework is already chosen elsewhere, this plan should be revised to match it
    instead of introducing a second one.
  - |
    Assumed exactly the three roles named in the acceptance criteria (Admin, Reporter,
    Developer), with no additional roles to consider.
  - |
    Assumed `role: Role` is supplied to `DefectForm` and to `createDefect` by whatever
    authentication/session mechanism exists elsewhere in the system; this story does not
    implement login, session, or role-resolution logic.
  - |
    `createDefect` here is a pure, in-memory domain function representing the create-defect
    entry point. Wiring it to an actual HTTP endpoint or database is left to a later story in
    the epic; this story only guarantees that the function itself never lets a non-Admin
    submission carry an assignee through to the resulting record.
  - |
    `DefectForm` only renders a `title` field plus the conditionally-visible `assignee` field to
    keep this story's scope to assignee visibility. The full required-field set is the
    responsibility of the sibling "capture all required defect fields" story and is
    intentionally not implemented here.
package_dependencies:
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: DefectForm is implemented as a React component to satisfy AC1/AC2's DOM-presence requirements.
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: Required alongside react to render DefectForm in tests via React Testing Library.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: All new source files (roles.ts, defect.ts, DefectForm.tsx) are TypeScript; no build tooling exists yet in this empty repo.
  - name: "@types/react"
    version: ^18.3.3
    ecosystem: npm
    rationale: Type definitions needed to write DefectForm.tsx in TypeScript.
  - name: "@types/react-dom"
    version: ^18.3.0
    ecosystem: npm
    rationale: Type definitions for react-dom used by the test renderer.
  - name: jest
    version: ^29.7.0
    ecosystem: npm
    rationale: Test runner for both the domain (defect.test.ts) and component (DefectForm.test.tsx) test-first tests; no test runner exists yet.
  - name: ts-jest
    version: ^29.2.4
    ecosystem: npm
    rationale: Lets Jest run the TypeScript test files directly without a separate compile step.
  - name: "@types/jest"
    version: ^29.5.12
    ecosystem: npm
    rationale: Type definitions for Jest globals (test, expect, test.each) used in the new test files.
  - name: jest-environment-jsdom
    version: ^29.7.0
    ecosystem: npm
    rationale: DefectForm.test.tsx renders into a DOM and queries it via screen.getByLabelText/queryByLabelText, which requires a jsdom test environment.
  - name: "@testing-library/react"
    version: ^16.0.0
    ecosystem: npm
    rationale: Provides render/screen used to assert the assignee field's presence/absence and enabled state for AC1/AC2.
  - name: "@testing-library/jest-dom"
    version: ^6.4.8
    ecosystem: npm
    rationale: Provides the toBeInTheDocument/toBeEnabled matchers used in the AC1/AC2 assertions.
notes: |
  Diagram omitted: every file in this plan is newly created (package.json, tsconfig.json,
  jest.config.js, src/domain/roles.ts, src/domain/defect.ts, src/components/DefectForm.tsx, and
  their test files) — this is a purely additive, greenfield change with no existing callers or
  callees to show a meaningful flowchart against.

  Why the gate lives in `createDefect` and not only in the form: AC3/AC4 are phrased in terms of
  what gets "saved on the defect record" when a defect "is created," which is a guarantee that
  must hold even if a request reaches record-creation without going through the rendered form
  (e.g. a future API caller). Hiding the field in the UI alone would satisfy AC1/AC2 but not
  robustly satisfy AC3/AC4, so the same role check is duplicated at both the presentation layer
  (DefectForm) and the domain layer (createDefect) rather than relying on the UI as the only
  enforcement point.

  Process note: since this appears to be the very first code landing in this repository, the
  reviewer may want to confirm the chosen stack (React/TypeScript/Jest) before implementation
  starts, since later stories in the same "Defect Creation" epic will likely build on whatever
  form component and domain module this story establishes.
