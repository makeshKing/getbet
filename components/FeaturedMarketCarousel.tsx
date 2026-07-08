import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { CARD_BG, DIVIDER, BORDER_SUBTLE, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY, ACCENT, LINE_COLORS, categoryAccent } from '../lib/theme';

export interface MarketSlide {
  id: string;
  category: { label: string; icon: ReactNode };
  title: string;
  outcomes: {
    name: string;
    icon?: string;
    payoutMultiplier: number;
    probability: number;
    color: string;
  }[];
  chartData: { date: string;[outcomeName: string]: number | string }[];
  news?: string;
  volume: number;
  marketCount: number;
}

export interface MarketCarouselProps {
  slides?: MarketSlide[];
  onSelectMarket?: (id: string) => void;
}

const formatVol = (cents: number) => {
  // Realistic display floor — never show below $10,000
  const dollars = Math.max(cents, 1_000_000) / 100;
  return '$' + dollars.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

// Default Mock Data for immediate preview if no slides are passed
const MOCK_SLIDES: MarketSlide[] = [
  {
    id: 'mock-1',
    category: { label: 'SPORTS', icon: <Globe2 size={14} /> },
    title: "2026 Men's World Cup Winner",
    outcomes: [
      { name: 'Spain', icon: 'https://flagcdn.com/w40/es.png', payoutMultiplier: 5.53, probability: 17.1, color: '#FF4B4B' },
      { name: 'France', icon: 'https://flagcdn.com/w40/fr.png', payoutMultiplier: 5.76, probability: 16.4, color: '#3B82F6' },
      { name: 'Brazil', icon: 'https://flagcdn.com/w40/br.png', payoutMultiplier: 7.20, probability: 13.9, color: '#F59E0B' },
    ],
    chartData: [
      { date: 'Jun 18', Spain: 15, France: 14, Brazil: 12 },
      { date: 'Jun 19', Spain: 14.5, France: 15.2, Brazil: 12.8 },
      { date: 'Jun 20', Spain: 16, France: 15, Brazil: 13 },
      { date: 'Jun 21', Spain: 16.8, France: 16, Brazil: 13.5 },
      { date: 'Jun 22', Spain: 17.1, France: 16.4, Brazil: 13.9 },
    ],
    news: "The 2026 FIFA World Cup kicks off June 11 across the United States, Canada, and Mexico — the first ever 48-team edition.",
    volume: 1245000,
    marketCount: 46,
  },
  {
    id: 'mock-2',
    category: { label: 'POLITICS', icon: <Globe2 size={14} /> },
    title: "Will Congressional salaries increase by 2030?",
    outcomes: [
      { name: 'Yes', payoutMultiplier: 1.83, probability: 47, color: '#10B981' },
      { name: 'No', payoutMultiplier: 2.24, probability: 53, color: '#ef4444' },
    ],
    chartData: [
      { date: 'Jun 18', Yes: 30, No: 70 },
      { date: 'Jun 19', Yes: 35, No: 65 },
      { date: 'Jun 20', Yes: 42, No: 58 },
      { date: 'Jun 21', Yes: 45, No: 55 },
      { date: 'Jun 22', Yes: 47, No: 53 },
    ],
    news: "Discussions regarding congressional salary adjustments continue amid budget negotiations.",
    volume: 6420000,
    marketCount: 4,
  }
];

// ============================================================
// CAROUSEL CHART — complete, self-contained, exact copy of the
// working market detail page chart logic, scaled down for the
// smaller carousel card. Paste this whole block as-is.
// (imports merged into the top of this file to avoid duplicates)
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

// ── Odds Pill ── transparent / hover-15% / active-fill ──
interface OddsPillProps {
  probability: number;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

const OddsPill: React.FC<OddsPillProps> = ({ probability, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center justify-center min-w-[54px] h-7 px-2.5 rounded-full text-[12px] font-bold cursor-pointer transition-all duration-150 ease-out hover:scale-[1.02] ${selected ? 'bg-[#00D4AA] text-[#0A0C10]' : 'bg-transparent text-white hover:bg-[#00D4AA]/15'
      }`}
    style={{ border: '1.5px solid #00D4AA' }}
  >
    {probability.toFixed(1).replace(/\.0$/, '')}%
  </button>
);

export const FeaturedMarketCarousel: React.FC<MarketCarouselProps> = ({ slides = MOCK_SLIDES, onSelectMarket }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Reset outcome selection when slide changes
  useEffect(() => {
    setSelectedOutcome(null);
  }, [currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const timer = setInterval(handleNext, 7000);
    return () => clearInterval(timer);
  }, [isPaused, handleNext, totalSlides]);

  if (!currentSlide) return null;

  const accent = categoryAccent(currentSlide.category.label);

  return (
    <div
      className="bg-[#15171C] border border-[#22252B] rounded-xl md:rounded-2xl p-4 md:p-6 cursor-pointer transition-colors duration-200 group relative overflow-hidden w-full max-w-full flex flex-col h-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => onSelectMarket?.(currentSlide.id)}
    >
      {/* Header — pagination (Mobile Only) */}
      <div className="flex md:hidden items-center justify-end shrink-0 absolute top-3 right-3 z-20">
        {totalSlides > 1 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="w-6 h-6 rounded-full bg-[#22252B] flex items-center justify-center transition-colors duration-150 z-10 hover:bg-[#2A2D35] flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              aria-label="Previous"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
            <span className="text-[10px] font-bold text-[#9AA0A6] w-8 text-center whitespace-nowrap flex-shrink-0">
              {currentIndex + 1} of {totalSlides}
            </span>
            <button
              className="w-6 h-6 rounded-full bg-[#22252B] flex items-center justify-center transition-colors duration-150 z-10 hover:bg-[#2A2D35] flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              aria-label="Next"
            >
              <ChevronRight size={14} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Sliding Track Container */}
      <div className="overflow-hidden relative w-full h-full">
        <div
          className="flex transition-transform duration-500 ease-in-out will-change-transform w-full h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => {
            return (
              <div key={slide.id} className="w-full h-full flex-shrink-0">
                <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6 h-full">
                  {/* LEFT — outcomes list */}
                  <div className="flex flex-col justify-between pt-7 md:pt-0">
                    <div>
                      {/* Category badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#9AA0A6]">{slide.category.icon}</span>
                        <p className="text-[#9AA0A6] text-[10px] font-bold uppercase tracking-widest">
                          {slide.category.label}
                        </p>
                      </div>

                      {/* Title */}
                      <h2 className="text-white text-lg md:text-2xl font-bold mb-4 leading-tight line-clamp-2 pr-16 md:pr-0">
                        {slide.title}
                      </h2>

                      {/* Column headers */}
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 sm:gap-4 text-[#9AA0A6] text-xs mb-2 border-b border-[#22252B] pb-2">
                        <span>Market</span>
                        <span className="text-right w-12 sm:w-16">Pays out</span>
                        <span className="text-right w-11 sm:w-14">Odds</span>
                      </div>

                      {/* Outcome rows */}
                      {slide.outcomes.slice(0, 3).map((o, idx) => (
                        <div key={idx} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 sm:gap-4 items-center py-2 border-b border-[#22252B]">
                          <div className="flex items-center gap-2 min-w-0">
                            {o.icon && (
                              <img src={o.icon} alt={o.name} className="w-5 h-5 rounded-sm object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            )}
                            <div className={`w-5 h-5 rounded-sm bg-[#1E2025] border border-[#22252B] items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${o.icon ? 'hidden' : 'flex'}`}>
                              {o.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white text-sm font-medium truncate min-w-0">{o.name}</span>
                          </div>
                          <span className="text-right text-[#9AA0A6] text-xs sm:text-sm w-12 sm:w-16 flex-shrink-0">{o.payoutMultiplier.toFixed(2)}x</span>
                          <div className="flex justify-end w-11 sm:w-14 flex-shrink-0">
                            <span className="border border-[#00D4AA] text-[#00D4AA] text-[11px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                              {o.probability.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      {/* Volume + markets count */}
                      <div className="flex items-center justify-between">
                        <span className="text-[#9AA0A6] text-xs font-medium">
                          {formatVol(slide.volume)} vol
                        </span>
                        <span className="text-[#9AA0A6] text-xs font-medium">{slide.marketCount} more</span>
                      </div>

                      {/* News */}
                      <p className="text-[#9AA0A6] text-xs mt-3 leading-relaxed line-clamp-3">
                        <span className="text-white font-bold">News</span> · {slide.news || "No recent news for this market."}
                      </p>
                    </div>
                  </div>

                  {/* RIGHT — chart (hidden on mobile, Kalshi-style compact card) */}
                  <div className="hidden md:flex flex-col h-full md:pt-0 min-w-0">
                    {/* Legend above chart & Desktop Pagination */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0 pr-4">
                        {slide.outcomes.map(o => (
                          <span key={o.name} className="flex items-center gap-2 text-sm whitespace-nowrap">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: o.color }} />
                            <span className="text-[#9AA0A6] font-bold">{o.name}</span>
                            <span className="text-white font-black">{o.probability.toFixed(1)}%</span>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          className="w-7 h-7 rounded-full border border-[#22252B] flex items-center justify-center text-xs text-white hover:border-white/30 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                          aria-label="Previous"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] font-bold text-[#9AA0A6] w-10 text-center whitespace-nowrap">
                          {currentIndex + 1} of {totalSlides}
                        </span>
                        <button
                          className="w-7 h-7 rounded-full border border-[#22252B] flex items-center justify-center text-xs text-white hover:border-white/30 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleNext(); }}
                          aria-label="Next"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Chart — carousel outcome chart */}
                    <div className="flex-1 min-h-[200px] w-full min-w-0">
                      <CarouselOutcomeChart
                        chartData={slide.chartData}
                        outcomes={slide.outcomes.map(o => ({ id: o.name, name: o.name, color: o.color }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
