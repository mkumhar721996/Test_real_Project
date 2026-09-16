summary: |
  This plan implements immediate permission cutover on role change for
  TEST-REAL-PROJECT-STORY-003. The repository currently contains no
  application code, framework, or test tooling (only a README.md and a
  .env with ARC_DEV_PORT/ARC_WEB_PORT), so this story bootstraps a minimal
  domain layer — role/defect/session types, an in-memory user repository,
  pure visibility/edit permission functions, and a defect service that
  always re-resolves a user's role from the repository at the moment of
  each action. The core design choice that satisfies "no retention of
  prior access" is architectural rather than an add-on: permissions are
  never cached or snapshotted anywhere (not in the session, not in a
  permissions cache), so there is nothing stale to invalidate when a
  role changes — every view/edit check reads the live role directly.

scope:
  - description: |
      Bootstrap minimal Node.js/TypeScript project tooling and a Vitest
      test runner, since none exists in the repo yet.
    files:
      - package.json
      - tsconfig.json
      - vitest.config.ts
    rationale: |
      Required to write and run any of the failing tests below; no
      existing build/test convention exists to reuse.

  - description: |
      Define the core domain types shared by the rest of the module.

      ```ts
      export type RoleName = 'Reporter' | 'Developer' | 'Admin';

      export interface User {
        id: string;
        role: RoleName;
      }

      export interface Defect {
        id: string;
        submittedBy: string;
        assignedTo: string | null;
      }

      export interface Session {
        userId: string;
      }
      ```
    files:
      - src/domain/types.ts
    rationale: |
      `Session` deliberately carries only `userId`, never a role — this
      is what forces every check to resolve the *current* role instead
      of trusting a value captured earlier in the session (AC4, AC5).

  - description: |
      In-memory user store with role mutation.

      ```ts
      export class UserRepository {
        private users = new Map<string, User>();
        addUser(user: User): void { this.users.set(user.id, { ...user }); }
        getUser(id: string): User {
          const u = this.users.get(id);
          if (!u) throw new Error(`Unknown user ${id}`);
          return u;
        }
        updateRole(id: string, newRole: RoleName): void {
          const u = this.getUser(id);
          u.role = newRole;
        }
      }
      ```
    files:
      - src/domain/userRepository.ts
    rationale: |
      `updateRole` mutates the single stored record in place; there is
      no secondary cache/snapshot of role anywhere, so `getUser` always
      returns the live role (this is the mechanism behind AC4).

  - description: |
      In-memory defect store with lookup and update.

      ```ts
      export class DefectRepository {
        private defects = new Map<string, Defect>();
        addDefect(defect: Defect): void { this.defects.set(defect.id, { ...defect }); }
        getDefect(id: string): Defect {
          const d = this.defects.get(id);
          if (!d) throw new Error(`Unknown defect ${id}`);
          return d;
        }
        updateDefect(id: string, changes: Partial<Pick<Defect, 'assignedTo'>>): Defect {
          const d = this.getDefect(id);
          Object.assign(d, changes);
          return d;
        }
      }
      ```
    files:
      - src/domain/defectRepository.ts
    rationale: |
      Minimal persistence needed to exercise view/edit rules against
      concrete defect records in tests.

  - description: |
      Pure permission functions implementing the visibility/edit rules
      exercised by AC1-3, AC6-7.

      ```ts
      export function canViewDefect(user: User, defect: Defect): boolean {
        switch (user.role) {
          case 'Developer':
            return defect.assignedTo === user.id;
          case 'Reporter':
            return defect.submittedBy === user.id;
          case 'Admin':
            return true;
          default:
            return false;
        }
      }

      export function canEditDefect(user: User, defect: Defect): boolean {
        return canViewDefect(user, defect);
      }
      ```
    files:
      - src/domain/permissions.ts
    rationale: |
      Reporter visibility is bound to `submittedBy`; Developer visibility
      is bound to `assignedTo`. This is the minimal rule set consistent
      with every AC (a Reporter promoted to Developer gains
      assignment-based visibility and loses submission-based visibility;
      a Developer demoted to Reporter loses assignment-based visibility
      entirely). Edit permission mirrors view permission since no
      finer-grained edit rule is described in the ACs.

  - description: |
      Defect service that always re-fetches the user's current role
      before authorizing an action — this is what makes AC4/AC5 hold
      without any explicit cache-invalidation step.

      ```ts
      export class PermissionDeniedError extends Error {}

      export function viewDefect(
        session: Session,
        defectId: string,
        userRepo: UserRepository,
        defectRepo: DefectRepository
      ): Defect {
        const user = userRepo.getUser(session.userId);
        const defect = defectRepo.getDefect(defectId);
        if (!canViewDefect(user, defect)) {
          throw new PermissionDeniedError(`User ${user.id} cannot view defect ${defect.id}`);
        }
        return defect;
      }

      export function editDefect(
        session: Session,
        defectId: string,
        changes: Partial<Pick<Defect, 'assignedTo'>>,
        userRepo: UserRepository,
        defectRepo: DefectRepository
      ): Defect {
        const user = userRepo.getUser(session.userId);
        const defect = defectRepo.getDefect(defectId);
        if (!canEditDefect(user, defect)) {
          throw new PermissionDeniedError(`User ${user.id} cannot edit defect ${defect.id}`);
        }
        return defectRepo.updateDefect(defectId, changes);
      }
      ```
    files:
      - src/domain/defectService.ts
    rationale: |
      Both functions call `userRepo.getUser(session.userId)` fresh on
      every invocation rather than accepting a `User` object from the
      caller, so a role change is visible to the very next call using
      the same `Session` object (AC5) with no separate refresh step
      (AC4).

  - description: |
      Test suites, one file per concern, covering all 7 ACs.
    files:
      - tests/permissions.test.ts
      - tests/roleChangeStatelessness.test.ts
      - tests/defectService.test.ts
    rationale: |
      Splits pure-function permission tests (AC1-3) from the
      cache/statelessness proof (AC4/AC5) and the service-level
      edit-action tests (AC6-7), matching the layers above.

tests:
  - |
    AC1 — tests/permissions.test.ts
    Reporter promoted to Developer immediately gains visibility to a
    defect assigned to them:
    ```ts
    it('AC1: Reporter promoted to Developer gains visibility to defects assigned to them', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Reporter' });
      const defect: Defect = { id: 'd1', submittedBy: 'other', assignedTo: 'u1' };

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(false);

      userRepo.updateRole('u1', 'Developer');

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(true);
    });
    ```
    Fails first because `canViewDefect`/`UserRepository` do not exist yet.

  - |
    AC2 — tests/permissions.test.ts
    Reporter promoted to Developer immediately loses visibility to a
    defect they submitted but are not assigned to:
    ```ts
    it('AC2: Reporter promoted to Developer loses visibility to defects submitted but not assigned to them', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Reporter' });
      const defect: Defect = { id: 'd2', submittedBy: 'u1', assignedTo: 'other' };

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(true);

      userRepo.updateRole('u1', 'Developer');

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(false);
    });
    ```

  - |
    AC3 — tests/permissions.test.ts
    Developer demoted to Reporter immediately loses visibility to a
    defect previously assigned to them (not submitted by them):
    ```ts
    it('AC3: Developer demoted to Reporter loses visibility to defects assigned to (not submitted by) them', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Developer' });
      const defect: Defect = { id: 'd3', submittedBy: 'other', assignedTo: 'u1' };

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(true);

      userRepo.updateRole('u1', 'Reporter');

      expect(canViewDefect(userRepo.getUser('u1'), defect)).toBe(false);
    });
    ```

  - |
    AC4 — tests/roleChangeStatelessness.test.ts
    No cached view retains old-role permissions past the point of
    change; verified two ways — behaviorally, and by spying to prove
    the role is re-read on every call rather than memoized:
    ```ts
    it('AC4a: viewDefect reflects a role change immediately with no cache-clear step', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Reporter' });
      const defectRepo = new DefectRepository();
      defectRepo.addDefect({ id: 'd4', submittedBy: 'other', assignedTo: 'u1' });
      const session: Session = { userId: 'u1' };

      expect(() => viewDefect(session, 'd4', userRepo, defectRepo)).toThrow(PermissionDeniedError);

      userRepo.updateRole('u1', 'Developer');

      expect(viewDefect(session, 'd4', userRepo, defectRepo).id).toBe('d4');
    });

    it('AC4b: viewDefect re-reads the role from the repository on every call (no memoization)', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Developer' });
      const defectRepo = new DefectRepository();
      defectRepo.addDefect({ id: 'd5', submittedBy: 'other', assignedTo: 'u1' });
      const session: Session = { userId: 'u1' };
      const getUserSpy = vi.spyOn(userRepo, 'getUser');

      viewDefect(session, 'd5', userRepo, defectRepo);
      viewDefect(session, 'd5', userRepo, defectRepo);

      expect(getUserSpy).toHaveBeenCalledTimes(2);
    });
    ```

  - |
    AC5 — tests/roleChangeStatelessness.test.ts
    A role change mid-session (same `Session` object, unchanged
    `userId`) is enforced on the very next action:
    ```ts
    it('AC5: a role change mid-session is enforced on the next action using the same session', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Reporter' });
      const defectRepo = new DefectRepository();
      defectRepo.addDefect({ id: 'd6', submittedBy: 'other', assignedTo: 'u1' });
      const session: Session = { userId: 'u1' };

      expect(() => viewDefect(session, 'd6', userRepo, defectRepo)).toThrow(PermissionDeniedError);

      userRepo.updateRole('u1', 'Developer');

      expect(viewDefect(session, 'd6', userRepo, defectRepo).id).toBe('d6');
    });
    ```

  - |
    AC6 — tests/defectService.test.ts
    Reporter promoted to Developer can immediately edit a defect now
    assigned to them:
    ```ts
    it('AC6: Reporter promoted to Developer can immediately edit a defect now assigned to them', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Reporter' });
      const defectRepo = new DefectRepository();
      defectRepo.addDefect({ id: 'd7', submittedBy: 'other', assignedTo: 'u1' });
      const session: Session = { userId: 'u1' };
      userRepo.updateRole('u1', 'Developer');

      const updated = editDefect(session, 'd7', { assignedTo: 'u1' }, userRepo, defectRepo);

      expect(updated.assignedTo).toBe('u1');
    });
    ```

  - |
    AC7 — tests/defectService.test.ts
    Developer demoted to Reporter is immediately rejected editing a
    defect they were previously assigned to:
    ```ts
    it('AC7: Developer demoted to Reporter is immediately rejected editing a defect previously assigned to them', () => {
      const userRepo = new UserRepository();
      userRepo.addUser({ id: 'u1', role: 'Developer' });
      const defectRepo = new DefectRepository();
      defectRepo.addDefect({ id: 'd8', submittedBy: 'other', assignedTo: 'u1' });
      const session: Session = { userId: 'u1' };
      userRepo.updateRole('u1', 'Reporter');

      expect(() =>
        editDefect(session, 'd8', { assignedTo: 'u1' }, userRepo, defectRepo)
      ).toThrow(PermissionDeniedError);
    });
    ```

assumptions_or_open_questions:
  - |
    The repository has no existing application code, framework, or test
    tooling (only README.md and .env). This plan bootstraps a minimal
    Node.js + TypeScript + Vitest domain module purely to make these
    ACs concretely testable. If the real product uses a different
    stack, this scaffolding should be reconciled with it rather than
    kept as a second stack.
  - |
    Assumed visibility/edit rule set: Reporter visibility/edit is bound
    to `defect.submittedBy === user.id`; Developer visibility/edit is
    bound to `defect.assignedTo === user.id`. This is the minimal rule
    consistent with all 7 ACs, but the story text does not spell out
    the full Reporter/Developer rule table explicitly — only the
    before/after behavior on role change.
  - |
    Assumed edit permission equals view permission for Reporter and
    Developer (no separate, stricter edit rule is described anywhere
    in the ACs).
  - |
    Admin's visibility rule (full access) is not exercised by any AC in
    this story. `RoleName` includes `'Admin'` for consistency with the
    parent epic's three-role model, and `canViewDefect` defaults Admin
    to full visibility as a placeholder, but this branch is untested
    here and should be revisited by whichever story specifies Admin
    behavior explicitly.
  - |
    Modeled "session" as the minimal shape needed to prove AC4/AC5:
    an object holding only `userId`, resolved against the live
    `UserRepository` on every action. No real authentication/session
    infrastructure exists yet in the repo, so this is a stand-in
    abstraction, not a claim about how sessions will ultimately be
    implemented in the full application.

package_dependencies:
  - name: vitest
    version: ^2.1.0
    ecosystem: npm
    rationale: |
      No test runner exists in the repo; Vitest is used to write and
      run the failing-test-first suites for all 7 ACs.
  - name: typescript
    version: ^5.6.0
    ecosystem: npm
    rationale: |
      Domain code and tests are written in TypeScript for type-checked
      role/defect/session modeling; no TS toolchain exists yet.

notes: |
  Because the repo is currently empty of application code, "fit the
  real structure/conventions" isn't applicable in the usual sense —
  there are no conventions yet to match. The scope above is scoped as
  tightly as possible to just what these 7 ACs require: a role/defect
  model, pure permission predicates, and a service layer that never
  caches a resolved role. No HTTP layer, persistence beyond in-memory
  maps, or Admin-specific behavior is introduced, since none of that
  is exercised by this story's acceptance criteria.

  Call graph for the new module (all nodes are new in this story):

  ```mermaid
  flowchart TD
    T[Vitest test suites] --> S["defectService.ts<br/>viewDefect / editDefect"]
    S -->|"re-fetches role on every call (AC4, AC5)"| UR["userRepository.ts<br/>UserRepository"]
    S --> DR["defectRepository.ts<br/>DefectRepository"]
    S -->|"authorization check (AC1-3, AC6-7)"| P["permissions.ts<br/>canViewDefect / canEditDefect"]
    P --> TY["types.ts<br/>RoleName / User / Defect"]
    UR --> TY
    DR --> TY

    classDef touched fill:#f96,color:#000
    class T,S,UR,DR,P,TY touched
  ```
