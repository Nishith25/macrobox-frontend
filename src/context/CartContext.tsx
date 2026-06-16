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

export type PlanDay = {
  day: number;
  date: string;
  slot: string;
  preference: "veg" | "nonveg" | "mixed";
  selectedMeal: string;
  selectedMealTitle: string;
  selectedMealPrice: number;
  selectedMealProtein: number;
  selectedMealCalories: number;
  selectedMealCarbs: number;
  selectedMealFat: number;
  alternativeMeal?: string;
  alternativeMealTitle?: string;
};

export type CartItemType = "meal" | "plan" | "challenge_plan";

export type CartItem = {
  _id: string;
  itemType?: CartItemType;

  // New plan ID
  planId?: string;

  // Old compatibility ID
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
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
};

type AddToCartItem = {
  _id: string;
  itemType?: CartItemType;
  planId?: string;
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
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
  planItems?: PlanIncludedItem[];
  planDays?: PlanDay[];
};

type CartCtx = {
  cart: CartItem[];
  cartCount: number;
  addToCart: (item: AddToCartItem) => void;
  removeFromCart: (id: string, planId?: string) => void;
  increaseQty: (id: string, planId?: string) => void;
  decreaseQty: (id: string, planId?: string) => void;
  updatePlanDays: (id: string, planId: string, planDays: PlanDay[]) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx>({} as CartCtx);

const cleanNumber = (value: any) => Number(value || 0);

const safeRandomId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isPlanItem = (item: any) => {
  return (
    item?.itemType === "plan" ||
    item?.itemType === "challenge_plan" ||
    Boolean(item?.planId) ||
    Boolean(item?.challengeId)
  );
};

const getFinalPlanId = (item: { planId?: string; challengeId?: string; _id?: string }) => {
  const raw = String(item.planId || item.challengeId || item._id || "")
    .replace(/^plan-/, "")
    .trim();

  return raw;
};

const getPlanTitle = (planId?: string) => {
  if (!planId) return "MacroBox Meal Plan";

  const pretty = String(planId)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return `${pretty} Meal Plan`;
};

const getCartKey = (item: { _id: string; planId?: string; challengeId?: string }) => {
  const finalPlanId = getFinalPlanId(item);

  if (finalPlanId) {
    return `${item._id}__${finalPlanId}`;
  }

  return `${item._id}__normal`;
};

const getPlanCartKey = (planId: string) => `plan-${planId}__${planId}`;

const makeIncludedItem = (item: any): PlanIncludedItem => ({
  _id: String(item._id || item.mealId || item.meal || safeRandomId()),
  title: item.title || "Meal Item",
  price: cleanNumber(item.price),
  protein: cleanNumber(item.protein),
  calories: cleanNumber(item.calories),
  carbs: cleanNumber(item.carbs),
  fat: cleanNumber(item.fat),
  qty: Number(item.qty || 1),
});

const makePlanDay = (day: any): PlanDay => ({
  day: Number(day.day || 1),
  date: String(day.date || ""),
  slot: String(day.slot || ""),
  preference: ["veg", "nonveg", "mixed"].includes(day.preference)
    ? day.preference
    : "mixed",
  selectedMeal: String(day.selectedMeal || ""),
  selectedMealTitle: String(day.selectedMealTitle || "Meal"),
  selectedMealPrice: cleanNumber(day.selectedMealPrice),
  selectedMealProtein: cleanNumber(day.selectedMealProtein),
  selectedMealCalories: cleanNumber(day.selectedMealCalories),
  selectedMealCarbs: cleanNumber(day.selectedMealCarbs),
  selectedMealFat: cleanNumber(day.selectedMealFat),
  alternativeMeal: String(day.alternativeMeal || ""),
  alternativeMealTitle: String(day.alternativeMealTitle || ""),
});

const buildPlanDescription = (planDays: PlanDay[], fallbackCount: number) => {
  if (planDays.length > 0) {
    return `Daily delivery plan. Includes ${planDays.length} meals delivered across ${planDays.length} days.`;
  }

  return `Includes ${fallbackCount} selected plan item${
    fallbackCount > 1 ? "s" : ""
  }.`;
};

const buildPlanFromItems = ({
  planId,
  items,
  title,
  imageUrl,
  priceOverride,
  description,
  planDays,
  preference,
  rewardEligible,
}: {
  planId: string;
  items: PlanIncludedItem[];
  title?: string;
  imageUrl?: string;
  priceOverride?: number;
  description?: string;
  planDays?: PlanDay[];
  preference?: "veg" | "nonveg" | "mixed" | "";
  rewardEligible?: boolean;
}): CartItem => {
  const computedPrice = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  const protein = items.reduce((sum, item) => sum + item.protein * item.qty, 0);
  const calories = items.reduce(
    (sum, item) => sum + item.calories * item.qty,
    0
  );
  const carbs = items.reduce((sum, item) => sum + item.carbs * item.qty, 0);
  const fat = items.reduce((sum, item) => sum + item.fat * item.qty, 0);

  const finalPlanDays = Array.isArray(planDays)
    ? planDays.map(makePlanDay)
    : [];

  return {
    _id: `plan-${planId}`,
    itemType: "plan",
    planId,
    challengeId: planId,
    title: title || getPlanTitle(planId),
    description: description || buildPlanDescription(finalPlanDays, items.length),
    price: cleanNumber(priceOverride || computedPrice),
    protein,
    calories,
    carbs,
    fat,
    imageUrl,
    qty: 1,
    preference: preference || "mixed",
    rewardEligible: rewardEligible !== false,
    planItems: items,
    planDays: finalPlanDays,
  };
};

const normalizeNormalItem = (item: any): CartItem => ({
  _id: String(item._id),
  itemType: item.itemType || "meal",
  planId: "",
  challengeId: "",
  title: item.title || "Meal",
  description: item.description || "",
  price: cleanNumber(item.price),
  protein: cleanNumber(item.protein),
  calories: cleanNumber(item.calories),
  carbs: cleanNumber(item.carbs),
  fat: cleanNumber(item.fat),
  imageUrl: item.imageUrl,
  qty: Number(item.qty || 1),
});

const normalizeCart = (items: any[]): CartItem[] => {
  const normalItems: CartItem[] = [];
  const oldGroupedPlanItems = new Map<
    string,
    {
      title?: string;
      imageUrl?: string;
      items: PlanIncludedItem[];
    }
  >();

  for (const item of items) {
    if (isPlanItem(item)) {
      const planId = getFinalPlanId(item);

      if (!planId) {
        normalItems.push(normalizeNormalItem(item));
        continue;
      }

      const alreadyBuiltPlan =
        item.itemType === "plan" ||
        item.itemType === "challenge_plan" ||
        Array.isArray(item.planItems) ||
        Array.isArray(item.planDays);

      if (alreadyBuiltPlan) {
        const planItems = Array.isArray(item.planItems)
          ? item.planItems.map(makeIncludedItem)
          : [];

        const finalPlanItems =
          planItems.length > 0 ? planItems : [makeIncludedItem(item)];

        normalItems.push(
          buildPlanFromItems({
            planId,
            items: finalPlanItems,
            title: item.title || getPlanTitle(planId),
            imageUrl: item.imageUrl,
            priceOverride: item.price,
            description: item.description,
            planDays: item.planDays,
            preference: item.preference,
            rewardEligible: item.rewardEligible,
          })
        );

        continue;
      }

      // old cart style: individual meals with challengeId
      const existing = oldGroupedPlanItems.get(planId);

      if (existing) {
        existing.items.push(makeIncludedItem(item));
      } else {
        oldGroupedPlanItems.set(planId, {
          title: item.planTitle || getPlanTitle(planId),
          imageUrl: item.imageUrl,
          items: [makeIncludedItem(item)],
        });
      }

      continue;
    }

    normalItems.push(normalizeNormalItem(item));
  }

  const groupedPlans = Array.from(oldGroupedPlanItems.entries()).map(
    ([planId, group]) =>
      buildPlanFromItems({
        planId,
        items: group.items,
        title: group.title,
        imageUrl: group.imageUrl,
      })
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

      if (isPlanItem(item)) {
        const planId = getFinalPlanId(item);

        if (!planId) {
          return cleanPrev;
        }

        const planKey = getPlanCartKey(planId);

        const incomingPlanItems = Array.isArray(item.planItems)
          ? item.planItems.map(makeIncludedItem)
          : [makeIncludedItem(item)];

        const newPlan = buildPlanFromItems({
          planId,
          items: incomingPlanItems,
          title: item.title || getPlanTitle(planId),
          imageUrl: item.imageUrl,
          priceOverride: item.price,
          description: item.description,
          planDays: item.planDays,
          preference: item.preference,
          rewardEligible: item.rewardEligible,
        });

        const existingIndex = cleanPrev.findIndex(
          (cartItem) =>
            isPlanItem(cartItem) && getCartKey(cartItem) === planKey
        );

        if (existingIndex >= 0) {
          const copy = [...cleanPrev];
          copy[existingIndex] = newPlan;
          return copy;
        }

        return [...cleanPrev, newPlan];
      }

      const incomingKey = getCartKey({
        _id: item._id,
        planId: "",
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
          planId: "",
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

  const removeFromCart = (id: string, planId?: string) => {
    setCart((prev) =>
      normalizeCart(prev).filter(
        (item) =>
          getCartKey(item) !==
          getCartKey({
            _id: id,
            planId,
            challengeId: planId,
          })
      )
    );
  };

  const increaseQty = (id: string, planId?: string) => {
    setCart((prev) =>
      normalizeCart(prev).map((item) =>
        getCartKey(item) ===
        getCartKey({
          _id: id,
          planId,
          challengeId: planId,
        })
          ? {
              ...item,
              qty: item.itemType === "plan" ? 1 : item.qty + 1,
            }
          : item
      )
    );
  };

  const decreaseQty = (id: string, planId?: string) => {
    setCart((prev) =>
      normalizeCart(prev)
        .map((item) =>
          getCartKey(item) ===
          getCartKey({
            _id: id,
            planId,
            challengeId: planId,
          })
            ? {
                ...item,
                qty: item.itemType === "plan" ? 0 : item.qty - 1,
              }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const updatePlanDays = (id: string, planId: string, planDays: PlanDay[]) => {
    setCart((prev) =>
      normalizeCart(prev).map((item) =>
        getCartKey(item) ===
        getCartKey({
          _id: id,
          planId,
          challengeId: planId,
        })
          ? {
              ...item,
              planDays: planDays.map(makePlanDay),
            }
          : item
      )
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
        updatePlanDays,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);