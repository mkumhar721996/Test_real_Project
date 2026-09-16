summary: |
  This repository currently contains no code at all (just a README), so this plan both
  bootstraps a minimal backend and implements role-scoped defect-list visibility on top of it.
  Since no domain model, framework, or auth system exists yet, the plan stands up a small
  Node.js service with an in-memory defect store, and centers the actual permission
  logic in one pure function, `getVisibleDefects(user, defects)`, that decides what a Reporter,
  Developer, or Admin may see — including every empty-state case from the acceptance criteria —
  before wiring it into a thin `GET /defects` route. The plan is test-first: each acceptance
  criterion becomes a unit test against the pure filtering function (fast, precise
  assertions on exactly which defects come back) backed by a route test that pins the
  exact JSON response shape, so no count, label, or message can ever leak the existence of
  defects outside a role's permitted scope.

  ACTUAL IMPLEMENTATION NOTE: the original draft of this plan specified Node.js + TypeScript +
  Express + Vitest + supertest. The execution sandbox this story was implemented in has no
  outbound access to the npm registry (verified: direct requests and requests through the
  configured proxy to registry.npmjs.org both return `403 Forbidden`; no local mirror/cache is
  configured), so none of those packages, nor their type definitions, could be installed. The
  implementation below instead uses only Node.js 22's built-ins — `node:http` in place of
  Express, plain JavaScript with JSDoc type annotations in place of TypeScript, and `node:test`
  + `node:assert` in place of Vitest, and the global `fetch` in place of supertest — to deliver
  the identical architecture (domain / services / repositories / middleware / routes) and the
  same test coverage with zero external dependencies. `package.json` has no `dependencies` or
  `devDependencies` as a result. If the target deployment environment has registry access and a
  different stack is truly required, that stack can be substituted in without changing the
  `getVisibleDefects` contract or the route's JSON response shape.

scope:
  - description: |
      Bootstrap a minimal Node.js project: package manifest with a `test` script that runs
      Node's built-in test runner. Nothing else in the repo builds or runs tests today, so this
      is a prerequisite for any TDD work. (No `tsconfig.json`/`vitest.config.ts`: the npm
      registry is unreachable from the execution sandbox, so TypeScript and Vitest could not be
      installed — see the summary's "ACTUAL IMPLEMENTATION NOTE".)
    files:
      - package.json
    rationale: |
      There is no `package.json`, build tooling, or test runner anywhere in the repo. TDD
      requires a runnable test command (`npm test`, backed by `node --test`) before the first
      failing test can be written.

  - description: |
      Define the domain shapes shared by every role-scoping rule: `Role`, `User`, and `Defect`,
      documented via JSDoc typedefs (no TypeScript compiler available).
    files:
      - src/domain/roles.js
      - src/domain/user.js
      - src/domain/defect.js
    rationale: |
      The visibility rules in the ACs (submitter, assignee, unassigned, role) all hinge on a
      small, explicit shape. Example:
      ```js
      /** @typedef {'reporter' | 'developer' | 'admin'} Role */

      /**
       * @typedef {Object} Defect
       * @property {string} id
       * @property {string} title
       * @property {string} submittedBy - user id of the reporter who filed it
       * @property {string | null} assignedTo - user id of the developer, or null if unassigned
       * @property {string} status
       */
      ```

  - description: |
      Implement `getVisibleDefects(user, allDefects)`, the pure function that enforces ACs 1–6.
    files:
      - src/services/defectVisibility.js
      - test/services/defectVisibility.test.js
    rationale: |
      Keeping the actual permission decision in one pure, framework-free function makes it
      exhaustively testable with plain object arrays and immune to accidental leakage through
      HTTP/serialization concerns. Signature:
      ```js
      export function getVisibleDefects(user, allDefects) {
        switch (user.role) {
          case 'admin':
            return allDefects;
          case 'reporter':
            return allDefects.filter(d => d.submittedBy === user.id);
          case 'developer':
            return allDefects.filter(d => d.assignedTo === user.id);
        }
      }
      ```

  - description: |
      Add an in-memory `DefectRepository` with `findAll()` and a test-only `seed()`/`clear()`
      pair, since there is no database or persistence layer in the project yet.
    files:
      - src/repositories/defectRepository.js
    rationale: |
      The route needs a source of "all defects" to hand to `getVisibleDefects`. An in-memory
      store is the minimal thing that satisfies the ACs without deciding a database technology
      that hasn't been chosen anywhere else in the codebase.

  - description: |
      Add a minimal identity resolution middleware that resolves the authenticated user from a
      trusted request header (`x-user-id`), plus an in-memory `UserRepository`.
    files:
      - src/middleware/auth.js
      - src/repositories/userRepository.js
    rationale: |
      The ACs assume "a Reporter/Developer/Admin is authenticated," but no login, session, or
      token system exists anywhere in the repo, and building one is not in scope for this
      story. This middleware is an explicit stand-in for "there is an authenticated user with a
      role" so the visibility rule can be tested end-to-end; it is not a real auth
      implementation (see assumptions).

  - description: |
      Wire a thin `GET /defects` route that resolves the authenticated user, loads all defects,
      calls `getVisibleDefects`, and returns `{ defects, count }` — never a total or any other
      field.
    files:
      - src/routes/defects.js
      - src/app.js
      - src/server.js
    rationale: |
      This is the boundary where "list or count" leakage (ACs 1, 2, 4, 5) would actually
      manifest, so the response contract is deliberately minimal: `count` is always
      `visible.length`, computed from the already-filtered array, so it structurally cannot
      reflect the total number of defects in the system. `src/app.js` uses `node:http` directly
      in place of Express (see the summary's "ACTUAL IMPLEMENTATION NOTE").

  - description: |
      Add route-level integration tests asserting the exact JSON body for each role and each
      empty-state scenario, using the global `fetch` against a `node:http` server.
    files:
      - test/routes/defects.test.js
    rationale: |
      The unit tests on `getVisibleDefects` prove the filtering logic is correct; the route
      tests prove the HTTP layer doesn't reintroduce a leak (e.g. an extra `totalDefects` field,
      a debug log, or a message like "no defects assigned to you yet, 4 exist").

tests:
  - |
    AC1 (Reporter sees only their own submissions) — `test/services/defectVisibility.test.js`:
    ```js
    test('AC1: returns only defects submitted by the reporter', () => {
      const reporter = { id: 'u1', role: 'reporter' };
      const defects = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: null, status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      assert.deepEqual(getVisibleDefects(reporter, defects), [defects[0]]);
    });
    ```
    Backed by a route test in `test/routes/defects.test.js` asserting
    `assert.deepEqual(body, { defects: [seededOwnDefect], count: 1 })` for `u1`, with `d2`
    absent from both the array and the count.

  - |
    AC2 (Developer sees only defects assigned to them, none unassigned or assigned elsewhere) —
    `test/services/defectVisibility.test.js`:
    ```js
    test('AC2: returns only defects assigned to the developer', () => {
      const developer = { id: 'u2', role: 'developer' };
      const defects = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
        { id: 'd3', title: 'C', submittedBy: 'u1', assignedTo: null, status: 'open' },
      ];
      assert.deepEqual(getVisibleDefects(developer, defects), [defects[0]]);
    });
    ```

  - |
    AC3 (Admin sees all defects) — `test/services/defectVisibility.test.js`:
    ```js
    test('AC3: returns every defect for an admin', () => {
      const admin = { id: 'u9', role: 'admin' };
      const defects = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u2', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      assert.deepEqual(getVisibleDefects(admin, defects), defects);
    });
    ```

  - |
    AC4 (Reporter with no submissions sees an empty list with no hint others exist) —
    `test/services/defectVisibility.test.js` plus a route-level contract test:
    ```js
    test('AC4: returns an empty array when the reporter has submitted nothing', () => {
      const reporter = { id: 'u1', role: 'reporter' };
      const defects = [
        { id: 'd1', title: 'A', submittedBy: 'u2', assignedTo: null, status: 'open' },
      ];
      assert.deepEqual(getVisibleDefects(reporter, defects), []);
    });
    ```
    Route test in `test/routes/defects.test.js`, hitting the running `node:http` server with
    the global `fetch`:
    ```js
    const res = await fetch(`${baseUrl}/defects`, { headers: { 'x-user-id': 'u1' } });
    const body = await res.json();
    assert.deepEqual(body, { defects: [], count: 0 });
    ```
    asserting deep equality (not just membership) so an added `message`/`totalCount` field
    fails the test.

  - |
    AC5 (Developer with nothing assigned sees an empty list, no hint of unassigned/others'
    defects) — `test/services/defectVisibility.test.js`:
    ```js
    test('AC5: returns an empty array when the developer has no assigned defects', () => {
      const developer = { id: 'u2', role: 'developer' };
      const defects = [
        { id: 'd1', title: 'A', submittedBy: 'u1', assignedTo: 'u3', status: 'open' },
        { id: 'd2', title: 'B', submittedBy: 'u1', assignedTo: null, status: 'open' },
      ];
      assert.deepEqual(getVisibleDefects(developer, defects), []);
    });
    ```
    Route test asserts `assert.deepEqual(body, { defects: [], count: 0 })` for `u2` (a
    developer) against the same seeded data, i.e. the same exact-equality contract as AC4.

  - |
    AC6 (Admin sees an appropriate empty state when no defects exist system-wide) —
    `test/services/defectVisibility.test.js`:
    ```js
    test('AC6: returns an empty array for an admin when no defects exist', () => {
      const admin = { id: 'u9', role: 'admin' };
      assert.deepEqual(getVisibleDefects(admin, []), []);
    });
    ```
    Route test in `test/routes/defects.test.js` with the repository cleared:
    ```js
    const res = await fetch(`${baseUrl}/defects`, { headers: { 'x-user-id': 'u9' } });
    const body = await res.json();
    assert.deepEqual(body, { defects: [], count: 0 });
    ```

assumptions_or_open_questions:
  - |
    The repository has no existing tech stack (no package.json, no framework) anywhere. This
    plan originally chose Node.js + TypeScript + Express + Vitest + supertest as the minimal
    stack to implement and test an HTTP-facing defect list. That stack could not actually be
    installed in the execution sandbox because the npm registry is unreachable (403 Forbidden
    on every request, no local mirror configured), so the implementation was redirected to
    Node.js 22's built-ins only: `node:http`, plain JavaScript with JSDoc, `node:test` +
    `node:assert`, and global `fetch`. The architecture (domain / services / repositories /
    middleware / routes) and the `getVisibleDefects` contract are unchanged; only the concrete
    packages differ. If a future environment has registry access and a different stack (e.g.
    the original Express/TypeScript/Vitest choice) is genuinely required, it can be layered in
    without changing the visibility logic or the route's JSON contract.
  - |
    "Authenticated" in the ACs is treated as "there is a resolved `User { id, role }` on the
    request." Real authentication (login, sessions, tokens, password handling) is assumed to be
    out of scope for this story and left to a separate story/epic; this plan adds only a
    trusted-header stand-in (`x-user-id` / `x-user-role`) so the role-scoping behavior itself
    can be exercised and tested end-to-end.
  - |
    Defect schema is assumed to be the minimal shape needed by the ACs: `id`, `title`,
    `submittedBy`, `assignedTo` (nullable), `status`. No richer schema (priority, timestamps,
    description) is introduced since nothing in the ACs requires it.
  - |
    Persistence is assumed to be in-memory for this story, since no database or ORM exists
    anywhere in the repo yet. A future story is expected to swap `DefectRepository`'s
    implementation without changing `getVisibleDefects` or the route contract.
  - |
    The API response shape `{ defects: Defect[], count: number }` is assumed acceptable since no
    API contract exists elsewhere in the codebase to conform to. `count` is always derived from
    the already-filtered list, never from the total.
  - |
    "Unassigned" is modeled as `assignedTo: null`; no separate "unassigned" status field is
    assumed.

package_dependencies: []
  # None. The npm registry is unreachable from the execution sandbox (403 Forbidden on every
  # package, no local mirror configured), so express, typescript, vitest, supertest, and their
  # @types packages — originally planned here — could not be installed. The implementation uses
  # only Node.js 22 built-ins (node:http, node:test, node:assert, global fetch) instead, so
  # `package.json` declares zero dependencies and zero devDependencies.

notes: |
  This is a greenfield repository (only a README exists), so there are no existing conventions
  to mirror; the module layout below (`domain` / `services` / `repositories` / `routes` /
  `middleware`) is proposed fresh for this story and is intended to be the starting convention
  for the rest of the "User Roles & Permissions" epic, not just this one story.

  Process: after the scaffolding step, run `npm test` to confirm the service/route test
  files fail (red) before writing `defectVisibility.js`, the repositories, the middleware, and
  the route — then implement just enough to turn them green.

  The diagram below shows the request path the route-level tests exercise, and why each node is
  touched:

  ```mermaid
  flowchart TD
      Client[HTTP client] -->|GET /defects| Router[src/routes/defects.js]
      Router -->|resolves user from headers| AuthMW[src/middleware/auth.js]
      AuthMW -->|looks up role by id| UserRepo[src/repositories/userRepository.js]
      Router -->|filters by user.role| VisSvc[src/services/defectVisibility.js]
      VisSvc -->|reads all defects| DefectRepo[src/repositories/defectRepository.js]

      classDef touched fill:#f96,color:#000;
      class Router,AuthMW,UserRepo,VisSvc,DefectRepo touched;
  ```
