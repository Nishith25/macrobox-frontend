import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { Menu, X, Shield } from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setOpen(false);
  };

  const closeMenu = () => setOpen(false);

  return (
    <nav className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-4">

        {/* LOGO */}
        <Link
          to="/"
          onClick={closeMenu}
          className="text-2xl font-bold text-green-600 tracking-tight"
        >
          MacroBox
        </Link>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>

        {/* MENU */}
        <div
          className={`md:flex md:items-center md:space-x-6 absolute md:static left-0 w-full md:w-auto bg-white md:bg-transparent transition-all
            ${open ? "top-16 opacity-100" : "top-[-400px] opacity-0 md:opacity-100"}
            p-4 md:p-0 shadow-md md:shadow-none`}
        >
          {/* PUBLIC */}
          <Link to="/" onClick={closeMenu} className="block hover:text-green-600">
            Home
          </Link>

          <Link to="/meals" onClick={closeMenu} className="block hover:text-green-600">
            Meals
          </Link>

          {/* USER ONLY */}
          {isAuthenticated && (
            <Link
              to="/plan-my-day"
              onClick={closeMenu}
              className="block hover:text-green-600"
            >
              Plan My Day
            </Link>
          )}

          {/* ADMIN LINKS */}
          {isAdmin && (
            <div className="flex items-center gap-3 text-red-600 font-semibold">
              <Shield size={16} />
              <Link to="/admin/meals" onClick={closeMenu} className="hover:underline">
                Admin Meals
              </Link>
              <Link to="/admin/users" onClick={closeMenu} className="hover:underline">
                Users
              </Link>
            </div>
          )}

          {/* AUTH */}
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={closeMenu}
                className="block hover:text-green-600"
              >
                Dashboard
              </Link>

              {/* USER NAME + ROLE */}
              <span className="text-gray-600 text-sm px-2">
                Hi,{" "}
                <span className="font-semibold">
                  {user?.name?.split(" ")[0]}
                </span>
                {isAdmin && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                    ADMIN
                  </span>
                )}
              </span>

              <button
                onClick={handleLogout}
                className="block text-red-500 hover:text-red-600 font-medium"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu} className="block hover:text-green-600">
                Login
              </Link>
              <Link
                to="/signup"
                onClick={closeMenu}
                className="block hover:text-green-600 font-semibold"
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
