import { useState } from "react";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setMode("login")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              mode === "login"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              mode === "signup"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Sign Up
          </button>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          {mode === "login" ? "Welcome back" : "Create your MacroBox account"}
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          {mode === "login"
            ? "Log in to manage your meal plans and subscriptions."
            : "Start your fitness journey with full-day macro-perfect meals."}
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            alert(`${mode.toUpperCase()} form submit (hook backend later)`);
          }}
        >
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Email address
            </label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg"
          >
            {mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
