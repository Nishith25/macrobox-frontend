// frontend/src/utils/macroCalculator.ts

export type GoalType =
  | "weight_loss"
  | "maintenance"
  | "weight_gain"
  | "muscle_gain"
  | "fat_loss";

export type GenderType = "male" | "female";

export type ActivityType =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type MacroCalculatorInput = {
  height: number;
  weight: number;
  age: number;
  gender: GenderType;
  activity: ActivityType | string;
  goal: GoalType;
  goalWeight?: number | null;
};

export type MacroTargets = {
  bmi: number;
  bmr: number;
  maintenanceCalories: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const SUPPORTED_GOALS: GoalType[] = [
  "weight_loss",
  "maintenance",
  "weight_gain",
  "muscle_gain",
  "fat_loss",
];

export const ACTIVITY_MULTIPLIERS: Record<ActivityType, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const clamp = (value: number, minimum: number, maximum: number) => {
  return Math.max(minimum, Math.min(maximum, value));
};

const round = (value: number) => {
  return Math.round(toNumber(value));
};

export function calculateMacroTargets(
  input: MacroCalculatorInput
): MacroTargets {
  const height = toNumber(input.height);
  const weight = toNumber(input.weight);
  const age = toNumber(input.age);

  const goalWeight =
    input.goalWeight === null ||
    input.goalWeight === undefined ||
    input.goalWeight === 0
      ? null
      : toNumber(input.goalWeight);

  const gender: GenderType =
    input.gender === "female" ? "female" : "male";

  const activity: ActivityType = Object.prototype.hasOwnProperty.call(
    ACTIVITY_MULTIPLIERS,
    input.activity
  )
    ? (input.activity as ActivityType)
    : "moderate";

  const goal: GoalType = SUPPORTED_GOALS.includes(input.goal)
    ? input.goal
    : "maintenance";

  if (!height || !weight || !age) {
    return {
      bmi: 0,
      bmr: 0,
      maintenanceCalories: 0,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  const heightInMetres = height / 100;
  const bmi = weight / heightInMetres ** 2;

  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const maintenanceCalories =
    bmr * ACTIVITY_MULTIPLIERS[activity];

  let calorieAdjustment = 0;

  switch (goal) {
    case "fat_loss":
      calorieAdjustment = -500;
      break;

    case "weight_loss":
      calorieAdjustment = -400;
      break;

    case "muscle_gain":
      calorieAdjustment = 250;
      break;

    case "weight_gain":
      calorieAdjustment = 400;
      break;

    case "maintenance":
    default:
      calorieAdjustment = 0;
      break;
  }

  /*
    When the user provides a goal weight, calculate a safe daily
    adjustment based on reaching that goal over approximately 60 days.
  */
  if (goalWeight !== null && goalWeight !== weight) {
    const weightDifference = goalWeight - weight;
    const goalWeightAdjustment = (weightDifference * 7700) / 60;

    calorieAdjustment = clamp(
      Math.round(goalWeightAdjustment),
      -700,
      700
    );
  }

  const minimumCalories = gender === "female" ? 1200 : 1400;

  const calories = Math.max(
    minimumCalories,
    round(maintenanceCalories + calorieAdjustment)
  );

  let proteinPerKg = 1.6;
  let fatPercentage = 0.25;

  switch (goal) {
    case "fat_loss":
      proteinPerKg = 2.2;
      fatPercentage = 0.25;
      break;

    case "weight_loss":
      proteinPerKg = 2;
      fatPercentage = 0.25;
      break;

    case "muscle_gain":
      proteinPerKg = 2.1;
      fatPercentage = 0.25;
      break;

    case "weight_gain":
      proteinPerKg = 1.8;
      fatPercentage = 0.28;
      break;

    case "maintenance":
    default:
      proteinPerKg = 1.6;
      fatPercentage = 0.25;
      break;
  }

  const protein = round(weight * proteinPerKg);
  const fat = round((calories * fatPercentage) / 9);

  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;

  const remainingCalories = Math.max(
    calories - proteinCalories - fatCalories,
    0
  );

  const carbs = round(remainingCalories / 4);

  return {
    bmi: Number(bmi.toFixed(1)),
    bmr: round(bmr),
    maintenanceCalories: round(maintenanceCalories),
    calories,
    protein,
    carbs,
    fat,
  };
}

export default calculateMacroTargets;