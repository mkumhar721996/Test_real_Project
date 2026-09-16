summary: |
  Implement Admin-only permanent deletion of a defect (and its comments) at any status,
  including terminal states (Won't Fix, Closed). Deletion is a hard delete: the defect and
  its comments are removed from the database so they can never reappear in any list or
  detail view. Only users with the Admin role may perform the deletion; Developers and
  Reporters are rejected. The client shows a confirmation step before calling the delete
  endpoint, and cancelling that confirmation must not delete anything.

  IMPORTANT CONTEXT: this repository currently contains no application code at all (only
  README.md and .env — confirmed by scanning the entire tree). The parent epic describes
  sibling stories (status transitions, editing, reassignment, comments) as if a defect
  model, roles, and auth already exist, but none of that is present in this codebase yet.
  This plan therefore has to assume a minimal tech stack and bootstrap just enough
  scaffolding (Defect/Comment/User models, a role-guard middleware, an Express app) for
  this story's acceptance criteria to be implementable and testable in isolation. That
  stack choice is a guess, not something read from real code, and is called out as the
  first open question below — please confirm or redirect before implementation starts.

scope:
  - description: |
      Bootstrap the minimal project scaffold this story needs to exist at all: a
      TypeScript/Express backend with a Prisma schema defining `User` (with a `role`),
      `Defect` (with a `status`), and `Comment` (belonging to a `Defect`), plus a test
      runner (Vitest) wired up for both backend (Supertest) and frontend
      (React Testing Library) tests. No feature logic lives here — this only exists so
      later scope items have somewhere to add code.
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
      - prisma/schema.prisma
      - src/db/prisma.ts
      - src/app.ts
      - src/server.ts
    rationale: |
      Nothing in this repo compiles or runs today. Every later scope item needs a Defect
      row, a Comment row, a User with a role, and an HTTP app to attach the delete route
      to. This is deliberately the smallest schema/app that supports the ACs below —
      status transitions, editing, reassignment, and comment authoring themselves are
      explicitly out of scope for this story and are left to the sibling stories in the
      epic.

  - description: |
      Add a role-guard middleware `requireRole(...roles: Role[])` that rejects requests
      from callers whose role is not in the allowed list, and use it to gate the new
      delete route to Admins only. This is the enforcement point for AC4.
    files:
      - src/middleware/requireRole.ts
      - src/routes/defects.ts
    rationale: |
      AC4 requires that Developers and Reporters be rejected when attempting deletion.
      Putting the check in route middleware (rather than only in the service layer) keeps
      the authorization decision in one obvious, reusable place, consistent with how a
      real auth/roles story would likely wire it once it exists.

  - description: |
      Add `deleteDefect(defectId: string): Promise<void>` in a defect service, and a
      `DELETE /defects/:id` route that calls it. The service performs a hard delete of the
      Defect row; the Prisma schema declares `Comment.defect` with `onDelete: Cascade` so
      associated comments are removed in the same operation. The route does not check
      defect status, so deletion is status-agnostic (covers AC3 for free rather than as a
      special case).
    files:
      - src/services/defectService.ts
      - src/routes/defects.ts
      - prisma/schema.prisma
    rationale: |
      AC1/AC2/AC3 all reduce to "hard-delete the row regardless of status, and cascade the
      comments." Doing the cascade at the schema level (`onDelete: Cascade`) is simpler
      and less error-prone than deleting comments manually in application code, and
      guarantees atomicity without a manual transaction.

  - description: |
      Add a `DeleteDefectButton` component that shows a confirmation prompt before
      calling the delete endpoint, and only calls it if the Admin confirms. Cancelling
      must leave the defect untouched (AC5).
    files:
      - src/frontend/components/DeleteDefectButton.tsx
    rationale: |
      AC5 is inherently a client-side interaction (confirm/cancel), not a backend
      concern — the backend only ever sees a DELETE request if the Admin confirmed, so
      the "cancel means no deletion" behavior has to be verified at the component level.

tests:
  - |
    AC1 — deleting a defect permanently removes it and its comments.
    File: `tests/defects.delete.test.ts`
    ```ts
    it('permanently removes the defect and its comments', async () => {
      const defect = await prisma.defect.create({ data: { title: 'Bug', status: 'OPEN' } });
      await prisma.comment.create({ data: { body: 'note', defectId: defect.id } });

      await request(app)
        .delete(`/defects/${defect.id}`)
        .set('x-user-role', 'ADMIN')
        .expect(204);

      expect(await prisma.defect.findUnique({ where: { id: defect.id } })).toBeNull();
      expect(await prisma.comment.findMany({ where: { defectId: defect.id } })).toHaveLength(0);
    });
    ```
    Minimal code to pass: `deleteDefect` in `src/services/defectService.ts` calling
    `prisma.defect.delete({ where: { id } })`, with `Comment.defect` declared
    `onDelete: Cascade` in `prisma/schema.prisma`.

  - |
    AC2 — a deleted defect no longer appears in list or detail views.
    File: `tests/defects.delete.test.ts`
    ```ts
    it('no longer appears in list or detail views', async () => {
      const defect = await prisma.defect.create({ data: { title: 'Bug', status: 'OPEN' } });
      await request(app).delete(`/defects/${defect.id}`).set('x-user-role', 'ADMIN').expect(204);

      const list = await request(app).get('/defects').set('x-user-role', 'ADMIN');
      expect(list.body.find((d: { id: string }) => d.id === defect.id)).toBeUndefined();

      await request(app).get(`/defects/${defect.id}`).set('x-user-role', 'ADMIN').expect(404);
    });
    ```
    Minimal code to pass: a bare `GET /defects` (list) and `GET /defects/:id` (detail)
    route added in `src/routes/defects.ts` that simply reads from Prisma — since the row
    is gone after AC1's delete, both naturally omit it with no extra filtering logic.

  - |
    AC3 — deletion succeeds for defects in terminal statuses (Won't Fix, Closed).
    File: `tests/defects.delete.test.ts`
    ```ts
    it.each(['WONT_FIX', 'CLOSED'])('allows deleting a defect in terminal status %s', async (status) => {
      const defect = await prisma.defect.create({ data: { title: 'Bug', status } });
      await request(app)
        .delete(`/defects/${defect.id}`)
        .set('x-user-role', 'ADMIN')
        .expect(204);
      expect(await prisma.defect.findUnique({ where: { id: defect.id } })).toBeNull();
    });
    ```
    Minimal code to pass: no status check anywhere in `deleteDefect` or the route handler.

  - |
    AC4 — Developers and Reporters are rejected when attempting deletion.
    File: `tests/defects.delete.test.ts`
    ```ts
    it.each(['DEVELOPER', 'REPORTER'])('rejects deletion by %s', async (role) => {
      const defect = await prisma.defect.create({ data: { title: 'Bug', status: 'OPEN' } });
      await request(app)
        .delete(`/defects/${defect.id}`)
        .set('x-user-role', role)
        .expect(403);
      expect(await prisma.defect.findUnique({ where: { id: defect.id } })).not.toBeNull();
    });
    ```
    Minimal code to pass: `requireRole('ADMIN')` middleware in `src/middleware/requireRole.ts`
    applied to the `DELETE /defects/:id` route, returning `403` before the handler runs.

  - |
    AC5 — cancelling the confirmation does not delete the defect.
    File: `tests/frontend/DeleteDefectButton.test.tsx`
    ```tsx
    it('does not delete the defect when the admin cancels the confirmation', async () => {
      const onDelete = vi.fn();
      render(<DeleteDefectButton defectId="abc" onDelete={onDelete} />);
      await userEvent.click(screen.getByRole('button', { name: /delete/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onDelete).not.toHaveBeenCalled();
    });
    ```
    Minimal code to pass: `DeleteDefectButton` renders a confirm/cancel prompt on click
    and only invokes the `onDelete` (which wraps the `DELETE` API call) prop when the
    Admin clicks confirm, never on cancel.

assumptions_or_open_questions:
  - |
    BLOCKING: the repository has no existing code, framework, or dependency manifest.
    This plan assumes a Node.js/TypeScript + Express + Prisma (PostgreSQL) backend and a
    React frontend with Vitest for both, purely as a reasonable default — none of this is
    confirmed by anything in the repo. If the real/intended stack differs (or if this
    story is actually meant to land on top of other in-flight branches from sibling
    stories in the epic), please say so before implementation starts.
  - |
    Assumes `User.role` is one of `ADMIN`, `DEVELOPER`, `REPORTER`, and that a defect's
    `status` includes at least `OPEN`, `WONT_FIX`, and `CLOSED`. The exact status enum and
    any additional in-flight statuses belong to the status-transition story in this epic;
    this plan only needs terminal statuses to exist as valid values.
  - |
    Assumes deletion is a genuine hard delete (row removed from the database), not a soft
    delete/tombstone, per AC1's wording "permanently removed." If audit/compliance needs
    a retained record of who deleted what and when, that is not covered here and would
    need its own AC.
  - |
    Assumes there is no confirmation step or authorization check needed for
    already-deleted/nonexistent defect IDs beyond a plain 404 (no AC specifies that
    behavior, so it isn't tested here beyond what falls out of the routes in scope).
  - |
    The `x-user-role` header used in the backend tests is a placeholder auth seam since no
    real authentication/session system exists in this repo yet. Once a real auth story
    lands, these tests should be updated to authenticate as a user with the appropriate
    role rather than trusting a header.

package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: HTTP server for the DELETE /defects/:id route and supporting list/detail routes.
  - name: "@prisma/client"
    version: ^5.19.1
    ecosystem: npm
    rationale: Query/mutate Defect, Comment, and User rows for the delete flow.
  - name: prisma
    version: ^5.19.1
    ecosystem: npm
    rationale: Schema/migration CLI to define the Defect/Comment/User models and the cascade delete relation.
  - name: vitest
    version: ^2.1.1
    ecosystem: npm
    rationale: Test runner for both the backend delete tests and the frontend confirmation-button test.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: Drive HTTP requests against the Express app in the AC1–AC4 backend tests.
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: Implement the DeleteDefectButton confirmation component for AC5.
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: Render target for the React component in tests and the app.
  - name: "@testing-library/react"
    version: ^16.0.1
    ecosystem: npm
    rationale: Render and query the DeleteDefectButton component in the AC5 test.
  - name: "@testing-library/user-event"
    version: ^14.5.2
    ecosystem: npm
    rationale: Simulate the click-delete-then-click-cancel interaction in the AC5 test.
  - name: jsdom
    version: ^25.0.0
    ecosystem: npm
    rationale: DOM environment for Vitest to run the React component test.
  - name: typescript
    version: ^5.6.2
    ecosystem: npm
    rationale: Language/compiler for the entire scaffold and feature code, since none exists in the repo yet.

notes: |
  Nothing in this repository currently exists besides `README.md` and `.env` — confirmed
  by a full-tree glob and grep. Every file listed under `scope` is a new file. The
  diagram below shows the layering this plan introduces (route → middleware/service →
  DB, and a separate frontend component → future API client), all newly created, so
  fan-in/fan-out is minimal by construction; it's included mainly to make the
  route/middleware/service/DB call direction explicit for review, per the "crosses a
  layer boundary" guidance.

  ```mermaid
  flowchart TD
    FE[DeleteDefectButton.tsx<br/>frontend component]
    RT[routes/defects.ts<br/>DELETE /defects/:id]
    MW[middleware/requireRole.ts<br/>ADMIN-only guard]
    SVC[services/defectService.ts<br/>deleteDefect]
    DB[(Prisma / Postgres<br/>Defect + Comment cascade)]

    FE -->|"on confirm only (AC5)"| RT
    RT -->|"gate: 403 if not ADMIN (AC4)"| MW
    MW -->|"authorized: proceed"| SVC
    SVC -->|"hard delete, cascades comments (AC1/AC2/AC3)"| DB

    classDef touched fill:#f96,color:#000
    class FE,RT,MW,SVC,DB touched
  ```
