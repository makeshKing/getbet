import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Globe2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine, Tooltip } from 'recharts';

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
  chartData: { date: string; [outcomeName: string]: number | string }[];
  news?: string;
  volume: number;
  marketCount: number;
}

export interface MarketCarouselProps {
  slides?: MarketSlide[];
  onSelectMarket?: (id: string) => void;
}

const formatVol = (cents: number) => {
    return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
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
    ],
    chartData: [
      { date: 'May 2025', Spain: 15, France: 14 },
      { date: 'Aug 2025', Spain: 14.5, France: 15.2 },
      { date: 'Nov 2025', Spain: 16, France: 15 },
      { date: 'Mar 2026', Spain: 16.8, France: 16 },
      { date: 'Jun 2026', Spain: 17.1, France: 16.4 },
    ],
    news: "The 2026 FIFA World Cup kicks off June 11 across the United States, Canada, and Mexico — the first ever 48-team edition.",
    volume: 28253563200,
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
      { date: 'May 2025', Yes: 30, No: 70 },
      { date: 'Aug 2025', Yes: 35, No: 65 },
      { date: 'Nov 2025', Yes: 42, No: 58 },
      { date: 'Mar 2026', Yes: 45, No: 55 },
      { date: 'Jun 2026', Yes: 47, No: 53 },
    ],
    news: "Discussions regarding congressional salary adjustments continue amid budget negotiations.",
    volume: 1500000000,
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
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#15171C" strokeWidth={2} />
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

export const FeaturedMarketCarousel: React.FC<MarketCarouselProps> = ({ slides = MOCK_SLIDES, onSelectMarket }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredDataIndices, setHoveredDataIndices] = useState<Record<string, number | null>>({});

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-advance
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    // Don't auto advance if actively interacting with a chart
    const isHoveringChart = Object.values(hoveredDataIndices).some(v => v !== null);
    if (isHoveringChart) return;
    
    const timer = setInterval(handleNext, 7000);
    return () => clearInterval(timer);
  }, [isPaused, handleNext, totalSlides, hoveredDataIndices]);

  if (!currentSlide) return null;

  return (
    <div 
      className="bg-[#15171C] rounded-2xl border border-[#22252B] p-5 lg:p-6 cursor-pointer hover:border-slate-600 transition-colors duration-200 group relative overflow-hidden flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={() => onSelectMarket?.(currentSlide.id)}
    >
      {/* 1. Top row (Header - doesn't slide) */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-500">
            {currentSlide.category.icon}
          </div>
          <span className="text-[11px] font-bold text-slate-300 tracking-widest uppercase">
            {currentSlide.category.label}
          </span>
        </div>
        
        {totalSlides > 1 && (
          <div className="flex items-center gap-2">
            <button 
              className="w-7 h-7 rounded-full border border-[#22252B] flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#2A2E35] transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[11px] font-bold text-slate-300 w-8 text-center">
              {currentIndex + 1} of {totalSlides}
            </span>
            <button 
              className="w-7 h-7 rounded-full border border-[#22252B] flex items-center justify-center text-slate-400 hover:text-white hover:bg-[#2A2E35] transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Sliding Track Container */}
      <div className="overflow-hidden relative w-full">
        <div 
          className="flex transition-transform duration-500 ease-in-out will-change-transform w-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => {
            const hoveredIndex = hoveredDataIndices[slide.id] ?? null;
            const activeIndex = hoveredIndex !== null ? hoveredIndex : slide.chartData.length - 1;
            const activeDataPoint = slide.chartData[activeIndex] || slide.chartData[slide.chartData.length - 1];

            return (
              <div key={slide.id} className="w-full flex-shrink-0">
                
                {/* 2. Title */}
                <h2 className="text-2xl lg:text-[28px] font-semibold text-white mb-6 tracking-tight leading-tight line-clamp-2 capitalize">
                  {slide.title}
                </h2>

                {/* 3. Two-column content area */}
                <div className="flex flex-col lg:flex-row gap-8 mb-6">
                  
                  {/* Left column (~55% width) */}
                  <div className="lg:w-[55%] flex flex-col justify-center">
                    <div className="space-y-1">
                      {slide.outcomes.map((outcome, idx) => {
                        const prob = hoveredIndex !== null && activeDataPoint 
                          ? Number(activeDataPoint[outcome.name]) || outcome.probability 
                          : outcome.probability;

                        return (
                          <div key={idx} className="flex items-center gap-3 py-2">
                            {outcome.icon ? (
                              outcome.icon.length <= 4 ? (
                                <span className="text-2xl w-8 h-8 flex items-center justify-center">{outcome.icon}</span>
                              ) : (
                                <img src={outcome.icon} alt={outcome.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                              )
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                {outcome.name.charAt(0)}
                              </div>
                            )}
                            <span className="text-white font-medium flex-1">{outcome.name}</span>
                            <span className="text-[#9AA0A6] text-sm">{outcome.payoutMultiplier.toFixed(2)}x</span>
                            <span 
                              className="border text-sm font-bold px-3 py-1 rounded-full bg-transparent transition-colors" 
                              style={{ 
                                borderColor: outcome.color, 
                                color: outcome.color,
                                backgroundColor: hoveredIndex !== null ? `${outcome.color}15` : 'transparent'
                              }}
                            >
                              {prob.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right column (~45% width) */}
                  <div 
                    className="lg:w-[45%] h-[160px] relative mt-4 lg:mt-0"
                    onClick={(e) => {
                      // Prevent clicking the chart from triggering the outer card click
                      if (hoveredIndex !== null) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={slide.chartData} 
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                        onMouseMove={(e) => {
                          if (e?.activeTooltipIndex !== undefined) {
                            setHoveredDataIndices(prev => ({ ...prev, [slide.id]: e.activeTooltipIndex }));
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredDataIndices(prev => ({ ...prev, [slide.id]: null }));
                        }}
                      >
                        <CartesianGrid horizontal={true} vertical={false} stroke="#22252B" strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#9AA0A6', fontSize: 9, fontWeight: 600 }}
                          dy={10}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          orientation="right" 
                          axisLine={false} 
                          tickLine={false}
                          tickFormatter={(val) => `${val}%`}
                          tick={{ fill: '#9AA0A6', fontSize: 9, fontWeight: 600 }}
                          ticks={[7.5, 15, 22.5, 30, 50, 75, 100].filter(t => t <= 100)} 
                        />
                        <Tooltip cursor={false} content={() => <></>} />
                        
                        {hoveredIndex !== null && activeDataPoint && (
                          <ReferenceLine
                            x={activeDataPoint.date}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={1}
                            label={({ viewBox }) => (
                              <text
                                x={viewBox.x}
                                y={viewBox.y - 10}
                                fill="#9AA0A6"
                                fontSize={10}
                                textAnchor="middle"
                                className="font-bold uppercase tracking-wider"
                              >
                                {activeDataPoint.date}
                              </text>
                            )}
                          />
                        )}

                        {slide.outcomes.map(o => (
                          <Line 
                            key={o.name}
                            type="monotone" 
                            dataKey={o.name} 
                            stroke={o.color} 
                            strokeWidth={2}
                            dot={<CustomDot color={o.color} shortName={o.name.substring(0,3).toUpperCase()} hoveredIndex={hoveredIndex} dataLength={slide.chartData.length} />}
                            activeDot={false}
                            isAnimationActive={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 4. Divider + news row */}
                <div className="border-t border-[#22252B] pt-4 mb-4">
                  <p className="text-[13px] text-[#9AA0A6] flex items-center gap-2 truncate">
                    <span className="font-bold text-white shrink-0">News</span>
                    <span className="truncate">{slide.news || "No recent news for this market."}</span>
                  </p>
                </div>

                {/* 5. Footer row */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-[#9AA0A6]">
                    {formatVol(slide.volume)} vol
                  </div>
                  <div className="text-[11px] font-bold text-[#9AA0A6]">
                    {slide.marketCount} markets
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

