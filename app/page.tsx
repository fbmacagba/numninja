"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RotateCcw, Target, ArrowLeft, User, History, Zap } from 'lucide-react';

type ScoreEntry = {
  alias: string;
  score: number;
  attempts: number;
  timestamp: string;
};

export default function NumGenius() {
  // Game State
  const [gameState, setGameState] = useState<'login' | 'game' | 'ranking'>('login');
  const [playerAlias, setPlayerAlias] = useState('');
  const [secretNumber, setSecretNumber] = useState(0);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(1000);
  const [feedback, setFeedback] = useState({ message: 'Welcome to NumGenius! Guess a number between 1-100.', type: 'info' });
  const [previousGuesses, setPreviousGuesses] = useState<number[]>([]);
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  useEffect(() => {
    const savedScores = localStorage.getItem('numgenius_scores');
    if (savedScores) {
      setHighScores(JSON.parse(savedScores));
    }
  }, []);

  const startNewGame = () => {
    setSecretNumber(Math.floor(Math.random() * 100) + 1);
    setAttempts(0);
    setScore(1000);
    setPreviousGuesses([]);
    setGuess('');
    setIsGameOver(false);
    setStartTime(Date.now());
    setFeedback({ 
      message: `Welcome, ${playerAlias}! Guess a number between 1-100.`, 
      type: 'info' 
    });
    setGameState('game');
  };

  const saveScore = (finalScore: number, finalAttempts: number) => {
    const newScore: ScoreEntry = {
      alias: playerAlias,
      score: finalScore,
      attempts: finalAttempts,
      timestamp: new Date().toISOString(),
    };
    const updatedScores = [...highScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    
    setHighScores(updatedScores);
    localStorage.setItem('numgenius_scores', JSON.stringify(updatedScores));
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const numGuess = parseInt(guess);

    if (isNaN(numGuess) || numGuess < 1 || numGuess > 100) {
      setFeedback({ message: 'Please enter a valid number between 1 and 100.', type: 'warning' });
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setPreviousGuesses(prev => [...prev, numGuess]);

    // Calculate score reduction (similar to original logic)
    const timeElapsed = (Date.now() - startTime) / 1000;
    const timePenalty = Math.floor(timeElapsed / 10);
    const newScore = Math.max(100, 1000 - (newAttempts * 50) - timePenalty);
    setScore(newScore);

    if (numGuess === secretNumber) {
      setIsGameOver(true);
      const winMsg = `🎉 CONGRATULATIONS!\n\nYou guessed the number ${secretNumber}!\nAttempts: ${newAttempts}\nFinal Score: ${newScore}`;
      setFeedback({ message: winMsg, type: 'success' });
      saveScore(newScore, newAttempts);
    } else if (newAttempts >= 10) {
      setIsGameOver(true);
      setFeedback({ message: `😢 GAME OVER!\n\nThe number was ${secretNumber}. Better luck next time!`, type: 'warning' });
    } else if (numGuess < secretNumber) {
      setFeedback({ message: '⬆️ Too low! Try a higher number.', type: 'warning' });
    } else {
      setFeedback({ message: '⬇️ Too high! Try a lower number.', type: 'warning' });
    }

    // Hint at 5 attempts
    if (newAttempts === 5) {
      const hint = `💡 Hint: The number is ${secretNumber % 2 === 0 ? 'even!' : 'odd!'}`;
      setTimeout(() => setFeedback({ message: hint, type: 'info' }), 2000);
    }

    setGuess('');
  };

  // Render Login Screen
  if (gameState === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-dark-slate p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-primary-blue/30">
          <div className="flex justify-center mb-4">
            <Target className="w-16 h-16 text-primary-blue animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold mb-6 text-light-gray">Welcome to NumGenius!</h1>
          
          <div className="mb-6">
            <label className="block text-sm mb-2 text-light-gray/70">Enter your player alias:</label>
            <input 
              type="text" 
              value={playerAlias}
              onChange={(e) => setPlayerAlias(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && playerAlias && startNewGame()}
              className="w-full p-3 rounded bg-primary-dark border border-primary-blue/50 text-white text-center text-xl focus:ring-2 focus:ring-primary-blue outline-none"
              placeholder="Player 1"
            />
          </div>

          <button 
            onClick={() => playerAlias && startNewGame()}
            disabled={!playerAlias}
            className="w-full py-3 bg-accent-red hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-lg"
          >
            <Zap className="w-5 h-5" /> Start Game
          </button>

          {highScores.length > 0 && (
            <div className="mt-10 pt-6 border-t border-primary-blue/20">
              <h2 className="text-xl font-bold text-warning-orange mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5" /> Current Champions
              </h2>
              <div className="space-y-2">
                {highScores.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex justify-between p-2 rounded bg-primary-dark/50 text-sm">
                    <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {s.alias}</span>
                    <span className="font-bold">{s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Ranking Screen
  if (gameState === 'ranking') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="text-warning-orange a-bounce" /> 
              NUMGENIUS LEADERBOARD
            </h1>
            <button 
              onClick={() => setGameState('game')}
              className="p-2 bg-warning-orange text-white rounded-lg flex items-center gap-2 hover:bg-orange-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Game
            </button>
          </div>

          <div className="bg-dark-slate rounded-xl overflow-hidden shadow-xl border border-primary-blue/20">
            <div className="grid grid-cols-4 bg-primary-dark p-4 font-bold text-light-gray border-b border-primary-blue/20">
              <div>Rank</div>
              <div>Player</div>
              <div>Score</div>
              <div>Attempts</div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {highScores.length === 0 ? (
                <div className="p-10 text-center text-light-gray/50">
                  No scores yet! Be the first champion! 🏆
                </div>
              ) : (
                highScores.map((s, i) => (
                  <div 
                    key={i} 
                    className={`grid grid-cols-4 p-4 border-b border-primary-blue/10 transition-colors ${s.alias === playerAlias ? 'bg-primary-blue/30' : 'hover:bg-primary-dark/50'}`}
                  >
                    <div className="font-bold">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </div>
                    <div className="truncate">{s.alias}</div>
                    <div className="font-bold text-primary-blue">{s.score}</div>
                    <div>{s.attempts}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Game Screen
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-md w-full flex flex-col gap-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-light-gray/80">
            <User className="w-4 h-4" /> {playerAlias}
          </div>
          <h1 className="text-2xl font-bold text-primary-blue">🎯 NUMGENIUS</h1>
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-slate p-4 rounded-xl border border-primary-blue/30 flex flex-col items-center">
            <span className="text-xs text-light-gray/60 uppercase font-bold">Score</span>
            <span className="text-2xl font-bold text-light-gray flex items-center gap-2">
              <Trophy className="w-5 h-5 text-warning-orange" /> {score}
            </span>
          </div>
          <div className="bg-dark-slate p-4 rounded-xl border border-primary-blue/30 flex flex-col items-center">
            <span className="text-xs text-light-gray/60 uppercase font-bold">Attempts</span>
            <span className="text-2xl font-bold text-light-gray flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-red" /> {attempts}/10
            </span>
          </div>
        </div>

        {/* Main Input Section */}
        <div className="bg-dark-slate p-6 rounded-2xl shadow-xl border border-primary-blue/20 text-center">
          <p className="mb-4 text-light-gray/80">Guess a number between 1 and 100</p>
          
          <form onSubmit={handleGuess} className="flex flex-col gap-4">
            <input 
              type="number" 
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              disabled={isGameOver}
              className="text-center text-3xl p-3 rounded-lg bg-primary-dark border-2 border-primary-blue/50 text-white focus:ring-4 focus:ring-primary-blue/30 outline-none"
              placeholder="?"
              autoFocus
            />
            
            <div className="grid grid-cols-1 gap-3">
              <button 
                type="submit"
                disabled={isGameOver}
                className="py-3 bg-primary-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" /> Make Guess
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => setGameState('ranking')}
                  className="py-3 bg-success-green hover:bg-green-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Ranking
                </button>
                <button 
                  type="button"
                  onClick={startNewGame}
                  className="py-3 bg-accent-red hover:bg-red-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Feedback Area */}
        <div className={`p-4 rounded-xl border text-center font-medium transition-all ${
          feedback.type === 'success' ? 'bg-success-green/20 border-success-green text-success-green' :
          feedback.type === 'warning' ? 'bg-warning-orange/20 border-warning-orange text-warning-orange' :
          'bg-primary-dark/50 border-primary-blue/50 text-light-gray'
        }`}>
          <pre className="font-sans whitespace-pre-wrap">{feedback.message}</pre>
        </div>

        {/* History */}
        <div className="bg-dark-slate p-4 rounded-xl border border-primary-blue/20">
          <div className="flex items-center gap-2 text-sm font-bold text-light-gray/60 mb-3 uppercase">
            <History className="w-4 h-4" /> Previous Guesses
          </div>
          <div className="flex flex-wrap gap-2">
            {previousGuesses.length === 0 && <span className="text-light-gray/30 text-sm italic">No guesses yet...</span>}
            {[...previousGuesses].sort((a, b) => a - b).map((g, i) => (
              <span key={i} className="px-2 py-1 bg-primary-dark rounded border border-primary-blue/30 text-xs font-bold">
                {g}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
