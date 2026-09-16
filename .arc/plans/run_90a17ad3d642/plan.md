summary: |
  This repository is currently greenfield: aside from a README and a `.env` file there is no
  source code, no package manifest, and no test tooling. This plan bootstraps a minimal
  Node.js/TypeScript project and implements admin-only role assignment as a pure domain/service
  layer (no HTTP framework, no real database), backed by in-memory repositories for users and
  audit log entries. The service enforces that only Admins may change another user's role,
  applies the change synchronously (so it is visible immediately), and writes an audit log entry
  on every role change and on every permission denial, satisfying all five acceptance criteria.
  Wiring this service into a real API/auth layer and durable storage is left to later stories in
  the "User Roles & Permissions" epic.

scope:
  - description: |
      Bootstrap a minimal Node.js + TypeScript project with a test runner, since none exists yet.
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
    rationale: |
      No package manifest, tsconfig, or test framework exists in the repo. TDD requires a
      runnable test suite before any production code is written.

  - description: |
      Define the core domain types: `Role`, `User`, and `AuditLogEntry`.
    files:
      - src/domain/role.ts
      - src/domain/user.ts
      - src/domain/auditLogEntry.ts
    rationale: |
      Shared, minimal types used by the repositories and the service. No framework or
      persistence concerns leak into these.

  - description: |
      Add a typed `PermissionDeniedError` so denial (AC3) can be asserted precisely rather than
      via a generic `Error`.
    files:
      - src/errors/permissionDeniedError.ts
    rationale: |
      Callers and tests need to distinguish "denied because not Admin" from other failures
      (e.g. unknown user id).

  - description: |
      Add in-memory repositories for users and audit log entries.
    files:
      - src/repositories/userRepository.ts
      - src/repositories/auditLogRepository.ts
    rationale: |
      The acceptance criteria require persisted role changes and persisted audit entries, but
      say nothing about durable storage or an API layer. An in-memory store is the minimal
      thing that satisfies "saved" and "takes effect immediately" without introducing a real
      database dependency the ACs don't ask for.

  - description: |
      Implement `assignRole(actor, targetUserId, newRole)` in a `RoleAssignmentService`: checks
      the actor is Admin, updates the target's role and records a `ROLE_CHANGED` audit entry on
      success, or throws `PermissionDeniedError` and records a `PERMISSION_DENIED` audit entry
      on denial.
    files:
      - src/services/roleAssignmentService.ts
    rationale: |
      This is the single piece of business logic all five ACs are about: Admin-only mutation,
      immediate effect, denial for non-Admins (including self), and audit logging for both
      outcomes.

  - description: |
      Write the failing-tests-first suite covering all five acceptance criteria against the
      service.
    files:
      - tests/roleAssignmentService.test.ts
    rationale: |
      TDD: every behavior above is driven by one of these tests, written and run red before the
      corresponding production code is written.

tests:
  - |
    AC1 — Admin assigns/changes another user's role and it is saved.
    ```ts
    it('saves the role change when an Admin changes another user's role', () => {
      const admin: User = { id: 'admin-1', name: 'Ada', role: 'Admin' };
      const target: User = { id: 'user-1', name: 'Bob', role: 'Reporter' };
      userRepository.seed([admin, target]);

      assignRole(admin, target.id, 'Developer');

      expect(userRepository.getUser(target.id)?.role).toBe('Developer');
    });
    ```
    Minimal code to pass: `assignRole` calls `userRepository.updateUserRole(targetUserId, newRole)`
    after confirming `actor.role === 'Admin'`.

  - |
    AC2 — the new role takes effect immediately for the target user.
    ```ts
    it('reflects the new role immediately for the target user', () => {
      const admin: User = { id: 'admin-1', name: 'Ada', role: 'Admin' };
      const target: User = { id: 'user-1', name: 'Bob', role: 'Reporter' };
      userRepository.seed([admin, target]);

      assignRole(admin, target.id, 'Admin');

      expect(userRepository.getUser(target.id)?.role).toBe('Admin');
    });
    ```
    Minimal code to pass: `userRepository.updateUserRole` mutates the in-memory record
    synchronously and `getUser` reads the same store, so no additional caching/async code is
    needed — the repository must not buffer or debounce writes.

  - |
    AC3 — a Reporter or Developer is denied when changing any user's role, including their own.
    ```ts
    it('denies a Developer attempting to change any user's role, including their own', () => {
      const developer: User = { id: 'dev-1', name: 'Dev', role: 'Developer' };
      userRepository.seed([developer]);

      expect(() => assignRole(developer, developer.id, 'Admin')).toThrow(PermissionDeniedError);
      expect(userRepository.getUser(developer.id)?.role).toBe('Developer');
    });
    ```
    Minimal code to pass: `assignRole` throws `PermissionDeniedError` before touching the
    repository whenever `actor.role !== 'Admin'`.

  - |
    AC4 — a successful role change creates an audit log entry with actor, target, old role, new
    role, and timestamp.
    ```ts
    it('creates an audit log entry with actor, target, old role, new role, and timestamp', () => {
      const admin: User = { id: 'admin-1', name: 'Ada', role: 'Admin' };
      const target: User = { id: 'user-1', name: 'Bob', role: 'Reporter' };
      userRepository.seed([admin, target]);

      assignRole(admin, target.id, 'Developer');

      const entries = auditLogRepository.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actorId: 'admin-1',
        targetId: 'user-1',
        type: 'ROLE_CHANGED',
        details: { oldRole: 'Reporter', newRole: 'Developer' },
      });
      expect(entries[0].timestamp).toBeTruthy();
    });
    ```
    Minimal code to pass: on success, `assignRole` reads the target's current role before
    mutating it, then calls `auditLogRepository.record({ timestamp: new Date().toISOString(),
    actorId: actor.id, targetId, type: 'ROLE_CHANGED', details: { oldRole, newRole } })`.

  - |
    AC5 — a permission-denial event creates an audit log entry with actor, attempted action,
    target resource, and timestamp.
    ```ts
    it('creates an audit log entry recording actor, attempted action, target resource, and timestamp on denial', () => {
      const developer: User = { id: 'dev-1', name: 'Dev', role: 'Developer' };
      const target: User = { id: 'user-2', name: 'Carl', role: 'Reporter' };
      userRepository.seed([developer, target]);

      expect(() => assignRole(developer, target.id, 'Admin')).toThrow(PermissionDeniedError);

      const entries = auditLogRepository.getAll();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        actorId: 'dev-1',
        targetId: 'user-2',
        type: 'PERMISSION_DENIED',
        details: { attemptedAction: 'ASSIGN_ROLE' },
      });
    });
    ```
    Minimal code to pass: before throwing, `assignRole` calls `auditLogRepository.record({
    timestamp: new Date().toISOString(), actorId: actor.id, targetId: targetUserId, type:
    'PERMISSION_DENIED', details: { attemptedAction: 'ASSIGN_ROLE', attemptedRole: newRole } })`.

assumptions_or_open_questions:
  - |
    The repository has no existing tech stack (no package.json, no framework, no database). I
    chose a minimal Node.js/TypeScript service layer with in-memory repositories and Vitest as
    the test runner, since the ACs describe business behavior, not an API shape or a storage
    technology. A real HTTP endpoint, authentication/session handling, and durable persistence
    (database) are not implemented here and would need a follow-up story.
  - |
    `actor: User` is passed directly into `assignRole` rather than derived from an authenticated
    request/session, because no auth system exists yet in this codebase. Wiring this into a real
    API layer (extracting the actor from a session/JWT) is out of scope for this story.
  - |
    AC2 ("takes effect immediately") is satisfied by construction: the repository is a
    synchronous in-memory `Map`/array with no cache or async write path. If a real database or
    cache is introduced later, this immediacy guarantee will need to be re-verified.
  - |
    AC5 says "any role boundary is violated," but the only permission-checked action that exists
    in this codebase is role assignment itself. I scoped the `PERMISSION_DENIED` audit logging to
    denials from `assignRole` only; other future permission-checked actions (per the parent epic)
    will need their own denial-audit logging when they're built.
  - |
    The ACs do not say whether an Admin may change their own role (self-escalation concerns in
    the story description appear aimed at non-Admins escalating themselves, per AC3). This plan
    does not add an extra restriction preventing Admins from changing their own role, since no AC
    requires it — flagging this for reviewer confirmation.
  - |
    Audit log entries are kept in an in-memory list only for this story (no durability across
    process restarts). Long-term audit log storage/retention is assumed to be a separate,
    later concern for the epic.

package_dependencies:
  - name: vitest
    version: ^2.1.0
    ecosystem: npm
    rationale: |
      No test framework exists in the repo yet; Vitest is used to write and run the
      failing-tests-first suite for this story.
  - name: typescript
    version: ^5.6.0
    ecosystem: npm
    rationale: |
      The domain/service/repository code and tests are written in TypeScript; no TS toolchain
      currently exists in the repo.

notes: |
  Codebase state: `git ls-files`-equivalent exploration shows only `README.md` and `.env` at the
  repo root (plus `.arc/` tooling scratch files) — there is no existing source tree, framework,
  or database to conform to, so this plan establishes the minimal project layout needed to do
  test-first work on this one story.

  Because this introduces a new module graph (test suite -> service -> repositories/error) across
  5 files, here is the call shape:

  ```mermaid
  flowchart TD
      T[tests/roleAssignmentService.test.ts] -->|drives| S[src/services/roleAssignmentService.ts]
      S -->|"actor.role !== Admin -> throw + log denial (AC3, AC5)"| E[src/errors/permissionDeniedError.ts]
      S -->|"getUser / updateUserRole (AC1, AC2)"| UR[src/repositories/userRepository.ts]
      S -->|"record ROLE_CHANGED / PERMISSION_DENIED (AC4, AC5)"| AR[src/repositories/auditLogRepository.ts]
      UR -->|"shape"| UD[src/domain/user.ts]
      AR -->|"shape"| AD[src/domain/auditLogEntry.ts]
      S -->|"shape"| RD[src/domain/role.ts]

      classDef touched fill:#f96,color:#000
      class T,S,E,UR,AR,UD,AD,RD touched
  ```

  All nodes above are files this plan creates; there are no pre-existing modules to integrate
  with. Future stories should replace the in-memory repositories with real persistence and add
  an API/auth layer that constructs the `actor: User` from a real session before calling
  `assignRole`.
