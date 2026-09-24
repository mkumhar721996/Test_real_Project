summary: |
  AC1 (create with valid data) and AC2 (blank-required-field validation) are already implemented
  and passing today in `src/domain/employee.ts`, `src/components/EmployeeForm.tsx`, and
  `src/components/EmployeeManager.tsx` (see `src/components/EmployeeManager.test.tsx` lines 28-44
  and `src/components/EmployeeForm.test.tsx` lines 16-44). What is missing is AC3: there is no
  "Employee Detail" screen anywhere in the codebase, and `EmployeeList` only exposes an "Edit"
  row action, never a way to view a record's full details. The approved prototype at
  `.arc/designs/TEST-REAL-PROJECT-STORY-022-design.html` adds exactly this screen (`data-name="Employee
  Detail"`, lines 804-848, styled by `.detail-card`/`.detail-grid`/`.detail-header`/`.detail-avatar`,
  lines 496-542) and a "View" action per row in the Employee List (line 926). This plan closes that
  gap test-first: it adds a `createdAt` timestamp to the `Employee` domain record (needed for the
  design's "Record created" field), a new `EmployeeDetail` presentational component matching the
  prototype's detail screen, a "View" action on `EmployeeList`, and the `EmployeeManager` wiring
  (a `'view'` screen state) that connects them — so an HR Admin can open any row, including one
  just created, and see its entered details rendered accurately.
scope:
  - description: |
      Add an optional `createdAt` timestamp to the `Employee` record and stamp it inside
      `createEmployee`, so every newly created employee carries the "Record created" value the
      detail screen (prototype lines 840-842, `<dt>Record created</dt><dd id="detail-createdAt">`)
      needs to display. Kept optional (not required) so existing fixtures across
      `EmployeeList.test.tsx` / `EmployeeManager.test.tsx` that predate this field keep compiling
      unchanged.

      Before → after:
      ```ts
      // before
      export interface Employee extends EmployeeInput {
        id: string;
        badge?: 'New' | 'Updated';
      }

      // after
      export interface Employee extends EmployeeInput {
        id: string;
        badge?: 'New' | 'Updated';
        createdAt?: string;
      }
      ```
      `createEmployee` changes from
      `return { ...input, id: nextEmployeeId(existingEmployees), badge: 'New' };`
      to
      `return { ...input, id: nextEmployeeId(existingEmployees), badge: 'New', createdAt: new Date().toISOString() };`.
      `updateEmployee` is untouched — its `{ ...existing, ...input, badge: 'Updated' }` spread
      already carries the original `createdAt` through unchanged.
    files:
      - src/domain/employee.ts
      - src/domain/employee.test.ts
    rationale: |
      AC3 requires the detail view to show "the entered employee details ... accurately," and the
      approved design's detail screen includes a "Record created" field sourced from
      `emp.createdAt` (design lines 909-911, 945). No such field exists on `Employee` today.
  - description: |
      Add a new presentational `EmployeeDetail` component that renders the design's Employee
      Detail screen: a breadcrumb back-link, a `.detail-card` with a `.detail-header` (initials
      avatar + name heading + employee ID subtitle) and a `.detail-grid` definition list showing
      Work email, Department, Job title, Employment type, Start date, Manager (falling back to the
      literal text "Not set" when blank, exactly as the prototype's `openDetail()` does at design
      line 944: `emp.manager && emp.manager.trim() !== '' ? emp.manager : 'Not set'`), and a
      full-width "Record created" row, plus a "Back to employee list" button
      (`.btn.btn-secondary`, design line 845).

      Signature:
      ```tsx
      export interface EmployeeDetailProps {
        employee: Employee;
        onBack: () => void;
      }

      export function EmployeeDetail({ employee, onBack }: EmployeeDetailProps): JSX.Element
      ```
    files:
      - src/components/EmployeeDetail.tsx
      - src/components/EmployeeDetail.test.tsx
    rationale: |
      This is the screen AC3 requires and that the approved design depicts
      (`data-name="Employee Detail"`, design lines 804-848) but that does not exist in the
      codebase in any form today.
  - description: |
      Add a "View" action to each `EmployeeList` row, matching the prototype's row-actions button
      (design line 926: `<button ... onclick="openDetail('${emp.id}')">View</button>`). The
      existing "Edit" action predates this story's acceptance criteria (there is no edit AC here,
      and the prototype's row-actions column shows only "View") and is left in place unchanged
      since removing already-shipped, separately-tested functionality is out of scope for this
      plan — see the "Edit stays" note under assumptions.

      Prop change:
      ```ts
      // before
      export interface EmployeeListProps {
        employees: Employee[];
        onAddEmployee: () => void;
        onEditEmployee: (id: string) => void;
      }

      // after
      export interface EmployeeListProps {
        employees: Employee[];
        onAddEmployee: () => void;
        onEditEmployee: (id: string) => void;
        onViewEmployee: (id: string) => void;
      }
      ```
      The `.row-actions` cell renders a "View" button ahead of the existing "Edit" button, each
      calling its respective callback with `employee.id`.
    files:
      - src/components/EmployeeList.tsx
      - src/components/EmployeeList.test.tsx
    rationale: |
      AC3's "WHEN the HR Admin views that employee record" needs an explicit entry point from the
      list into the detail screen; the design places that entry point on every row as a "View"
      button (design lines 636-642 note it explicitly: "Each row has a 'View' action that opens
      the Employee Detail screen (AC3)").
  - description: |
      Wire `EmployeeDetail` into `EmployeeManager`: add a `'view'` value to the internal `Screen`
      union alongside a `viewingId` state field, a `handleView` setter passed to `EmployeeList` as
      `onViewEmployee`, and a render branch that looks the employee up by id and renders
      `<EmployeeDetail employee={...} onBack={() => setScreen('list')} />`.

      Before → after of the `Screen` type and render branching:
      ```ts
      // before
      type Screen = 'list' | 'add' | 'edit';

      // after
      type Screen = 'list' | 'add' | 'edit' | 'view';
      ```
      New branch (mirrors the existing `editingEmployee` lookup pattern already in the file):
      ```tsx
      const viewingEmployee = screen === 'view' ? employees.find((e) => e.id === viewingId) : undefined;
      if (viewingEmployee) {
        return <EmployeeDetail employee={viewingEmployee} onBack={() => setScreen('list')} />;
      }
      ```
    files:
      - src/components/EmployeeManager.tsx
      - src/components/EmployeeManager.test.tsx
    rationale: |
      `EmployeeManager` is the only component that owns the `employees` list and screen
      navigation state, so it is the natural place to resolve "which employee is being viewed" by
      id and hand the resolved record to the new presentational `EmployeeDetail` component — the
      same pattern already used for `'edit'`.
tests:
  - |
    AC1 is already implemented and passing — no new test is needed. Evidence:
    `src/components/EmployeeManager.test.tsx:28-34` ("AC1: HR Admin creates an employee and it
    appears in the employee list") and `src/components/EmployeeForm.test.tsx:16-32` ("AC1:
    submitting with every required field filled calls onSubmit with the entered values") both
    exercise the full create flow against the currently-shipped code and pass today.
  - |
    AC2 is already implemented and passing — no new test is needed. Evidence:
    `src/components/EmployeeManager.test.tsx:36-44` ("AC2: submitting the add form with a required
    field blank keeps the HR Admin on the form") asserts both the visible field error
    (`expect(screen.getByText('Last name is required.')).toBeVisible();`) and that no record was
    created (`expect(screen.queryByText('Jordan Blake')).not.toBeInTheDocument();`);
    `src/components/EmployeeForm.test.tsx:34-44` covers the same at the form-component level.
  - |
    AC3 has no coverage today and is the actual scope of this plan. New failing tests, in TDD
    order (domain timestamp first, then the new component, then the list entry point, then the
    manager wiring that ties them together):

    1. `src/domain/employee.test.ts` — the timestamp the detail screen depends on:
    ```ts
    test('AC3: createEmployee stamps a createdAt timestamp used by the detail view', () => {
      const before = Date.now();
      const employee = createEmployee(validInput(), 'HR Admin', []);
      expect(typeof employee.createdAt).toBe('string');
      expect(new Date(employee.createdAt as string).getTime()).toBeGreaterThanOrEqual(before);
    });
    ```
    Fails today because `createEmployee` never sets `createdAt`.

    2. `src/components/EmployeeDetail.test.tsx` (new file) — the detail screen itself:
    ```tsx
    import { render, screen, fireEvent } from '@testing-library/react';
    import { EmployeeDetail } from './EmployeeDetail';
    import { Employee } from '../domain/employee';

    function jordanFixture(): Employee {
      return {
        id: 'EMP-1004',
        firstName: 'Jordan',
        lastName: 'Blake',
        email: 'jordan.blake@peoplehub.com',
        department: 'Customer Success',
        jobTitle: 'Support Specialist',
        startDate: '2026-09-21',
        employmentType: 'Full-time',
        manager: 'Dana Okafor',
        createdAt: '2026-09-21T10:00:00.000Z',
        badge: 'New',
      };
    }

    test('AC3: displays every entered employee detail accurately', () => {
      render(<EmployeeDetail employee={jordanFixture()} onBack={jest.fn()} />);
      expect(screen.getByRole('heading', { name: 'Jordan Blake' })).toBeInTheDocument();
      expect(screen.getByText('EMP-1004')).toBeInTheDocument();
      expect(screen.getByText('jordan.blake@peoplehub.com')).toBeInTheDocument();
      expect(screen.getByText('Customer Success')).toBeInTheDocument();
      expect(screen.getByText('Support Specialist')).toBeInTheDocument();
      expect(screen.getByText('Full-time')).toBeInTheDocument();
      expect(screen.getByText('Dana Okafor')).toBeInTheDocument();
    });

    test('AC3: shows "Not set" when the optional manager field was left blank', () => {
      render(<EmployeeDetail employee={{ ...jordanFixture(), manager: '' }} onBack={jest.fn()} />);
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    test('calls onBack when "Back to employee list" is clicked', () => {
      const onBack = jest.fn();
      render(<EmployeeDetail employee={jordanFixture()} onBack={onBack} />);
      fireEvent.click(screen.getByRole('button', { name: /back to employee list/i }));
      expect(onBack).toHaveBeenCalled();
    });
    ```
    Fails today because the `EmployeeDetail` module does not exist.

    3. `src/components/EmployeeList.test.tsx` — the new "View" entry point:
    ```tsx
    test('calls onViewEmployee with the row id when View is clicked', () => {
      const onViewEmployee = jest.fn();
      render(
        <EmployeeList
          employees={[priyaFixture()]}
          onAddEmployee={jest.fn()}
          onEditEmployee={jest.fn()}
          onViewEmployee={onViewEmployee}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'View' }));
      expect(onViewEmployee).toHaveBeenCalledWith('EMP-1001');
    });
    ```
    Fails today both to compile (missing required prop) and to find a "View" button.

    4. `src/components/EmployeeManager.test.tsx` — the end-to-end AC3 flow, deliberately reusing
    the create flow from the already-passing AC1 test so the same session that creates a record
    is the one that views it:
    ```tsx
    test('AC3: viewing a created employee from the list shows its accurately entered details', () => {
      render(<EmployeeManager role="HR Admin" />);
      fireEvent.click(screen.getByRole('button', { name: /add employee/i }));
      fillAddForm();
      fireEvent.click(screen.getByRole('button', { name: /create employee/i }));
      fireEvent.click(screen.getByRole('button', { name: 'View' }));
      expect(screen.getByRole('heading', { name: 'Jordan Blake' })).toBeInTheDocument();
      expect(screen.getByText('jordan.blake@peoplehub.com')).toBeInTheDocument();
      expect(screen.getByText('Support Specialist')).toBeInTheDocument();
    });
    ```
    Fails today because there is no "View" button to click and no `'view'` screen to assert
    against.
assumptions_or_open_questions:
  - |
    Design/AC conflict, flagged rather than silently resolved: the prototype's HTML comment above
    the Employee Detail screen (design lines 796-802) claims it is reached "automatically after a
    successful create," but the prototype's own executable submit handler (design lines
    1024-1034) does the opposite — it calls `goToScreen('Employee List')`, flashes the new row,
    and shows a toast, never `openDetail()`. AC1 itself only requires the record to "appear in the
    employee list," which matches the executable behavior, not the comment. This plan follows the
    executable behavior and AC1's wording: after create, the HR Admin lands back on the list and
    must click "View" to reach the detail screen (exercised together in the AC3
    `EmployeeManager.test.tsx` test above). Please confirm this reading is correct, or say if the
    detail screen should open automatically post-create instead.
  - |
    The prototype's Add Employee submit flow also shows a confirmation toast (`#toast`, design
    lines 854-860, 1033) and a `row-flash` animation on the newly-created row (design lines
    365-374, 913, 1032) — neither is required by AC1's wording ("a new employee record is created
    and appears in the employee list") and both are already satisfiable without them per the
    passing `EmployeeManager.test.tsx` AC1 test. To keep this plan strictly scoped to the three
    stated acceptance criteria, neither is included here. Flagging in case the reviewer wants
    these cosmetic confirmations pulled into scope as a follow-up.
  - |
    The existing "Edit" row action and edit screen in `EmployeeList`/`EmployeeManager` (not part
    of any of this story's three ACs) are left in place unchanged. The approved design's Employee
    List row only shows a "View" button, not "Edit," but since edit is already shipped,
    independently tested functionality, removing it is treated as out of scope for a plan whose
    job is to implement TEST-REAL-PROJECT-STORY-022's stated ACs, not to prune prior work.
  - |
    `createdAt` is stored as `Date.toISOString()` (matching the prototype's fixture data format,
    design lines 588, 601, 614) and rendered as-is by `EmployeeDetail` rather than reformatted
    with `toLocaleString`, since no locale/timezone formatting utility exists anywhere in the
    codebase yet and introducing one is not needed to satisfy AC3's "displayed accurately."
  - |
    The detail avatar's initials (design line 936:
    `(emp.firstName[0] + emp.lastName[0]).toUpperCase()`) and the `.detail-avatar` circle are
    purely decorative per the design and are included in `EmployeeDetail` since they cost nothing
    extra beyond the component already being built, but no test asserts their exact text — only
    the substantive fields (email, department, job title, etc.) are asserted, matching AC3's focus
    on "entered employee details."
package_dependencies: []
notes: |
  This plan touches four files across two layers (the domain module and three components), with
  `EmployeeList` calling back up into `EmployeeManager` and `EmployeeManager` composing the new
  `EmployeeDetail` alongside the existing `EmployeeForm`/`EmployeeList`, so a diagram earns its
  place here:

  ```mermaid
  flowchart TD
    domain["src/domain/employee.ts<br/>createEmployee: now stamps createdAt"]
    manager["src/components/EmployeeManager.tsx<br/>+ 'view' screen, viewingId state"]
    list["src/components/EmployeeList.tsx<br/>+ onViewEmployee / 'View' button"]
    form["src/components/EmployeeForm.tsx<br/>(untouched)"]
    detail["src/components/EmployeeDetail.tsx<br/>(new)"]

    manager -->|"createEmployee(input, role, employees)"| domain
    manager -->|"renders, mode='add'|'edit'"| form
    manager -->|"renders employees, onViewEmployee"| list
    list -->|"onViewEmployee(id)"| manager
    manager -->|"renders employee=lookup(viewingId)"| detail
    detail -->|"onBack()"| manager

    classDef touched fill:#f96,color:#000
    classDef new fill:#2563eb,color:#fff
    class domain,manager,list touched
    class detail new
  ```

  Why the lookup lives in `EmployeeManager` rather than `EmployeeList` or `EmployeeDetail`: it is
  the sole owner of the `employees` array and the existing `'edit'` screen already resolves
  `editingEmployee` the same way (`employees.find((e) => e.id === editingId)`), so `'view'` mirrors
  an established pattern in this file rather than introducing a new one.

  Design fidelity check performed against
  `.arc/designs/TEST-REAL-PROJECT-STORY-022-design.html`: read in full (1046 lines). The Employee
  List (lines 643-703), Add Employee (lines 716-793), and Employee Detail (lines 804-848) screens
  were all inspected; class names (`.detail-card`, `.detail-grid`, `.detail-header`,
  `.detail-avatar`, `.row-actions`) and the `Not set` manager fallback and `openDetail()` field
  mapping were taken directly from the prototype's markup/script rather than invented. The two
  design/AC tensions found (auto-navigation-to-detail claim vs. actual script behavior; toast/flash
  as unrequired-by-AC embellishments) are called out explicitly above rather than silently resolved
  one way.
