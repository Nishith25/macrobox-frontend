export interface Meal {
  _id?: string;   // backend MongoDB ID
  id?: number;    // old local ID
  title: string;
  description: string;
  protein: number;
  calories: number;
  image: string;
}
