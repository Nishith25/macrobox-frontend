// frontend/src/data/challenges.ts

export type ChallengeGoal =
  | "fat_loss"
  | "muscle_gain"
  | "clean_eating"
  | "budget"
  | "couple"
  | "office";

export type ChallengeMeal = {
  day: number;
  title: string;
  description: string;
  calories: number;
  protein: number;
  price: number;
};

export type Challenge = {
  id: string;
  title: string;
  shortTitle: string;
  goal: ChallengeGoal;
  duration: number;
  mealsPerDay: number;
  caloriesRange: string;
  proteinRange: string;
  startingPrice: number;
  badge: string;
  color: "green" | "blue" | "orange" | "pink" | "purple" | "slate";
  description: string;
  benefits: string[];
  meals: ChallengeMeal[];
};

export const challenges: Challenge[] = [
  {
    id: "lean-box",
    title: "7-Day Lean Box",
    shortTitle: "Lean Box",
    goal: "fat_loss",
    duration: 7,
    mealsPerDay: 1,
    caloriesRange: "350–550 kcal",
    proteinRange: "25–45g protein",
    startingPrice: 149,
    badge: "Fat Loss",
    color: "green",
    description:
      "A 7-day high-protein, calorie-controlled meal challenge designed for fat loss and clean eating.",
    benefits: [
      "High-protein meals",
      "Low to moderate calories",
      "Helps control cravings",
      "Simple 7-day consistency plan",
    ],
    meals: [
      {
        day: 1,
        title: "Grilled Chicken Salad Box",
        description: "Lean chicken, veggies and light dressing.",
        calories: 420,
        protein: 38,
        price: 189,
      },
      {
        day: 2,
        title: "Paneer Tikka Macro Bowl",
        description: "Paneer, rice, vegetables and balanced spices.",
        calories: 510,
        protein: 31,
        price: 179,
      },
      {
        day: 3,
        title: "Egg Rice Fit Box",
        description: "Eggs, rice and clean seasoning.",
        calories: 460,
        protein: 34,
        price: 159,
      },
      {
        day: 4,
        title: "Chicken Protein Bowl",
        description: "Chicken, rice and salad combo.",
        calories: 540,
        protein: 42,
        price: 199,
      },
      {
        day: 5,
        title: "Mexican Rajma Protein Bowl",
        description: "Rajma, rice, salsa and veggies.",
        calories: 500,
        protein: 28,
        price: 149,
      },
      {
        day: 6,
        title: "Peri Peri Paneer Box",
        description: "Paneer, veggies and peri peri rice.",
        calories: 530,
        protein: 32,
        price: 179,
      },
      {
        day: 7,
        title: "Lean Chicken Rice Bowl",
        description: "Simple high-protein chicken rice bowl.",
        calories: 490,
        protein: 40,
        price: 189,
      },
    ],
  },
  {
    id: "bulk-box",
    title: "7-Day Bulk Box",
    shortTitle: "Bulk Box",
    goal: "muscle_gain",
    duration: 7,
    mealsPerDay: 1,
    caloriesRange: "600–850 kcal",
    proteinRange: "35–60g protein",
    startingPrice: 199,
    badge: "Muscle Gain",
    color: "blue",
    description:
      "A high-calorie, high-protein challenge for gym users who want muscle gain and recovery support.",
    benefits: [
      "Higher calories",
      "Protein-focused meals",
      "Good for gym users",
      "Helps hit daily protein target",
    ],
    meals: [
      {
        day: 1,
        title: "Chicken Muscle Gain Bowl",
        description: "Chicken, rice, veggies and high-protein sauce.",
        calories: 720,
        protein: 52,
        price: 229,
      },
      {
        day: 2,
        title: "Paneer Bulk Bowl",
        description: "Paneer, rice, corn and vegetables.",
        calories: 690,
        protein: 40,
        price: 209,
      },
      {
        day: 3,
        title: "Banana Oats Protein Bowl",
        description: "Oats, banana, nuts and protein-rich toppings.",
        calories: 650,
        protein: 32,
        price: 229,
      },
      {
        day: 4,
        title: "Butter Chicken Fit Bowl",
        description: "Macro-friendly butter chicken and rice.",
        calories: 780,
        protein: 55,
        price: 249,
      },
      {
        day: 5,
        title: "Egg Bulk Rice Box",
        description: "Eggs, rice and vegetables.",
        calories: 670,
        protein: 38,
        price: 179,
      },
      {
        day: 6,
        title: "Chicken Peanut Protein Bowl",
        description: "Chicken, rice and peanut-based sauce.",
        calories: 820,
        protein: 58,
        price: 249,
      },
      {
        day: 7,
        title: "Paneer Power Bowl",
        description: "Paneer, rice, veggies and high-protein add-ons.",
        calories: 710,
        protein: 42,
        price: 219,
      },
    ],
  },
  {
    id: "fit-girl-box",
    title: "Fit Girl Clean Box",
    shortTitle: "Fit Girl Box",
    goal: "clean_eating",
    duration: 7,
    mealsPerDay: 1,
    caloriesRange: "300–500 kcal",
    proteinRange: "20–35g protein",
    startingPrice: 149,
    badge: "Clean Eating",
    color: "pink",
    description:
      "A clean, light and stylish meal challenge with balanced macros and feel-good meals.",
    benefits: [
      "Clean eating meals",
      "Light but filling",
      "Protein included",
      "Good for daily healthy routine",
    ],
    meals: [
      {
        day: 1,
        title: "Greek Yogurt Protein Bowl",
        description: "Yogurt, fruits and protein-rich toppings.",
        calories: 360,
        protein: 24,
        price: 149,
      },
      {
        day: 2,
        title: "Paneer Salad Box",
        description: "Paneer, veggies and clean dressing.",
        calories: 420,
        protein: 28,
        price: 169,
      },
      {
        day: 3,
        title: "Egg White Rice Box",
        description: "Egg whites, rice and vegetables.",
        calories: 410,
        protein: 30,
        price: 149,
      },
      {
        day: 4,
        title: "Clean Chicken Bowl",
        description: "Chicken, greens and rice.",
        calories: 460,
        protein: 34,
        price: 189,
      },
      {
        day: 5,
        title: "Protein Brownie Combo",
        description: "Healthy sweet protein dessert combo.",
        calories: 390,
        protein: 22,
        price: 159,
      },
      {
        day: 6,
        title: "Mexican Veg Clean Bowl",
        description: "Beans, veggies and rice.",
        calories: 450,
        protein: 24,
        price: 149,
      },
      {
        day: 7,
        title: "Paneer Glow Bowl",
        description: "Paneer, greens and balanced carbs.",
        calories: 480,
        protein: 30,
        price: 179,
      },
    ],
  },
  {
    id: "student-power-box",
    title: "Student Power Box",
    shortTitle: "Student Box",
    goal: "budget",
    duration: 7,
    mealsPerDay: 1,
    caloriesRange: "450–700 kcal",
    proteinRange: "20–40g protein",
    startingPrice: 99,
    badge: "Budget",
    color: "orange",
    description:
      "Affordable healthy meals for students who want good macros without spending too much.",
    benefits: [
      "Budget-friendly",
      "Good protein",
      "Simple meals",
      "Best for college students",
    ],
    meals: [
      {
        day: 1,
        title: "₹99 Trial Protein Bowl",
        description: "Affordable first MacroBox meal.",
        calories: 520,
        protein: 26,
        price: 99,
      },
      {
        day: 2,
        title: "Egg Rice Budget Box",
        description: "Eggs, rice and vegetables.",
        calories: 560,
        protein: 28,
        price: 129,
      },
      {
        day: 3,
        title: "Rajma Protein Bowl",
        description: "Rajma, rice and salad.",
        calories: 590,
        protein: 24,
        price: 119,
      },
      {
        day: 4,
        title: "Paneer Rice Box",
        description: "Paneer, rice and vegetables.",
        calories: 610,
        protein: 30,
        price: 149,
      },
      {
        day: 5,
        title: "Chicken Student Bowl",
        description: "Chicken, rice and salad.",
        calories: 650,
        protein: 38,
        price: 169,
      },
      {
        day: 6,
        title: "Oats Power Bowl",
        description: "Oats, banana and nuts.",
        calories: 540,
        protein: 22,
        price: 129,
      },
      {
        day: 7,
        title: "Veg Protein Rice Box",
        description: "Beans, rice and vegetables.",
        calories: 570,
        protein: 24,
        price: 119,
      },
    ],
  },
  {
    id: "couple-challenge-box",
    title: "Couple Challenge Box",
    shortTitle: "Couple Box",
    goal: "couple",
    duration: 7,
    mealsPerDay: 2,
    caloriesRange: "Custom",
    proteinRange: "Custom",
    startingPrice: 299,
    badge: "2 People",
    color: "purple",
    description:
      "A 7-day food challenge for two people starting their fitness journey together.",
    benefits: [
      "Two-person meal plan",
      "Goal-based meals",
      "Fun challenge format",
      "Great for couples or friends",
    ],
    meals: [
      {
        day: 1,
        title: "Couple Protein Combo",
        description: "Two goal-based protein meals.",
        calories: 980,
        protein: 70,
        price: 329,
      },
      {
        day: 2,
        title: "Lean + Bulk Combo",
        description: "One lean bowl and one bulk bowl.",
        calories: 1150,
        protein: 82,
        price: 349,
      },
      {
        day: 3,
        title: "Paneer + Chicken Combo",
        description: "Veg and non-veg balanced combo.",
        calories: 1060,
        protein: 74,
        price: 339,
      },
      {
        day: 4,
        title: "Clean Eating Combo",
        description: "Two clean eating bowls.",
        calories: 920,
        protein: 62,
        price: 319,
      },
      {
        day: 5,
        title: "Mexican Protein Combo",
        description: "Two Mexican-inspired macro bowls.",
        calories: 1080,
        protein: 68,
        price: 329,
      },
      {
        day: 6,
        title: "Gym Couple Combo",
        description: "Two high-protein gym meals.",
        calories: 1240,
        protein: 92,
        price: 369,
      },
      {
        day: 7,
        title: "Challenge Finish Combo",
        description: "Final day celebration healthy combo.",
        calories: 1000,
        protein: 72,
        price: 349,
      },
    ],
  },
  {
    id: "office-fit-box",
    title: "Office Fit Box",
    shortTitle: "Office Box",
    goal: "office",
    duration: 7,
    mealsPerDay: 1,
    caloriesRange: "450–650 kcal",
    proteinRange: "25–45g protein",
    startingPrice: 169,
    badge: "Lunch Plan",
    color: "slate",
    description:
      "A lunch-focused challenge for working people who want healthy office meals.",
    benefits: [
      "Perfect for lunch",
      "Easy daily routine",
      "Balanced macros",
      "No boring diet food",
    ],
    meals: [
      {
        day: 1,
        title: "Office Chicken Rice Box",
        description: "Balanced lunch with chicken and rice.",
        calories: 590,
        protein: 40,
        price: 199,
      },
      {
        day: 2,
        title: "Paneer Office Bowl",
        description: "Paneer, rice and veggies.",
        calories: 560,
        protein: 34,
        price: 179,
      },
      {
        day: 3,
        title: "Rajma Office Box",
        description: "Rajma, rice and salad.",
        calories: 540,
        protein: 26,
        price: 169,
      },
      {
        day: 4,
        title: "Chicken Tikka Lunch Bowl",
        description: "Chicken tikka, rice and greens.",
        calories: 620,
        protein: 45,
        price: 219,
      },
      {
        day: 5,
        title: "Egg Office Bowl",
        description: "Eggs, rice and vegetables.",
        calories: 520,
        protein: 30,
        price: 169,
      },
      {
        day: 6,
        title: "Mexican Office Bowl",
        description: "Beans, rice, salsa and veggies.",
        calories: 580,
        protein: 28,
        price: 179,
      },
      {
        day: 7,
        title: "Clean Lunch Box",
        description: "Balanced clean office lunch.",
        calories: 500,
        protein: 32,
        price: 189,
      },
    ],
  },
];

export const getChallengeById = (id?: string) =>
  challenges.find((challenge) => challenge.id === id);