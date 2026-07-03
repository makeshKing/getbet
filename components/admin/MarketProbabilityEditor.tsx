import React, { useState } from 'react';
import { Market, MarketDynamics } from '../../types';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import {
  X, TrendingUp, TrendingDown, Minus, BarChart2,
  Clock, Target, Zap,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Types & Defaults
// ─────────────────────────────────────────────────────────────

interface Props {
  market: Market;
  onClose: () => void;
}

type Tab = 'live' | 'dynamics';

const DEFAULT_DYNAMICS: MarketDynamics = {
  pricePreset: 50,
  minProbability: 5,
  maxProbability: 95,
  driftEnabled: false,
  driftRate: 1,
  driftDirection: 'none',
  driftStartTime: null,
  driftEndTime: null,
  lastDriftApplied: null,
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const RangeRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  accentClass: string;
  valueClass: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, accentClass, valueClass, onChange }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-10 shrink-0">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={`flex-1 h-2 rounded-full appearance-none cursor-pointer ${accentClass}`}
    />
    <span className={`w-10 text-center text-sm font-black tabular-nums shrink-0 ${valueClass}`}>{value}%</span>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export const MarketProbabilityEditor: React.FC<Props> = ({ market, onClose }) => {
  const { adminUpdateMarketField, refreshMarkets } = useApp();
  const { addToast } = useToast();

  const [tab, setTab] = useState<Tab>('live');
  const [saving, setSaving] = useState(false);
  const [applyingDrift, setApplyingDrift] = useState(false);

  const isMultiOutcome = !!(market.outcomes && market.outcomes.length > 0);

  // ── Live-adjust state ──
  const [probability, setProbability] = useState(market.probability);
  const [outcomeProbs, setOutcomeProbs] = useState<Record<string, number>>(
    market.outcomes
      ? Object.fromEntries(market.outcomes.map(o => [o.id, o.probability]))
      : {}
  );

  // ── Dynamics state ──
  const [dyn, setDyn] = useState<MarketDynamics>(market.dynamics ?? DEFAULT_DYNAMICS);

  // ── Helpers ──────────────────────────────────────────────────

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const handleApplyProbability = async () => {
    setSaving(true);
    try {
      if (isMultiOutcome) {
        const updated = (market.outcomes ?? []).map(o => ({
          ...o,
          probability: outcomeProbs[o.id] ?? o.probability,
        }));
        await adminUpdateMarketField(market.id, 'outcomes', updated);
      } else {
        await adminUpdateMarketField(market.id, 'probability', probability);
      }
      addToast('Probability updated', 'success');
      await refreshMarkets();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = async () => {
    if (isMultiOutcome) return;
    setSaving(true);
    try {
      const clamped = clamp(dyn.pricePreset, dyn.minProbability, dyn.maxProbability);
      await adminUpdateMarketField(market.id, 'probability', clamped);
      setProbability(clamped);
      addToast(`Probability preset to ${clamped}%`, 'success');
      await refreshMarkets();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDynamics = async () => {
    setSaving(true);
    try {
      await adminUpdateMarketField(market.id, 'dynamics', dyn);
      // Clamp current probability to new range if needed (binary only)
      if (!isMultiOutcome) {
        const clamped = clamp(market.probability, dyn.minProbability, dyn.maxProbability);
        if (clamped !== market.probability) {
          await adminUpdateMarketField(market.id, 'probability', clamped);
        }
      }
      addToast('Dynamics preset saved', 'success');
      await refreshMarkets();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyDrift = async () => {
    if (!dyn.driftEnabled || dyn.driftDirection === 'none') {
      addToast('Enable drift and choose a direction first', 'error');
      return;
    }
    if (isMultiOutcome) {
      addToast('Drift is only supported for binary markets', 'error');
      return;
    }
    setApplyingDrift(true);
    try {
      const lastApplied = dyn.lastDriftApplied ? new Date(dyn.lastDriftApplied) : null;
      const now = new Date();
      const elapsedHours = lastApplied
        ? (now.getTime() - lastApplied.getTime()) / 3_600_000
        : 1; // default 1 h for first apply
      const delta = dyn.driftRate * elapsedHours * (dyn.driftDirection === 'up' ? 1 : -1);
      const newProb = clamp(Math.round(market.probability + delta), dyn.minProbability, dyn.maxProbability);

      const updatedDyn: MarketDynamics = { ...dyn, lastDriftApplied: now.toISOString() };
      await adminUpdateMarketField(market.id, 'probability', newProb);
      await adminUpdateMarketField(market.id, 'dynamics', updatedDyn);
      setDyn(updatedDyn);
      setProbability(newProb);
      addToast(`Drift applied → ${newProb}% (Δ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%)`, 'success');
      await refreshMarkets();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setApplyingDrift(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Live Market · Probability Control</span>
              </div>
              <h2 className="text-base font-black text-white leading-snug truncate">{market.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 hover:bg-white/20 rounded-xl transition-colors text-white/70 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Current probability display */}
          <div className="mt-4 bg-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">Current Probability</div>
              {isMultiOutcome ? (
                <div className="flex flex-wrap gap-2 mt-1">
                  {(market.outcomes ?? []).map(o => (
                    <span
                      key={o.id}
                      className="text-xs font-black text-white px-2 py-0.5 rounded-lg"
                      style={{ backgroundColor: (o.color ?? '#6366f1') + '55' }}
                    >
                      {o.name} {o.probability}%
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-5xl font-black text-white tabular-nums">{market.probability}<span className="text-2xl ml-1 text-white/60">%</span></div>
              )}
            </div>
            {!isMultiOutcome && (
              <div className="shrink-0 text-right space-y-1.5">
                <div className="w-32 bg-white/20 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${market.probability}%` }}
                  />
                </div>
                <span className="text-[10px] text-white/60 font-bold block">
                  YES {market.probability}¢ · NO {100 - market.probability}¢
                </span>
                {market.dynamics && (
                  <span className="text-[9px] text-amber-300 font-black uppercase tracking-wider block">
                    Range: {market.dynamics.minProbability}–{market.dynamics.maxProbability}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
          {(['live', 'dynamics'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
                tab === t
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-slate-900'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {t === 'live' ? '⚡ Live Adjust' : '⚙ Dynamics Preset'}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* ──────────────── LIVE TAB ──────────────── */}
          {tab === 'live' && (
            isMultiOutcome ? (
              <div className="space-y-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Adjust each outcome independently
                </p>
                {(market.outcomes ?? []).map(outcome => {
                  const val = outcomeProbs[outcome.id] ?? outcome.probability;
                  return (
                    <div key={outcome.id} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: outcome.color ?? '#6366f1' }} />
                          <span className="text-sm font-black text-slate-800 dark:text-white">{outcome.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOutcomeProbs(p => ({ ...p, [outcome.id]: Math.max(1, val - 1) }))}
                            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-black text-base hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                          >−</button>
                          <span className="text-base font-black text-slate-900 dark:text-white tabular-nums w-11 text-center">
                            {val}%
                          </span>
                          <button
                            onClick={() => setOutcomeProbs(p => ({ ...p, [outcome.id]: Math.min(99, val + 1) }))}
                            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-black text-base hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                          >+</button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={val}
                        onChange={e => setOutcomeProbs(p => ({ ...p, [outcome.id]: Number(e.target.value) }))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${val}%`, backgroundColor: outcome.color ?? '#6366f1' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Binary live adjust */
              <div className="space-y-6">
                {/* Big circular display */}
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="60" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-700" />
                      <circle
                        cx="70" cy="70" r="60"
                        fill="none"
                        stroke="url(#probGrad)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(probability / 100) * 376.99} 376.99`}
                        transform="rotate(-90 70 70)"
                        className="transition-all duration-300"
                      />
                      <defs>
                        <linearGradient id="probGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{probability}%</span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YES</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs font-bold text-slate-500">
                    <span className="text-emerald-600 dark:text-emerald-400">YES {probability}¢</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-indigo-600 dark:text-indigo-400">NO {100 - probability}¢</span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>1%</span><span>50%</span><span>99%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={probability}
                    onChange={e => setProbability(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Quick picks */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {[10, 25, 40, 50, 60, 75, 90].map(v => (
                    <button
                      key={v}
                      onClick={() => setProbability(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                        probability === v
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600'
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>

                {/* +/- controls with number input */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProbability(p => Math.max(1, p - 5))}
                    className="px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                  >−5%</button>
                  <button
                    onClick={() => setProbability(p => Math.max(1, p - 1))}
                    className="px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                  >−1%</button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={probability}
                    onChange={e => setProbability(clamp(Number(e.target.value), 1, 99))}
                    className="flex-1 text-center py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 text-slate-900 dark:text-white font-black text-lg focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => setProbability(p => Math.min(99, p + 1))}
                    className="px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                  >+1%</button>
                  <button
                    onClick={() => setProbability(p => Math.min(99, p + 5))}
                    className="px-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 transition-colors"
                  >+5%</button>
                </div>
              </div>
            )
          )}

          {/* ──────────────── DYNAMICS TAB ──────────────── */}
          {tab === 'dynamics' && (
            <div className="space-y-5">

              {/* Price Preset */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={15} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Price Preset</h3>
                  </div>
                  <button
                    onClick={handleApplyPreset}
                    disabled={saving || isMultiOutcome}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors disabled:opacity-40 shadow-sm"
                  >
                    {saving ? '...' : 'Apply Now'}
                  </button>
                </div>
                <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70 font-medium">
                  Instantly set the market probability to a preset anchor value.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={99}
                    value={dyn.pricePreset}
                    onChange={e => setDyn(d => ({ ...d, pricePreset: Number(e.target.value) }))}
                    className="flex-1 h-2.5 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="w-12 text-center font-black text-indigo-700 dark:text-indigo-300 tabular-nums text-base">{dyn.pricePreset}%</span>
                </div>
              </div>

              {/* Probability Range */}
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-violet-600 dark:text-violet-400" />
                  <h3 className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-widest">Probability Range</h3>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Probability will be clamped to this range when drift is applied.
                </p>
                <div className="space-y-3">
                  <RangeRow
                    label="Floor"
                    value={dyn.minProbability}
                    min={1}
                    max={dyn.maxProbability - 1}
                    accentClass="accent-emerald-500"
                    valueClass="text-emerald-600 dark:text-emerald-400"
                    onChange={v => setDyn(d => ({ ...d, minProbability: v }))}
                  />
                  <RangeRow
                    label="Ceil"
                    value={dyn.maxProbability}
                    min={dyn.minProbability + 1}
                    max={99}
                    accentClass="accent-rose-500"
                    valueClass="text-rose-500 dark:text-rose-400"
                    onChange={v => setDyn(d => ({ ...d, maxProbability: v }))}
                  />
                </div>
                {/* Visual range bar */}
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative mt-1">
                  <div
                    className="absolute h-full bg-gradient-to-r from-emerald-400 to-violet-500 rounded-full transition-all duration-300"
                    style={{ left: `${dyn.minProbability}%`, width: `${dyn.maxProbability - dyn.minProbability}%` }}
                  />
                  {/* Current position marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/80 transition-all duration-300"
                    style={{ left: `${market.probability}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-0.5">
                  <span className="text-emerald-600">{dyn.minProbability}% floor</span>
                  <span className="text-slate-500">Current: {market.probability}%</span>
                  <span className="text-rose-500">{dyn.maxProbability}% ceiling</span>
                </div>
              </div>

              {/* Time-Based Drift */}
              <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-amber-600 dark:text-amber-400" />
                    <h3 className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-widest">Time-Based Drift</h3>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => setDyn(d => ({ ...d, driftEnabled: !d.driftEnabled }))}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 ${dyn.driftEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${dyn.driftEnabled ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-[11px] text-amber-700/70 dark:text-amber-400/70 font-medium">
                  Automatically drift the probability over time. Click "Apply Drift Now" to manually trigger.
                </p>

                {/* Drift settings — always visible but dimmed when disabled */}
                <div className={`space-y-4 transition-opacity duration-300 ${dyn.driftEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  {/* Rate */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 w-16 shrink-0">Rate/hr</span>
                    <input
                      type="range"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={dyn.driftRate}
                      onChange={e => setDyn(d => ({ ...d, driftRate: Number(e.target.value) }))}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="w-14 text-center font-black text-amber-600 dark:text-amber-400 tabular-nums text-sm shrink-0">
                      {dyn.driftRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Direction */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Drift Direction</span>
                    <div className="flex gap-2">
                      {(['up', 'down', 'none'] as const).map(dir => (
                        <button
                          key={dir}
                          onClick={() => setDyn(d => ({ ...d, driftDirection: dir }))}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all border ${
                            dyn.driftDirection === dir
                              ? dir === 'up'
                                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30'
                                : dir === 'down'
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/30'
                                  : 'bg-slate-600 text-white border-slate-600'
                              : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-amber-400 hover:text-amber-600'
                          }`}
                        >
                          {dir === 'up' ? <TrendingUp size={12} /> : dir === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time window */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">Start Time</label>
                      <input
                        type="datetime-local"
                        value={dyn.driftStartTime ? dyn.driftStartTime.slice(0, 16) : ''}
                        onChange={e => setDyn(d => ({ ...d, driftStartTime: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">End Time</label>
                      <input
                        type="datetime-local"
                        value={dyn.driftEndTime ? dyn.driftEndTime.slice(0, 16) : ''}
                        onChange={e => setDyn(d => ({ ...d, driftEndTime: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>

                  {dyn.lastDriftApplied && (
                    <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 font-medium">
                      Last applied: {new Date(dyn.lastDriftApplied).toLocaleString()}
                    </p>
                  )}

                  {/* Apply drift button */}
                  <button
                    onClick={handleApplyDrift}
                    disabled={applyingDrift || isMultiOutcome}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20"
                  >
                    {applyingDrift ? <Spinner size="sm" /> : <Zap size={14} />}
                    Apply Drift Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'live' ? handleApplyProbability : handleSaveDynamics}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-indigo-500/25"
          >
            {saving && <Spinner size="sm" />}
            {tab === 'live' ? 'Apply Changes' : 'Save Preset'}
          </button>
        </div>
      </div>
    </div>
  );
};
