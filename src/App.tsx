import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Mic, History, Dumbbell } from 'lucide-react';
import VoiceRecorder from './components/VoiceRecorder';
import Dashboard from './components/Dashboard';
import WorkoutList from './components/WorkoutList';
import { Workout } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'record' | 'dashboard' | 'history'>('record');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkouts = async () => {
    try {
      const response = await fetch('/api/workouts');
      if (response.ok) {
        const data = await response.json();
        setWorkouts(data);
      }
    } catch (error) {
      console.error('Failed to fetch workouts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const handleDeleteWorkout = async (id: number) => {
    try {
      const response = await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setWorkouts(workouts.filter(w => w.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete workout', error);
    }
  };

  const handleWorkoutSaved = () => {
    fetchWorkouts();
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-zinc-900 text-white p-2 rounded-xl">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AuraFit</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-8">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center h-64"
            >
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'record' && <VoiceRecorder onWorkoutSaved={handleWorkoutSaved} />}
              {activeTab === 'dashboard' && <Dashboard workouts={workouts} />}
              {activeTab === 'history' && <WorkoutList workouts={workouts} onDelete={handleDeleteWorkout} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-3 rounded-2xl transition-colors ${
              activeTab === 'dashboard' ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <Activity className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('record')}
            className="flex flex-col items-center justify-center -mt-6"
          >
            <div className={`p-4 rounded-full shadow-lg transition-transform ${
              activeTab === 'record' ? 'bg-zinc-900 text-white scale-110' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}>
              <Mic className="w-7 h-7" />
            </div>
            <span className={`text-[10px] font-medium uppercase tracking-wider mt-2 ${
              activeTab === 'record' ? 'text-zinc-900' : 'text-zinc-400'
            }`}>Record</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center p-3 rounded-2xl transition-colors ${
              activeTab === 'history' ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-wider">History</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
