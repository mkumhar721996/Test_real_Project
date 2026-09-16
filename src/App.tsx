import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { DefectCreationPage } from "./pages/defects/DefectCreationPage";

export function App(): JSX.Element {
  return (
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
  );
}
