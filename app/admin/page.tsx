"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, MessageSquare, Users, Star, Trash2, RefreshCw, Filter, BarChart3, ArrowLeft } from 'lucide-react';

type FeedbackItem = {
  id: number;
  alias: string | null;
  message: string;
  rating: number | null;
  category: string;
  created_at: string;
};

type Stats = {
  players: { total: number };
  scores: { total: number; avg_score: number; top_score: number; avg_level: number };
  feedback: {
    total: number;
    avg_rating: number;
    by_category: { category: string; count: number }[];
    by_rating: { rating: number; count: number }[];
  };
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: '🐛 Bug',
  suggestion: '💡 Suggestion',
  praise: '❤️ Praise',
  other: '💬 Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'text-red-400 bg-red-500/10 border-red-500/30',
  suggestion: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  praise: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
  other: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-slate-600 text-xs">No rating</span>;
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5 flex items-start gap-4"
    >
      <div className="text-cyan-400 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black text-white">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<'feedback' | 'stats'>('feedback');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minRating, setMinRating] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PER_PAGE), offset: String(page * PER_PAGE) });
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (minRating) params.set('minRating', minRating);
      const res = await fetch(`/api/admin/feedback?${params}`);
      if (res.status === 401 || res.status === 403) {
        setError('Access denied. You must be an admin to view this page.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load feedback');
      const data = await res.json();
      setFeedback(data.feedback);
      setTotal(data.total);
    } catch {
      setError('Failed to load feedback.');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, minRating, page]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) return;
      setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);
  useEffect(() => { if (tab === 'stats') fetchStats(); }, [tab, fetchStats]);

  const deleteFeedback = async (id: number) => {
    setDeletingId(id);
    try {
      await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setFeedback((prev) => prev.filter((f) => f.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeletingId(null);
    }
  };

  const applyFilters = () => { setPage(0); fetchFeedback(); };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <a href="/" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all inline-block">
            Back to Game
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-slate-500 hover:text-slate-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <span className="text-2xl">🥷</span>
            <div>
              <h1 className="font-black text-lg leading-none">NumNinja Admin</h1>
              <p className="text-xs text-slate-500 mt-0.5">Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => tab === 'feedback' ? fetchFeedback() : fetchStats()}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 pb-0">
          {(['feedback', 'stats'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all border-b-2 ${
                tab === t
                  ? 'text-cyan-400 border-cyan-400 bg-cyan-400/5'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {t === 'feedback' ? <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Feedback</span>
                               : <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Stats</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ─── FEEDBACK TAB ─── */}
          {tab === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All categories</option>
                    <option value="bug">🐛 Bug</option>
                    <option value="suggestion">💡 Suggestion</option>
                    <option value="praise">❤️ Praise</option>
                    <option value="other">💬 Other</option>
                  </select>
                </div>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Any rating</option>
                  <option value="5">★★★★★ only</option>
                  <option value="4">★★★★+ </option>
                  <option value="3">★★★+</option>
                </select>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-all"
                >
                  Apply
                </button>
                <span className="text-slate-500 text-sm self-center ml-auto">{total} total</span>
              </div>

              {/* Feedback list */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : feedback.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No feedback yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other}`}>
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <StarRating rating={item.rating} />
                            <span className="text-slate-600 text-xs">
                              {item.alias ? `by ${item.alias}` : 'Guest'}
                            </span>
                            <span className="text-slate-700 text-xs ml-auto">
                              {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">{item.message}</p>
                        </div>
                        <button
                          onClick={() => deleteFeedback(item.id)}
                          disabled={deletingId === item.id}
                          className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10 flex-shrink-0 disabled:opacity-30"
                        >
                          {deletingId === item.id
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {total > PER_PAGE && (
                <div className="flex items-center justify-center gap-3 mt-8">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sm font-bold rounded-lg transition-all"
                  >
                    ← Prev
                  </button>
                  <span className="text-slate-500 text-sm">
                    Page {page + 1} of {Math.ceil(total / PER_PAGE)}
                  </span>
                  <button
                    disabled={(page + 1) * PER_PAGE >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-sm font-bold rounded-lg transition-all"
                  >
                    Next →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── STATS TAB ─── */}
          {tab === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {statsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : stats ? (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Players & Scores</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard icon={<Users className="w-5 h-5" />} label="Players" value={stats.players.total} />
                      <StatCard icon={<Trophy className="w-5 h-5" />} label="Top Score" value={stats.scores.top_score.toLocaleString()} />
                      <StatCard icon={<Star className="w-5 h-5" />} label="Avg Score" value={stats.scores.avg_score.toLocaleString()} />
                      <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Avg Level" value={stats.scores.avg_level} sub={`${stats.scores.total} scores`} />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Feedback</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                      <StatCard icon={<MessageSquare className="w-5 h-5" />} label="Total Feedback" value={stats.feedback.total} />
                      <StatCard icon={<Star className="w-5 h-5" />} label="Avg Rating" value={stats.feedback.avg_rating > 0 ? `${stats.feedback.avg_rating} / 5` : '—'} />
                    </div>

                    {stats.feedback.by_category.length > 0 && (
                      <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5 mb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">By Category</h3>
                        <div className="space-y-2">
                          {stats.feedback.by_category.map(({ category, count }) => {
                            const pct = stats.feedback.total > 0 ? Math.round((count / stats.feedback.total) * 100) : 0;
                            return (
                              <div key={category} className="flex items-center gap-3">
                                <span className="text-sm w-28 text-slate-400">{CATEGORY_LABELS[category] || category}</span>
                                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-cyan-500 rounded-full"
                                  />
                                </div>
                                <span className="text-sm text-slate-500 w-12 text-right">{count} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {stats.feedback.by_rating.length > 0 && (
                      <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Rating Distribution</h3>
                        <div className="space-y-2">
                          {stats.feedback.by_rating.map(({ rating, count }) => {
                            const pct = stats.feedback.total > 0 ? Math.round((count / stats.feedback.total) * 100) : 0;
                            return (
                              <div key={rating} className="flex items-center gap-3">
                                <span className="text-yellow-400 text-sm w-24">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>
                                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-yellow-500 rounded-full"
                                  />
                                </div>
                                <span className="text-sm text-slate-500 w-12 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 text-slate-500">Failed to load stats.</div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
