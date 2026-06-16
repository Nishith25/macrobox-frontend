// frontend/src/pages/Checkout.tsx (FRONTEND)

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/cart", { replace: true });
    }, 600);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="min-h-screen bg-[#f2f3f5] px-4 py-14 text-slate-950 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-[720px] rounded-[22px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
          <ShoppingBag size={30} />
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950">
          Redirecting to Cart Checkout
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
          Your updated checkout flow is now inside the cart page, including
          address, plan schedule, coupons and Razorpay payment.
        </p>

        <button
          type="button"
          onClick={() => navigate("/cart", { replace: true })}
          className="mt-7 rounded-[14px] bg-green-600 px-7 py-3 text-sm font-black text-white transition hover:bg-green-700"
        >
          Go to Cart
        </button>
      </div>
    </main>
  );
}