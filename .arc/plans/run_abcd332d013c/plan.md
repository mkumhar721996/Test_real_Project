summary: |
  This codebase currently only models a "Defect Management" tracker (`src/domain/defect.ts`,
  `src/domain/roles.ts`, `src/components/DefectForm.tsx`) with roles `Admin | Reporter |
  Developer`. STORY-021 introduces an entirely separate bounded context — "Employee Records" for
  an HR Admin — that shares no code with the defect domain. The approved prototype
  (`.arc/designs/TEST-REAL-PROJECT-STORY-021-design.html`, "PeopleHub HR") shows three screens on
  one page: an Employee List (table of Employee ID / Name / Department / Job title / Start date /
  Actions, with a "+ Add employee" button), an Add Employee form gated behind an HR-Admin-only
  check (rendering an access-denied panel otherwise), and an Edit Employee form with the same
  field set pre-filled. Following this repo's established pattern (domain-first: a pure,
  framework-agnostic function is the single authoritative gate, exercised by tests before any
  UI, then a thin React layer calls it — see `.arc/plans/run_c183a4e5b113/plan.md` and
  `.arc/plans/run_1aa1e0098f54/plan.md`), this plan adds a pure `src/domain/employee.ts` module
  (`validateEmployeeInput`, `createEmployee`, `updateEmployee`, `EmployeeValidationError`,
  `EmployeeAccessDeniedError`) plus three new components: a presentational `EmployeeForm`
  (add/edit, inline validation matching the prototype's field-error copy), a presentational
  `EmployeeList` (renders the table from an `employees` prop), and a small stateful container
  `EmployeeManager` that wires the two together and holds the in-memory employee list — mirroring
  how the existing codebase has no database/API layer at all today. Scope is deliberately limited
  to what the 5 ACs require: the reviewer-only chrome in the prototype (top app bar, role
  switcher control, nav sidebar/Settings placeholder, "Simulate list state" and "Fill with sample
  data" aids, toast notifications, loading/empty/error list states, row-flash animation) is
  explicitly excluded as speculative or already flagged in the prototype itself as a review aid,
  not shipped UI.
scope:
  - description: |
      Add the pure domain module for the Employee bounded context: types, the required-field
      list, a validation helper, and the two mutation entry points that are the single
      authoritative gate for AC1, AC2, AC4, and AC5.

      Signatures:
      ```ts
      export type EmployeeRole = 'HR Admin' | 'Manager';

      export interface EmployeeInput {
        firstName: string;
        lastName: string;
        email: string;
        department: string;
        jobTitle: string;
        startDate: string;
        employmentType?: string;
        manager?: string;
      }

      export interface Employee extends EmployeeInput {
        id: string;
        badge?: 'New' | 'Updated';
      }

      export const REQUIRED_EMPLOYEE_FIELDS: (keyof EmployeeInput)[] = [
        'firstName', 'lastName', 'email', 'department', 'jobTitle', 'startDate',
      ];

      export function validateEmployeeInput(input: Partial<EmployeeInput>): (keyof EmployeeInput)[]

      export class EmployeeValidationError extends Error {
        constructor(public fields: (keyof EmployeeInput)[]) {
          super(`Missing required field(s): ${fields.join(', ')}`);
        }
      }
      export class EmployeeAccessDeniedError extends Error {}

      export function createEmployee(
        input: EmployeeInput,
        role: EmployeeRole,
        existingEmployees: Employee[]
      ): Employee

      export function updateEmployee(existing: Employee, input: EmployeeInput): Employee
      ```

      `validateEmployeeInput` returns the subset of `REQUIRED_EMPLOYEE_FIELDS` whose value is
      missing or blank after trimming (mirroring the prototype's own `validateForm`, which only
      checks `input.value.trim() === ''` — it does not validate email *format* despite the input
      having `type="email"`, so this plan does not add format validation either). `createEmployee`
      throws `EmployeeAccessDeniedError` when `role !== 'HR Admin'` (checked before validation, so
      a non-admin submission never reaches the validation-error path), then throws
      `EmployeeValidationError` on any missing required field, otherwise returns a new `Employee`
      with a generated `id` (`EMP-` + one more than the highest existing numeric suffix, defaulting
      to `EMP-1001` when `existingEmployees` is empty) and `badge: 'New'`. `updateEmployee` only
      validates (no role check — AC4 only names "create"; the prototype's Edit Employee screen has
      no access-denied variant, only the same inline-error pattern) and returns the merged record
      with `badge: 'Updated'`.
    files:
      - src/domain/employee.ts
    rationale: |
      AC1/AC2/AC5 are phrased as system-level guarantees ("the employee record is created and
      stored," "the system rejects the submission," "the updated details are persisted") and AC4
      as an authorization guarantee ("the system denies the action") — all four need one
      enforcement point that holds regardless of caller, the same reasoning STORY-009's
      `createDefect` role gate and STORY-011's `changeDefectStatus` used for their domains.
  - description: |
      Add a presentational `EmployeeForm` used for both the Add and Edit screens (the prototype
      gives them an identical field set and validation pattern — first/last name, work email,
      department select, job title, start date, optional employment-type select, optional
      manager). On submit it runs `validateEmployeeInput` itself so an invalid submission never
      calls `onSubmit`, and renders the same per-field error text and error-banner headings the
      prototype shows (`#add-firstName-error` = "First name is required.", etc.; banner heading
      "Couldn't create employee" in add mode / "Couldn't save changes" in edit mode, both with
      "Fix the highlighted field(s) below and try again.").

      Signature:
      ```tsx
      export interface EmployeeFormProps {
        mode: 'add' | 'edit';
        initialValues?: EmployeeInput;
        onSubmit: (input: EmployeeInput) => void;
        onCancel: () => void;
      }

      export function EmployeeForm(props: EmployeeFormProps): JSX.Element
      ```

      Core submit handler:
      ```tsx
      function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const errors = validateEmployeeInput(values);
        setErrorFields(errors);
        if (errors.length > 0) return;
        onSubmit(values);
      }
      ```

      Required fields carry the prototype's `<span class="required-mark">*</span>` marker in
      their label text ("First name *", "Work email *", ...); `employmentType` and `manager` do
      not. Submit button label is "Create employee" in add mode, "Save changes" in edit mode,
      matching the prototype exactly.
    files:
      - src/components/EmployeeForm.tsx
    rationale: |
      AC1 and AC2 are both about what happens on form submission with vs. without all required
      fields — the prototype's Add/Edit Employee screens are the only recorded design for this,
      so the field set, required marks, and per-field/banner error copy come directly from
      `.arc/designs/TEST-REAL-PROJECT-STORY-021-design.html` lines ~573-635 (Add) and ~658-717
      (Edit).
  - description: |
      Add a presentational `EmployeeList` matching the prototype's populated-state table (Employee
      ID / Name / Department / Job title / Start date / Actions columns), rendering one row per
      entry in the `employees` prop, an Edit button per row, and a "+ Add employee" button. A
      just-created or just-edited employee's badge (`'New'` / `'Updated'`) renders as a small chip
      next to their name — the prototype calls this out explicitly as how AC3 and AC5 are made
      "visible at a glance, not just implied" (design HTML comment above the Employee List
      screen). Loading/empty/error list states, the "Simulate list state" control, and the row-
      flash animation are the prototype's own review aids or cosmetic-only additions with no
      AC backing them, so none are implemented here.

      Signature:
      ```tsx
      export interface EmployeeListProps {
        employees: Employee[];
        onAddEmployee: () => void;
        onEditEmployee: (id: string) => void;
      }

      export function EmployeeList(props: EmployeeListProps): JSX.Element
      ```
    files:
      - src/components/EmployeeList.tsx
    rationale: |
      AC3 ("the newly created employee appears in the list") and the visible-update half of AC5
      both require a real rendered table to assert against, not just a data structure — the same
      reasoning STORY-009's plan gave for needing a rendered `DefectForm` to test AC1/AC2.
  - description: |
      Add a small stateful container, `EmployeeManager`, that holds the in-memory `employees`
      array (this repo has no store/API/database layer anywhere yet, so an in-memory list is
      consistent with `createDefect`/`changeDefectStatus` being pure in-memory functions too) and
      which of the three screens (`'list' | 'add' | 'edit'`) is showing. It is the one place that
      decides, for the Add screen, whether to render `EmployeeForm` or the access-denied panel —
      reproducing the prototype's `#add-access-denied` vs `#add-form-wrapper` toggle (design HTML
      lines ~558-565) — based on the `role` prop.

      Signature:
      ```tsx
      export interface EmployeeManagerProps {
        role: EmployeeRole;
        initialEmployees?: Employee[];
      }

      export function EmployeeManager(props: EmployeeManagerProps): JSX.Element
      ```

      Add/edit submit handlers:
      ```tsx
      function handleAdd(input: EmployeeInput) {
        const employee = createEmployee(input, role, employees);
        setEmployees((prev) => [employee, ...prev]);
        setScreen('list');
      }

      function handleEditSubmit(input: EmployeeInput) {
        const existing = employees.find((e) => e.id === editingId);
        if (!existing) return;
        const updated = updateEmployee(existing, input);
        setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        setScreen('list');
      }
      ```

      When `screen === 'add'` and `role !== 'HR Admin'`, it renders the access-denied panel
      ("You don't have permission to create employee records" / "Creating employee records
      requires the HR Admin role." / a "Back to employee list" button) instead of `EmployeeForm`,
      matching the prototype's access-denied copy (design HTML lines ~559-564) minus the
      prototype's dynamic "Your current role is Engineering Manager" sentence, since this plan's
      `EmployeeRole` is a generic `'HR Admin' | 'Manager'` rather than a specific job title — see
      assumptions.
    files:
      - src/components/EmployeeManager.tsx
    rationale: |
      AC1, AC3, AC4, and AC5 all describe an end-to-end flow (submit → list reflects it, or
      submit → denied) that spans the form and the list; something has to own the shared
      `employees` array and screen state, and role is supplied by the caller — the same
      "role/session comes from outside this story" assumption STORY-009's plan made for
      `DefectForm`/`createDefect`.
  - description: |
      Add the test-first specs for the new domain module and each new component, one file per
      production file above.
    files:
      - src/domain/employee.test.ts
      - src/components/EmployeeForm.test.tsx
      - src/components/EmployeeList.test.tsx
      - src/components/EmployeeManager.test.tsx
    rationale: |
      Test-first: every file above is written before its corresponding production file exists, so
      each fails on import/compile first, then on behavior, then passes once the minimal
      implementation described in this plan's other scope items is written.
tests:
  - |
    AC1 — HR Admin creates an employee with all required fields (domain-level, `employee.test.ts`,
    and integration-level, `EmployeeManager.test.tsx`):
    ```ts
    test('AC1: HR Admin creates an employee with all required fields', () => {
      const employee = createEmployee(validInput(), 'HR Admin', []);
      expect(employee).toMatchObject(validInput());
      expect(employee.id).toMatch(/^EMP-\d+$/);
      expect(employee.badge).toBe('New');
    });
    ```
    ```tsx
    test('AC1: HR Admin creates an employee and it appears in the employee list', () => {
      render(<EmployeeManager role="HR Admin" />);
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      fillAddForm();
      fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
      expect(screen.getByText('Jordan Blake')).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `createEmployee` returning a fully-populated `Employee` with a fresh
    `id` and `badge: 'New'` when `role === 'HR Admin'` and every required field is present;
    `EmployeeManager.handleAdd` prepending that result into `employees` state and switching back
    to the `'list'` screen so `EmployeeList` re-renders it.
  - |
    AC2 — a missing required field is rejected with a validation error (domain-level and
    form-level):
    ```ts
    test('AC2: missing required field is rejected with the missing field name', () => {
      const input = { ...validInput(), lastName: '' };
      expect(() => createEmployee(input, 'HR Admin', [])).toThrow(EmployeeValidationError);
    });
    ```
    ```tsx
    test('AC2: submitting with a required field blank shows an inline error and does not call onSubmit', () => {
      const onSubmit = jest.fn();
      render(<EmployeeForm mode="add" onSubmit={onSubmit} onCancel={jest.fn()} />);
      fillRequiredFields();
      fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
      expect(screen.getByText('Last name is required.')).toBeVisible();
      expect(onSubmit).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: `validateEmployeeInput` flagging any blank required field;
    `EmployeeForm.handleSubmit` calling it, storing the returned field list, rendering that
    field's error text, and returning before calling `onSubmit` when the list is non-empty.
  - |
    AC3 — a newly created employee appears in the employee list (component-level,
    `EmployeeList.test.tsx`, plus the AC1 integration test above which exercises the same
    behavior end-to-end):
    ```tsx
    test('AC3: renders every employee passed in, including a newly created one', () => {
      const employees = [priyaFixture(), { ...jordanFixture(), badge: 'New' }];
      render(<EmployeeList employees={employees} onAddEmployee={jest.fn()} onEditEmployee={jest.fn()} />);
      expect(screen.getByText('Jordan Blake')).toBeInTheDocument();
      expect(screen.getByText('Priya Natarajan')).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `EmployeeList` mapping every entry in the `employees` prop to a table
    row rendering `${firstName} ${lastName}`, `department`, `jobTitle`, and `startDate`.
  - |
    AC4 — a non-HR-Admin is denied when attempting to create an employee record (domain-level and
    integration-level):
    ```ts
    test('AC4: a non-HR-Admin cannot create an employee record', () => {
      expect(() => createEmployee(validInput(), 'Manager', [])).toThrow(EmployeeAccessDeniedError);
    });
    ```
    ```tsx
    test('AC4: a non-HR-Admin sees an access-denied panel instead of the add form', () => {
      render(<EmployeeManager role="Manager" />);
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      expect(screen.getByText(/you don't have permission to create employee records/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: `createEmployee` throwing `EmployeeAccessDeniedError` before validation
    when `role !== 'HR Admin'`; `EmployeeManager` rendering the access-denied panel instead of
    `EmployeeForm` on the `'add'` screen under the same condition, so the form (and thus
    `onSubmit`/`createEmployee`) is never reachable by a non-admin through the UI either.
  - |
    AC5 — editing and saving an existing employee persists and reflects the changes
    (domain-level and integration-level):
    ```ts
    test('AC5: editing an existing employee persists the updated fields', () => {
      const existing: Employee = { id: 'EMP-1001', ...validInput(), badge: undefined };
      const updated = updateEmployee(existing, { ...validInput(), jobTitle: 'Senior Support Specialist' });
      expect(updated.jobTitle).toBe('Senior Support Specialist');
      expect(updated.id).toBe('EMP-1001');
      expect(updated.badge).toBe('Updated');
    });
    ```
    ```tsx
    test('AC5: editing an existing employee updates the list', () => {
      render(<EmployeeManager role="HR Admin" initialEmployees={[priyaFixture()]} />);
      fireEvent.click(screen.getByRole('button', { name: /edit/i }));
      fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Senior HR Coordinator' } });
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
      expect(screen.getByText('Senior HR Coordinator')).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `updateEmployee` merging `input` onto `existing`, keeping `id`, setting
    `badge: 'Updated'`; `EmployeeManager.handleEditSubmit` replacing the matching entry in
    `employees` state and returning to the `'list'` screen so the new value renders.
assumptions_or_open_questions:
  - |
    `EmployeeRole` is modeled as `'HR Admin' | 'Manager'`, a simplified stand-in for the
    prototype's role-switcher options ("Priya Natarajan — HR Admin" / "Elena Vasquez —
    Engineering Manager"). AC4 only requires denying "a user who is not an HR Admin," which the
    `role !== 'HR Admin'` check satisfies for any non-admin role value; the exact enumeration of
    non-admin roles is left open since no AC names one besides HR Admin.
  - |
    Because `EmployeeRole` is generic rather than a specific job title, the access-denied panel
    omits the prototype's dynamic second sentence ("Your current role is Engineering Manager")
    and states only "Creating employee records requires the HR Admin role." This is a deliberate,
    small deviation from the prototype's exact copy — flagging it per instructions rather than
    inventing a role-title lookup with no AC or design system backing it.
  - |
    `role` and `existingEmployees`/`initialEmployees` are supplied by the caller (props), the same
    "authentication/session/role resolution happens elsewhere" assumption
    `.arc/plans/run_1aa1e0098f54/plan.md` made for `DefectForm`/`createDefect` — this story does
    not implement login, session, or a real backend.
  - |
    No persistence/store/API layer is introduced. `EmployeeManager` holds `employees` in React
    state exactly as `EmployeeForm`'s existing sibling `DefectForm` holds no list at all and the
    whole defect domain has no store — consistent with this repo's current in-memory-only
    convention. "Stored in the system" (AC1) and "persisted" (AC5) are satisfied at this layer;
    wiring to a real backend is left to a future story, same as the defect domain's
    create/transition functions today.
  - |
    The prototype's reviewer-only chrome and cosmetic-only additions are explicitly excluded as
    out of scope for these 5 ACs: the top app bar/role-switcher control, the nav sidebar and its
    disabled "Settings" placeholder, the "Simulate list state" preview toggle and its
    loading/empty/error table states, the toast notifications on create/save, the row-flash
    animation, and the "Fill with sample data" button — none are required by any AC, and several
    (loading/error states, toasts) would require inventing async/network behavior no AC
    describes. The design HTML itself labels the state-preview toggle and sample-data button as
    review aids "not part of the shipped UI."
  - |
    Email format is not validated beyond non-blank, matching the prototype's own `validateForm`,
    which only checks `.value.trim() === ''` for every required field including email despite the
    input's `type="email"`. No AC asks for format validation, so none is added.
  - |
    The employee list starts empty (`initialEmployees` defaults to `[]`) rather than seeded with
    the prototype's three fixture rows (Priya Natarajan, Marcus Webb, Sofia Reyes) — those are
    prototype review fixtures, not a stated requirement of any AC. `EmployeeManager` accepts an
    optional `initialEmployees` prop so a future story can wire in real seed/fetched data without
    changing this component's shape.
  - |
    The table's `startDate` cell renders the raw `YYYY-MM-DD` value rather than the prototype's
    formatted "Mar 6, 2023" style; no AC specifies a date display format, and adding a formatting
    helper with no test requiring it would be speculative. Flagging this as a design-vs-AC gap
    the reviewer may want addressed in a follow-up.
  - |
    AC4's denial is scoped to the *create* action only, per its literal wording ("attempt to
    create a new employee record"); editing is not role-gated because no AC requires it and the
    prototype's Edit Employee screen has no access-denied variant (only `#add-access-denied`
    exists in the design HTML, no `#edit-access-denied`).
package_dependencies: []
notes: |
  This is a new, self-contained bounded context and does not import from or modify
  `src/domain/defect.ts`, `src/domain/roles.ts`, or `src/components/DefectForm.tsx` — those keep
  their own `Role` (`Admin | Reporter | Developer`) for the unrelated defect tracker. All new
  files are additive.

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000

    EM["EmployeeManager.tsx (new)<br/>owns employees[] + screen state"]:::touched
    EF["EmployeeForm.tsx (new)<br/>add/edit fields + inline validation"]:::touched
    EL["EmployeeList.tsx (new)<br/>table + Add/Edit buttons"]:::touched
    ED["employee.ts (new)<br/>validateEmployeeInput / createEmployee / updateEmployee"]:::touched

    EL -->|"onAddEmployee() / onEditEmployee(id) — user picked an action"| EM
    EM -->|"renders with employees + callbacks"| EL
    EM -->|"renders when screen='add'/'edit'"| EF
    EF -->|"onSubmit(input) on valid submit"| EM
    EF -->|"validateEmployeeInput(values) for inline errors (AC2)"| ED
    EM -->|"createEmployee(input, role, employees) (AC1/AC4)"| ED
    EM -->|"updateEmployee(existing, input) (AC5)"| ED
  ```

  Why validation runs in both `EmployeeForm` (for inline per-field errors, AC2) and again inside
  `createEmployee`/`updateEmployee` (for AC1/AC2/AC5 at the domain level): this duplicates the
  belt-and-suspenders pattern `.arc/plans/run_1aa1e0098f54/plan.md` used for the assignee-role
  gate — the UI hiding/blocking an invalid or unauthorized submission is not itself proof that the
  record-creation boundary enforces the same rule for any other caller, so both layers assert it
  independently and are tested independently.
