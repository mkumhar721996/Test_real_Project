import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import { AuthContext } from "./AuthContext";
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
