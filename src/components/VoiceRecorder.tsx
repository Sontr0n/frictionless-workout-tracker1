import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, CheckCircle2, XCircle, Save, Keyboard, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Exercise } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface VoiceRecorderProps {
  onWorkoutSaved: () => void;
}

export default function VoiceRecorder({ onWorkoutSaved }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{ notes?: string; exercises: Exercise[] } | null>(null);
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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current?.stop();
      if (transcript) {
        parseWorkout(transcript);
      }
    } else {
      setTranscript('');
      setParsedData(null);
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
                    name: { type: Type.STRING, description: "Name of the exercise" },
                    sets: { type: Type.INTEGER, description: "Number of sets" },
                    reps: { type: Type.INTEGER, description: "Number of reps per set" },
                    weight: { type: Type.NUMBER, description: "Weight used in lbs or kg" },
                  },
                  required: ["name", "sets", "reps", "weight"],
                },
              },
            },
            required: ["exercises"],
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      setParsedData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze workout data. Please try again or edit manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const saveWorkout = async () => {
    if (!parsedData) return;

    try {
      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          notes: parsedData.notes || '',
          exercises: parsedData.exercises,
        }),
      });

      if (!response.ok) throw new Error('Failed to save workout');

      setParsedData(null);
      setTranscript('');
      setManualInput('');
      onWorkoutSaved();
    } catch (err) {
      setError('Failed to save workout. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-2xl mx-auto p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-zinc-900">Record Workout</h2>
        <p className="text-zinc-500">
          {isManualMode ? 'Describe your workout below.' : 'Tap the mic and describe your workout naturally.'}
          <br />
          <span className="text-sm italic">"I did 3 sets of bench press for 10 reps at 135 lbs..."</span>
        </p>
      </div>

      {!isManualMode ? (
        <div className="flex flex-col items-center space-y-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
            className={`relative flex items-center justify-center w-32 h-32 rounded-full shadow-xl transition-colors ${
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
              <Square className="w-12 h-12 text-white fill-current" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
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
            className="w-full h-32 p-4 rounded-2xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
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
              className="flex items-center space-x-2 bg-zinc-900 text-white px-6 py-3 rounded-full font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span>Analyze</span>
            </button>
          </div>
        </form>
      )}

      {isRecording && (
        <div className="flex items-center space-x-2 text-red-500 font-medium animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Recording...</span>
        </div>
      )}

      {transcript && !parsedData && !isParsing && !isManualMode && (
        <div className="w-full p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
          <p className="text-zinc-700 italic">"{transcript}"</p>
        </div>
      )}

      {isParsing && !isManualMode && (
        <div className="flex flex-col items-center space-y-4 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
          <p>Analyzing your workout...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-xl w-full">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {parsedData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden"
        >
          <div className="p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
            <div className="flex items-center space-x-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Workout Parsed</span>
            </div>
            <button
              onClick={saveWorkout}
              className="flex items-center space-x-2 bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Workout</span>
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {parsedData.notes && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-zinc-700 text-sm">{parsedData.notes}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Exercises</h4>
              <div className="space-y-3">
                {parsedData.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl">
                    <span className="font-medium text-zinc-900">{ex.name}</span>
                    <div className="flex items-center space-x-4 text-sm text-zinc-500">
                      <span>{ex.sets} sets</span>
                      <span>×</span>
                      <span>{ex.reps} reps</span>
                      <span className="font-medium text-zinc-900 bg-white px-2 py-1 rounded-md shadow-sm border border-zinc-100">
                        {ex.weight} lbs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
