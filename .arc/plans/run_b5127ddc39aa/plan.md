summary: |
  This repository is currently an empty scaffold (only a README and a .env
  declaring ARC_DEV_PORT=8008 / ARC_WEB_PORT=3008 — implying a separate
  backend API dev server and frontend dev server). This plan bootstraps the
  minimal vertical slice needed to satisfy TEST-REAL-PROJECT-STORY-008: a
  defect creation form (React) that displays every field required to create
  a defect, blocks submission with a visible per-field error when a required
  field is empty, and — on a valid submission — creates a defect record via
  a small Express API that unconditionally sets status to 'New' (never a
  draft/intermediate status). Role-based field visibility (mentioned in the
  parent epic) is explicitly out of scope for this story and is left for a
  follow-up story. No persistence layer exists yet, so an in-memory
  repository is used as the minimal correct implementation for "a defect
  record is created" — swapping it for real persistence later does not
  change the form, validation, or status-forcing behavior this story is
  responsible for.
scope:
  - description: |
      Add npm workspace scaffolding: root `package.json` with
      `"workspaces": ["server", "web"]`, and one `package.json` each for
      `server/` (Express API) and `web/` (Vite + React app). This is the
      first code in the repo, so the tooling setup itself is in-scope, not
      speculative.
    files:
      - package.json
      - server/package.json
      - web/package.json
      - web/vite.config.js
      - web/index.html
      - web/src/main.jsx
    rationale: |
      Nothing exists yet to run tests or serve the form against; this is the
      minimal harness needed before any failing test can even execute.
  - description: |
      Backend defect creation path: a shared validation function, a service
      that forces status to `'New'`, an in-memory repository, and an Express
      route wiring them together.

      Signatures:
      ```js
      // server/src/validation/validateDefectInput.js
      export const REQUIRED_DEFECT_FIELDS = ['title', 'description', 'severity', 'priority'];
      export function validateDefectInput(input) {
        // returns { valid: boolean, errors: { [field]: string } }
      }

      // server/src/services/defectService.js
      export function createDefect(input) {
        // throws { name: 'ValidationError', errors } when invalid
        // otherwise returns the saved defect with status forced to 'New'
      }

      // server/src/repositories/defectRepository.js
      export function save(defect) { /* pushes to in-memory array, returns defect */ }
      export function findAll() { /* returns all saved defects, for tests */ }
      ```
    files:
      - server/src/validation/validateDefectInput.js
      - server/src/services/defectService.js
      - server/src/repositories/defectRepository.js
      - server/src/routes/defects.js
      - server/src/app.js
      - server/src/index.js
    rationale: |
      AC3 requires the created record to have status 'New' immediately with
      no intermediate status — the safest way to guarantee that is to make
      `createDefect` the single place a defect object is constructed, and to
      never accept a client-supplied `status` field at all (it's not read
      from `input`). AC2 requires a blocked submission with a validation
      error, which the route surfaces as a 400 with a field-keyed error map.
  - description: |
      Frontend defect creation form: a controlled React component rendering
      inputs for every required field, client-side validation that blocks
      the API call and shows an inline error per missing field, and a thin
      API client for the POST call.

      Signature:
      ```jsx
      // web/src/components/DefectForm.jsx
      export function DefectForm({ onSubmitSuccess }) { /* ... */ }

      // web/src/api/defectsApi.js
      export async function createDefect(payload) {
        // POST to `${API_BASE_URL}/api/defects`, returns parsed JSON or throws with .errors
      }
      ```
    files:
      - web/src/components/DefectForm.jsx
      - web/src/api/defectsApi.js
      - web/src/App.jsx
    rationale: |
      AC1 and AC2 are form-level UI concerns; AC3's "submitted immediately as
      New" is verified end-to-end by the form calling the real API and
      trusting the server's forced status (no client-side status field is
      ever sent or displayed as editable).
  - description: |
      Test harness config so `vitest` can run both server (node
      environment, using `supertest`) and web (jsdom environment, using
      `@testing-library/react`) suites.
    files:
      - server/vitest.config.js
      - web/vitest.config.js
      - web/vitest.setup.js
    rationale: |
      The two workspaces need different test environments (`node` vs
      `jsdom`), so each gets its own minimal vitest config rather than one
      shared config with conditional logic.
tests:
  - |
    AC1 — failing test first (`web/src/components/DefectForm.test.jsx`):
    ```jsx
    test('renders a field for every piece of information required to create a defect', () => {
      render(<DefectForm onSubmitSuccess={() => {}} />);
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/severity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
    ```
    Minimal code to pass: `DefectForm.jsx` renders labeled `<input>`/`<select>`
    elements for `title`, `description`, `severity`, `priority` plus a submit
    button. No validation or submit logic needed yet.
  - |
    AC2 — failing test first (`web/src/components/DefectForm.test.jsx`):
    ```jsx
    test('blocks submission and shows a validation error when title is left empty', async () => {
      const onSubmitSuccess = vi.fn();
      render(<DefectForm onSubmitSuccess={onSubmitSuccess} />);
      await userEvent.type(screen.getByLabelText(/description/i), 'Cannot log in');
      await userEvent.selectOptions(screen.getByLabelText(/severity/i), 'High');
      await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'High');
      await userEvent.click(screen.getByRole('button', { name: /submit/i }));
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(onSubmitSuccess).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: `DefectForm` tracks per-field error state, runs a
    required-field check on submit before calling the API, renders the error
    text next to the empty field, and returns early (no `fetch`/`onSubmitSuccess`
    call) when any required field is blank.

    Companion backend failing test first (`server/test/validateDefectInput.test.js`),
    since the server must independently reject the same case (never trust the
    client alone):
    ```js
    test('reports an error for each missing required field', () => {
      const { valid, errors } = validateDefectInput({
        title: '', description: 'd', severity: '', priority: 'Low',
      });
      expect(valid).toBe(false);
      expect(errors.title).toMatch(/required/i);
      expect(errors.severity).toMatch(/required/i);
    });
    ```
  - |
    AC3 — failing test first (`server/test/defectService.test.js`), proving
    the created record is 'New' and that a client cannot smuggle in a
    different status:
    ```js
    test('createDefect always sets status to New, ignoring any client-supplied status', () => {
      const defect = createDefect({
        title: 'Login fails', description: 'Cannot log in with valid creds',
        severity: 'High', priority: 'High', status: 'Draft',
      });
      expect(defect.status).toBe('New');
      expect(defect.id).toBeDefined();
    });
    ```
    Minimal code to pass: `createDefect` validates via `validateDefectInput`,
    then builds a new defect object that only copies `title`, `description`,
    `severity`, `priority` from `input` and hardcodes `status: 'New'` (never
    reads `input.status`).

    Companion end-to-end failing test first (`server/test/defects.routes.test.js`):
    ```js
    test('POST /api/defects creates a defect with status New immediately', async () => {
      const res = await request(app).post('/api/defects').send({
        title: 'Login fails', description: 'Cannot log in with valid creds',
        severity: 'High', priority: 'High',
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('New');
    });
    ```
    Minimal code to pass: `routes/defects.js` POST handler calls
    `createDefect(req.body)`, returns 201 with the created defect on success,
    and returns 400 with `{ errors }` when `createDefect` throws a
    `ValidationError`.
assumptions_or_open_questions:
  - |
    The story gives no concrete list of "all information required to create
    a defect." I assumed four required fields: `title`, `description`,
    `severity`, `priority` (each a plain required input/select). This should
    be confirmed against the actual defect data model when one exists —
    if the real model has more/fewer required fields, the field list in
    `DefectForm.jsx` and `REQUIRED_DEFECT_FIELDS` should be updated together.
  - |
    No persistence layer (database) exists in the repo yet. I used a plain
    in-memory array (`defectRepository.js`) as the minimal correct
    implementation of "a defect record is created." This will need to be
    swapped for real persistence in a later story; that swap should not
    require changes to `defectService.createDefect`'s contract.
  - |
    No frontend/backend framework choice was dictated by any existing code
    (the repo was empty). I chose Express for the API and React+Vite for the
    form as a conventional, low-ceremony pairing that matches the two ports
    already declared in `.env` (8008 for the API dev server, 3008 for the
    web dev server). If the team has a different intended stack, this plan's
    `scope` and `package_dependencies` should be revised before implementation.
  - |
    Client-side and server-side required-field validation are implemented
    as two separate, small checks (not a shared library) to avoid adding
    cross-workspace build tooling for a 4-field check. The server's
    `validateDefectInput` is the authoritative one exercised by AC3's
    "no intermediate status" guarantee; the client's check exists only to
    satisfy AC2's immediate inline error without a round-trip.
  - |
    Authentication/role context is out of scope for this story per the
    epic's own split (role-based field visibility is called out separately
    from this story's ACs), so the form is implemented with no auth guard
    and no role-conditional fields.
package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: Minimal HTTP framework for the POST /api/defects endpoint that creates the defect and forces status 'New'.
  - name: cors
    version: ^2.8.5
    ecosystem: npm
    rationale: The web dev server (port 3008) and API dev server (port 8008) run on different origins; the form's fetch call needs the API to allow cross-origin requests in dev.
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: UI library for the controlled DefectForm component required by AC1/AC2.
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: DOM renderer required alongside react to mount DefectForm/App.
  - name: vite
    version: ^5.4.0
    ecosystem: npm
    rationale: Dev server and bundler for the web workspace, matching the ARC_WEB_PORT already declared in .env.
  - name: "@vitejs/plugin-react"
    version: ^4.3.1
    ecosystem: npm
    rationale: JSX/Fast-Refresh support for React components under Vite.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for both the server (node env) and web (jsdom env) failing-test-first suites in this plan.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: HTTP-level assertions against the Express app for the POST /api/defects route test (AC3).
  - name: "@testing-library/react"
    version: ^16.0.0
    ecosystem: npm
    rationale: Render and query DefectForm in the AC1/AC2 component tests.
  - name: "@testing-library/jest-dom"
    version: ^6.4.8
    ecosystem: npm
    rationale: DOM matchers (toBeInTheDocument, etc.) used in the DefectForm tests.
  - name: "@testing-library/user-event"
    version: ^14.5.2
    ecosystem: npm
    rationale: Simulates typing/selecting/clicking in the AC2 blocked-submission test.
  - name: jsdom
    version: ^24.1.1
    ecosystem: npm
    rationale: DOM environment required by vitest to run the web workspace's component tests.
notes: |
  The codebase had zero existing files besides README.md and .env before
  this plan, so every file listed under `scope` is new — there is no prior
  convention to mirror. The `.env` values `ARC_DEV_PORT=8008` and
  `ARC_WEB_PORT=3008` are the only concrete hints about intended shape
  (separate API/web dev servers), which is why the plan splits into
  `server/` and `web/` npm workspaces rather than a single combined app.

  Because this plan introduces 3+ new files that cross a layer boundary
  (UI form -> API client -> HTTP route -> service -> repository), here is
  the call graph this scope creates:

  ```mermaid
  flowchart TD
    App[App.jsx] -->|mounts| DefectForm[DefectForm.jsx]
    DefectForm -->|"on valid submit"| DefectsApi[defectsApi.js]
    DefectsApi -->|"POST /api/defects"| DefectsRoute[routes/defects.js]
    DefectsRoute -->|"createDefect(body)"| DefectService[services/defectService.js]
    DefectService -->|"validateDefectInput(input)"| Validation[validation/validateDefectInput.js]
    DefectService -->|"save(defect) w/ status forced to New"| DefectRepository[repositories/defectRepository.js]

    classDef touched fill:#f96,color:#000
    class App,DefectForm,DefectsApi,DefectsRoute,DefectService,Validation,DefectRepository touched
  ```

  Every node above is new (this is a from-scratch slice), but the diagram
  still shows the intended layering: the route never builds a defect object
  itself, and only `defectService.createDefect` is allowed to decide the
  status value — this is the single choke point that guarantees AC3 (no
  intermediate/draft status ever exists, even transiently).
