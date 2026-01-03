import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/api";

/* ================= CONSTANTS ================= */

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/* ================= DASHBOARD ================= */

export default function Dashboard() {
  const { user } = useAuth();

  /* ================= STATE ================= */
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [activity, setActivity] = useState("moderate");
  const [goalWeight, setGoalWeight] = useState("");
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD SAVED DATA ================= */
  useEffect(() => {
    api.get("/user/me").then((res) => {
      const m = res.data.bodyMetrics;
      if (m) {
        setHeight(String(m.height || ""));
        setWeight(String(m.weight || ""));
        setAge(String(m.age || ""));
        setGender(m.gender || "male");
        setActivity(m.activity || "moderate");
        setGoalWeight(String(m.goalWeight || ""));
        setLocked(Boolean(m.locked));
      }
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  /* ================= PARSED VALUES ================= */
  const h = Number(height);
  const w = Number(weight);
  const a = Number(age);
  const gw = Number(goalWeight);
  const isValid = h > 0 && w > 0 && a > 0;

  /* ================= BMI ================= */
  const bmi = isValid ? (w / Math.pow(h / 100, 2)).toFixed(1) : null;

  const bmiLabel =
    bmi === null
      ? "—"
      : Number(bmi) < 18.5
      ? "Underweight"
      : Number(bmi) < 25
      ? "Normal"
      : Number(bmi) < 30
      ? "Overweight"
      : "Obese";

  /* ================= CALORIES ================= */
  const bmr =
    isValid &&
    (gender === "male"
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161);

  const maintenanceCalories =
    bmr && Math.round(bmr * activityMultipliers[activity]);

 let calorieDiff: number | null = null;

if (maintenanceCalories && gw) {
  const raw = Math.round(((gw - w) * 7700) / 7);

  // clamp to safe limits
  calorieDiff = Math.max(-700, Math.min(700, raw));
}


  const targetCalories =
    maintenanceCalories && calorieDiff
      ? maintenanceCalories + calorieDiff
      : null;

  /* ================= PROTEIN GOAL ================= */
  let proteinGoal: number | null = null;
  let proteinLabel = "—";

  if (w > 0) {
    if (gw && gw > w) {
      proteinGoal = Math.round(gw * 2.0);
      proteinLabel = "Muscle gain";
    } else if (gw && gw < w) {
      proteinGoal = Math.round(gw * 2.2);
      proteinLabel = "Fat loss";
    } else {
      proteinGoal = Math.round(w * 1.8);
      proteinLabel = "Maintenance";
    }
  }

  /* ================= SAVE ================= */
  const handleSave = async () => {
    if (!isValid) {
      alert("Please enter valid body details");
      return;
    }

    await api.post("/user/body-metrics", {
      height: h,
      weight: w,
      age: a,
      gender,
      activity,
      goalWeight: gw,
      locked: true,
    });

    setLocked(true);
  };

  /* ================= CHANGE ================= */
  const handleChange = async () => {
    await api.post("/user/body-metrics", {
      height: h,
      weight: w,
      age: a,
      gender,
      activity,
      goalWeight: gw,
      locked: false,
    });

    setLocked(false);
  };

  /* ================= UI ================= */
  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <h1 className="text-3xl font-bold mb-2">
        Welcome, {user?.name} 👋
      </h1>
      <p className="text-gray-600 mb-6">
        Track BMI, calories & protein goals
      </p>

      {/* BODY DETAILS */}
      <div className="border rounded-lg p-6 mb-6">
        <h2 className="font-semibold mb-4">Body Details</h2>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <Input label="Height (cm)" value={height} setValue={setHeight} disabled={locked} />
          <Input label="Weight (kg)" value={weight} setValue={setWeight} disabled={locked} />
          <Input label="Age (years)" value={age} setValue={setAge} disabled={locked} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <select disabled={locked} value={gender} onChange={(e) => setGender(e.target.value)} className="border rounded px-3 py-2">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>

          <select disabled={locked} value={activity} onChange={(e) => setActivity(e.target.value)} className="border rounded px-3 py-2">
            <option value="sedentary">Sedentary</option>
            <option value="light">Lightly Active</option>
            <option value="moderate">Moderately Active</option>
            <option value="active">Very Active</option>
            <option value="very_active">Athlete</option>
          </select>

          <Input label="Target weight (kg)" value={goalWeight} setValue={setGoalWeight} disabled={locked} />
        </div>
      </div>

      {/* ACTION BUTTON */}
      {!locked ? (
        <button onClick={handleSave} className="mb-8 bg-green-600 text-white px-6 py-2 rounded-lg">
          Save
        </button>
      ) : (
        <button onClick={handleChange} className="mb-8 border border-green-600 text-green-600 px-6 py-2 rounded-lg">
          Change Values
        </button>
      )}

      {/* RESULTS */}
      <div className="grid md:grid-cols-4 gap-6">
        <Stat title="BMI" value={bmi ?? "—"} label={bmiLabel} />
        <Stat title="Maintenance Calories" value={maintenanceCalories ? `${maintenanceCalories} kcal` : "—"} label="To maintain weight" />
        <Stat title="Target Calories" value={targetCalories ? `${targetCalories} kcal` : "—"} label={calorieDiff ? (calorieDiff > 0 ? "Weight gain" : "Weight loss") : "—"} />
        <Stat title="Protein Goal" value={proteinGoal ? `${proteinGoal} g/day` : "—"} label={proteinLabel} highlight />
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function Input({ label, value, setValue, disabled }: any) {
  return (
    <input
      type="number"
      placeholder={label}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      className={`border rounded px-3 py-2 ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
    />
  );
}

function Stat({ title, value, label, highlight }: any) {
  return (
    <div className={`border rounded-lg p-4 ${highlight ? "bg-green-50 border-green-400" : ""}`}>
      <p className="text-gray-500">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-green-600">{label}</p>
    </div>
  );
}
