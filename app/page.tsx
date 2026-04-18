"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Target, ArrowLeft, User, Zap, Sparkles, Crown, Share2, Copy, Check, ArrowUp, ArrowDown, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const LEVELS = [
  { level: 1, rank: 'Novice',      range: 10,   attempts: 4,  theme: 'cyan'    },
  { level: 2, rank: 'Apprentice',  range: 20,   attempts: 4,  theme: 'cyan'    },
  { level: 3, rank: 'Warrior',     range: 50,   attempts: 6,  theme: 'indigo'  },
  { level: 4, rank: 'Ninja',       range: 100,  attempts: 7,  theme: 'purple'  },
  { level: 5, rank: 'Assassin',    range: 200,  attempts: 8,  theme: 'amber'   },
  { level: 6, rank: 'Shadow',      range: 500,  attempts: 9,  theme: 'orange'  },
  { level: 7, rank: 'Grandmaster', range: 1000, attempts: 10, theme: 'red'     },
  { level: 8, rank: 'Phantom',     range: 2000, attempts: 11, theme: 'fuchsia' },
];

type ScoreEntry = {
  id?: number;
  alias: string;
  score: number;
  levelReached: number;
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
          className={`absolute font-black text-orange-400 select-none ${pos.size} drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]`}
          style={{ top: pos.top, left: pos.left, opacity: 0.15 }}
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
  const [gameState, setGameState] = useState<'login' | 'game' | 'ranking' | 'level_select'>('login');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [playerAlias, setPlayerAlias] = useState('');
  const [password, setPassword] = useState('');
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [secretNumber, setSecretNumber] = useState(0);
  const [guess, setGuess] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [smokeBombs, setSmokeBombs] = useState(0);
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
  const [windowLow, setWindowLow] = useState(1);
  const [windowHigh, setWindowHigh] = useState(100);
  const [isEndlessMode, setIsEndlessMode] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [chestState, setChestState] = useState<'closed' | 'opening' | 'open'>('closed');
  const [lastRoundScore, setLastRoundScore] = useState(0);
  const [playerBaseScore, setPlayerBaseScore] = useState(0);
  const [displayedCumulativeScore, setDisplayedCumulativeScore] = useState(0);
  const [scoreGainVisible, setScoreGainVisible] = useState(false);
  const [scoreGainAmount, setScoreGainAmount] = useState(0);
  const scoreAnimFrameRef = useRef<number | null>(null);
  const scoreGainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileCurrentPw, setProfileCurrentPw] = useState('');
  const [profileNewPw, setProfileNewPw] = useState('');
  const [profileConfirmPw, setProfileConfirmPw] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileDone, setProfileDone] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackCategory, setFeedbackCategory] = useState('other');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateStep, setGuestGateStep] = useState<'prompt' | 'declined' | 'register' | 'goodbye'>('prompt');
  const [guestRegAlias, setGuestRegAlias] = useState('');
  const [guestRegPassword, setGuestRegPassword] = useState('');
  const [guestRegError, setGuestRegError] = useState<string | null>(null);
  const [guestRegLoading, setGuestRegLoading] = useState(false);

  useEffect(() => {
    async function loadScores() {
      try {
        const response = await fetch('/api/scores');
        if (response.ok) {
          const apiScores = await response.json();
          // Map DB snake_case to frontend camelCase if needed
          const mappedScores = apiScores.map((s: any) => ({
            ...s,
            levelReached: s.level_reached || s.levelReached || 1
          }));
          setHighScores(mappedScores);
          localStorage.setItem('numninja_scores', JSON.stringify(mappedScores));
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

  useEffect(() => {
    return () => {
      if (scoreAnimFrameRef.current !== null) cancelAnimationFrame(scoreAnimFrameRef.current);
      if (scoreGainTimerRef.current) clearTimeout(scoreGainTimerRef.current);
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    };
  }, []);

  // Request fullscreen on first touch to hide the mobile browser bar
  useEffect(() => {
    const enterFullscreen = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } else if ((el as any).webkitRequestFullscreen) {
        (el as any).webkitRequestFullscreen();
      }
    };
    document.addEventListener('touchstart', enterFullscreen, { once: true, passive: true });
    return () => document.removeEventListener('touchstart', enterFullscreen);
  }, []);

  const cumulativeScore = playerBaseScore + totalScore;

  const animateScoreCounter = useCallback((from: number, to: number) => {
    if (scoreAnimFrameRef.current !== null) cancelAnimationFrame(scoreAnimFrameRef.current);
    const duration = 1400;
    const startTime = performance.now();
    const diff = to - from;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      if (progress >= 1) {
        setDisplayedCumulativeScore(to);
        scoreAnimFrameRef.current = null;
        return;
      }
      const jitterEnd = 0.6;
      let value: number;
      if (progress < jitterEnd) {
        const t = progress / jitterEnd;
        const base = from + diff * t;
        const jitter = diff * 0.25 * (1 - t) * (Math.random() - 0.5) * 2;
        value = Math.max(from, Math.min(to, Math.round(base + jitter)));
      } else {
        const t = (progress - jitterEnd) / (1 - jitterEnd);
        const eased = 1 - Math.pow(1 - t, 3);
        value = Math.round(from + diff * (jitterEnd + (1 - jitterEnd) * eased));
      }
      setDisplayedCumulativeScore(value);
      scoreAnimFrameRef.current = requestAnimationFrame(tick);
    };
    scoreAnimFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const triggerVictoryEffects = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#3b82f6', '#ffd700', '#34d399', '#f87171'],
    });
    const victorySfx = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    const applauseSfx = new Audio('https://assets.mixkit.co/active_storage/sfx/130/130-preview.mp3');
    victorySfx.volume = 0.6;
    applauseSfx.volume = 0.5;
    victorySfx.play().catch(() => {});
    setTimeout(() => applauseSfx.play().catch(() => {}), 300);
  };
  
  const playSfx = (type: 'win' | 'fail' | 'wrong' | 'smoke') => {
    try {
      const urls = {
        win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
        fail: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        wrong: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
        smoke: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
      };
      const audio = new Audio(urls[type]);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch(e) {}
  };

  const activeLevelConfig = LEVELS[currentLevel - 1] || LEVELS[0];
  const isShrinkingLevel = currentLevel >= 6;
  // Bombs awarded on all levels during the gauntlet; in Endless Mode only on levels 6-8
  const isBombEligible = isEndlessMode ? currentLevel >= 6 : true;

  const startNewRun = (baseScore?: number, resumeLevel: number = 1) => {
    setIsEndlessMode(false);
    setCurrentLevel(resumeLevel);
    setTotalScore(0);
    setSmokeBombs(0);
    if (baseScore !== undefined) {
      setPlayerBaseScore(baseScore);
      setDisplayedCumulativeScore(baseScore);
    }
    startLevel(resumeLevel);
  };

  const handleLogin = async () => {
    const normalized = playerAlias.trim();
    if (!normalized || !password || normalized.length < 3 || password.length < 4) {
      setAliasError("Alias & Password must be longer (3/4 chars).");
      return;
    }
    
    setAliasError(null);
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: normalized, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setAliasError(data.error || 'Authentication failed');
        return;
      }

      // Use the canonical casing from the database
      if (data.alias) {
        setPlayerAlias(data.alias);
      }
      setIsAdmin(!!data.isAdmin);

      // Load existing score as base for cumulative scoring
      const canonAlias = (data.alias || normalized).toLowerCase();
      const existingEntry = highScores.find(s => s.alias.toLowerCase() === canonAlias);
      const base = existingEntry?.score ?? 0;
      const resumeLevel = Math.min(Math.max(existingEntry?.levelReached ?? 1, 1), LEVELS.length);
      startNewRun(base, resumeLevel);
    } catch (err) {
      setAliasError('Network error, please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout failed:', error);
    }
    setGameState('login');
    setPlayerAlias('');
    setPassword('');
    setIsGuest(false);
    setIsAdmin(false);
    setHighScores([]);
    // Reload to clear state safely
    window.location.reload();
  };

  const startNextLevel = () => {
    const nextLvl = currentLevel + 1;
    setCurrentLevel(nextLvl);
    startLevel(nextLvl);
  };

  const saveAndQuit = () => {
    saveScore(cumulativeScore, 0, currentLevel);
    setGameState('ranking');
  };

  const startLevel = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    const config = LEVELS[levelIndex - 1];
    setSecretNumber(Math.floor(Math.random() * config.range) + 1);
    setAttempts(0);
    setPreviousGuesses([]);
    setGuess('');
    setIsGameOver(false);
    setGameWon(false);
    setProximity(null);
    setGuessDir(null);
    setWindowLow(1);
    setWindowHigh(config.range);
    setStartTime(Date.now());
    setFeedback({ message: `Level ${config.level} (${config.rank}). Ready, ${playerAlias}! Guess 1-${config.range}.`, type: 'info' });
    setGameState('game');
  };

  const saveScore = async (finalScore: number, finalAttempts: number, levelReached: number, aliasOverride?: string) => {
    if (isGuest && !aliasOverride) return;
    const effectiveAlias = aliasOverride ?? playerAlias;
    const newScore: ScoreEntry = {
      alias: effectiveAlias,
      score: finalScore,
      levelReached,
      attempts: finalAttempts,
      timestamp: new Date().toISOString(),
    };
    // Always replace — cumulative score always increases
    const updatedScores = [...highScores.filter(s => s.alias !== effectiveAlias), newScore]
      .sort((a, b) => b.score - a.score).slice(0, 50);
    setHighScores(updatedScores);
    localStorage.setItem('numninja_scores', JSON.stringify(updatedScores));
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newScore,
          level_reached: levelReached // Match API requirement
        }),
      });
      if (!response.ok) console.warn('Failed to save score to server, using localStorage only');
    } catch (error) {
      console.warn('Failed to reach API, score saved to localStorage only:', error);
    }
  };

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const numGuess = parseInt(guess);
    if (isNaN(numGuess) || numGuess < 1 || numGuess > activeLevelConfig.range) {
      setFeedback({ message: `Enter a valid number (1-${activeLevelConfig.range})!`, type: 'warning' });
      return;
    }
    if (isShrinkingLevel && (numGuess < windowLow || numGuess > windowHigh)) {
      setFeedback({ message: `🪟 Window locked: ${windowLow}–${windowHigh}!`, type: 'warning' });
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const result: 'high' | 'low' | 'exact' =
      numGuess === secretNumber ? 'exact' : numGuess > secretNumber ? 'high' : 'low';
    setPreviousGuesses(prev => [...prev, { value: numGuess, result }]);

    const timeElapsed = (Date.now() - startTime) / 1000;
    const isSpeedBonus = timeElapsed <= 15;

    if (numGuess === secretNumber) {
      setIsGameOver(true);
      setGameWon(true);
      setProximity(null);
      setGuessDir(null);
      playSfx('win');
      triggerVictoryEffects();

      const basePoints = activeLevelConfig.range * 10;
      const attemptMultiplier = ((activeLevelConfig.attempts - newAttempts) * basePoints) / 10;
      let roundScore = basePoints + attemptMultiplier;
      if (isSpeedBonus) roundScore = Math.floor(roundScore * 1.5);

      const newTotal = totalScore + roundScore;
      const prevCumulative = playerBaseScore + totalScore;
      const newCumulative = playerBaseScore + newTotal;
      setTotalScore(newTotal);
      setLastRoundScore(roundScore);
      setChestState('closed');

      // Score gain animation: badge appears, roulette counter fires, then modal opens
      setScoreGainAmount(roundScore);
      setScoreGainVisible(true);
      if (scoreGainTimerRef.current) clearTimeout(scoreGainTimerRef.current);
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
      scoreGainTimerRef.current = setTimeout(() => setScoreGainVisible(false), 1800);
      setTimeout(() => animateScoreCounter(prevCumulative, newCumulative), 600);
      modalTimerRef.current = setTimeout(() => setShowRewardModal(true), 2100);

      let msg = `🎉 Level Cleared! +${roundScore} pts.`;
      if (newAttempts === 1) msg = `GODLIKE INSTINCT! 🎯 First try! +${roundScore}`;
      else if (isSpeedBonus) msg = `⚡ Speed Demon! +50% Bonus! +${roundScore}`;

      setFeedback({ message: msg, type: 'success' });

      // Always persist cumulative score after each won level
      saveScore(newCumulative, newAttempts, currentLevel);
    } else if (newAttempts >= activeLevelConfig.attempts) {
      playSfx('fail');
      setIsGameOver(true);
      setGameWon(false);
      setProximity(null);
      setGuessDir(null);
      setFeedback({ message: `💀 LEVEL FAILED. The number was ${secretNumber}.`, type: 'warning' });
    } else {
      playSfx('wrong');
      const distance = Math.abs(numGuess - secretNumber);
      // Proximity hints only on levels 1–3; higher levels give direction only
      if (currentLevel <= 3) setProximity(getProximity(distance));
      setGuessDir(numGuess < secretNumber ? 'higher' : 'lower');
      setShake(true);
      setTimeout(() => setShake(false), 500);

      const attemptsLeft = activeLevelConfig.attempts - newAttempts;

      // Shrinking window: compress the allowed range every 3rd wrong guess on levels 6+
      let shrinkMsg = '';
      if (isShrinkingLevel && newAttempts % 3 === 0) {
        const updatedGuesses = [...previousGuesses, { value: numGuess, result }];
        let logicLow = 1, logicHigh = activeLevelConfig.range;
        updatedGuesses.forEach(g => {
          if (g.result === 'low')  logicLow  = Math.max(logicLow,  g.value + 1);
          if (g.result === 'high') logicHigh = Math.min(logicHigh, g.value - 1);
        });
        const logicWidth = logicHigh - logicLow + 1;
        const newWindowWidth = Math.max(1, Math.ceil(logicWidth * 0.5));
        const minStart = Math.max(logicLow, secretNumber - newWindowWidth + 1);
        const maxStart = Math.min(logicHigh - newWindowWidth + 1, secretNumber);
        const windowStart = minStart + Math.floor(Math.random() * (Math.max(0, maxStart - minStart) + 1));
        const windowEnd = windowStart + newWindowWidth - 1;
        setWindowLow(windowStart);
        setWindowHigh(windowEnd);
        shrinkMsg = ` 🪟 WINDOW SHRINKS: ${windowStart}–${windowEnd}!`;
      }

      if (attemptsLeft === 1) {
        setFeedback({ message: `Focus... your life depends on it. 🧘‍♂️ (1 try left!)${shrinkMsg}`, type: 'warning' });
      } else {
        const dir = numGuess < secretNumber ? '⬆️ TOO LOW! Go higher!' : '⬇️ TOO HIGH! Go lower!';
        setFeedback({ message: `${dir}${shrinkMsg}`, type: 'warning' });
      }
    }

    setGuess('');
  };

  const useSmokeBomb = () => {
    if (smokeBombs > 0 && !isGameOver) {
       playSfx('smoke');
       setSmokeBombs(prev => prev - 1);
       const variance = Math.max(2, Math.floor(activeLevelConfig.range * 0.15));
       const low = Math.max(isShrinkingLevel ? windowLow : 1, secretNumber - variance);
       const high = Math.min(isShrinkingLevel ? windowHigh : activeLevelConfig.range, secretNumber + variance);
       setFeedback({ message: `💨 SMOKE BOMB: It's between ${low} and ${high}!`, type: 'info' });
    }
  };

  const openChest = () => {
    setChestState('opening');
    setTimeout(() => {
      setChestState('open');
      if (isBombEligible) {
        setSmokeBombs(prev => prev + 1);
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.45 },
          colors: ['#ef4444', '#f97316', '#fbbf24', '#a855f7', '#3b82f6'],
          startVelocity: 35,
          gravity: 0.9,
        });
      } else {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.45 },
          colors: ['#fbbf24', '#f59e0b', '#fde68a'],
          startVelocity: 25,
        });
      }
    }, 420);
  };

  const closeRewardModal = () => {
    setShowRewardModal(false);
    setChestState('closed');
  };

  const openProfileModal = () => {
    setProfileCurrentPw('');
    setProfileNewPw('');
    setProfileConfirmPw('');
    setProfileError(null);
    setProfileDone(false);
    setShowProfileModal(true);
  };

  const submitProfile = async () => {
    if (profileLoading) return;
    if (profileNewPw !== profileConfirmPw) {
      setProfileError('New passwords do not match');
      return;
    }
    if (profileNewPw.length < 4) {
      setProfileError('New password must be at least 4 characters');
      return;
    }
    setProfileError(null);
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: profileCurrentPw, newPassword: profileNewPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || 'Failed to update profile');
        return;
      }
      setProfileDone(true);
    } finally {
      setProfileLoading(false);
    }
  };

  const openFeedbackModal = () => {
    setFeedbackMessage('');
    setFeedbackRating(0);
    setFeedbackCategory('other');
    setFeedbackDone(false);
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!feedbackMessage.trim() || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: feedbackMessage.trim(), rating: feedbackRating || null, category: feedbackCategory }),
      });
      setFeedbackDone(true);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleGuestPlay = () => {
    setIsGuest(true);
    setPlayerAlias('Guest');
    setAliasError(null);
    startNewRun(0, 1);
  };

  const handleNextLevelOrGate = () => {
    if (isGuest && currentLevel >= 5) {
      setGuestGateStep('prompt');
      setGuestRegAlias('');
      setGuestRegPassword('');
      setGuestRegError(null);
      setShowGuestGateModal(true);
    } else {
      startNextLevel();
    }
  };

  const handleGuestRegister = async () => {
    const normalized = guestRegAlias.trim();
    if (!normalized || !guestRegPassword || normalized.length < 3 || guestRegPassword.length < 4) {
      setGuestRegError('Alias must be 3+ chars, password 4+ chars.');
      return;
    }
    setGuestRegLoading(true);
    setGuestRegError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: normalized, password: guestRegPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGuestRegError(data.error || 'Registration failed');
        setGuestRegLoading(false);
        return;
      }
      const canonAlias = (data.alias || normalized) as string;
      await saveScore(cumulativeScore, attempts, currentLevel, canonAlias);
      setIsGuest(false);
      setPlayerAlias(canonAlias);
      setShowGuestGateModal(false);
      startNextLevel();
    } catch {
      setGuestRegError('Network error, please try again.');
    } finally {
      setGuestRegLoading(false);
    }
  };

  const shareToFacebook = (finalScore?: number, finalAttempts?: number) => {
    const url = encodeURIComponent(window.location.href);
    const quote = finalScore !== undefined
      ? encodeURIComponent(
          `🥷 I just cracked NumNinja!\n` +
          `🎯 Guessed it in ${finalAttempts} attempt${finalAttempts === 1 ? '' : 's'} — Score: ${finalScore.toLocaleString()}\n\n` +
          `Think you can beat me? It's harder than it looks. 👇`
        )
      : encodeURIComponent(`🥷 Can YOU beat the NumNinja?\nGuess the secret number 1–100 before your 10 attempts run out. Simple? Think again. 👇`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank');
  };

  const copyShareText = () => {
    const text =
      `🥷 I just cracked NumNinja!\n` +
      `🎯 Guessed it in ${attempts} attempt${attempts === 1 ? '' : 's'} — Score: ${cumulativeScore.toLocaleString()}\n\n` +
      `Think you can beat me? It's harder than it looks.\n` +
      `👉 ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const proxCfg = proximity ? PROXIMITY_CONFIG[proximity] : null;

  return (
    <div
      className="game-root fixed inset-0 overflow-y-auto text-slate-100 font-sans selection:bg-cyan-500/30"
      style={{
        backgroundImage: "url('/og-image.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/15 pointer-events-none z-0" />

      <FloatingNumbers />

      <AnimatePresence mode="wait">

        {/* ─── LOGIN ─── */}
        {gameState === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full min-h-full flex flex-col sm:items-center sm:justify-center sm:p-6 sm:pb-safe relative z-10"
          >
            <div className="bg-slate-900/[0.85] backdrop-blur-xl pt-safe pb-safe px-6 py-8 sm:p-8 sm:rounded-3xl shadow-2xl sm:max-w-md w-full text-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] flex-1 sm:flex-none flex flex-col justify-center overflow-y-auto">
              <motion.div
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg shadow-cyan-500/40">
                  <Target className="w-12 h-12 text-white" />
                </div>
              </motion.div>

              <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent tracking-tight">
                NumNinja
              </h1>
              <p className="text-slate-400 mb-8 font-medium">Can you crack the secret code?</p>

              <div className="mb-6 text-left space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 ml-1">
                    Player Alias
                  </label>
                  <input
                    type="text"
                    value={playerAlias}
                    onChange={(e) => { setPlayerAlias(e.target.value); setAliasError(null); }}
                    className={`w-full p-4 rounded-2xl bg-slate-900/50 border text-white text-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600 ${aliasError ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-slate-700'}`}
                    placeholder="Enter your name..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500 ml-1 flex justify-between items-center">
                    Password
                    <button 
                      onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAliasError(null); }}
                      className="text-cyan-400 hover:text-cyan-300 normal-case"
                    >
                      {authMode === 'login' ? 'Need an account?' : 'Already have one?'}
                    </button>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setAliasError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && playerAlias && password && handleLogin()}
                    className={`w-full p-4 rounded-2xl bg-slate-900/50 border text-white text-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all placeholder:text-slate-600 ${aliasError ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'border-slate-700'}`}
                    placeholder="Secret code..."
                  />
                </div>
                {aliasError && (
                  <p className="text-red-400 text-sm font-bold mt-2 ml-2 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> {aliasError}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogin}
                disabled={!playerAlias || !password}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Zap className="w-5 h-5 fill-current" /> {authMode === 'login' ? 'Login & Play' : 'Register & Play'}
              </motion.button>

              <div className="flex items-center gap-3 mt-1">
                <div className="flex-1 h-px bg-slate-700/60" />
                <span className="text-slate-500 text-xs font-medium">or</span>
                <div className="flex-1 h-px bg-slate-700/60" />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGuestPlay}
                className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-slate-500/50 text-slate-300 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2 text-base"
              >
                Play as Guest <span className="text-slate-500 text-sm font-normal">(up to level 5)</span>
              </motion.button>

              {highScores.length > 0 && (
                <div className="mt-10 pt-8 border-t border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
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
                        <span className="font-black text-cyan-400">{s.score}</span>
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
            className="w-full min-h-full flex flex-col sm:items-center sm:p-6 md:p-12 relative z-10"
          >
            <div className="w-full sm:max-w-2xl bg-slate-900/[0.85] sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none pt-safe pb-safe px-4 sm:px-0 sm:pt-0 sm:pb-0 flex-1 sm:flex-none">
              <div className="flex justify-between items-center mb-10 pt-4 sm:pt-0">
                <div className="flex items-center gap-3">
                  <Trophy className="text-yellow-500 w-8 h-8" />
                  <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="px-4 py-2 bg-amber-900/50 hover:bg-amber-800/60 text-amber-400 hover:text-amber-300 rounded-xl flex items-center gap-2 transition-all border border-amber-500/50 hover:border-amber-400"
                    >
                      <Shield className="w-4 h-4" /> Admin
                    </a>
                  )}
                  <button
                    onClick={() => setGameState('game')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-2 transition-all border border-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/[0.85] backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <div className="grid grid-cols-4 bg-slate-900/50 p-5 font-bold text-slate-500 text-xs uppercase tracking-widest border-b border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <div>Rank</div>
                  <div>Player</div>
                  <div className="text-right">Score</div>
                  <div className="text-right">Level</div>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {isLoadingScores ? (
                    <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
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
                            ? 'bg-cyan-500/10 border-l-4 border-l-cyan-500'
                            : 'hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="font-black text-lg">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                        </div>
                        <div className="truncate font-medium text-slate-300">{s.alias}</div>
                        <div className="text-right font-black text-cyan-400">{s.score}</div>
                        <div className="text-right text-slate-500">Lvl {s.levelReached || 1}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={openFeedbackModal}
                className="mt-5 w-full py-3 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/30 rounded-2xl text-slate-400 hover:text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span>💬</span> Leave Feedback
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── LEVEL SELECT (ENDLESS MODE) ─── */}
        {gameState === 'level_select' && (
          <motion.div
            key="level_select"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-full flex flex-col sm:items-center sm:p-6 md:p-12 relative z-10"
          >
            <div className="w-full sm:max-w-2xl bg-slate-900/[0.85] sm:bg-transparent backdrop-blur-xl sm:backdrop-blur-none pt-safe pb-safe px-4 sm:px-0 sm:pt-0 sm:pb-0 flex-1 sm:flex-none">
              {/* Header */}
              <div className="text-center mb-8 pt-4 sm:pt-0">
                <div className="text-6xl mb-3">🔥</div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400 bg-clip-text text-transparent mb-2 tracking-tight">
                  ENDLESS MODE
                </h1>
                <p className="text-slate-400 mb-4">Gauntlet complete! Score keeps accumulating — pick your next challenge.</p>
                <div className="inline-flex items-center gap-2 px-6 py-2 bg-cyan-900/30 border border-cyan-500/40 rounded-full">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="font-black text-cyan-300 text-lg">{cumulativeScore.toLocaleString()} pts</span>
                </div>
              </div>

              {/* Level Cards */}
              <div className="grid gap-3 mb-6">
                {LEVELS.map((lvl) => (
                  <motion.button
                    key={lvl.level}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startLevel(lvl.level)}
                    className="flex items-center justify-between p-5 bg-slate-900/[0.85] backdrop-blur-md rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-cyan-900/50 flex items-center justify-center font-black text-lg text-slate-300 transition-all border border-slate-700 group-hover:border-cyan-500/40">
                        {lvl.level}
                      </div>
                      <div>
                        <div className="font-black text-white text-base">{lvl.rank}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          1–{lvl.range.toLocaleString()} · {lvl.attempts} attempts
                          {lvl.level >= 6 && <span className="ml-1 text-amber-500">· 🪟 Shrinking window</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-slate-600 group-hover:text-cyan-400 transition-colors font-bold text-sm pr-1">
                      PLAY →
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Save & Quit */}
              <button
                onClick={saveAndQuit}
                className="w-full py-4 bg-slate-900/[0.85] hover:bg-slate-800/[0.85] border border-slate-700 hover:border-yellow-500/40 rounded-2xl font-bold text-slate-300 flex items-center justify-center gap-2 transition-all"
              >
                <Trophy className="w-5 h-5 text-yellow-500" /> Save Score &amp; View Leaderboard
              </button>
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
            className="w-full min-h-full flex flex-col sm:items-center sm:justify-center sm:p-6 md:p-12 relative z-10"
          >
            <div className="w-full sm:max-w-md bg-slate-900/[0.85] backdrop-blur-xl sm:rounded-3xl border-0 sm:border border-cyan-500/30 p-4 sm:p-5 pt-safe pb-safe flex flex-col gap-4 flex-1 sm:flex-none">

              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button
                    onClick={openProfileModal}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/[0.85] backdrop-blur-md rounded-full border border-slate-700 hover:border-cyan-500/50 text-slate-300 text-xs font-bold shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all"
                    title="Profile settings"
                  >
                    <User className="w-3 h-3 text-slate-400" /> {playerAlias}
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/[0.85] backdrop-blur-md rounded-full border border-cyan-500/50 text-cyan-300 text-xs font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]">
                    <Crown className="w-3 h-3 text-yellow-400" /> {activeLevelConfig.rank}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && (
                    <motion.a
                      href="/admin"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 bg-slate-900/[0.85] backdrop-blur-md hover:bg-amber-900/[0.85] text-amber-400 hover:text-amber-300 rounded-full border border-amber-500/50 hover:border-amber-400 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      title="Admin Dashboard"
                    >
                      <Shield className="w-4 h-4" />
                    </motion.a>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleLogout}
                    className="p-2 bg-slate-900/[0.85] backdrop-blur-md hover:bg-red-900/[0.85] text-slate-400 hover:text-red-400 rounded-full border border-slate-700 hover:border-red-500/50 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => shareToFacebook()}
                    className="p-2 bg-slate-900/[0.85] backdrop-blur-md hover:bg-cyan-900/[0.85] text-slate-400 hover:text-cyan-400 rounded-full border border-slate-700 hover:border-cyan-500/50 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    title="Share to Facebook"
                  >
                    <Share2 className="w-4 h-4" />
                  </motion.button>
                  <div className="hidden sm:block text-xl font-black bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_5px_rgba(251,146,60,0.4)] italic tracking-tighter">
                    NUMNINJA
                  </div>
                </div>
              </div>

              {/* Score + Attempt Dots */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`relative p-4 rounded-2xl border flex flex-col items-center transition-all duration-300 ${
                    scoreGainVisible
                      ? 'border-cyan-400/70 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                      : 'border-slate-700/60'
                  }`}
                >
                  <AnimatePresence>
                    {scoreGainVisible && (
                      <motion.div
                        key="gain-badge"
                        initial={{ opacity: 0, y: 4, scale: 0.7 }}
                        animate={{ opacity: [0, 1, 1, 0], y: [4, -4, -14, -26], scale: [0.7, 1.15, 1, 0.85] }}
                        transition={{ duration: 1.5, times: [0, 0.12, 0.65, 1] }}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-cyan-500/50 whitespace-nowrap z-20 pointer-events-none"
                      >
                        +{scoreGainAmount.toLocaleString()} pts
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total Score</span>
                  <span className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-3xl font-black text-white tabular-nums">
                      {displayedCumulativeScore.toLocaleString()}
                    </span>
                  </span>
                </motion.div>
                <motion.div
                  whileHover={{ y: -4 }}
                  className="p-4 rounded-2xl border border-slate-700/60 flex flex-col items-center"
                >
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">Attempts</span>
                  <div className="flex gap-1.5 flex-wrap justify-center">
                    {Array.from({ length: activeLevelConfig.attempts }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          i < attempts
                            ? 'bg-cyan-500 shadow-sm shadow-cyan-500/60 scale-110'
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
                className={`p-6 rounded-2xl border-2 text-center relative overflow-hidden transition-all duration-300 ${
                  proxCfg ? `${proxCfg.border} shadow-lg ${proxCfg.glow}` : 'border-slate-700/60'
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

                <p className="mb-4 text-slate-400 font-medium">What is the secret number?</p>

                {isShrinkingLevel && !isGameOver && (
                  <motion.div
                    key={`${windowLow}-${windowHigh}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 flex items-center justify-center gap-2"
                  >
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black border ${
                      attempts > 0 && attempts % 3 === 2
                        ? 'bg-red-900/40 border-red-500/60 text-red-300'
                        : 'bg-amber-900/30 border-amber-500/40 text-amber-300'
                    }`}>
                      🪟 Window: {windowLow}–{windowHigh}
                      {attempts > 0 && attempts % 3 === 2 && ' ⚠️ Shrinks next!'}
                    </span>
                  </motion.div>
                )}

                <form onSubmit={handleGuess} className="flex flex-col gap-6 relative z-10">
                  <div className="relative group">
                    <input
                      type="number"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      disabled={isGameOver}
                      min={isShrinkingLevel ? windowLow : 1}
                      max={isShrinkingLevel ? windowHigh : activeLevelConfig.range}
                      className="w-full text-center text-5xl font-black p-6 rounded-3xl bg-slate-900/80 border-2 border-slate-700 text-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/40 outline-none transition-all placeholder:text-slate-800"
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
                    <div className="absolute inset-0 rounded-3xl bg-orange-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                  </div>

                  <div className="flex flex-col gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isGameOver}
                      className="py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                    >
                      <Target className="w-5 h-5" /> Submit Guess
                    </motion.button>

                    {gameWon && currentLevel < LEVELS.length ? (
                      <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        type="button"
                        onClick={handleNextLevelOrGate}
                        className="py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      >
                         Next Level <ArrowUp className="w-5 h-5" />
                      </motion.button>
                    ) : gameWon && !isEndlessMode ? (
                      <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        type="button"
                        onClick={() => { setIsEndlessMode(true); setGameState('level_select'); }}
                        className="py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                      >
                        🔥 Enter Endless Mode
                      </motion.button>
                    ) : gameWon && isEndlessMode ? (
                      <motion.button
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        type="button"
                        onClick={() => setGameState('level_select')}
                        className="py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(249,115,22,0.4)]"
                      >
                        🎯 Pick Next Level
                      </motion.button>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={useSmokeBomb}
                          disabled={smokeBombs <= 0 || isGameOver}
                          className="py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-600"
                        >
                          💨 Smoke Bomb ({smokeBombs})
                        </button>
                        {isGameOver && !gameWon ? (
                          <button
                            type="button"
                            onClick={() => startLevel(currentLevel)}
                            className="py-3 bg-red-900/60 hover:bg-red-800/80 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                          >
                            <RotateCcw className="w-4 h-4" /> Retry Level
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { if(confirm("Restart the entire game?")) startNewRun(); }}
                            className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-600"
                          >
                            <RotateCcw className="w-4 h-4" /> Restart Run
                          </button>
                        )}
                        {(cumulativeScore > 0 || isGameOver) && (
                          <button
                            type="button"
                            onClick={saveAndQuit}
                            className="col-span-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-600"
                          >
                            <Trophy className="w-4 h-4 text-yellow-500" /> Save Score & Quit
                          </button>
                        )}
                      </div>
                    )}
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
                  className={`p-4 rounded-2xl border text-center font-bold transition-all ${
                    feedback.type === 'success' ? 'bg-green-900/40 border-green-500/50 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.3)]' :
                    feedback.type === 'warning' ? 'bg-amber-900/40 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]' :
                    'bg-cyan-900/40 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <p className="leading-relaxed text-lg tracking-wide">{feedback.message}</p>

                  {gameWon && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col sm:flex-row gap-3 justify-center mt-4 pt-4 border-t border-green-500/30"
                    >
                      <button
                        onClick={() => shareToFacebook(cumulativeScore, attempts)}
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
              <div className="border-t border-slate-700/40 pt-4">
                <div className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">History</div>
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

      {/* ─── REWARD CHEST MODAL ─── */}
      <AnimatePresence>
        {showRewardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl px-8 pt-7 pb-8 max-w-sm w-full text-center overflow-hidden shadow-2xl shadow-amber-500/10"
            >
              {/* Opening flash */}
              <AnimatePresence>
                {chestState === 'opening' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.85, 0] }}
                    transition={{ duration: 0.42 }}
                    className="absolute inset-0 bg-amber-200 rounded-3xl z-30 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Corner decoration */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/5 rounded-br-full pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-amber-500/5 rounded-tl-full pointer-events-none" />

              {/* Header */}
              <div className="mb-1 relative z-10">
                <div className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
                  Level {currentLevel} — {activeLevelConfig.rank}
                </div>
                <motion.h2
                  key={chestState}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-black text-white leading-tight"
                >
                  {chestState === 'closed'
                    ? '✨ A reward awaits...'
                    : chestState === 'opening'
                    ? '💥 Opening...'
                    : isBombEligible
                    ? '💥 SMOKE BOMB!'
                    : `⭐ +${lastRoundScore.toLocaleString()} pts!`}
                </motion.h2>
              </div>

              {/* Chest + Reward area */}
              <div className="relative h-52 w-full flex items-end justify-center pb-2 my-3">

                {/* Sparkle particles (closed state only) */}
                <AnimatePresence>
                  {chestState === 'closed' &&
                    [0, 60, 120, 180, 240, 300].map((angle, i) => (
                      <motion.span
                        key={angle}
                        exit={{ opacity: 0, scale: 0 }}
                        className="absolute text-yellow-300 text-base pointer-events-none select-none"
                        style={{
                          top: `${42 + 36 * Math.sin((angle * Math.PI) / 180)}%`,
                          left: `${50 + 36 * Math.cos((angle * Math.PI) / 180)}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        animate={{ scale: [0.5, 1.4, 0.5], opacity: [0.2, 1, 0.2], rotate: [0, 25, 0] }}
                        transition={{ duration: 1.8 + i * 0.1, delay: i * 0.28, repeat: Infinity }}
                      >
                        ✨
                      </motion.span>
                    ))}
                </AnimatePresence>

                {/* Reward item — floats above chest */}
                <AnimatePresence>
                  {chestState === 'open' && (
                    <>
                      {/* Radial rays */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ bottom: '40%' }}>
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                          <motion.div
                            key={deg}
                            className="absolute w-0.5 rounded-full"
                            style={{
                              height: '72px',
                              background: isBombEligible
                                ? 'linear-gradient(to top, transparent, rgba(239,68,68,0.6))'
                                : 'linear-gradient(to top, transparent, rgba(250,204,21,0.6))',
                              transformOrigin: 'bottom center',
                              transform: `rotate(${deg}deg)`,
                              bottom: '50%',
                            }}
                            initial={{ scaleY: 0, opacity: 0 }}
                            animate={{ scaleY: [0, 1, 0.6], opacity: [0, 1, 0] }}
                            transition={{ duration: 1.1, delay: (deg / 360) * 0.3 }}
                          />
                        ))}
                      </div>

                      {/* Reward emoji */}
                      <motion.div
                        className="absolute select-none z-40"
                        style={{
                          fontSize: '5rem',
                          top: '2%',
                          left: '50%',
                          x: '-50%',
                          filter: isBombEligible
                            ? 'drop-shadow(0 0 22px rgba(239,68,68,0.9)) drop-shadow(0 0 8px rgba(239,68,68,0.6))'
                            : 'drop-shadow(0 0 22px rgba(250,204,21,0.9))',
                        }}
                        initial={{ y: 80, scale: 0, rotate: -25 }}
                        animate={{ y: 0, scale: [0, 1.35, 1], rotate: [-25, 12, 0] }}
                        transition={{ type: 'spring', stiffness: 480, damping: 18, delay: 0.12 }}
                      >
                        {isBombEligible ? '💣' : '⭐'}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* CSS Chest */}
                <div
                  className={`relative flex flex-col items-center z-20 ${chestState === 'closed' ? 'cursor-pointer' : ''}`}
                  style={{ perspective: '700px' }}
                  onClick={chestState === 'closed' ? openChest : undefined}
                >
                  {/* Ground glow */}
                  <div className={`absolute -bottom-3 w-32 h-5 rounded-full blur-xl transition-all duration-700 ${
                    chestState === 'closed' ? 'bg-amber-500/50' : chestState === 'open' ? 'bg-amber-500/10' : 'bg-amber-400/70'
                  }`} />

                  {/* Lid */}
                  <motion.div
                    className="relative w-32 h-14 rounded-t-2xl border-[3px] border-amber-400 z-20 overflow-hidden"
                    style={{
                      transformOrigin: 'center bottom',
                      background: 'linear-gradient(to bottom, #fbbf24 0%, #d97706 50%, #92400e 100%)',
                    }}
                    animate={chestState !== 'closed' ? { rotateX: -130, opacity: 0 } : { rotateX: 0, opacity: 1 }}
                    transition={{ duration: 0.38, ease: 'easeIn' }}
                    whileHover={chestState === 'closed' ? { scale: 1.04 } : {}}
                  >
                    <div className="absolute top-2 inset-x-4 h-[3px] bg-amber-200/40 rounded-full" />
                    <div className="absolute top-5 inset-x-4 h-[3px] bg-amber-200/30 rounded-full" />
                    <div className="absolute top-8 inset-x-4 h-[3px] bg-amber-200/20 rounded-full" />
                    <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-yellow-300/70 border border-yellow-200/50 shadow-sm" />
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-yellow-300/70 border border-yellow-200/50 shadow-sm" />
                  </motion.div>

                  {/* Gold band */}
                  <div className="relative w-36 h-4 z-30 -my-0.5"
                    style={{ background: 'linear-gradient(to right, #92400e, #fde68a, #f59e0b, #fde68a, #92400e)' }}
                  >
                    <div className="absolute inset-y-0.5 inset-x-0 border-y border-yellow-200/30" />
                  </div>

                  {/* Body */}
                  <div
                    className="relative w-32 h-20 rounded-b-2xl border-[3px] border-t-0 border-amber-600 z-20 overflow-hidden"
                    style={{ background: 'linear-gradient(to bottom, #92400e 0%, #78350f 40%, #451a03 100%)' }}
                  >
                    <div className="absolute top-3 inset-x-3 h-px bg-amber-700/60 rounded-full" />
                    <div className="absolute top-7 inset-x-3 h-px bg-amber-700/50 rounded-full" />
                    <div className="absolute top-11 inset-x-3 h-px bg-amber-700/40 rounded-full" />
                    {/* Keyhole */}
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 border-yellow-500/60 flex items-center justify-center"
                      style={{ background: '#1c0a00' }}>
                      <div className="w-2 h-2 rounded-full bg-yellow-600/50" />
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-[5px] w-2.5 h-4 rounded-b border-2 border-t-0 border-yellow-500/60"
                      style={{ background: '#1c0a00' }} />
                    {/* Corner rivets */}
                    <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-yellow-500/50 border border-yellow-400/40" />
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-yellow-500/50 border border-yellow-400/40" />
                    <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-yellow-500/50 border border-yellow-400/40" />
                    <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-yellow-500/50 border border-yellow-400/40" />
                  </div>

                  {/* Hover glow ring (closed only) */}
                  {chestState === 'closed' && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl border-2 border-amber-400/0 pointer-events-none"
                      animate={{ borderColor: ['rgba(251,191,36,0)', 'rgba(251,191,36,0.5)', 'rgba(251,191,36,0)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>
              </div>

              {/* "Tap to open" (closed state) */}
              <AnimatePresence>
                {chestState === 'closed' && (
                  <motion.div
                    exit={{ opacity: 0, y: -6 }}
                    className="mb-5"
                  >
                    <motion.button
                      onClick={openChest}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="text-amber-300 font-black text-sm uppercase tracking-widest flex items-center gap-2 mx-auto"
                    >
                      <span>👆</span> Tap the chest to open!
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reward info (open state) */}
              <AnimatePresence>
                {chestState === 'open' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="relative z-10"
                  >
                    {isBombEligible ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.55 }}
                        className="mb-5 p-4 rounded-2xl border text-left"
                        style={{ background: 'rgba(127,29,29,0.25)', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-2">💨 Smoke Bomb Unlocked</div>
                        <p className="text-sm text-slate-300 leading-relaxed">
                          Tap <span className="text-white font-semibold">💨 Smoke Bomb</span> during a level to reveal a <span className="text-orange-300 font-semibold">±15% range</span> guaranteed to contain the answer.
                        </p>
                        <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center gap-2">
                          <span className="text-xs text-slate-500">You now have</span>
                          <span className="font-black text-white text-base">{smokeBombs}</span>
                          <span className="text-xs text-slate-500">💨 smoke bomb{smokeBombs !== 1 ? 's' : ''}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.55 }}
                        className="mb-5 p-4 rounded-2xl border text-center"
                        style={{ background: 'rgba(120,53,15,0.2)', borderColor: 'rgba(245,158,11,0.25)' }}
                      >
                        <p className="font-black text-yellow-300 text-lg">+{lastRoundScore.toLocaleString()} pts</p>
                        <p className="text-xs text-slate-400 mt-1">Smoke Bombs are reserved for levels 6–8. Reach them to claim one!</p>
                      </motion.div>
                    )}

                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.72 }}
                      onClick={closeRewardModal}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-4 font-black rounded-2xl transition-all text-white text-lg tracking-wide ${
                        isBombEligible
                          ? 'shadow-[0_0_24px_rgba(239,68,68,0.45)]'
                          : 'shadow-[0_0_24px_rgba(245,158,11,0.35)]'
                      }`}
                      style={{
                        background: isBombEligible
                          ? 'linear-gradient(to right, #dc2626, #ea580c)'
                          : 'linear-gradient(to right, #d97706, #ca8a04)',
                      }}
                    >
                      Continue →
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── GUEST GATE MODAL ─── */}
      <AnimatePresence>
        {showGuestGateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 rounded-3xl px-8 pt-7 pb-8 max-w-sm w-full text-center overflow-hidden shadow-2xl shadow-cyan-500/10"
            >
              {guestGateStep === 'prompt' && (
                <motion.div key="prompt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-5xl mb-4">🏆</div>
                  <h2 className="text-xl font-black text-white mb-2">Level 6 Unlocked!</h2>
                  <p className="text-slate-400 text-sm mb-6">Save your score to continue to the next level and preserve your progress.</p>
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setGuestGateStep('register')}
                      className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all"
                    >
                      Save Score & Continue
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setGuestGateStep('declined')}
                      className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-400 font-semibold rounded-2xl transition-all"
                    >
                      Not Now
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {guestGateStep === 'declined' && (
                <motion.div key="declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-5xl mb-4">🔒</div>
                  <h2 className="text-xl font-black text-white mb-2">Score Required</h2>
                  <p className="text-slate-400 text-sm mb-6">Guests must save their scores before they can continue beyond level 5.</p>
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setGuestGateStep('register')}
                      className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all"
                    >
                      Save Score
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setGuestGateStep('goodbye')}
                      className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-400 font-semibold rounded-2xl transition-all"
                    >
                      Exit Game
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {guestGateStep === 'register' && (
                <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-5xl mb-4">🥷</div>
                  <h2 className="text-xl font-black text-white mb-1">Create Your Account</h2>
                  <p className="text-slate-400 text-sm mb-5">Choose an alias and password to save your score.</p>
                  <div className="flex flex-col gap-3 text-left mb-4">
                    <input
                      type="text"
                      value={guestRegAlias}
                      onChange={e => setGuestRegAlias(e.target.value)}
                      placeholder="Alias (3+ chars)"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 focus:border-cyan-500/70 rounded-xl text-white placeholder-slate-500 outline-none transition-colors"
                    />
                    <input
                      type="password"
                      value={guestRegPassword}
                      onChange={e => setGuestRegPassword(e.target.value)}
                      placeholder="Password (4+ chars)"
                      className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 focus:border-cyan-500/70 rounded-xl text-white placeholder-slate-500 outline-none transition-colors"
                      onKeyDown={e => e.key === 'Enter' && handleGuestRegister()}
                    />
                    {guestRegError && (
                      <p className="text-red-400 text-sm font-bold flex items-center gap-1">
                        <Zap className="w-4 h-4" /> {guestRegError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleGuestRegister}
                      disabled={guestRegLoading}
                      className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all"
                    >
                      {guestRegLoading ? 'Saving...' : 'Register & Continue'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setGuestGateStep('declined')}
                      className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 text-slate-400 font-semibold rounded-2xl transition-all"
                    >
                      Back
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {guestGateStep === 'goodbye' && (
                <motion.div key="goodbye" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="text-5xl mb-4">🌟</div>
                  <h2 className="text-xl font-black text-white mb-2">Thank You for Playing!</h2>
                  <p className="text-slate-400 text-sm mb-6">Thank you for playing NumNinja! Hope you enjoyed the game.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowGuestGateModal(false);
                      setIsGuest(false);
                      setPlayerAlias('');
                      setGameState('login');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all"
                  >
                    Return to Home
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PROFILE MODAL ─── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowProfileModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-3xl px-7 pt-7 pb-8 max-w-md w-full shadow-2xl"
            >
              {profileDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="text-5xl mb-4">✅</div>
                  <h2 className="text-2xl font-black text-white mb-2">Password Updated</h2>
                  <p className="text-slate-400 text-sm mb-6">Your new password is active.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setShowProfileModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all"
                  >
                    Done
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-500/40 flex items-center justify-center">
                        <User className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white leading-none">{playerAlias}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Profile settings</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Current Password</label>
                      <input
                        type="password"
                        value={profileCurrentPw}
                        onChange={(e) => setProfileCurrentPw(e.target.value)}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        className="w-full bg-slate-800/80 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">New Password</label>
                      <input
                        type="password"
                        value={profileNewPw}
                        onChange={(e) => { setProfileNewPw(e.target.value); setProfileError(null); }}
                        placeholder="At least 4 characters"
                        autoComplete="new-password"
                        className="w-full bg-slate-800/80 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        value={profileConfirmPw}
                        onChange={(e) => { setProfileConfirmPw(e.target.value); setProfileError(null); }}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                        onKeyDown={(e) => e.key === 'Enter' && profileCurrentPw && profileNewPw && profileConfirmPw && submitProfile()}
                        className="w-full bg-slate-800/80 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                      />
                    </div>

                    <AnimatePresence>
                      {profileError && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="text-red-400 text-sm font-semibold"
                        >
                          {profileError}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowProfileModal(false)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-bold rounded-2xl transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: profileCurrentPw && profileNewPw && profileConfirmPw ? 1.02 : 1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={submitProfile}
                      disabled={!profileCurrentPw || !profileNewPw || !profileConfirmPw || profileLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {profileLoading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                        : 'Save Changes'}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FEEDBACK MODAL ─── */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(2,6,23,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowFeedbackModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/20 rounded-3xl px-7 pt-7 pb-8 max-w-md w-full shadow-2xl shadow-cyan-500/10"
            >
              {feedbackDone ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="text-5xl mb-4">🙏</div>
                  <h2 className="text-2xl font-black text-white mb-2">Thanks!</h2>
                  <p className="text-slate-400 text-sm mb-6">Your feedback helps make NumNinja better.</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setShowFeedbackModal(false)}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-2xl transition-all"
                  >
                    Close
                  </motion.button>
                </motion.div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-2xl font-black text-white">Send Feedback</h2>
                    <p className="text-slate-400 text-sm mt-1">Bugs, ideas, or just a note — we read everything.</p>
                  </div>

                  {/* Category */}
                  <div className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Type</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'bug', label: '🐛 Bug' },
                        { value: 'suggestion', label: '💡 Idea' },
                        { value: 'praise', label: '❤️ Love' },
                        { value: 'other', label: '💬 Other' },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setFeedbackCategory(value)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                            feedbackCategory === value
                              ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300'
                              : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Rating (optional)</div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setFeedbackRating(feedbackRating === star ? 0 : star)}
                          className={`text-2xl transition-transform hover:scale-110 ${
                            star <= feedbackRating ? 'text-yellow-400' : 'text-slate-700 hover:text-slate-500'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-5">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Message</div>
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value.slice(0, 1000))}
                      placeholder="Tell us what you think..."
                      rows={4}
                      className="w-full bg-slate-800/80 border border-slate-700 focus:border-cyan-500/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none transition-colors"
                    />
                    <div className="text-right text-xs text-slate-700 mt-1">{feedbackMessage.length}/1000</div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-bold rounded-2xl transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: feedbackMessage.trim() ? 1.02 : 1 }}
                      whileTap={{ scale: feedbackMessage.trim() ? 0.98 : 1 }}
                      onClick={submitFeedback}
                      disabled={!feedbackMessage.trim() || feedbackLoading}
                      className="flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {feedbackLoading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                        : 'Send Feedback'}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
