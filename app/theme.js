const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Global color replacements
code = code.replace(/indigo/g, 'cyan');
code = code.replace(/violet/g, 'blue');
code = code.replace(/#818cf8/g, '#06b6d4');
code = code.replace(/#a78bfa/g, '#3b82f6');
code = code.replace(/#a5b4fc/g, '#67e8f9');

// Darker backdrop
code = code.replace(/bg-\[\#0f172a\]\/30/g, 'bg-slate-900\/70');

// Floating Numbers updates to match glowing orange/cyan spark theme
code = code.replace(/opacity: 0\.06/g, 'opacity: 0.15'); // Brighter
code = code.replace(/text-white select-none \$\{pos.size\}/g, 'text-orange-400 select-none ${pos.size} drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]');

// Make input boxes have orange glowing focus instead of cyan
code = code.replace(/focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500\/20/g, 'focus:border-orange-500 focus:ring-4 focus:ring-orange-500\/40');
code = code.replace(/group-focus-within:opacity-100/g, 'group-focus-within:opacity-100'); // No-op, just context
// The blurred background behind the input should be orange when focused:
code = code.replace(/bg-cyan-500\/10 blur-xl opacity-0 group-focus-within:opacity-100/g, 'bg-orange-500\/20 blur-xl opacity-0 group-focus-within:opacity-100');

// Make login title orange/amber instead of cyan to resemble the NUM ninja title
code = code.replace(/from-cyan-400 via-blue-400 to-cyan-300/g, 'from-orange-400 via-amber-400 to-orange-500');

// Enhance the main Glassmorphism borders and shadows (from slate to a slight cyan neon vibe)
code = code.replace(/border-slate-700\/50/g, 'border-cyan-500\/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]');
code = code.replace(/bg-slate-800\/40/g, 'bg-slate-900\/60');
code = code.replace(/bg-slate-800\/60/g, 'bg-slate-900\/70');

// Button should have an orange option if we want to pop
code = code.replace(/from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-xl shadow-cyan-900\/30/g, 
  'from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(249,115,22,0.4)]');
  
code = code.replace(/from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg shadow-cyan-900\/40/g,
  'from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-2 text-lg shadow-[0_0_15px_rgba(249,115,22,0.4)]');

// Update text sizes and make some things more ninja-like
// "NUMNINJA" header in game view
code = code.replace(/from-cyan-400 to-blue-400 bg-clip-text text-transparent/g, 'from-orange-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_0_5px_rgba(251,146,60,0.4)]');

fs.writeFileSync('app/page.tsx', code);
console.log('Modified page.tsx aesthetics.');
