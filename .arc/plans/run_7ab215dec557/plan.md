summary: |
  This repository is currently empty (only a README.md exists — no package.json, no source
  code). TEST-REAL-PROJECT-STORY-004 requires that as soon as a Developer is unassigned from a
  defect, they immediately lose all access to it (list visibility, direct access, comments,
  history) and that the unassignment itself is audit-logged. Since there is no existing
  codebase or persistence layer to build on, this plan bootstraps the minimal slice needed to
  make the behavior true and testable: an in-memory domain model (Defect, Comment,
  HistoryEntry, AuditLogEntry), a single `canAccessDefect` authorization rule keyed off the
  defect's *current* assignee, a defect service that enforces that rule on every read path and
  writes an audit entry on unassignment, and a thin Express HTTP layer so "direct access via a
  saved link" can be tested at the HTTP status/body level. Scope is held tightly to the six
  acceptance criteria; broader concerns (real auth/sessions, durable storage, the full
  three-role permission model) belong to the parent epic and are called out as open questions
  rather than built here.
scope:
  - description: |
      Bootstrap a minimal TypeScript/Express project skeleton (no code exists yet in this
      repo): `package.json`, `tsconfig.json`, `vitest.config.ts`.
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
    rationale: |
      There is no build/test tooling in the repo at all. This is the minimum needed to write
      and run the failing tests below in TypeScript with Vitest + Supertest.
  - description: |
      Define the domain types shared by the rest of the slice: `User`, `Role`, `Defect`,
      `Comment`, `HistoryEntry`, `AuditLogEntry`.
    files:
      - src/domain/types.ts
    rationale: |
      Every test and service below needs a shared, minimal shape for these entities. Kept to
      only the fields the ACs require (e.g. `Defect.assigneeId`, `AuditLogEntry.actorId` /
      `unassignedUserId` / `timestamp`).
  - description: |
      Add the single authorization rule that everything else enforces:
      `canAccessDefect(user, defect): boolean`. Admin: always true. Reporter: true iff
      `defect.reporterId === user.id`. Developer: true iff `defect.assigneeId === user.id`
      (i.e. based on the *current* assignee only — this is what makes access loss immediate
      and automatic on unassignment, with no separate "revoke" step needed).
    files:
      - src/domain/authorization.ts
    rationale: |
      Centralizing this one predicate means AC1–AC5 are all satisfied by construction once
      every read path calls it — there's no separate list-filter logic vs. direct-access logic
      to keep in sync.
  - description: |
      Add in-memory repositories for defects/comments/history and for the audit log.
    files:
      - src/repositories/defectRepository.ts
      - src/repositories/auditLogRepository.ts
    rationale: |
      No persistence/database choice has been made anywhere in this codebase yet (it doesn't
      exist). Using in-memory stores behind small repository interfaces keeps this story
      testable and swappable later without speculatively picking a database now (see open
      questions).
  - description: |
      Add `defectService` with the operations the HTTP layer and tests need: `unassignDeveloper`,
      `listDefectsForUser`, `getDefectForUser`, `getCommentsForUser`, `getHistoryForUser`. Every
      "for user" read calls `canAccessDefect` first and returns `undefined` on denial; the HTTP
      layer turns that into a 404. `unassignDeveloper` clears `assigneeId` and writes one audit
      entry via `auditLogRepository`.
    files:
      - src/services/defectService.ts
    rationale: |
      This is where AC1–AC6 actually get enforced. Putting the audit-write inside the same
      operation that performs the unassignment (rather than as a separate call site) makes it
      impossible to save an unassignment without logging it.
    signature: |
      ```ts
      function unassignDeveloper(input: { defectId: string; actorId: string }): Defect
      function listDefectsForUser(user: User): Defect[]
      function getDefectForUser(user: User, defectId: string): Defect | undefined
      function getCommentsForUser(user: User, defectId: string): Comment[] | undefined
      function getHistoryForUser(user: User, defectId: string): HistoryEntry[] | undefined
      ```
  - description: |
      Add a minimal Express app: a placeholder `currentUser` middleware (reads an `x-user-id`
      header and looks the user up — a stand-in for real auth/session handling, which belongs
      to the parent permission-model epic and doesn't exist yet), and routes
      `GET /defects`, `GET /defects/:id`, `GET /defects/:id/comments`,
      `GET /defects/:id/history`, `PATCH /defects/:id/unassign`. Any route whose service call
      returns `undefined` responds `404 { error: "Defect not found" }` — a generic body/status
      that does not confirm the defect exists, which is what AC3/AC5 ("no defect data is
      exposed") actually require.
    files:
      - src/http/middleware/currentUser.ts
      - src/http/routes/defects.ts
      - src/http/app.ts
    rationale: |
      AC2–AC5 talk about "direct access via a saved link" and "a clear error" — that's an
      HTTP-level contract, so it needs an HTTP layer to test against with Supertest, not just a
      service-level assertion.
tests:
  - |
    AC1 — unit test in `tests/unit/defectService.test.ts`:
    ```ts
    it("excludes a defect from a developer's list after they are unassigned", () => {
      const defect = repo.createDefect({ title: "Crash on save", reporterId: reporter.id, assigneeId: dev.id });
      defectService.unassignDeveloper({ defectId: defect.id, actorId: admin.id });
      const list = defectService.listDefectsForUser(dev);
      expect(list.map((d) => d.id)).not.toContain(defect.id);
    });
    ```
    Fails first because `defectService` doesn't exist yet. Made to pass by
    `listDefectsForUser` filtering with `canAccessDefect`, and `unassignDeveloper` clearing
    `assigneeId`.
  - |
    AC2 + AC3 — HTTP integration test in `tests/integration/defectAccess.http.test.ts`
    (Supertest against `app`), asserting both the denial and that no defect fields leak into
    the body:
    ```ts
    it("denies a saved-link direct access to an unassigned developer without exposing defect data", async () => {
      await request(app).patch(`/defects/${defect.id}/unassign`).set("x-user-id", admin.id);
      const res = await request(app).get(`/defects/${defect.id}`).set("x-user-id", dev.id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Defect not found" });
    });
    ```
  - |
    AC4 + AC5 — HTTP integration tests in `tests/integration/defectAccess.http.test.ts` for
    comments and history, same shape:
    ```ts
    it("denies access to prior comments after unassignment and returns no comment data", async () => {
      await request(app).patch(`/defects/${defect.id}/unassign`).set("x-user-id", admin.id);
      const res = await request(app).get(`/defects/${defect.id}/comments`).set("x-user-id", dev.id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Defect not found" });
    });

    it("denies access to defect history after unassignment and returns no history data", async () => {
      await request(app).patch(`/defects/${defect.id}/unassign`).set("x-user-id", admin.id);
      const res = await request(app).get(`/defects/${defect.id}/history`).set("x-user-id", dev.id);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Defect not found" });
    });
    ```
  - |
    AC6 — unit test in `tests/unit/defectService.test.ts` asserting the audit entry's shape:
    ```ts
    it("records an audit log entry when a developer is unassigned", () => {
      defectService.unassignDeveloper({ defectId: defect.id, actorId: admin.id });
      const entries = auditLogRepository.findByDefectId(defect.id);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        action: "DEVELOPER_UNASSIGNED",
        actorId: admin.id,
        defectId: defect.id,
        unassignedUserId: dev.id,
      });
      expect(entries[0].timestamp).toBeInstanceOf(Date);
    });
    ```
assumptions_or_open_questions:
  - |
    The repo has no existing code, framework, or persistence choice at all (only a README).
    This plan assumes a Node.js + TypeScript + Express stack with in-memory repositories as
    the minimal vehicle to implement and test this story; it is not derived from any existing
    convention. Please confirm this is the intended stack, or redirect before implementation
    starts.
  - |
    Direct-access denial is implemented as `404 { error: "Defect not found" }` rather than
    `403 Forbidden`, specifically so the response doesn't confirm the defect's existence to an
    unauthorized caller. This is a stronger reading of AC3/AC5's "no defect data is exposed"
    than a 403 would give. Flagging in case product wants a distinguishable 403 instead.
  - |
    "Unassigned" is treated as: the Developer's id no longer equals `defect.assigneeId` (set to
    null, or reassigned to a different developer) — both cases remove the prior developer's
    access under `canAccessDefect`.
  - |
    The audit log and all domain data are in-memory only for this story, since no database has
    been chosen anywhere in this codebase yet. A durable store is assumed to be a later
    concern (likely under the permission-model epic or a dedicated persistence story), not
    scope creep to add speculatively here.
  - |
    `currentUser` middleware reads a plain `x-user-id` header with no real authentication —
    a deliberate stand-in, since session/auth handling belongs to the parent "User Roles &
    Permissions" epic and doesn't exist yet. Real auth will need to replace this middleware
    later without changing `canAccessDefect` or the service layer.
  - |
    Reporter/Admin authorization rules (not covered by any AC here) were added to
    `canAccessDefect` only because a single shared predicate needs to be meaningful for all
    three roles to be trustworthy; they are intentionally minimal (Admin sees all, Reporter
    sees own reports) and not exercised beyond what's needed to keep the Developer-focused
    tests above honest.
package_dependencies:
  - name: express
    version: ^4.19.2
    ecosystem: npm
    rationale: HTTP layer needed to test "direct access via a saved link" (AC2–AC5) at the status-code/body level.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: Project has no build tooling yet; the domain/service code and tests are written in TypeScript.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for the unit and integration tests listed above; no test framework exists in the repo yet.
  - name: supertest
    version: ^7.0.0
    ecosystem: npm
    rationale: Drives HTTP-level assertions against the Express app for AC2–AC5 without binding a real port.
  - name: "@types/express"
    version: ^4.17.21
    ecosystem: npm
    rationale: Type definitions for express under TypeScript.
  - name: "@types/supertest"
    version: ^6.0.2
    ecosystem: npm
    rationale: Type definitions for supertest under TypeScript.
  - name: "@types/node"
    version: ^20.14.9
    ecosystem: npm
    rationale: Node.js type definitions required to compile the TypeScript sources.
  - name: tsx
    version: ^4.16.2
    ecosystem: npm
    rationale: Run/execute TypeScript directly (dev server, ad-hoc scripts) without a separate compile step.
notes: |
  Repo state check: `Glob '**/*'` and `Glob '**/package.json'` confirm the only file in the
  worktree besides `.arc/` scratch/plan files is `README.md` — there is no existing code,
  convention, or persistence layer to fit into. Everything in `scope` above is therefore new,
  not a modification of something pre-existing.

  Call flow for the new slice (all nodes are new/touched — there is no pre-existing code to
  contrast against, so the diagram shows internal layering/fan-out rather than touched-vs-untouched):

  ```mermaid
  flowchart TD
    classDef touched fill:#f96,color:#000

    A[HTTP routes<br/>src/http/routes/defects.ts]:::touched
    M[currentUser middleware<br/>src/http/middleware/currentUser.ts]:::touched
    S[defectService<br/>src/services/defectService.ts]:::touched
    Z[canAccessDefect<br/>src/domain/authorization.ts]:::touched
    R[defectRepository<br/>src/repositories/defectRepository.ts]:::touched
    L[auditLogRepository<br/>src/repositories/auditLogRepository.ts]:::touched
    APP[app.ts]:::touched

    APP -->|wires| M
    APP -->|mounts| A
    M -->|"resolves req.user (AC2-5 need a caller identity)"| A
    A -->|"list/get/comments/history: enforce access on every read (AC1-5)"| S
    A -->|"PATCH .../unassign (AC6)"| S
    S -->|"per-user authorization check"| Z
    S -->|"read/write defect+comment+history state"| R
    S -->|"write one entry per unassignment"| L
  ```

  This mirrors a standard route -> service -> repository layering so the single
  `canAccessDefect` rule is the only place access logic lives, and the audit write is
  co-located with the state change it documents (no separate call site to forget).
