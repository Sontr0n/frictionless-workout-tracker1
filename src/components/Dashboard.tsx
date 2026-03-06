import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Sparkles, TrendingUp, Activity, Dumbbell } from 'lucide-react';
import { Workout } from '../types';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  workouts: Workout[];
}

export default function Dashboard({ workouts }: DashboardProps) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(false);

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (workouts.length === 0) return;
      
      setIsLoadingRec(true);
      try {
        const history = workouts.slice(0, 10);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Based on the following recent workout history, provide a short, encouraging recommendation for the next workout. Focus on progressive overload, recovery, or exercise variety.
          
History: ${JSON.stringify(history)}`,
          config: {
            systemInstruction: "You are an expert personal trainer. Keep recommendations concise (2-3 sentences max) and actionable.",
          }
        });
        
        setRecommendation(response.text || "Keep up the great work! Consistency is key.");
      } catch (error: any) {
        console.error('Failed to fetch recommendation', error);
        setRecommendation(error.message || "Keep up the great work! Consistency is key.");
      } finally {
        setIsLoadingRec(false);
      }
    };

    fetchRecommendation();
  }, [workouts]);

  // Calculate stats
  const totalWorkouts = workouts.length;
  
  // Calculate total volume (sets * reps * weight) for the last 7 workouts to show a trend
  const volumeData = workouts
    .slice(0, 7)
    .reverse()
    .map(w => {
      const volume = w.exercises.reduce((acc, ex) => acc + (ex.sets * ex.reps * ex.weight), 0);
      return {
        date: format(parseISO(w.date), 'MMM d'),
        volume
      };
    });

  const totalVolume = workouts.reduce((acc, w) => {
    return acc + w.exercises.reduce((accEx, ex) => accEx + (ex.sets * ex.reps * ex.weight), 0);
  }, 0);

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
        <Dumbbell className="w-12 h-12 opacity-20" />
        <p>No workouts recorded yet. Start tracking to see your progress!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto p-6">
      {/* AI Recommendation Card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Sparkles className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-4 text-emerald-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-semibold tracking-wide uppercase text-sm">AI Coach Insight</h3>
          </div>
          {isLoadingRec ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                <div className="h-4 bg-zinc-700 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <p className="text-lg leading-relaxed text-zinc-100">
              {recommendation || "Keep up the great work! Consistency is key."}
            </p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Workouts</p>
            <p className="text-3xl font-bold text-zinc-900">{totalWorkouts}</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm flex items-center space-x-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Volume</p>
            <p className="text-3xl font-bold text-zinc-900">{totalVolume.toLocaleString()} lbs</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-100 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900 mb-6">Volume Trend (Last 7 Workouts)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={volumeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`${value.toLocaleString()} lbs`, 'Volume']}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="#18181b" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#18181b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
