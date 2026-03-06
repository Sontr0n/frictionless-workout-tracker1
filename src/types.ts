export interface Exercise {
  id?: number;
  workout_id?: number;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: number;
  date: string;
  notes: string;
  exercises: Exercise[];
}
