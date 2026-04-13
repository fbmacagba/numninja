"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Target, ArrowLeft, User, History, Zap, Sparkles, Crown, Share2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type ScoreEntry = {
  id?: number;
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
  const [gameWon, setGameWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(true);

  // Load Scores
  useEffect(() => {
    async function fetchScores() {
      setIsLoadingScores(true);
      try {
        const response = await fetch('/api/scores');
        if (response.ok) {
          const data = await response.json();
          setHighScores(data);
        } else {
          throw new Error('API Error');
        }
      } catch (e) {
        console.warn("Cloudflare D1 error, falling back to local storage", e);
        loadLocalScores();
      } finally {
        setIsLoadingScores(false);
      }
    }

    async function loadLocalScores() {
      const savedScores = localStorage.getItem('numgenius_scores');
      if (savedScores) setHighScores(JSON.parse(savedScores));
    }

    fetchScores();
  }, []);

  const triggerVictoryEffects = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3498DB', '#FFD700', '#2ECC71', '#E74C3C']
    });

    const victorySfx = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const applauseSfx = new Audio('https://assets.mixkit.co/active_storage/sfx/130/130-preview.mp3');
    
    victorySfx.volume = 0.6;
    applauseSfx.volume = 0.5;

    victorySfx.play().catch(e => console.log("Audio playback blocked"));
    setTimeout(() => {
      applauseSfx.play().catch(e => console.log("Audio playback blocked"));
    }, 300);
  };

  const startNewGame = () => {
    setSecretNumber(Math.floor(Math.random() * 100) + 1);
    setAttempts(0);
    setScore(1000);
    setPreviousGuesses([]);
    setGuess('');
    setIsGameOver(false);
    setGameWon(false);
    setStartTime(Date.now());
    setFeedback({ message: `Ready, ${playerAlias}! Guess a number between 1-100.`, type: 'info' });
    setGameState('game');
  };

  const saveScore = async (finalScore: number, finalAttempts: number) => {
    const newScore: ScoreEntry = {
      alias: playerAlias,
      score: finalScore,
      attempts: finalAttempts,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScore),
      });

      if (response.ok) {
        // Refresh scores from D1
        const res = await fetch('/api/scores');
        if (res.ok) {
          const data = await res.json();
          setHighScores(data);
        }
      } else {
        throw new Error('Save Error');
      }
    } catch (e) {
      console.error("D1 Save failed, saving locally", e);
      saveLocalScore(newScore);
    }
  };

  const saveLocalScore = (newScore: ScoreEntry) => {
    const updatedScores = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 50);
    setHighScores(updatedScores);
    localStorage.setItem('numgenius_scores', JSON.stringify(updatedScores));
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const numGuess = parseInt(guess);

    if (isNaN(numGuess) || numGuess < 1 || numGuess > 100) {
      setFeedback({ message: 'Enter a valid number (1-100)!', type: 'warning' });
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    setPreviousGuesses(prev => [...prev, numGuess]);

    const timeElapsed = (Date.now() - startTime) / 1000;
    const timePenalty = Math.floor(timeElapsed / 10);
    const newScore = Math.max(100, 1000 - (newAttempts * 50) - timePenalty);
    setScore(newScore);

    if (numGuess === secretNumber) {
      setIsGameOver(true);
      setGameWon(true);
      triggerVictoryEffects();
      setFeedback({ message: `🎉 BOOM! You nailed it! The number was ${secretNumber}!`, type: 'success' });
      saveScore(newScore, newAttempts);
    } else if (newAttempts >= 10) {
      setIsGameOver(true);
      setGameWon(false);
      setFeedback({ message: `😢 Out of attempts! The secret number was ${secretNumber}.`, type: 'warning' });
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      if (numGuess < secretNumber) {
        setFeedback({ message: '⬆️ TOO LOW! Go higher!', type: 'warning' });
      } else {
        setFeedback({ message: '⬇️ TOO HIGH! Go lower!', type: 'warning' });
      }
    }

    if (newAttempts === 5 && numGuess !== secretNumber) {
      const hint = `💡 HINT: The number is ${secretNumber % 2 === 0 ? 'EVEN' : 'ODD'}!`;
      setTimeout(() => setFeedback({ message: hint, type: 'info' }), 1500);
    }

    setGuess('');
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const copyShareText = () => {
    const text = `🎯 I just cracked the code on NumGenius!\n🏆 Score: ${score}\n🎯 Attempts: ${attempts}\n\nCan you beat me? Try it here: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="min-h-screen flex items-center justify-center p-6 relative z-10"
          >
            <div className="bg-slate-800/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-700/50">
              <motion.div 
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/40">
                  <Target className="w-12 h-12 text-white" />
                </div>
              </motion.div>
              
              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-tight">
                NumGenius
              </h1>
              <p className="text-slate-400 mb-8 font-medium">Can you crack the secret code?</p>
              
              <div className="mb-8 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 ml-1">Player Alias</label>
                <input 
                  type="text" 
                  value={playerAlias}
                  onChange={(e) => setPlayerAlias(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && playerAlias && startNewGame()}
                  className="w-full p-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white text-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter your name..."
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playerAlias && startNewGame()}
                disabled={!playerAlias}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-blue-900/20"
              >
                <Zap className="w-5 h-5 fill-current" /> Start Adventure
              </motion.button>

              {highScores.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-700/50">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" /> Hall of Fame
                  </h2>
                  <div className="space-y-3">
                    {highScores.slice(0, 3).map((s, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="flex justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-800/50 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <span className="font-medium text-slate-300">{s.alias}</span>
                        </span>
                        <span className="font-black text-blue-400">{s.score}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'ranking' && (
          <motion.div 
            key="ranking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-6 md:p-12 flex flex-col items-center relative z-10"
          >
            <div className="max-w-2xl w-full">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-500 w-8 h-8" /> 
                  <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
                </div>
                <button 
                  onClick={() => setGameState('game')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-2 transition-all border border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>

              <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50">
                <div className="grid grid-cols-4 bg-slate-900/50 p-5 font-bold text-slate-500 text-xs uppercase tracking-widest border-b border-slate-700/50">
                  <div>Rank</div>
                  <div>Player</div>
                  <div className="text-right">Score</div>
                  <div className="text-right">Tries</div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {isLoadingScores ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p>Loading legends...</p>
                    </div>
                  ) : highScores.length === 0 ? (
                    <div className="p-16 text-center text-slate-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No legends yet. Be the first!</p>
                    </div>
                  ) : (
                    highScores.map((s, i) => (
                      <div 
                        key={i} 
                        className={`grid grid-cols-4 p-5 border-b border-slate-700/30 transition-all ${s.alias === playerAlias ? 'bg-blue-500/10' : 'hover:bg-slate-700/30'}`}
                      >
                        <div className="font-black text-lg">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </div>
                        <div className="truncate font-medium text-slate-300">{s.alias}</div>
                        <div className="text-right font-black text-blue-400">{s.score}</div>
                        <div className="text-right text-slate-500">{s.attempts}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {gameState === 'game' && (
          <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-6 md:p-12 flex flex-col items-center relative z-10"
          >
            <div className="max-w-md w-full flex flex-col gap-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700 text-slate-400 text-xs font-bold">
                  <User className="w-3 h-3" /> {playerAlias}
                </div>
                <div className="text-xl font-black text-blue-500 italic tracking-tighter">NUMGENIUS</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 flex flex-col items-center shadow-xl"
                >
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Current Score</span>
                  <span className="text-3xl font-black text-white flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" /> {score}
                  </span>
                </motion.div>
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 flex flex-col items-center shadow-xl"
                >
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Attempts</span>
                  <span className="text-3xl font-black text-white flex items-center gap-2">
                    <Target className="w-6 h-6 text-red-500" /> {attempts}/10
                  </span>
                </motion.div>
              </div>

              <motion.div 
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                className="bg-slate-800/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-slate-700/50 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Target className="w-24 h-24 rotate-12" />
                </div>

                <p className="mb-6 text-slate-400 font-medium">What is the secret number?</p>
                
                <form onSubmit={handleGuess} className="flex flex-col gap-6 relative z-10">
                  <div className="relative group">
                    <input 
                      type="number" 
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      disabled={isGameOver}
                      className="w-full text-center text-5xl font-black p-6 rounded-3xl bg-slate-900/80 border-2 border-slate-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-800"
                      placeholder="?"
                      autoFocus
                    />
                    <div className="absolute inset-0 rounded-3xl bg-blue-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isGameOver}
                      className="py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-blue-900/40"
                    >
                      <Target className="w-5 h-5" /> Submit Guess
                    </motion.button>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button"
                        onClick={() => setGameState('ranking')}
                        className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Trophy className="w-4 h-4 text-yellow-500" /> Ranking
                      </button>
                      <button 
                        type="button"
                        onClick={startNewGame}
                        className="py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <RotateCcw className="w-4 h-4" /> Restart
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>

              <AnimatePresence mode="wait">
                <motion.div 
                  key={feedback.message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-5 rounded-2xl border text-center font-bold transition-all shadow-inner ${
                    feedback.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-300' :
                    feedback.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300' :
                    'bg-slate-800/50 border-slate-700 text-slate-400'
                  }`}
                >
                  <p className="leading-relaxed mb-4">{feedback.message}</p>
                  
                  {gameWon && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="flex flex-col sm:flex-row gap-3 justify-center mt-4 pt-4 border-t border-green-500/30"
                    >
                      <button 
                        onClick={shareToFacebook}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20"
                      >
                        <Share2 className="w-4 h-4" /> Share to FB
                      </button>
                      <button 
                        onClick={copyShareText}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm transition-all border border-slate-600"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy Message'}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500 mb-4 uppercase tracking-widest">
                  <History className="w-4 h-4" /> History
                </div>
                <div className="flex flex-wrap gap-3">
                  {previousGuesses.length === 0 && <span className="text-slate-600 text-sm italic">No guesses yet...</span>}
                  {[...previousGuesses].sort((a, b) => a - b).map((g, i) => (
                    <motion.span 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      key={i} 
                      className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-700 text-xs font-bold text-slate-300 shadow-sm"
                    >
                      {g}
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
