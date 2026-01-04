import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartItem = {
  _id: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  imageUrl?: string;
  qty: number;
};

type CartCtx = {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: any) => void;
  removeFromCart: (id: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx>({} as CartCtx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("macrobox_cart");
      return raw ? JSON.parse(raw) : [];
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

  const addToCart = (meal: any) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i._id === meal._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
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
          imageUrl: meal.imageUrl,
          qty: 1,
        },
      ];
    });
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i._id !== id));

  const increaseQty = (id: string) =>
    setCart((prev) => prev.map((i) => (i._id === id ? { ...i, qty: i.qty + 1 } : i)));

  const decreaseQty = (id: string) =>
    setCart((prev) =>
      prev
        .map((i) => (i._id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0)
    );

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider
      value={{ cart, cartCount, addToCart, removeFromCart, increaseQty, decreaseQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
