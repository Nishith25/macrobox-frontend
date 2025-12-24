import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Missing verification token.");
      return;
    }

    async function verify() {
      try {
        const res = await axios.get(`${API}/api/auth/verify-email/${token}`);

        setStatus("success");

        // Redirect after 2 sec
        setTimeout(() => navigate("/login"), 2000);
      } catch (error: any) {
        const msg =
          error?.response?.data?.message ||
          "Invalid or expired verification link.";

        setErrorMessage(msg);
        setStatus("error");
      }
    }

    verify();
  }, [token, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md text-center">

        {/* LOADING */}
        {status === "loading" && (
          <>
            <div className="animate-spin h-12 w-12 mx-auto border-4 border-green-600 border-t-transparent rounded-full mb-4"></div>
            <h1 className="text-xl font-bold text-gray-700">
              Verifying your email...
            </h1>
            <p className="text-gray-500 mt-2">Please wait a moment.</p>
          </>
        )}

        {/* SUCCESS */}
        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              Email Verified! 🎉
            </h1>
            <p className="text-gray-600">Redirecting to login...</p>
          </>
        )}

        {/* ERROR */}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-2">
              Verification Failed ❌
            </h1>
            <p className="text-gray-600">{errorMessage}</p>

            <button
              onClick={() => navigate("/resend-verification")}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Resend Verification Email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
