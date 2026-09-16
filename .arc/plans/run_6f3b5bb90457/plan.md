summary: |
  This is a greenfield repository (only a README and a `.env` exist today — no
  package manifest, source tree, or test runner). This plan bootstraps the
  minimal project scaffolding and implements the Role Definition story as a
  small, framework-free domain module: a `Role`/`Permission` model, an
  `Account` type with role-defaulting and admin-gated role changes, and a
  fail-closed access-check gate. This module becomes the single source of
  truth that every later story (defect CRUD, auth, UI) will import rather than
  re-implementing permission logic, per the parent epic ("User Roles &
  Permissions"). Each of the 10 acceptance criteria maps to exactly one
  failing test written before its implementation.

scope:
  - description: |
      Bootstrap minimal TypeScript + Jest project tooling (no existing
      manifest/config in the repo).
    files:
      - package.json
      - tsconfig.json
      - jest.config.js
    rationale: |
      The repo currently has no `package.json` or test runner at all, so
      there is nothing to run the test-first tests against until this exists.
  - description: |
      Define the `Role` enum, `Permission` enum, and the `ROLE_PERMISSIONS`
      matrix plus `hasPermission(role, permission): boolean`.
    files:
      - src/domain/roles.ts
      - tests/domain/roles.test.ts
    rationale: |
      AC1-AC4 require exactly three roles and an authoritative,
      inspectable mapping of each role to its permitted actions.
  - description: |
      Define `Account` (`{ id: string; role: Role }`) and
      `createAccount(input: { id: string; role?: Role }): Account`, defaulting
      to `Role.Reporter` when `role` is omitted.
    files:
      - src/domain/accounts.ts
      - tests/domain/accounts.test.ts
    rationale: |
      AC1 (exactly one role per account) and AC8 (default to Reporter) are
      properties of account creation, not of the role/permission matrix
      itself.
  - description: |
      Add `changeRole(actingAccount, targetAccount, newRole): Account`,
      throwing `NotAuthorizedError` (and leaving the target unchanged) unless
      `actingAccount.role` has the `ChangeUserRole` permission.
    files:
      - src/domain/accounts.ts
      - tests/domain/accounts.test.ts
    rationale: |
      AC9/AC10 are specifically about mutating another account's role and
      require an admin-only guard distinct from generic `hasPermission`
      lookups.
  - description: |
      Add a fail-closed access gate, `checkAccess(account, permission,
      resolve)`, that returns `{ allowed: false }` (no `data` key) unless the
      role has the permission AND `resolve()` completes without throwing;
      any thrown error (simulating a backend error/timeout) also denies.
    files:
      - src/domain/access.ts
      - tests/domain/access.test.ts
    rationale: |
      AC5-AC7 are about the enforcement boundary, not the permission table:
      unlisted actions must be denied, denials must leak no resource data,
      and backend failures must fail closed rather than open.

tests:
  - |
    AC1 — `tests/domain/roles.test.ts`:
    ```ts
    it('Role enum has exactly Reporter, Developer, Admin', () => {
      expect(Object.values(Role).sort()).toEqual(['Admin', 'Developer', 'Reporter']);
    });
    ```
    Combined with the `accounts.test.ts` AC1 case below (an account exposes a
    single `role` field, not a list), this covers "exactly one role."
  - |
    AC2 — `tests/domain/roles.test.ts`:
    ```ts
    it('Reporter may submit and view only own defects', () => {
      expect(hasPermission(Role.Reporter, Permission.SubmitDefect)).toBe(true);
      expect(hasPermission(Role.Reporter, Permission.ViewOwnDefects)).toBe(true);
      expect(hasPermission(Role.Reporter, Permission.ViewAnyDefect)).toBe(false);
    });
    ```
  - |
    AC3 — `tests/domain/roles.test.ts`:
    ```ts
    it('Developer may view/update status of assigned defects only', () => {
      expect(hasPermission(Role.Developer, Permission.ViewAssignedDefects)).toBe(true);
      expect(hasPermission(Role.Developer, Permission.UpdateAssignedDefectStatus)).toBe(true);
      expect(hasPermission(Role.Developer, Permission.DeleteDefect)).toBe(false);
    });
    ```
  - |
    AC4 — `tests/domain/roles.test.ts`:
    ```ts
    it('Admin may create/view/edit/reassign/delete/comment on any defect', () => {
      for (const p of [Permission.CreateDefect, Permission.ViewAnyDefect, Permission.EditDefect,
        Permission.ReassignDefect, Permission.DeleteDefect, Permission.CommentOnDefect]) {
        expect(hasPermission(Role.Admin, p)).toBe(true);
      }
    });
    ```
  - |
    AC5 — `tests/domain/access.test.ts`:
    ```ts
    it('denies an action not listed under the role\'s permissions', () => {
      const reporter = createAccount({ id: 'u5', role: Role.Reporter });
      const result = checkAccess(reporter, Permission.DeleteDefect, () => ({ id: 'defect-1' }));
      expect(result.allowed).toBe(false);
    });
    ```
  - |
    AC6 — `tests/domain/access.test.ts`:
    ```ts
    it('exposes no resource data when denied', () => {
      const reporter = createAccount({ id: 'u6', role: Role.Reporter });
      const result = checkAccess(reporter, Permission.ViewAnyDefect, () => ({ secret: 'classified' }));
      expect(result.allowed).toBe(false);
      expect((result as { data?: unknown }).data).toBeUndefined();
    });
    ```
  - |
    AC7 — `tests/domain/access.test.ts`:
    ```ts
    it('denies access when the permission check/resolver throws (backend error/timeout)', () => {
      const admin = createAccount({ id: 'admin2', role: Role.Admin });
      const result = checkAccess(admin, Permission.ViewAnyDefect, () => {
        throw new Error('backend timeout');
      });
      expect(result.allowed).toBe(false);
    });
    ```
  - |
    AC8 — `tests/domain/accounts.test.ts`:
    ```ts
    it('assigns Reporter when no role is specified', () => {
      const account = createAccount({ id: 'u2' });
      expect(account.role).toBe(Role.Reporter);
    });
    ```
  - |
    AC9 — `tests/domain/accounts.test.ts`:
    ```ts
    it('lets an Admin change another account\'s role', () => {
      const admin = createAccount({ id: 'admin1', role: Role.Admin });
      const target = createAccount({ id: 'u3', role: Role.Reporter });
      const updated = changeRole(admin, target, Role.Developer);
      expect(updated.role).toBe(Role.Developer);
    });
    ```
  - |
    AC10 — `tests/domain/accounts.test.ts`:
    ```ts
    it('denies a non-Admin attempting to change any account\'s role', () => {
      const developer = createAccount({ id: 'dev1', role: Role.Developer });
      const target = createAccount({ id: 'u4', role: Role.Reporter });
      expect(() => changeRole(developer, target, Role.Admin)).toThrow(NotAuthorizedError);
      expect(target.role).toBe(Role.Reporter);
    });
    ```

assumptions_or_open_questions:
  - |
    The repository has no existing language/framework/manifest of any kind
    (only `README.md` and `.env`). This plan picks TypeScript + Jest as a
    minimal, dependency-light default because the acceptance criteria
    describe pure domain rules with no UI or API surface specified. If the
    team has a different intended stack (e.g. Python, a specific backend
    framework), this plan's scaffolding step should be swapped out — the
    domain design (roles/permissions/accounts/access gate) would translate
    directly.
  - |
    Account persistence/storage is out of scope for this story. `Account` is
    modeled as a plain in-memory object; wiring it to a real datastore is
    left to whichever later story introduces user signup/login/storage.
  - |
    AC7's "backend error or timeout" is modeled generically as any exception
    thrown while checking permissions or resolving the protected resource,
    since no concrete backend/database/timeout mechanism exists yet in this
    codebase to simulate more specifically.
  - |
    The specific permission identifiers (`SubmitDefect`, `ViewOwnDefects`,
    `ViewAssignedDefects`, `UpdateAssignedDefectStatus`, `CreateDefect`,
    `ViewAnyDefect`, `EditDefect`, `ReassignDefect`, `DeleteDefect`,
    `CommentOnDefect`, `ChangeUserRole`) are names invented to match the
    acceptance criteria's wording; later stories should reuse these exact
    identifiers rather than inventing parallel ones.
  - |
    "View own-submitted defects only" (AC2) and "assigned to them only"
    (AC3) describe row-level scoping (which defects), not just an
    action-level permission. This story only establishes the
    role-to-action permission table (`hasPermission`); the actual row-level
    filtering (e.g. `WHERE reporterId = :userId`) belongs to whichever
    story implements defect listing/querying, since no defect data model
    exists yet to filter.

package_dependencies:
  - name: typescript
    version: ^5.4.0
    ecosystem: npm
    rationale: |
      No manifest or compiler exists yet; the domain model and tests are
      written in TypeScript for the enum/type-safety that best expresses a
      closed 3-role, fixed-permission-set model (AC1-AC4).
  - name: jest
    version: ^29.7.0
    ecosystem: npm
    rationale: |
      No test runner exists yet; required to execute the failing-test-first
      suites for all 10 acceptance criteria.
  - name: ts-jest
    version: ^29.1.0
    ecosystem: npm
    rationale: Lets Jest run the TypeScript test/source files directly without a separate build step.
  - name: "@types/jest"
    version: ^29.5.0
    ecosystem: npm
    rationale: Type definitions for Jest globals (`describe`/`it`/`expect`) used in the TypeScript test files.
  - name: "@types/node"
    version: ^20.11.0
    ecosystem: npm
    rationale: Type definitions needed for the TypeScript compiler to type-check under Node.

notes: |
  Dependency shape within this story's own scope (`accounts.ts` and
  `access.ts` both depend on the `Role`/`Permission` model in `roles.ts`;
  `access.ts` also takes an `Account` produced by `accounts.ts`):

  ```mermaid
  flowchart TD
    roles[src/domain/roles.ts<br/>Role, Permission, hasPermission]
    accounts[src/domain/accounts.ts<br/>createAccount, changeRole]
    access[src/domain/access.ts<br/>checkAccess]
    rolesTest[tests/domain/roles.test.ts]
    accountsTest[tests/domain/accounts.test.ts]
    accessTest[tests/domain/access.test.ts]

    accounts -->|"uses hasPermission for changeRole's admin guard (AC9/AC10)"| roles
    access -->|"uses hasPermission to gate access (AC5)"| roles
    access -->|"takes Account produced by createAccount"| accounts
    rolesTest --> roles
    accountsTest --> accounts
    accessTest --> access

    classDef touched fill:#f96,color:#000
    class roles,accounts,access,rolesTest,accountsTest,accessTest touched
  ```

  No existing code was found to reuse or conflict with (the repo predates
  any implementation), so this plan is purely additive. Later stories that
  need row-level defect scoping (AC2/AC3) or an HTTP-layer enforcement point
  should import `hasPermission`/`checkAccess` from this module rather than
  re-deriving the role/permission table.
