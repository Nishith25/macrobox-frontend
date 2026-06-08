// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";
import { applyMacroBoxTheme, getSavedTheme } from "./utils/theme";

export default function App() {
  useEffect(() => {
    applyMacroBoxTheme(getSavedTheme());
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}