import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';
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

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  index?: number;
  dataKey?: string;
  color?: string;
  shortName?: string;
  hoveredIndex?: number | null;
  dataLength?: number;
}

const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload, index, dataKey, color, shortName, hoveredIndex, dataLength } = props;

  if (index !== hoveredIndex) return null;
  if (cx === undefined || cy === undefined || !payload || !dataKey || !color) return null;

  const val = payload[dataKey];
  const isNearRightEdge = index !== undefined && dataLength !== undefined && index > dataLength - 2;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke={CARD_BG} strokeWidth={2} />
      <text
        x={isNearRightEdge ? cx - 10 : cx + 10}
        y={cy + 4}
        fill={color}
        fontWeight="bold"
        fontSize={12}
        textAnchor={isNearRightEdge ? 'end' : 'start'}
        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
      >
        {`${shortName || dataKey} ${Number(val).toFixed(1).replace(/\.0$/, '')}%`}
      </text>
    </g>
  );
};

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
  const [hoveredDataIndices, setHoveredDataIndices] = useState<Record<string, number | null>>({});
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);

  const [carouselHoverIndex, setCarouselHoverIndex] = useState<number | null>(null);
  const [carouselHoverData, setCarouselHoverData] = useState<any>(null);
  const [carouselDrawComplete, setCarouselDrawComplete] = useState(false);
  const carouselHasRunOnce = useRef(false);

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  useEffect(() => {
    carouselHasRunOnce.current = false;
    setCarouselDrawComplete(false);
    const timer = setTimeout(() => setCarouselDrawComplete(true), 1300);
    return () => clearTimeout(timer);
  }, [currentSlide?.id]);

  function renderCarouselDot(props: any, outcome: any, chartData: any[]) {
    const { cx, cy, index } = props;
    const isLastPoint = index === chartData.length - 1;
    const isHoveredPoint = index === carouselHoverIndex;
    const outcomeKey = outcome.name;

    if (!carouselDrawComplete) return <g key={`cd-${outcomeKey}-${index}`} />;

    if (isHoveredPoint) {
      const val = carouselHoverData?.[outcomeKey];
      if (val === undefined) return <g key={`cd-${outcomeKey}-${index}`} />;
      const flipLeft = cx > 260;
      const lw = 110;
      const lx = flipLeft ? cx - lw - 6 : cx + 6;
      return (
        <g key={`cd-${outcomeKey}-${index}`}>
          <circle cx={cx} cy={cy} r={3.5} fill={outcome.color} stroke="#fff" strokeWidth={1.2} />
          <rect x={lx} y={cy - 11} width={lw} height={22} rx={4}
            fill="#1E2025" stroke={outcome.color} strokeWidth={1} />
          <text x={lx + lw/2} y={cy + 3} textAnchor="middle"
            fill={outcome.color} fontSize={9} fontWeight={600}>
            {outcome.name} {Number(val).toFixed(1)}%
          </text>
        </g>
      );
    }

    if (isLastPoint) {
      return (
        <g key={`cd-${outcomeKey}-${index}`}>
          <circle cx={cx} cy={cy} r={6} fill={outcome.color} opacity={0.15} />
          <circle cx={cx} cy={cy} r={4} fill={outcome.color} className="live-dot-glow" />
          <circle cx={cx} cy={cy} r={2.5} fill={outcome.color} stroke="#0B0D10" strokeWidth={1.2} />
        </g>
      );
    }

    return <g key={`cd-${outcomeKey}-${index}`} />;
  }

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
    const isHoveringChart = Object.values(hoveredDataIndices).some(v => v !== null);
    if (isHoveringChart) return;

    const timer = setInterval(handleNext, 7000);
    return () => clearInterval(timer);
  }, [isPaused, handleNext, totalSlides, hoveredDataIndices]);

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
            const hoveredIndex = hoveredDataIndices[slide.id] ?? null;
            const activeIndex = hoveredIndex !== null ? hoveredIndex : slide.chartData.length - 1;
            const activeDataPoint = slide.chartData[activeIndex] || slide.chartData[slide.chartData.length - 1];

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
                  <div className="hidden md:flex flex-col h-full md:pt-0">
                    {/* Legend above chart & Desktop Pagination */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0 pr-4">
                        {slide.outcomes.map(o => (
                          <span key={o.name} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
                            <span className="text-[#9AA0A6]">{o.name}</span>
                            <span className="text-white font-bold">{o.probability.toFixed(1)}%</span>
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
                    {/* Chart — no Y axis labels on left, only right */}
                    <div className="flex-1 min-h-[200px]">
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart
                          data={slide.chartData}
                          margin={{ top: 8, right: 32, left: 0, bottom: 0 }}
                          onMouseMove={(e: any) => {
                            if (e?.activeTooltipIndex !== undefined) {
                              setCarouselHoverIndex(e.activeTooltipIndex);
                              setCarouselHoverData(slide.chartData[e.activeTooltipIndex] ?? null);
                            }
                          }}
                          onMouseLeave={() => {
                            setCarouselHoverIndex(null);
                            setCarouselHoverData(null);
                          }}
                        >
                          <CartesianGrid horizontal vertical={false} stroke="#2A2D35" strokeDasharray="3 3" opacity={0.5} />

                          <YAxis
                            orientation="right"
                            domain={['auto', 'auto']}
                            tickFormatter={(v: number) => `${Math.round(v)}%`}
                            tick={{ fill: '#9AA0A6', fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                            width={32}
                          />

                          <Tooltip content={() => null} />

                          {slide.outcomes.map((outcome) => {
                            const outcomeKey = outcome.name;
                            return (
                            <Line
                              key={outcomeKey}
                              type="basis"
                              dataKey={outcomeKey}
                              stroke={outcome.color}
                              strokeWidth={1.5}
                              isAnimationActive={!carouselDrawComplete}
                              animationDuration={1200}
                              animationEasing="ease-out"
                              dot={(props: any) => renderCarouselDot(props, outcome, slide.chartData)}
                              activeDot={false}
                            />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
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
