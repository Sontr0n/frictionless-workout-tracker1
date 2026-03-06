import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("workouts.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sets INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    FOREIGN KEY (workout_id) REFERENCES workouts (id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/workouts", (req, res) => {
    try {
      const workouts = db.prepare("SELECT * FROM workouts ORDER BY date DESC").all();
      const exercises = db.prepare("SELECT * FROM exercises").all();

      const workoutsWithExercises = workouts.map((workout: any) => ({
        ...workout,
        exercises: exercises.filter((ex: any) => ex.workout_id === workout.id),
      }));

      res.json(workoutsWithExercises);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch workouts" });
    }
  });

  app.post("/api/workouts", (req, res) => {
    const { date, notes, exercises } = req.body;
    
    try {
      const insertWorkout = db.prepare("INSERT INTO workouts (date, notes) VALUES (?, ?)");
      const insertExercise = db.prepare(
        "INSERT INTO exercises (workout_id, name, sets, reps, weight) VALUES (?, ?, ?, ?, ?)"
      );

      const transaction = db.transaction(() => {
        const info = insertWorkout.run(date, notes || "");
        const workoutId = info.lastInsertRowid;

        for (const ex of exercises) {
          insertExercise.run(workoutId, ex.name, ex.sets, ex.reps, ex.weight);
        }
        return workoutId;
      });

      const workoutId = transaction();
      res.json({ success: true, workoutId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save workout" });
    }
  });

  app.delete("/api/workouts/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM workouts WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete workout" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
