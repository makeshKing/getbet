import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Market, Side } from '../types';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ============================================================
// CAROUSEL CHART — complete, self-contained, exact copy of the
// working market detail page chart logic, scaled down for the
// smaller carousel card. Paste this whole block as-is.
// ============================================================

function CarouselOutcomeChart({
  chartData,
  outcomes,
}: {
  chartData: any[];
  outcomes: { id: string; name: string; color: string }[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverPoint, setHoverPoint] = useState<any>(null);
  const [drawDone, setDrawDone] = useState(false);
  const ranOnce = useRef(false);

  useEffect(() => {
    ranOnce.current = false;
    setDrawDone(false);
    const t = setTimeout(() => {
      ranOnce.current = true;
      setDrawDone(true);
    }, 1300);
    return () => clearTimeout(t);
  }, [chartData]);

  function dotFor(outcome: { id: string; color: string }) {
    return function (props: any) {
      const { cx, cy, index } = props;
      const isLast = index === chartData.length - 1;
      const isHover = index === hoverIdx;

      if (!drawDone) {
        return <g key={`${outcome.id}-${index}`} />;
      }

      if (isHover) {
        const val = hoverPoint?.[outcome.id];
        if (val === undefined || val === null) {
          return <g key={`${outcome.id}-${index}`} />;
        }
        const flip = cx > 260;
        const w = 100;
        const x = flip ? cx - w - 6 : cx + 6;
        return (
          <g key={`${outcome.id}-${index}`}>
            <circle cx={cx} cy={cy} r={3.5} fill={outcome.color} stroke="#fff" strokeWidth={1.2} />
            <rect x={x} y={cy - 10} width={w} height={20} rx={4} fill="#1E2025" stroke={outcome.color} strokeWidth={1} />
            <text x={x + w / 2} y={cy + 4} textAnchor="middle" fill={outcome.color} fontSize={9} fontWeight={700}>
              {Number(val).toFixed(1)}%
            </text>
          </g>
        );
      }

      if (isLast) {
        return (
          <g key={`${outcome.id}-${index}`}>
            <circle cx={cx} cy={cy} r={6} fill={outcome.color} opacity={0.15} />
            <circle cx={cx} cy={cy} r={4} fill={outcome.color} className="live-dot-glow" />
            <circle cx={cx} cy={cy} r={2.5} fill={outcome.color} stroke="#0B0D10" strokeWidth={1.2} />
          </g>
        );
      }

      return <g key={`${outcome.id}-${index}`} />;
    };
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 30, left: 0, bottom: 0 }}
          onMouseMove={(e: any) => {
            if (e?.activeTooltipIndex !== undefined) {
              setHoverIdx(e.activeTooltipIndex);
              setHoverPoint(chartData[e.activeTooltipIndex] ?? null);
            }
          }}
          onMouseLeave={() => {
            setHoverIdx(null);
            setHoverPoint(null);
          }}
        >
          <CartesianGrid horizontal vertical={false} stroke="#2A2D35" strokeDasharray="3 3" opacity={0.4} />
          <YAxis
            orientation="right"
            domain={['dataMin - 2', 'dataMax + 2']}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            tick={{ fill: '#9AA0A6', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={() => null} />
          {outcomes.map((o) => (
            <Line
              key={o.id}
              type="basis"
              dataKey={o.id}
              stroke={o.color}
              strokeWidth={2.5}
              isAnimationActive={!drawDone}
              animationDuration={1200}
              animationEasing="ease-out"
              dot={dotFor(o)}
              activeDot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface FeaturedMarketCardProps {
  market: Market;
  onClick: (id: string) => void;
  categoryIcon?: React.FC<{ size?: number; className?: string }>;
  currentIndex?: number;
  totalFeatured?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

const formatVol = (cents: number) => {
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export const FeaturedMarketCard: React.FC<FeaturedMarketCardProps> = ({
  market,
  onClick,
  categoryIcon: CategoryIcon = Globe2,
  currentIndex = 1,
  totalFeatured = 1,
  onPrev,
  onNext
}) => {
  const isVs = market.subcategory === 'Head-to-Head' && market.candidateA && market.candidateB;
  const isMultiOutcome = !isVs && market.outcomes && market.outcomes.length > 0;
  const isResolved = !!market.outcome || market.status === 'resolved';

  const displayOutcomes = [];
  if (isVs) {
    displayOutcomes.push({ id: 'A', name: market.candidateA!.name, imageUrl: market.candidateA!.imageUrl, probability: market.probability, color: market.candidateA!.color || '#ef4444' });
    displayOutcomes.push({ id: 'B', name: market.candidateB!.name, imageUrl: market.candidateB!.imageUrl, probability: 100 - market.probability, color: market.candidateB!.color || '#3b82f6' });
  } else if (isMultiOutcome) {
    market.outcomes!.slice(0, 3).forEach(o => {
      displayOutcomes.push({ id: o.id, name: o.name, probability: o.probability, color: o.color || '#10b981' });
    });
  } else {
    displayOutcomes.push({ id: 'YES', name: 'Yes', probability: market.probability, color: '#10b981' });
    displayOutcomes.push({ id: 'NO', name: 'No', probability: 100 - market.probability, color: '#3b82f6' });
  }

  // Generate mock chart data based on the outcomes
  const chartData = useMemo(() => {
    const data = [];
    let curProbs = displayOutcomes.map(o => o.probability);

    // Start 30 points ago, converging to current probabilities
    for (let i = 0; i <= 30; i++) {
      const point: any = { time: `Point ${i}` };
      const progress = i / 30;

      displayOutcomes.forEach((o, idx) => {
        const target = o.probability;
        // Add noise that decreases as progress approaches 1
        const noise = (Math.random() - 0.5) * 20 * (1 - progress);
        // Linear interpolate from a random start point to the target
        const startPoint = Math.max(0, Math.min(100, target + (Math.random() - 0.5) * 40));
        let val = startPoint + (target - startPoint) * progress + noise;
        if (i === 30) val = target; // Ensure exact match at the end
        point[o.id] = Math.max(0, Math.min(100, val));
      });
      data.push(point);
    }
    return data;
  }, [market.id, displayOutcomes]);

  return (
    <div
      className={`rounded-2xl border p-5 relative group flex flex-col h-full
                ${isResolved
          ? 'bg-[#12161f] border-slate-800 opacity-70 grayscale-[20%] cursor-not-allowed'
          : 'bg-[#12161f] border-slate-800 cursor-pointer hover:border-slate-700 transition-colors duration-200'
        }`}
      onClick={() => {
        if (isResolved) return;
        onClick(market.id);
      }}
    >
      {/* Lock overlay — only shows on resolved cards on hover */}
      {isResolved && (
        <div className="absolute inset-0 z-10 rounded-2xl flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-200">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-white text-xs font-bold uppercase tracking-wide">
              Market Closed
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">

        {/* Left Column: Details */}
        <div className="flex flex-col">
          {/* Header: Category and Carousel Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-500">
                <CategoryIcon size={16} />
              </div>
              <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{market.category}</span>
              {isResolved && (
                <span className="ml-2 flex items-center gap-1 text-[#9AA0A6] text-[10px] font-medium border border-[#9AA0A6]/30 px-2 py-0.5 rounded-full bg-[#9AA0A6]/5">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  RESOLVED
                </span>
              )}
            </div>

            {totalFeatured > 1 && (
              <div className="flex items-center gap-2">
                <button
                  className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onPrev?.(); }}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-bold text-slate-300 w-8 text-center">
                  {currentIndex} of {totalFeatured}
                </span>
                <button
                  className="w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  onClick={(e) => { e.stopPropagation(); onNext?.(); }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black text-white mb-6 tracking-tight leading-tight capitalize">
            {market.title}
          </h2>

          {/* Outcomes Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-2">
            <div>Market</div>
            <div className="text-right w-14">Pays out</div>
            <div className="text-right w-14">Odds</div>
          </div>

          {/* Outcomes */}
          <div className="space-y-3 mb-6">
            {displayOutcomes.map((outcome) => {
              const payout = outcome.probability > 0 ? (100 / outcome.probability).toFixed(2) : '0.00';
              return (
                <div key={outcome.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-2">
                  <div className="flex items-center gap-3">
                    {outcome.imageUrl && (
                      <img src={outcome.imageUrl} alt={outcome.name} className="w-5 h-5 rounded-sm object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white mb-1 truncate">{outcome.name}</div>
                      <div className="h-0.5 rounded-full bg-slate-800/50 w-full relative overflow-hidden">
                        <div
                          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${outcome.probability}%`, backgroundColor: outcome.color }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-bold text-slate-400 w-14">
                    {payout}x
                  </div>
                  <div className="text-right w-14">
                    <div className="inline-flex items-center justify-center w-full py-1 rounded-full border text-[11px] font-black" style={{ borderColor: `${outcome.color}80`, color: outcome.color, backgroundColor: `${outcome.color}15` }}>
                      {outcome.probability}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-800/80">
            <div className="text-[11px] font-bold text-slate-300">
              {formatVol(market.volume)} vol
            </div>
            <div className="text-[11px] font-bold text-slate-300">
              {market.outcomes ? market.outcomes.length : 2} markets
            </div>
          </div>

          {/* News Snippet */}
          <div className="pt-4 mt-auto">
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="font-black text-white mr-2">News</span>
              {market.description}
            </p>
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="hidden lg:flex flex-col relative h-full min-h-[250px] min-w-0">
          <div className="flex items-center gap-4 mb-2 flex-wrap">
            {displayOutcomes.map(o => (
              <div key={o.id} className="flex items-center gap-2 text-sm font-bold text-[#9AA0A6]">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }}></div>
                {o.name} <span className="text-white font-black">{o.probability.toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <div className="flex-1 w-full h-full -ml-4 min-w-0">
            <CarouselOutcomeChart
              chartData={chartData}
              outcomes={displayOutcomes}
            />
          </div>

          <div className="absolute bottom-2 left-0 right-0 flex justify-between text-[10px] font-bold text-slate-500 px-2 pointer-events-none">
            <span>May 2025</span>
            <span>Aug 2025</span>
            <span>Nov 2025</span>
            <span>Mar 2026</span>
            <span>Jun 2026</span>
          </div>

          {/* Mock indicator text */}
          <div className="absolute bottom-6 left-2 text-[11px] font-black text-emerald-500">
            + $5
          </div>
        </div>

      </div>
    </div>
  );
};
