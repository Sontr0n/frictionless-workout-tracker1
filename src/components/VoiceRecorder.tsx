import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, XCircle, Save, Keyboard, Send, Plus, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Exercise } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface VoiceRecorderProps {
  onWorkoutSaved: () => void;
}

export default function VoiceRecorder({ onWorkoutSaved }: VoiceRecorderProps) {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [workoutNotes, setWorkoutNotes] = useState<string[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setError('Speech recognition failed. Please try again.');
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error(e);
          }
        }
      };
    } else {
      setIsManualMode(true);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isRecording]);

  const startWorkout = () => {
    setIsWorkoutActive(true);
    setWorkoutExercises([]);
    setWorkoutNotes([]);
    setError(null);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
      if (transcript) {
        parseWorkout(transcript);
      }
    } else {
      setTranscript('');
      setError(null);
      setIsRecording(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      parseWorkout(manualInput);
    }
  };

  const parseWorkout = async (text: string) => {
    setIsParsing(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Parse the following workout transcript into a structured JSON format. 
Capitalize the first letter of each word in the exercise name (e.g. "Bench Press", "Squat").
Identify the primary muscle group worked by each exercise (e.g. "Chest", "Legs", "Back", "Shoulders", "Arms", "Core").
Transcript: "${text}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              notes: {
                type: Type.STRING,
                description: "Any general notes or feelings about the workout.",
              },
              exercises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the exercise, capitalized" },
                    muscleGroup: { type: Type.STRING, description: "Primary muscle group worked" },
                    sets: { type: Type.INTEGER, description: "Number of sets" },
                    reps: { type: Type.INTEGER, description: "Number of reps per set" },
                    weight: { type: Type.NUMBER, description: "Weight used in lbs or kg" },
                  },
                  required: ["name", "muscleGroup", "sets", "reps", "weight"],
                },
              },
            },
            required: ["exercises"],
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      
      if (data.exercises && data.exercises.length > 0) {
        setWorkoutExercises(prev => [...prev, ...data.exercises]);
      }
      if (data.notes) {
        setWorkoutNotes(prev => [...prev, data.notes]);
      }
      
      setTranscript('');
      setManualInput('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze workout data. Please try again or edit manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const endAndSaveWorkout = async () => {
    if (workoutExercises.length === 0) {
      setIsWorkoutActive(false);
      return;
    }

    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          notes: workoutNotes.join(' | '),
          exercises: workoutExercises,
        }),
      });

      if (!response.ok) throw new Error('Failed to save workout');

      setIsWorkoutActive(false);
      setWorkoutExercises([]);
      setWorkoutNotes([]);
      setTranscript('');
      setManualInput('');
      onWorkoutSaved();
    } catch (err) {
      setError('Failed to save workout. Please try again.');
    }
  };

  if (!isWorkoutActive) {
    return (
      <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-2xl mx-auto p-6 min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Play className="w-10 h-10 text-zinc-900 ml-2" />
          </div>
          <h2 className="text-3xl font-bold text-zinc-900">Ready to train?</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            Start a new session to record your exercises cumulatively. You can add multiple exercises via voice or text as you go.
          </p>
        </div>
        <button
          onClick={startWorkout}
          className="bg-zinc-900 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-zinc-800 transition-all hover:scale-105 shadow-lg flex items-center space-x-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Start Workout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start space-y-8 w-full max-w-2xl mx-auto p-6 pb-24">
      <div className="w-full flex justify-between items-center bg-white p-4 rounded-[10px] shadow-sm border border-zinc-200 sticky top-4 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-semibold text-zinc-900">Workout in Progress</span>
        </div>
        <button
          onClick={endAndSaveWorkout}
          className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-[10px] text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>End & Save</span>
        </button>
      </div>

      <div className="w-full space-y-6">
        {workoutExercises.length > 0 && (
          <div className="bg-white rounded-[10px] shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
              <h3 className="font-semibold text-zinc-900">Current Session</h3>
            </div>
            <div className="p-4 space-y-3">
              {workoutExercises.map((ex, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-[10px]">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-zinc-900">{ex.name}</span>
                    {ex.muscleGroup && (
                      <span className="text-xs font-medium px-2 py-1 bg-zinc-200 text-zinc-700 rounded-[6px]">
                        {ex.muscleGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-zinc-500">
                    <span>{ex.sets} sets</span>
                    <span>×</span>
                    <span>{ex.reps} reps</span>
                    <span className="font-medium text-zinc-900 bg-white px-2 py-1 rounded-[6px] shadow-sm border border-zinc-200">
                      {ex.weight} lbs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[10px] shadow-sm border border-zinc-200 p-6 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-zinc-900">Add Exercise</h3>
            <p className="text-zinc-500 text-sm">
              {isManualMode ? 'Type your exercise details below.' : 'Tap the mic and describe your exercise.'}
            </p>
          </div>

          {!isManualMode ? (
            <div className="flex flex-col items-center space-y-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleRecording}
                className={`relative flex items-center justify-center w-24 h-24 rounded-full shadow-lg transition-colors ${
                  isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {isRecording && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full border-4 border-red-500 opacity-30"
                  />
                )}
                {isRecording ? (
                  <Square className="w-8 h-8 text-white fill-current" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </motion.button>
              <button 
                onClick={() => setIsManualMode(true)}
                className="flex items-center space-x-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Keyboard className="w-4 h-4" />
                <span>Switch to typing</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="w-full space-y-4">
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="e.g., 3 sets of squats, 10 reps at 225 lbs..."
                className="w-full h-24 p-4 rounded-[10px] border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
              />
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Back to voice
                </button>
                <button
                  type="submit"
                  disabled={!manualInput.trim() || isParsing}
                  className="flex items-center space-x-2 bg-zinc-900 text-white px-6 py-2 rounded-[10px] font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add</span>
                </button>
              </div>
            </form>
          )}

          {isRecording && (
            <div className="flex items-center justify-center space-x-2 text-red-500 font-medium animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Recording...</span>
            </div>
          )}

          {transcript && !isParsing && !isManualMode && (
            <div className="w-full p-4 bg-zinc-50 rounded-[10px] border border-zinc-200">
              <p className="text-zinc-700 italic">"{transcript}"</p>
            </div>
          )}

          {isParsing && !isManualMode && (
            <div className="flex flex-col items-center space-y-4 text-zinc-500 py-4">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
              <p className="text-sm">Analyzing...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-[10px] w-full">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
