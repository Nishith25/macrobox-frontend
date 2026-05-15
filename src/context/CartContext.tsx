// frontend/src/context/CartContext.tsx (FRONTEND)
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  _id: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  qty: number;
};

type AddToCartItem = {
  _id: string;
  title: string;
  price: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
};

type CartCtx = {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: AddToCartItem) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx>({} as CartCtx);

const normalizeCartItem = (item: any): CartItem => ({
  _id: item._id,
  title: item.title,
  price: Number(item.price || 0),
  protein: Number(item.protein || 0),
  calories: Number(item.calories || 0),
  carbs: Number(item.carbs || 0),
  fat: Number(item.fat || 0),
  imageUrl: item.imageUrl,
  qty: Number(item.qty || 1),
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("macrobox_cart");
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) return [];

      // ✅ Migrates old cart items that do not have carbs/fat
      return parsed.map(normalizeCartItem);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("macrobox_cart", JSON.stringify(cart));
  }, [cart]);

  const cartCount = useMemo(
    () => cart.reduce((sum, i) => sum + i.qty, 0),
    [cart]
  );

  const addToCart = (meal: AddToCartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i._id === meal._id);

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          qty: copy[idx].qty + 1,

          // ✅ keep latest nutrition values if admin updated meal
          price: Number(meal.price || copy[idx].price || 0),
          protein: Number(meal.protein || copy[idx].protein || 0),
          calories: Number(meal.calories || copy[idx].calories || 0),
          carbs: Number(meal.carbs || copy[idx].carbs || 0),
          fat: Number(meal.fat || copy[idx].fat || 0),
          imageUrl: meal.imageUrl || copy[idx].imageUrl,
        };
        return copy;
      }

      return [
        ...prev,
        {
          _id: meal._id,
          title: meal.title,
          price: Number(meal.price || 0),
          protein: Number(meal.protein || 0),
          calories: Number(meal.calories || 0),
          carbs: Number(meal.carbs || 0),
          fat: Number(meal.fat || 0),
          imageUrl: meal.imageUrl,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
  };

  const increaseQty = (id: string) => {
    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, qty: i.qty + 1 } : i))
    );
  };

  const decreaseQty = (id: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i._id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);