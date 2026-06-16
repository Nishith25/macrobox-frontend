// frontend/src/App.tsx (FRONTEND)

import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import AppRouter from "./router/AppRouter";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AppRouter />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}