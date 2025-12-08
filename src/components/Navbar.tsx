import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react"; // optional icons

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">

        {/* LOGO */}
        <Link
          to="/"
          className="text-2xl font-bold text-green-600 tracking-tight"
        >
          MacroBox
        </Link>

        {/* MOBILE TOGGLE BUTTON */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* MENU */}
        <div
          className={`md:flex md:space-x-6 md:static absolute left-0 w-full md:w-auto bg-white md:bg-transparent transition-all 
            ${open ? "top-16 opacity-100" : "top-[-400px] opacity-0 md:opacity-100"}
            p-4 md:p-0 shadow-md md:shadow-none`}
        >
          <Link to="/" className="block md:inline hover:text-green-600">
            Home
          </Link>

          <Link to="/meals" className="block md:inline hover:text-green-600">
            Meals
          </Link>

          <Link to="/plan-my-day" className="block md:inline hover:text-green-600">
            Plan My Day
          </Link>

          {/* ADMIN ONLY */}
          {isAdmin && (
            <Link
              to="/admin"
              className="block md:inline hover:text-green-600 font-semibold text-blue-600"
            >
              Admin Panel
            </Link>
          )}

          {/* AUTH MENU */}
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="block md:inline hover:text-green-600"
              >
                Dashboard
              </Link>

              {/* Show User Name */}
              <span className="text-gray-600 text-sm md:text-base px-2">
                Hi, <span className="font-semibold">{user?.name?.split(" ")[0]}</span>
              </span>

              <button
                onClick={handleLogout}
                className="block md:inline hover:text-red-600 text-red-500 font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block md:inline hover:text-green-600"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="block md:inline hover:text-green-600 font-semibold"
              >
                Signup
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
