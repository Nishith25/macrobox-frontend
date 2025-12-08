import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Verifying...");

  useEffect(() => {
    async function check() {
      try {
        const res = await axios.get(`${API}/api/auth/verify-email/${token}`);
        setMsg("Email verified! Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } catch {
        setMsg("Invalid or expired verification link.");
      }
    }
    check();
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <h1 className="text-xl font-bold">{msg}</h1>
    </div>
  );
}
