// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  useEffect(() => {
    const applyTheme = () => {
      const savedTheme = localStorage.getItem("macrobox_theme");

      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        document.body.style.background = "#020617";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.style.background = "#f6f7f8";
      }
    };

    applyTheme();

    window.addEventListener("storage", applyTheme);
    window.addEventListener("macrobox-theme-change", applyTheme);

    return () => {
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("macrobox-theme-change", applyTheme);
    };
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}