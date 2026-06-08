// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./router/AppRouter";

function applySavedTheme() {
  const savedTheme = localStorage.getItem("macrobox_theme");
  const theme = savedTheme === "dark" ? "dark" : "light";

  document.documentElement.classList.remove("dark");
  document.documentElement.removeAttribute("data-theme");

  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.style.background = "#020617";
    document.body.style.color = "#f8fafc";
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.style.background = "#f6f7f8";
    document.body.style.color = "#0f172a";
  }
}

export default function App() {
  useEffect(() => {
    applySavedTheme();

    const handleThemeChange = () => applySavedTheme();

    window.addEventListener("macrobox-theme-change", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);

    return () => {
      window.removeEventListener("macrobox-theme-change", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
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