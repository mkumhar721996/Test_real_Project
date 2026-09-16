summary: |
  This repository currently contains no application code (only README.md and .env — no
  package.json, no server, no data model, no test setup). This plan bootstraps the smallest
  possible backend slice needed to make TEST-REAL-PROJECT-STORY-005 testable and true: a
  minimal Express API exposing a defects list endpoint and a defect-by-id endpoint, backed by
  an in-memory store with hard-delete semantics. When an Admin deletes a defect, the record is
  permanently removed from the store, so it is trivially absent from the submitting Reporter's
  list (AC1) and any direct access returns a generic, indistinguishable-from-never-existed 404
  with no defect data or deletion metadata in the body (AC2, AC3). Full authentication and the
  three-role permission model are owned by the parent epic and are not built here; a
  header-based identity stand-in (`x-user-id` / `x-user-role`) is used only to make the ACs
  observable in tests.
scope:
  - description: |
      Scaffold a minimal Express application skeleton (no framework/tooling exists yet in this
      repo) so there is somewhere to host the defect endpoints under test.
    files:
      - package.json
      - src/app.js
      - src/server.js
    rationale: |
      The repo has zero application code today. `src/app.js` exports a `createApp()` factory
      (Express instance without `listen()`) so tests can mount it directly via supertest;
      `src/server.js` calls `createApp().listen(process.env.ARC_DEV_PORT || 8005)` to match the
      `ARC_DEV_PORT` convention already present in `.env`.
  - description: |
      Add an in-memory defect store with hard-delete semantics (no soft-delete/tombstone field
      at all).
    files:
      - src/store/defectStore.js
    rationale: |
      Signature: `create({ id, title, description, reporterId })`, `list()`, `getById(id)`,
      `remove(id)`, and a test-only `_reset()`. Choosing a real removal (`Map#delete`) over a
      `deleted`/`deletedAt` flag means there is no tombstone data to ever accidentally leak —
      directly satisfying AC3 by construction rather than by remembering to filter it out at
      every read path.
  - description: |
      Add defect routes: `GET /defects` (reporter-scoped list), `GET /defects/:id` (generic
      404 on missing-or-deleted), `DELETE /defects/:id` (hard delete).
    files:
      - src/routes/defects.js
    rationale: |
      `GET /defects` filters to `d.reporterId === req.headers['x-user-id']` only when
      `x-user-role: reporter`, which is the minimal behavior needed to make AC1's "submitting
      Reporter's defect list" observable — it is not a full implementation of list-visibility
      rules for Developer/Admin, which belongs to the parent permission-model epic.
      `GET /defects/:id` and the delete handler both respond `404 { error: 'Not found' }` when
      `defectStore.getById`/`remove` finds nothing, which is exactly what happens once a defect
      is removed — the same code path used for an ID that never existed, guaranteeing AC2 and
      AC3's "standard not-found, no extra data" requirement without a special case.
  - description: |
      Write failing tests first for each acceptance criterion, then implement the above until
      green.
    files:
      - tests/defects.test.js
    rationale: |
      Supertest against `createApp()`, seeding/reset via `defectStore.create` / `_reset` in
      `beforeEach`, per the TDD requirement.
tests:
  - |
    AC1 — deleted defect disappears from the submitting Reporter's list.
    ```js
    beforeEach(() => defectStore._reset());

    test('deleted defect is absent from submitting reporter list', async () => {
      const app = createApp();
      defectStore.create({ id: 'd1', title: 'Crash on save', description: 'x', reporterId: 'reporter-1' });

      await request(app).delete('/defects/d1').set('x-user-role', 'admin');

      const res = await request(app)
        .get('/defects')
        .set('x-user-id', 'reporter-1')
        .set('x-user-role', 'reporter');

      expect(res.body.map(d => d.id)).not.toContain('d1');
    });
    ```
  - |
    AC2 — any user, including the submitting Reporter, gets a standard not-found on direct
    access to a deleted defect.
    ```js
    test.each(['reporter-1', 'reporter-2', 'admin-1'])(
      'direct access to a deleted defect 404s for %s',
      async (userId) => {
        const app = createApp();
        defectStore.create({ id: 'd1', title: 'Crash on save', description: 'x', reporterId: 'reporter-1' });
        await request(app).delete('/defects/d1').set('x-user-role', 'admin');

        const res = await request(app).get('/defects/d1').set('x-user-id', userId);

        expect(res.status).toBe(404);
      }
    );
    ```
  - |
    AC3 — no deletion notice, tombstone, or other defect data is exposed on direct access; the
    response is byte-identical to accessing an ID that never existed.
    ```js
    test('deleted-defect response reveals nothing and matches never-existed response', async () => {
      const app = createApp();
      defectStore.create({ id: 'd1', title: 'Crash on save', description: 'secret repro steps', reporterId: 'reporter-1' });
      await request(app).delete('/defects/d1').set('x-user-role', 'admin');

      const deletedRes = await request(app).get('/defects/d1').set('x-user-id', 'reporter-1');
      const neverExistedRes = await request(app).get('/defects/does-not-exist').set('x-user-id', 'reporter-1');

      expect(deletedRes.body).toEqual(neverExistedRes.body);
      expect(deletedRes.body).toEqual({ error: 'Not found' });
      expect(JSON.stringify(deletedRes.body)).not.toMatch(/secret repro steps|deletedAt|tombstone/i);
    });
    ```
assumptions_or_open_questions:
  - "No existing application code was found in this repository (only README.md and .env). This plan treats the story as needing to bootstrap the smallest possible backend slice; if the real application actually lives in another repo/service not visible here, this plan should be redirected there instead of scaffolding a parallel one."
  - "The parent epic (three-role permission model / auth) is not implemented yet. This plan uses `x-user-id` / `x-user-role` request headers as a placeholder identity mechanism purely so the ACs are testable now, to be replaced by real auth middleware when that epic lands."
  - "Chose hard delete (permanently removing the record from the store) over soft-delete-plus-filtering. No AC or existing convention requires an audit trail or undelete capability, and physical removal trivially satisfies 'no tombstone' rather than relying on every read path remembering to filter a deleted flag. Flag if an audit trail turns out to be required elsewhere."
  - "GET /defects role-scoping is implemented only to the extent AC1 requires (reporter sees only their own submissions); full list-visibility rules for Developer/Admin roles are left permissive (all non-deleted defects) pending the permission-model epic and are not asserted by any test here."
  - "Authorization enforcement on the DELETE endpoint itself (rejecting a non-Admin caller) is out of scope: no AC covers it, so tests invoke delete as an already-authorized Admin action rather than testing who is allowed to call it."
  - "Not-found response body is fixed as `{ error: 'Not found' }` for both a truly-nonexistent ID and a deleted defect's ID; tests assert these two responses are exactly equal."
package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: No HTTP framework exists in this repo yet; needed to host the defects endpoints under test.
  - name: jest
    version: ^29.7.0
    ecosystem: npm
    rationale: No test runner exists yet; used to run the failing-test-first suite for all three ACs.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: No HTTP-assertion library exists yet; used to drive the Express app in-process from tests without binding a real port.
notes: |
  This repo is effectively greenfield for this story (git log shows only "Initial commit", and
  the working tree has just README.md, .env, and .arc/ tooling files). The `.env` file already
  defines `ARC_DEV_PORT=8005` / `ARC_WEB_PORT=3005`, which is why `src/server.js` reads
  `ARC_DEV_PORT` rather than hardcoding a port.

  Design call worth the reviewer's attention: hard-delete vs. soft-delete. AC3 only requires
  that no tombstone/deletion data be *exposed*; a soft-delete (`deletedAt` flag filtered out of
  every query) would also satisfy the letter of the AC. This plan picks hard delete instead
  because it removes an entire class of "forgot to filter this one read path" bugs by
  construction, and nothing in the story or epic asks for an audit trail or restore capability.
  If a future story needs deletion history, that would require revisiting this choice.

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000
    classDef untouched fill:#eee,color:#000

    server[src/server.js]:::touched
    app[src/app.js<br/>createApp]:::touched
    routes[src/routes/defects.js]:::touched
    store[src/store/defectStore.js]:::touched
    tests[tests/defects.test.js]:::touched
    env[.env<br/>ARC_DEV_PORT]:::untouched

    server -->|"listen() on ARC_DEV_PORT"| app
    env -.->|read by| server
    app -->|"mounts router"| routes
    routes -->|"list / getById / remove"| store
    tests -->|"supertest(createApp())"| app
    tests -->|"seed via create(), reset via _reset()"| store
  ```
