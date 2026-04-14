"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, RotateCcw, Target, ArrowLeft, User, Zap, Sparkles, Crown, Share2, Copy, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

type ScoreEntry = {
  id?: number;
  alias: string;
  score: number;
  attempts: number;
  timestamp: string;
};

type Proximity = 'freezing' | 'cold' | 'warm' | 'hot' | 'burning' | null;

const PROXIMITY_CONFIG = {
  burning: { label: '🔥 BURNING HOT', border: 'border-red-500/70',    glow: 'shadow-red-500/40',    bg: 'bg-red-500/10',    text: 'text-red-400'    },
  hot:     { label: '🌡️ HOT',          border: 'border-orange-500/60', glow: 'shadow-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  warm:    { label: '☀️ WARM',          border: 'border-yellow-500/50', glow: 'shadow-yellow-500/20', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  cold:    { label: '❄️ COLD',          border: 'border-cyan-500/50',   glow: 'shadow-cyan-500/20',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400'   },
  freezing:{ label: '🧊 FREEZING',      border: 'border-blue-500/40',   glow: 'shadow-blue-500/20',   bg: 'bg-blue-500/10',   text: 'text-blue-400'   },
};

function getProximity(distance: number): Proximity {
  if (distance <= 3)  return 'burning';
  if (distance <= 10) return 'hot';
  if (distance <= 20) return 'warm';
  if (distance <= 35) return 'cold';
  return 'freezing';
}

const FLOAT_POSITIONS = [
  { top: '5%',  left: '8%',  size: 'text-7xl', duration: 18, delay: 0  },
  { top: '15%', left: '85%', size: 'text-5xl', duration: 22, delay: 3  },
  { top: '40%', left: '3%',  size: 'text-6xl', duration: 16, delay: 7  },
  { top: '60%', left: '92%', size: 'text-4xl', duration: 25, delay: 1  },
  { top: '80%', left: '12%', size: 'text-8xl', duration: 20, delay: 5  },
  { top: '25%', left: '50%', size: 'text-3xl', duration: 30, delay: 12 },
  { top: '70%', left: '65%', size: 'text-6xl', duration: 14, delay: 8  },
  { top: '88%', left: '45%', size: 'text-5xl', duration: 19, delay: 2  },
];
const FLOAT_NUMBERS = [42, 7, 99, 13, 55, 28, 81, 3];

function FloatingNumbers() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {FLOAT_POSITIONS.map((pos, i) => (
        <motion.span
          key={i}
          className={`absolute font-black text-white select-none ${pos.size}`}
          style={{ top: pos.top, left: pos.left, opacity: 0.06 }}
          animate={{ y: [0, -30, 0] }}
          transition={{ duration: pos.duration, delay: pos.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          {FLOAT_NUMBERS[i]}
        </motion.span>
      ))}
    </div>
  );
}

export default function NumNinja() {
  const [gameState, setGameState] = useState<'login' | 'game' | 'ranking'>('login');
  const [playerAlias, setPlayerAlias] = useState('');
  const [secretNumber, setSecretNumber] = useState(0);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(1000);
  const [feedback, setFeedback] = useState({ message: 'Welcome to NumNinja! Guess a number between 1-100.', type: 'info' });
  const [previousGuesses, setPreviousGuesses] = useState<{ value: number; result: 'high' | 'low' | 'exact' }[]>([]);
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [startTime, setStartTime] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(true);
  const [proximity, setProximity] = useState<Proximity>(null);
  const [guessDir, setGuessDir] = useState<'higher' | 'lower' | null>(null);

  useEffect(() => {
    async function loadScores() {
      try {
        const response = await fetch('/api/scores');
        if (response.ok) {
          const apiScores = await response.json();
          setHighScores(apiScores);
          localStorage.setItem('numninja_scores', JSON.stringify(apiScores));
        } else {
          throw new Error('API returned non-ok status');
        }
      } catch (error) {
        console.warn('Failed to load from API, using localStorage:', error);
        const savedScores = localStorage.getItem('numninja_scores');
        if (savedScores) {
          try {
            setHighScores(JSON.parse(savedScores));
          } catch (e) {
            console.error('Failed to parse scores');
          }
        }
      }
      setIsLoadingScores(false);
    }
    loadScores();
  }, []);

  const triggerVictoryEffects = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#818cf8', '#a78bfa', '#ffd700', '#34d399', '#f87171'],
    });
    const victorySfx = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const applauseSfx = new Audio('https://assets.mixkit.co/active_storage/sfx/130/130-preview.mp3');
    victorySfx.volume = 0.6;
    applauseSfx.volume = 0.5;
    victorySfx.play().catch(() => {});
    setTimeout(() => applauseSfx.play().catch(() => {}), 300);
  };

  const startNewGame = () => {
    setSecretNumber(Math.floor(Math.random() * 100) + 1);
    setAttempts(0);
    setScore(1000);
    setPreviousGuesses([]);
    setGuess('');
    setIsGameOver(false);
    setGameWon(false);
    setProximity(null);
    setGuessDir(null);
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
    const updatedScores = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 50);
    setHighScores(updatedScores);
    localStorage.setItem('numninja_scores', JSON.stringify(updatedScores));
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScore),
      });
      if (!response.ok) console.warn('Failed to save score to server, using localStorage only');
    } catch (error) {
      console.warn('Failed to reach API, score saved to localStorage only:', error);
    }
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

    const result: 'high' | 'low' | 'exact' =
      numGuess === secretNumber ? 'exact' : numGuess > secretNumber ? 'high' : 'low';
    setPreviousGuesses(prev => [...prev, { value: numGuess, result }]);

    const timeElapsed = (Date.now() - startTime) / 1000;
    const timePenalty = Math.floor(timeElapsed / 10);
    const newScore = Math.max(100, 1000 - (newAttempts * 50) - timePenalty);
    setScore(newScore);

    if (numGuess === secretNumber) {
      setIsGameOver(true);
      setGameWon(true);
      setProximity(null);
      setGuessDir(null);
      triggerVictoryEffects();
      setFeedback({ message: `🎉 BOOM! You nailed it! The number was ${secretNumber}!`, type: 'success' });
      saveScore(newScore, newAttempts);
    } else if (newAttempts >= 10) {
      setIsGameOver(true);
      setGameWon(false);
      setProximity(null);
      setGuessDir(null);
      setFeedback({ message: `😢 Out of attempts! The secret number was ${secretNumber}.`, type: 'warning' });
    } else {
      const distance = Math.abs(numGuess - secretNumber);
      setProximity(getProximity(distance));
      setGuessDir(numGuess < secretNumber ? 'higher' : 'lower');
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
    const text = `🎯 I just cracked the code on NumNinja!\n🏆 Score: ${score}\n🎯 Attempts: ${attempts}\n\nCan you beat me? Try it here: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const proxCfg = proximity ? PROXIMITY_CONFIG[proximity] : null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img src="/og-image.png" className="w-full h-full object-cover opacity-60" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/30 via-[#0f172a]/60 to-[#0f172a]/85" />
      </div>

      <FloatingNumbers />

      <AnimatePresence mode="wait">

        {/* ─── LOGIN ─── */}
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
                <div className="p-4 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/40">
                  <Target className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent tracking-tight">
                NumNinja
              </h1>
              <p className="text-slate-400 mb-8 font-medium">Can you crack the secret code?</p>

              <div className="mb-8 text-left">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 ml-1">
                  Player Alias
                </label>
                <input
                  type="text"
                  value={playerAlias}
                  onChange={(e) => setPlayerAlias(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && playerAlias && startNewGame()}
                  className="w-full p-4 rounded-2xl bg-slate-900/50 border border-slate-700 text-white text-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="Enter your name..."
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => playerAlias && startNewGame()}
                disabled={!playerAlias}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-indigo-900/30"
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
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-800/50 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <span className="font-medium text-slate-300">{s.alias}</span>
                        </span>
                        <span className="font-black text-indigo-400">{s.score}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── RANKING ─── */}
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
                <div className="max-h-[60vh] overflow-y-auto">
                  {isLoadingScores ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
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
                        className={`grid grid-cols-4 p-5 border-b border-slate-700/30 transition-all ${
                          s.alias === playerAlias
                            ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500'
                            : 'hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="font-black text-lg">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </div>
                        <div className="truncate font-medium text-slate-300">{s.alias}</div>
                        <div className="text-right font-black text-indigo-400">{s.score}</div>
                        <div className="text-right text-slate-500">{s.attempts}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── GAME ─── */}
        {gameState === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-6 md:p-12 flex flex-col items-center relative z-10"
          >
            <div className="max-w-md w-full flex flex-col gap-6">

              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700 text-slate-400 text-xs font-bold">
                  <User className="w-3 h-3" /> {playerAlias}
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={shareToFacebook}
                    className="p-2 bg-slate-800/50 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 rounded-full border border-slate-700 transition-all"
                    title="Share to Facebook"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                  <div className="text-xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent italic tracking-tighter">
                    NUMNINJA
                  </div>
                </div>
              </div>

              {/* Score + Attempt Dots */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 flex flex-col items-center shadow-xl"
                >
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Score</span>
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <motion.span
                      key={score}
                      initial={{ scale: 1.3, color: '#a5b4fc' }}
                      animate={{ scale: 1, color: '#ffffff' }}
                      className="text-3xl font-black"
                    >
                      {score}
                    </motion.span>
                  </span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-slate-800/40 backdrop-blur-md p-5 rounded-3xl border border-slate-700/50 flex flex-col items-center shadow-xl"
                >
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">Attempts</span>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          i < attempts
                            ? 'bg-indigo-500 shadow-sm shadow-indigo-500/60 scale-110'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Guess Card */}
              <motion.div
                animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                className={`bg-slate-800/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border-2 text-center relative overflow-hidden transition-all duration-300 ${
                  proxCfg ? `${proxCfg.border} shadow-xl ${proxCfg.glow}` : 'border-slate-700/50'
                }`}
              >
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                  <Target className="w-24 h-24 rotate-12" />
                </div>

                {/* Proximity Badge */}
                <AnimatePresence>
                  {proxCfg && !isGameOver && (
                    <motion.div
                      key={proximity}
                      initial={{ opacity: 0, scale: 0.8, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: -4 }}
                      className={`mb-4 px-4 py-1.5 rounded-full text-xs font-black inline-flex items-center gap-1 border ${proxCfg.border} ${proxCfg.bg} ${proxCfg.text}`}
                    >
                      {proxCfg.label}
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="mb-6 text-slate-400 font-medium">What is the secret number?</p>

                <form onSubmit={handleGuess} className="flex flex-col gap-6 relative z-10">
                  <div className="relative group">
                    <input
                      type="number"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      disabled={isGameOver}
                      className="w-full text-center text-5xl font-black p-6 rounded-3xl bg-slate-900/80 border-2 border-slate-700 text-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-800"
                      placeholder="?"
                      autoFocus
                    />
                    {guessDir && !isGameOver && (
                      <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${guessDir === 'higher' ? 'text-cyan-400' : 'text-orange-400'}`}>
                        {guessDir === 'higher'
                          ? <ArrowUp className="w-6 h-6" />
                          : <ArrowDown className="w-6 h-6" />}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-3xl bg-indigo-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>

                  <div className="flex flex-col gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isGameOver}
                      className="py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-indigo-900/40"
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

              {/* Feedback */}
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
                  <p className="leading-relaxed">{feedback.message}</p>

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

              {/* Previous Guesses */}
              <div className="bg-slate-800/40 backdrop-blur-md p-6 rounded-3xl border border-slate-700/50">
                <div className="text-xs font-black text-slate-500 mb-4 uppercase tracking-widest">History</div>
                <div className="flex flex-wrap gap-2">
                  {previousGuesses.length === 0 && (
                    <span className="text-slate-600 text-sm italic">No guesses yet...</span>
                  )}
                  {[...previousGuesses].sort((a, b) => a.value - b.value).map((g, i) => (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`px-3 py-1 rounded-lg border text-xs font-bold shadow-sm ${
                        g.result === 'exact'
                          ? 'bg-green-500/20 border-green-500/50 text-green-300'
                          : g.result === 'high'
                          ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                          : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {g.value}{g.result === 'high' ? ' ↓' : g.result === 'low' ? ' ↑' : ' ✓'}
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
