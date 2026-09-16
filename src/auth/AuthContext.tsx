import { createContext, useContext } from "react";

export type AuthState = { isAuthenticated: boolean };

export const AuthContext = createContext<AuthState>({ isAuthenticated: false });

export const useAuth = (): AuthState => useContext(AuthContext);
