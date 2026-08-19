import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DataPoint {
  timestamp: number;
  [outcomeName: string]: number;
}

export interface Outcome {
  id: string;
  name: string;
  shortName: string;
  color: string;
  payoutMultiplier: number;
  icon?: string;
}

export interface InteractiveMarketChartProps {
  outcomes: Outcome[];
  data: DataPoint[];
  dateFormat?: string;
  title?: string;
  hideLeftPanel?: boolean;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: any;
  index?: number;
  dataKey?: string;
  outcome?: Outcome;
  hoveredIndex?: number | null;
  dataLength?: number;
  animActive?: boolean;
  showLiveDot?: boolean;
}

const LiveDot = ({ cx, cy, color }: { cx: number; cy: number; color: string }) => {
  return (
    <g>
      {/* Animated pulse ring */}
      <circle cx={cx} cy={cy} r={6} fill={color} className="live-dot-glow" />
      {/* Static soft halo */}
      <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.15} />
      {/* Solid center dot */}
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#15171C" strokeWidth={1.5} />
    </g>
  );
};

const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload, index, dataKey, outcome, hoveredIndex, dataLength, animActive, showLiveDot } = props;

  if (animActive) return <g style={{ pointerEvents: 'none' }} />;
  if (cx === undefined || cy === undefined || !payload || !dataKey || !outcome) return null;

  const isHovered = index === hoveredIndex;
  const isLast = index === (dataLength ?? 0) - 1;

  if (!isHovered && (!isLast || !showLiveDot)) return null;

  const val = payload[dataKey];
  const isNearRightEdge = index !== undefined && dataLength !== undefined && index > dataLength - 5;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {isLast ? (
        <LiveDot cx={cx} cy={cy} color={outcome.color} />
      ) : (
        isHovered && (
          <circle cx={cx} cy={cy} r={4.5} fill={outcome.color} stroke="#15171C" strokeWidth={2} />
        )
      )}

      {/* Floating labels removed to avoid overlap, values are shown in legend */}
    </g>
  );
};

export function InteractiveMarketChart({ outcomes, data, dateFormat = 'MMM d', title = "Brendan Sorsby's Next Team", hideLeftPanel = false }: InteractiveMarketChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : data.length - 1;
  const activeDataPoint = data[activeIndex];

  const hasAnimated = useRef(false);
  const [animActive, setAnimActive] = useState(true);
  const [showLiveDot, setShowLiveDot] = useState(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const timer = setTimeout(() => {
      setAnimActive(false);
      setShowLiveDot(true);
    }, 1300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate ticks
  const maxVal = useMemo(() => {
    if (!data.length) return 30;
    return Math.max(...data.flatMap(d => outcomes.map(o => (d[o.id] as number) || 0)));
  }, [data, outcomes]);

  const yTicks = useMemo(() => {
    const tickStep = 7.5;
    const maxTick = Math.ceil(maxVal / tickStep) * tickStep || 30;
    const ticks = [];
    for (let i = 0; i <= maxTick; i += tickStep) {
      ticks.push(i);
    }
    return ticks;
  }, [maxVal]);

  return (
    <div className="flex flex-col md:flex-row bg-[#15171C] p-6 rounded-2xl font-sans max-w-5xl mx-auto shadow-2xl border border-gray-800/50">

      {/* Left Panel */}
      {!hideLeftPanel && (
        <div className="w-full md:w-72 shrink-0 md:pr-6 md:border-r border-gray-800 flex flex-col mb-8 md:mb-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
              <div className="bg-blue-600 rounded-md p-1.5 shadow-lg shadow-blue-500/20">
                <Activity size={14} strokeWidth={3} />
              </div>
              <span>Sports</span>
            </div>
            <div className="md:hidden flex items-center space-x-2 text-white">
              <button className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium">7 of 7</span>
              <button className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-6 leading-tight">{title}</h2>

          <div className="flex justify-between text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">
            <span>Market</span>
            <div className="flex space-x-6 pr-2">
              <span>Pays out</span>
              <span>Odds</span>
            </div>
          </div>

          <div className="space-y-3">
            {outcomes.map(outcome => {
              const prob = activeDataPoint?.[outcome.id] || 0;
              return (
                <div key={outcome.id} className="flex items-center justify-between group cursor-pointer hover:bg-gray-800/40 p-1.5 -ml-1.5 rounded-lg transition-colors">
                  <div className="flex items-center">
                    {outcome.icon ? (
                      <img src={outcome.icon} alt={outcome.name} className="w-8 h-8 rounded-full mr-3 object-cover shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-full mr-3 flex items-center justify-center font-bold text-xs shadow-sm" style={{ backgroundColor: outcome.color, color: '#111' }}>
                        {outcome.shortName}
                      </div>
                    )}
                    <span className="text-gray-100 font-medium">{outcome.name}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-300 text-sm font-medium">{outcome.payoutMultiplier.toFixed(2)}x</span>
                    <div
                      className="px-4 py-1.5 rounded-full border-2 text-white font-bold w-[72px] text-center transition-colors flex items-center justify-center shadow-sm group-hover:bg-gray-800/80"
                      style={{ borderColor: outcome.color, color: outcome.color }}
                    >
                      {Math.round(prob)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-5 border-t border-gray-800/80">
            <div className="text-xs text-gray-400 mb-3 flex justify-between font-medium">
              <span>$47,295 vol</span>
              <span>30 markets</span>
            </div>
            <p className="text-sm text-gray-400/90 leading-relaxed line-clamp-4">
              <span className="font-bold text-gray-200">News</span> · Texas Tech quarterback Brendan Sorsby is entering the 2026 Supplemental Draft after losing his college eligibility over a scandal, with potential landing spots including the Arizona, Pittsburgh...
            </p>
          </div>
        </div>
      )}

      {/* Right Chart Area */}
      <div className="flex-1 md:pl-8 flex flex-col pt-1">
        {/* Header Legend */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            {outcomes.map(outcome => (
              <div key={outcome.id} className="flex items-center text-sm">
                <div className="w-2.5 h-2.5 rounded-full mr-2.5 shadow-sm" style={{ backgroundColor: outcome.color }} />
                <span className="text-gray-400 mr-2.5 font-medium">{outcome.name}</span>
                <span className="font-bold text-white text-base tracking-wide">{Number(activeDataPoint?.[outcome.id] || 0).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-3 text-white">
            <button className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium">7 of 7</span>
            <button className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center hover:bg-gray-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 min-h-[240px] relative w-full">
          {/* Absolute positioned Kalshi watermark/logo area if desired, or keep it clean */}
          <div className="absolute -top-14 right-2 flex items-center justify-end pointer-events-none">
            <span className="text-[#00E5CC] font-bold text-xl tracking-tight">Kalshi</span>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              onMouseMove={(e) => {
                if (e?.activeTooltipIndex !== undefined) {
                  setHoveredIndex(e.activeTooltipIndex);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="#2A2D35" strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(tick) => format(tick, dateFormat)}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9AA0A6', fontSize: 12, dy: 10, fontWeight: 500 }}
                minTickGap={50}
              />
              <YAxis
                orientation="right"
                domain={[0, yTicks[yTicks.length - 1] || 30]}
                ticks={yTicks}
                tickFormatter={(tick) => `${tick}%`}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9AA0A6', fontSize: 11, dx: 10, fontWeight: 500 }}
                width={45}
              />
              <Tooltip cursor={false} content={() => <></>} />

              {hoveredIndex !== null && activeDataPoint && (
                <ReferenceLine
                  x={activeDataPoint.timestamp}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth={1}
                  label={({ viewBox }) => (
                    <text
                      x={viewBox.x}
                      y={viewBox.y - 12}
                      fill="#9AA0A6"
                      fontSize={11}
                      textAnchor="middle"
                      className="font-medium uppercase tracking-wider"
                    >
                      {format(activeDataPoint.timestamp, 'MMM d, h a')}
                    </text>
                  )}
                />
              )}

              {outcomes.map(outcome => (
                <Line
                  key={outcome.id}
                  type="monotone"
                  dataKey={outcome.id}
                  stroke={outcome.color}
                  strokeWidth={2.5}
                  dot={<CustomDot outcome={outcome} hoveredIndex={hoveredIndex} dataLength={data.length} animActive={animActive} showLiveDot={showLiveDot} />}
                  activeDot={false}
                  isAnimationActive={animActive}
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DEMO WRAPPER FOR PREVIEWING THE COMPONENT
// ==========================================

const generateMockData = (): DataPoint[] => {
  const data: DataPoint[] = [];
  let time = new Date('2024-05-13T00:00:00Z').getTime();
  let nyj = 5.0;
  let ari = 5.0;

  for (let i = 0; i < 70; i++) {
    nyj = Math.max(1, Math.min(99, nyj + (Math.random() - 0.45) * 2));
    ari = Math.max(1, Math.min(99, ari + (Math.random() - 0.5) * 1.5));

    // Some dramatic shifts to simulate news events
    if (i === 20) nyj += 8; // "May 22" jump
    if (i === 45) { nyj += 12; ari += 3; } // "Jun 4" jump
    if (i === 60) nyj -= 15; // drop
    if (i === 65) nyj += 18; // final jump

    data.push({
      timestamp: time,
      nyj: Number(nyj.toFixed(1)),
      ari: Number(ari.toFixed(1)),
    });

    // Add 12 hours
    time += 12 * 60 * 60 * 1000;
  }

  // Snap the end to exactly match the screenshot's final values
  data[data.length - 1].nyj = 23.0;
  data[data.length - 1].ari = 9.3;

  return data;
};

export default function DemoWrapper() {
  const outcomes: Outcome[] = [
    {
      id: 'nyj',
      name: 'New York J',
      shortName: 'NYJ',
      color: '#00E5CC',
      payoutMultiplier: 3.08
    },
    {
      id: 'ari',
      name: 'Arizona',
      shortName: 'ARI',
      color: '#4B8BFF',
      payoutMultiplier: 5.90
    }
  ];

  const data = useMemo(() => generateMockData(), []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 sm:p-8">
      <InteractiveMarketChart outcomes={outcomes} data={data} />
    </div>
  );
}
