// frontend/src/context/CartContext.tsx (FRONTEND)

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type PlanIncludedItem = {
  _id: string;
  title: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  qty: number;
};

export type CartItemType = "meal" | "challenge_plan";

export type CartItem = {
  _id: string;
  itemType?: CartItemType;
  challengeId?: string;
  title: string;
  description?: string;
  price: number;
  protein: number;
  calories: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  qty: number;
  planItems?: PlanIncludedItem[];
};

type AddToCartItem = {
  _id: string;
  itemType?: CartItemType;
  challengeId?: string;
  title: string;
  description?: string;
  price: number;
  protein?: number;
  calories?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  qty?: number;
  planItems?: PlanIncludedItem[];
};

type CartCtx = {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: AddToCartItem) => void;
  removeFromCart: (id: string, challengeId?: string) => void;
  increaseQty: (id: string, challengeId?: string) => void;
  decreaseQty: (id: string, challengeId?: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx>({} as CartCtx);

const cleanNumber = (value: any) => Number(value || 0);

const getPlanTitle = (challengeId?: string) => {
  if (!challengeId) return "MacroBox Challenge Plan";

  const pretty = String(challengeId)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `${pretty} Challenge Plan`;
};

const getCartKey = (item: { _id: string; challengeId?: string }) =>
  `${item._id}__${item.challengeId || "normal"}`;

const getPlanCartKey = (challengeId: string) =>
  `plan-${challengeId}__${challengeId}`;

const makeIncludedItem = (item: any): PlanIncludedItem => ({
  _id: String(item._id || item.mealId || crypto.randomUUID()),
  title: item.title || "Meal Item",
  price: cleanNumber(item.price),
  protein: cleanNumber(item.protein),
  calories: cleanNumber(item.calories),
  carbs: cleanNumber(item.carbs),
  fat: cleanNumber(item.fat),
  qty: Number(item.qty || 1),
});

const buildPlanDescription = (items: PlanIncludedItem[]) => {
  if (!items.length) return "Includes selected MacroBox challenge meals.";

  return `Includes ${items.length} item${items.length > 1 ? "s" : ""}: ${items
    .map((item) => `${item.title} × ${item.qty}`)
    .join(", ")}`;
};

const buildPlanFromItems = (
  challengeId: string,
  items: PlanIncludedItem[],
  title?: string,
  imageUrl?: string
): CartItem => {
  const price = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const protein = items.reduce((sum, item) => sum + item.protein * item.qty, 0);
  const calories = items.reduce(
    (sum, item) => sum + item.calories * item.qty,
    0
  );
  const carbs = items.reduce((sum, item) => sum + item.carbs * item.qty, 0);
  const fat = items.reduce((sum, item) => sum + item.fat * item.qty, 0);

  return {
    _id: `plan-${challengeId}`,
    itemType: "challenge_plan",
    challengeId,
    title: title || getPlanTitle(challengeId),
    description: buildPlanDescription(items),
    price,
    protein,
    calories,
    carbs,
    fat,
    imageUrl,
    qty: 1,
    planItems: items,
  };
};

const normalizeNormalItem = (item: any): CartItem => ({
  _id: String(item._id),
  itemType: item.itemType || "meal",
  challengeId: item.challengeId || "",
  title: item.title || "Meal",
  description: item.description || "",
  price: cleanNumber(item.price),
  protein: cleanNumber(item.protein),
  calories: cleanNumber(item.calories),
  carbs: cleanNumber(item.carbs),
  fat: cleanNumber(item.fat),
  imageUrl: item.imageUrl,
  qty: Number(item.qty || 1),
  planItems: Array.isArray(item.planItems) ? item.planItems : undefined,
});

const normalizeCart = (items: any[]): CartItem[] => {
  const normalItems: CartItem[] = [];
  const challengeGroups = new Map<
    string,
    {
      title?: string;
      imageUrl?: string;
      items: PlanIncludedItem[];
    }
  >();

  for (const item of items) {
    const itemType = item.itemType || "";

    if (itemType === "challenge_plan") {
      const challengeId = String(item.challengeId || item._id || "").replace(
        "plan-",
        ""
      );

      const planItems = Array.isArray(item.planItems)
        ? item.planItems.map(makeIncludedItem)
        : [];

      const finalPlanItems =
        planItems.length > 0 ? planItems : [makeIncludedItem(item)];

      normalItems.push(
        buildPlanFromItems(
          challengeId,
          finalPlanItems,
          item.title || getPlanTitle(challengeId),
          item.imageUrl
        )
      );

      continue;
    }

    if (item.challengeId) {
      const challengeId = String(item.challengeId);
      const existing = challengeGroups.get(challengeId);

      if (existing) {
        existing.items.push(makeIncludedItem(item));
      } else {
        challengeGroups.set(challengeId, {
          title: item.planTitle || getPlanTitle(challengeId),
          imageUrl: item.imageUrl,
          items: [makeIncludedItem(item)],
        });
      }

      continue;
    }

    normalItems.push(normalizeNormalItem(item));
  }

  const groupedPlans = Array.from(challengeGroups.entries()).map(
    ([challengeId, group]) =>
      buildPlanFromItems(challengeId, group.items, group.title, group.imageUrl)
  );

  return [...normalItems, ...groupedPlans];
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem("macrobox_cart");
      const parsed = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(parsed)) return [];

      return normalizeCart(parsed);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("macrobox_cart", JSON.stringify(cart));
  }, [cart]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const addToCart = (item: AddToCartItem) => {
    setCart((prev) => {
      const cleanPrev = normalizeCart(prev);

      if (item.challengeId) {
        const challengeId = String(item.challengeId);
        const planKey = getPlanCartKey(challengeId);

        const incomingPlanItems =
          item.itemType === "challenge_plan" && Array.isArray(item.planItems)
            ? item.planItems.map(makeIncludedItem)
            : [makeIncludedItem(item)];

        const existingIndex = cleanPrev.findIndex(
          (cartItem) =>
            cartItem.itemType === "challenge_plan" &&
            getCartKey(cartItem) === planKey
        );

        if (existingIndex >= 0) {
          const copy = [...cleanPrev];
          const existingPlan = copy[existingIndex];

          const mergedItems = [...(existingPlan.planItems || [])];

          for (const incoming of incomingPlanItems) {
            const matchIndex = mergedItems.findIndex(
              (planItem) => planItem._id === incoming._id
            );

            if (matchIndex >= 0) {
              mergedItems[matchIndex] = {
                ...mergedItems[matchIndex],
                qty: mergedItems[matchIndex].qty + incoming.qty,
              };
            } else {
              mergedItems.push(incoming);
            }
          }

          copy[existingIndex] = buildPlanFromItems(
            challengeId,
            mergedItems,
            existingPlan.title || item.title || getPlanTitle(challengeId),
            item.imageUrl || existingPlan.imageUrl
          );

          return copy;
        }

        return [
          ...cleanPrev,
          buildPlanFromItems(
            challengeId,
            incomingPlanItems,
            item.itemType === "challenge_plan"
              ? item.title
              : getPlanTitle(challengeId),
            item.imageUrl
          ),
        ];
      }

      const incomingKey = getCartKey({
        _id: item._id,
        challengeId: "",
      });

      const index = cleanPrev.findIndex(
        (cartItem) => getCartKey(cartItem) === incomingKey
      );

      if (index >= 0) {
        const copy = [...cleanPrev];

        copy[index] = {
          ...copy[index],
          qty: copy[index].qty + Number(item.qty || 1),
          price: cleanNumber(item.price || copy[index].price),
          protein: cleanNumber(item.protein || copy[index].protein),
          calories: cleanNumber(item.calories || copy[index].calories),
          carbs: cleanNumber(item.carbs || copy[index].carbs),
          fat: cleanNumber(item.fat || copy[index].fat),
          imageUrl: item.imageUrl || copy[index].imageUrl,
        };

        return copy;
      }

      return [
        ...cleanPrev,
        {
          _id: String(item._id),
          itemType: "meal",
          challengeId: "",
          title: item.title,
          description: item.description || "",
          price: cleanNumber(item.price),
          protein: cleanNumber(item.protein),
          calories: cleanNumber(item.calories),
          carbs: cleanNumber(item.carbs),
          fat: cleanNumber(item.fat),
          imageUrl: item.imageUrl,
          qty: Number(item.qty || 1),
        },
      ];
    });
  };

  const removeFromCart = (id: string, challengeId?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) => getCartKey(item) !== getCartKey({ _id: id, challengeId })
      )
    );
  };

  const increaseQty = (id: string, challengeId?: string) => {
    setCart((prev) =>
      prev.map((item) =>
        getCartKey(item) === getCartKey({ _id: id, challengeId })
          ? { ...item, qty: item.qty + 1 }
          : item
      )
    );
  };

  const decreaseQty = (id: string, challengeId?: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          getCartKey(item) === getCartKey({ _id: id, challengeId })
            ? { ...item, qty: item.qty - 1 }
            : item
        )
        .filter((item) => item.qty > 0)
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