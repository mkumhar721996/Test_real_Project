summary: |
  This repository is currently empty (only a README, `.env`, and git metadata — no
  application code, package manifest, or framework exists yet). This plan introduces the
  smallest possible scaffold needed to implement and test-verify an authentication guard for
  the defect creation route: a React + TypeScript + Vite app with React Router v6, a minimal
  `AuthContext`/`useAuth` stub exposing an `isAuthenticated` flag, a `RequireAuth` guard
  component, and placeholder `LoginPage`/`DefectCreationPage` components. The guard is the
  only behavior under test here: unauthenticated visits to the defect creation route redirect
  to `/login` without rendering the form, and authenticated visits render the form. Full
  defect-form fields, role-based visibility, and 'New' status handling belong to sibling
  stories under the parent epic and are explicitly out of scope.

scope:
  - description: |
      Minimal project scaffold: `package.json`, `tsconfig.json`, `vite.config.ts`,
      `index.html`, and `src/main.tsx` bootstrapping a `BrowserRouter`-wrapped `<App />`.
      No existing scaffold exists in the repo to build on.
    files:
      - package.json
      - tsconfig.json
      - vite.config.ts
      - index.html
      - src/main.tsx
    rationale: |
      There is no application code in the repo at all (confirmed via full-tree search — only
      README.md, .env, and .git exist). A guard component cannot be built, run, or tested
      without a minimal app shell and router to guard a real route.

  - description: |
      Minimal auth stub: `src/auth/AuthContext.tsx` exporting a context and `useAuth()` hook
      with shape `{ isAuthenticated: boolean }`, default `{ isAuthenticated: false }`.
      ```tsx
      import { createContext, useContext } from "react";

      export type AuthState = { isAuthenticated: boolean };

      export const AuthContext = createContext<AuthState>({ isAuthenticated: false });

      export const useAuth = (): AuthState => useContext(AuthContext);
      ```
    files:
      - src/auth/AuthContext.tsx
    rationale: |
      The guard needs a source of truth for "logged in" state to branch on. No real
      login/session mechanism exists yet (no backend, no token storage) — this stub is
      deliberately minimal so tests can drive it directly via `AuthContext.Provider`.

  - description: |
      Guard component `src/auth/RequireAuth.tsx` that redirects to `/login` when
      unauthenticated, otherwise renders its children.
      ```tsx
      import { Navigate } from "react-router-dom";
      import { useAuth } from "./AuthContext";

      export function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
        const { isAuthenticated } = useAuth();
        return isAuthenticated ? children : <Navigate to="/login" replace />;
      }
      ```
    files:
      - src/auth/RequireAuth.tsx
    rationale: |
      This is the component under test — it directly implements both acceptance criteria
      (redirect when logged out, render when logged in).

  - description: |
      Placeholder page components: `src/pages/LoginPage.tsx` (renders a
      `data-testid="login-page"` element) and `src/pages/defects/DefectCreationPage.tsx`
      (renders a `data-testid="defect-creation-form"` element). Both are intentionally empty
      shells with no real fields.
    files:
      - src/pages/LoginPage.tsx
      - src/pages/defects/DefectCreationPage.tsx
    rationale: |
      The guard needs a real login destination and a real "form" destination to test against.
      Actual form fields, role-based visibility, and submission-to-'New'-status logic belong
      to other stories under the parent epic and must not be built here.

  - description: |
      Route wiring in `src/App.tsx`: registers `/login` and wraps `/defects/new` with
      `RequireAuth`.
      ```tsx
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/defects/new"
          element={
            <RequireAuth>
              <DefectCreationPage />
            </RequireAuth>
          }
        />
      </Routes>
      ```
    files:
      - src/App.tsx
    rationale: |
      Ties the guard to the actual defect-creation URL so the acceptance criteria (which are
      phrased in terms of navigating to "the defect creation form URL") are testable
      end-to-end through routing, not just as an isolated component.

tests:
  - |
    AC1 — unauthenticated navigation to the defect creation URL redirects to login and never
    renders the form. File: `src/auth/RequireAuth.test.tsx` (written first, expected to fail
    against a stub/missing `RequireAuth`).
    ```tsx
    import { render, screen } from "@testing-library/react";
    import { MemoryRouter } from "react-router-dom";
    import { AuthContext } from "../auth/AuthContext";
    import { App } from "../App";

    test("redirects unauthenticated user from defect creation to login", () => {
      render(
        <AuthContext.Provider value={{ isAuthenticated: false }}>
          <MemoryRouter initialEntries={["/defects/new"]}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.queryByTestId("defect-creation-form")).not.toBeInTheDocument();
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
    ```
  - |
    AC2 — authenticated navigation to the defect creation URL renders the form. File:
    `src/auth/RequireAuth.test.tsx` (same file, second case, written first and expected to
    fail until routes/guard exist).
    ```tsx
    test("renders defect creation form for authenticated user", () => {
      render(
        <AuthContext.Provider value={{ isAuthenticated: true }}>
          <MemoryRouter initialEntries={["/defects/new"]}>
            <App />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(screen.getByTestId("defect-creation-form")).toBeInTheDocument();
      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });
    ```

assumptions_or_open_questions:
  - |
    The repo has zero existing code or manifest, so the tech stack (React 18 + TypeScript +
    Vite + React Router v6, Vitest + React Testing Library for tests) is chosen here rather
    than inferred from convention. If a different stack is intended for this project, this
    plan needs to be redone against it before implementation.
  - |
    Assumed the defect creation form's route is `/defects/new`. No routing convention exists
    yet in the repo to confirm this; it may need to be reconciled with whatever URL sibling
    stories in the parent epic (the actual form-building stories) end up using.
  - |
    `AuthContext`/`useAuth` here is a minimal, directly-injectable stub exposing only
    `isAuthenticated`. It does not implement real login, session persistence, or token
    storage — that mechanism is assumed to be built by a separate story, and this guard is
    written to consume whatever real auth state that story eventually provides through the
    same `useAuth()` seam.
  - |
    `LoginPage` and `DefectCreationPage` are empty placeholders (a single test-id marker each)
    on purpose — building out their real content is explicitly the parent epic's job, not
    this story's.

package_dependencies:
  - name: react
    version: ^18.3.1
    ecosystem: npm
    rationale: Runtime UI library for the app shell, guard, and page components; nothing in the repo currently provides this.
  - name: react-dom
    version: ^18.3.1
    ecosystem: npm
    rationale: DOM renderer paired with react, required to mount the app in main.tsx.
  - name: react-router-dom
    version: ^6.26.0
    ecosystem: npm
    rationale: Provides Routes/Route/Navigate used to implement the redirect-on-unauthenticated behavior and to route /login and /defects/new.
  - name: typescript
    version: ^5.5.4
    ecosystem: npm
    rationale: Type-checked source for AuthContext/RequireAuth/pages per the .tsx signatures in this plan.
  - name: vite
    version: ^5.4.0
    ecosystem: npm
    rationale: Dev server/build tool for the new app scaffold; no build tooling currently exists in the repo.
  - name: "@vitejs/plugin-react"
    version: ^4.3.1
    ecosystem: npm
    rationale: Enables JSX/Fast Refresh support for React inside the Vite scaffold.
  - name: vitest
    version: ^2.0.5
    ecosystem: npm
    rationale: Test runner for the failing-first RequireAuth tests; no test runner exists in the repo yet.
  - name: "@testing-library/react"
    version: ^16.0.0
    ecosystem: npm
    rationale: Renders components and queries by data-testid in the RequireAuth tests.
  - name: "@testing-library/jest-dom"
    version: ^6.4.8
    ecosystem: npm
    rationale: Provides the toBeInTheDocument() matcher used in both test assertions.
  - name: jsdom
    version: ^24.1.0
    ecosystem: npm
    rationale: DOM environment for Vitest to render React components in tests without a real browser.

notes: |
  This plan is scaffold-heavy because the repository is genuinely greenfield: a full-tree
  search turned up only `README.md`, `.env`, and `.git` — no package manifest, no source
  directory, no framework choice made by any prior story. Every file listed under `scope` is
  new; there is no existing subsystem to diagram a boundary crossing against, so the mermaid
  diagram called for by "3+ files / crosses a layer boundary" is omitted per the "skip for a
  purely-additive plan" carve-out — there's nothing pre-existing to contrast the touched nodes
  against.

  TDD order: write `src/auth/RequireAuth.test.tsx` with both cases first (they fail because
  `App`, `RequireAuth`, `AuthContext`, and the page components don't exist yet), then add the
  scaffold and implementation files in the order listed under `scope` until both tests pass.
  Verify with:
  ```
  npm test -- src/auth/RequireAuth.test.tsx
  ```

  Route path and the exact shape of `AuthContext` are the two things most likely to need
  reconciliation once the rest of the epic's stories (real login flow, real defect form) land
  — flagged under `assumptions_or_open_questions` rather than guessed further.
