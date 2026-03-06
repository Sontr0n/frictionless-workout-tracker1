import React from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, Calendar, Dumbbell } from 'lucide-react';
import { Workout } from '../types';

interface WorkoutListProps {
  workouts: Workout[];
  onDelete: (id: number) => void;
}

export default function WorkoutList({ workouts, onDelete }: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
        <Dumbbell className="w-12 h-12 opacity-20" />
        <p>No workouts recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold text-zinc-900 mb-6">Workout History</h2>
      
      <div className="grid gap-6">
        {workouts.map((workout) => (
          <div key={workout.id} className="bg-white rounded-[10px] p-6 shadow-sm border border-zinc-200 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3 text-zinc-500">
                <div className="p-3 bg-zinc-50 rounded-[10px] text-zinc-900">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider">Date</p>
                  <p className="text-lg font-semibold text-zinc-900">
                    {format(parseISO(workout.date), 'EEEE, MMM do yyyy')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onDelete(workout.id)}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Delete workout"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {workout.notes && (
              <div className="mb-6 p-4 bg-zinc-50 rounded-[10px]">
                <p className="text-sm text-zinc-600 italic">"{workout.notes}"</p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Exercises</h4>
              {workout.exercises.map((ex, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50/50 rounded-[10px] border border-zinc-200">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-zinc-900">{ex.name}</span>
                    {ex.muscleGroup && (
                      <span className="text-xs font-medium px-2 py-1 bg-zinc-200 text-zinc-700 rounded-[6px]">
                        {ex.muscleGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-zinc-500">
                    <span className="w-16 text-right">{ex.sets} sets</span>
                    <span className="text-zinc-300">×</span>
                    <span className="w-16">{ex.reps} reps</span>
                    <span className="font-medium text-zinc-900 bg-white px-3 py-1 rounded-[6px] shadow-sm border border-zinc-200 min-w-[4rem] text-center">
                      {ex.weight} lbs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
