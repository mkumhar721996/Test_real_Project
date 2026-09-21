summary: |
  This story adds the authentication guard that governs access to the defect creation form.
  Nothing in the repository today models "logged in" state, a login page, or a router — the
  codebase so far is just the pure `createDefect` domain function and the presentational
  `DefectForm` component from the "Role-Based Assignee Field Visibility" story. Rather than
  inventing a router or a login page (neither of which any acceptance criterion asks for), this
  plan introduces a single router-agnostic `AuthGuard` component: given `isAuthenticated` and an
  `onUnauthenticated` callback, it renders its `children` only when authenticated, and otherwise
  renders nothing and immediately invokes `onUnauthenticated()` so the caller can perform whatever
  navigation-to-login mechanism the app eventually adopts. This keeps the guard itself fully
  testable and decoupled from a routing library that doesn't exist in this codebase yet, while
  still satisfying both acceptance criteria: unauthenticated access never mounts the form, and
  authenticated access renders it. The guard is exercised directly against the real `DefectForm`
  component (not a stand-in `div`) so the tests assert the actual "defect creation form" named in
  the acceptance criteria.
scope:
  - description: |
      Add an `AuthGuard` component that conditionally renders its children based on an
      `isAuthenticated` flag, and calls an `onUnauthenticated` callback (once, via an effect)
      when access is denied, instead of rendering anything.

      Signature:
      ```ts
      export interface AuthGuardProps {
        isAuthenticated: boolean;
        onUnauthenticated: () => void;
        children: ReactNode;
      }

      export function AuthGuard(props: AuthGuardProps): JSX.Element | null
      ```
    files:
      - src/components/AuthGuard.tsx
    rationale: |
      AC1 requires that an unauthenticated visit never renders the form and triggers a redirect;
      AC2 requires that an authenticated visit renders it. A small wrapper component is the
      right shape to assert both DOM-presence outcomes directly, and keeping the redirect as a
      caller-supplied callback (rather than calling a specific router API) avoids introducing a
      routing library this repo doesn't have and no AC asks for.
  - description: |
      Add `AuthGuard.test.tsx` exercising the guard with the real `DefectForm` as its children,
      covering both acceptance criteria against the actual defect creation form rather than a
      placeholder element.
    files:
      - src/components/AuthGuard.test.tsx
    rationale: |
      Using the real `DefectForm` (already in the codebase from the sibling assignee-visibility
      story) ties the test directly to "the defect creation form" as named in the acceptance
      criteria, instead of asserting only against a generic child node.
tests:
  - |
    AC1 — unauthenticated access redirects and never renders the form, in
    `src/components/AuthGuard.test.tsx`:
    ```tsx
    test('redirects to login and does not render the defect creation form when not authenticated', () => {
      const onUnauthenticated = jest.fn();
      render(
        <AuthGuard isAuthenticated={false} onUnauthenticated={onUnauthenticated}>
          <DefectForm role="Reporter" onSubmit={jest.fn()} />
        </AuthGuard>
      );
      expect(onUnauthenticated).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: /create defect/i })).not.toBeInTheDocument();
    });
    ```
    Minimal code to pass: in `AuthGuard.tsx`, when `!isAuthenticated`, return `null` from render
    (so the form never mounts) and call `onUnauthenticated()` in a `useEffect` keyed on
    `isAuthenticated`.
  - |
    AC2 — authenticated access renders the form and does not redirect, in
    `src/components/AuthGuard.test.tsx`:
    ```tsx
    test('renders the defect creation form and does not redirect when authenticated', () => {
      const onUnauthenticated = jest.fn();
      render(
        <AuthGuard isAuthenticated onUnauthenticated={onUnauthenticated}>
          <DefectForm role="Reporter" onSubmit={jest.fn()} />
        </AuthGuard>
      );
      expect(onUnauthenticated).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /create defect/i })).toBeInTheDocument();
    });
    ```
    Minimal code to pass: when `isAuthenticated` is `true`, `AuthGuard` renders `children`
    unchanged and the effect's guard clause prevents `onUnauthenticated` from firing.
assumptions_or_open_questions:
  - |
    No routing library (e.g. react-router) exists anywhere in this repository yet, and no
    acceptance criterion asks for one. `AuthGuard` is therefore written as a router-agnostic
    wrapper: it takes an `onUnauthenticated` callback rather than calling a specific navigation
    API, so it can later be wired to whatever routing mechanism the app adopts (e.g.
    `onUnauthenticated={() => navigate('/login')}`) without this story deciding that mechanism.
    Please confirm this is acceptable, or point to an intended router if one is already planned
    elsewhere in the epic.
  - |
    No login page component exists in the repository yet, and building one is not covered by
    either acceptance criterion (both are about the defect creation form's own access behavior).
    This story only implements the guard that would trigger navigation to a login page; the
    login page itself is assumed to belong to a separate authentication-focused story.
  - |
    No authentication/session module exists yet to supply a real "is this user logged in?"
    value. `AuthGuard` treats `isAuthenticated` as an externally supplied boolean prop, mirroring
    how the sibling "Role-Based Assignee Field Visibility" story treated `role` as supplied by
    "whatever authentication/session mechanism exists elsewhere" rather than implementing one.
  - |
    There is no router in this codebase, so "navigate to the defect creation form URL" is
    interpreted as "mount the guarded form route." The tests exercise this by rendering
    `AuthGuard` wrapping `DefectForm` directly, since there is no URL/route to navigate to yet.
  - |
    Assumed the redirect side effect should fire at most once per transition into the
    unauthenticated state (via a `useEffect` dependency on `isAuthenticated`) rather than on
    every render, to avoid calling `onUnauthenticated` repeatedly while unauthenticated content
    is (not) displayed.
package_dependencies: []
notes: |
  Diagram omitted: this is a small, additive change — one new component and its test file — that
  composes with the existing `DefectForm` at the same (presentational) layer rather than crossing
  a layer boundary, so a flowchart would not add information beyond the `scope`/`rationale` text
  above.

  Why the redirect is a callback and not a hard dependency on a router or `window.location`:
  calling `onUnauthenticated()` keeps `AuthGuard` a pure, easily-tested unit (assert it was
  called, rather than asserting on global navigation state or mocking a router), while still
  giving whoever wires up real routing later a single, obvious integration point.
