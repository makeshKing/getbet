import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CurrencyType } from '../context/CurrencyContext';
import { Side } from '../types';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { Calendar, MessageCircle, Share2, Download, ListFilter, ChevronDown, ChevronUp, Search, Info, Activity, Clock, ArrowLeft, Heart, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { getMarketRecentTrades, RecentTrade } from '../services/supabaseService';
import { format } from 'date-fns';
import { MarketOutcomeList } from '../components/MarketOutcomeList';
import { useIsMobile } from '../lib/useIsMobile';

interface MarketDetailProps {
   marketId: string;
   onBack: () => void;
   onMarketClick?: (id: string) => void;
}

const TIME_FILTERS = ['6H', '1D', '1W', '1M', 'ALL'];

function sampleData(data: any[], maxPoints = 150) {
  if (data.length <= maxPoints) return data;
  const step = Math.floor(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

interface MarketChartProps {
   chartData: any[];
   outcomes: any[];
   timeFilter: string;
}

const MarketChart = React.memo(function MarketChart({
   chartData,
   outcomes,
   timeFilter,
}: MarketChartProps) {
  // ============ STATE (put inside your component, near the top) ============
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverData, setHoverData] = useState<any>(null);
  const [drawComplete, setDrawComplete] = useState(false);
  const hasRunOnce = useRef(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const timer = setTimeout(() => setDrawComplete(true), 1300);
    return () => clearTimeout(timer);
  }, []);

  // ============ DOT RENDER FUNCTION (one shared function, reused per line) ============
  function renderDot(props: any, outcome: any) {
    const { cx, cy, index } = props;
    const isLastPoint = index === chartData.length - 1;
    const isHoveredPoint = index === hoverIndex;

    // While the line is still drawing in, show absolutely no dots
    if (!drawComplete) {
      return <g key={`dot-${outcome.id}-${index}`} />;
    }

    // Hovered point takes priority — show crosshair dot + floating label
    if (isHoveredPoint) {
      const val = hoverData?.[outcome.id];
      if (val === undefined || val === null) {
        return <g key={`dot-${outcome.id}-${index}`} />;
      }
      const flipLeft = cx > 520;
      const labelWidth = 160;
      const labelX = flipLeft ? cx - labelWidth - 8 : cx + 8;
      return (
        <g key={`dot-${outcome.id}-${index}`}>
          <circle cx={cx} cy={cy} r={5} fill={outcome.color} stroke="#ffffff" strokeWidth={1.5} />
          <rect x={labelX} y={cy - 13} width={labelWidth} height={26} rx={5}
            fill="#1E2025" stroke={outcome.color} strokeWidth={1} />
          <text x={labelX + labelWidth / 2} y={cy + 4} textAnchor="middle"
            fill={outcome.color} fontSize={11} fontWeight={600}>
            {outcome.name} {Number(val).toFixed(1)}%
          </text>
        </g>
      );
    }

    // Last point (and not currently hovered) — show the live pulsing dot
    if (isLastPoint) {
      return (
        <g key={`dot-${outcome.id}-${index}`}>
          <circle cx={cx} cy={cy} r={9} fill={outcome.color} opacity={0.15} />
          <circle cx={cx} cy={cy} r={6} fill={outcome.color} className="live-dot-glow" />
          <circle cx={cx} cy={cy} r={4.5} fill={outcome.color} stroke="#0B0D10" strokeWidth={1.5} />
        </g>
      );
    }

    // Every other point — nothing
    return <g key={`dot-${outcome.id}-${index}`} />;
  }

  // ============ JSX ============
  return (
    <div className="w-full">
      {/* Legend row above chart */}
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        {outcomes.map((o) => {
          const liveVal = hoverData ? hoverData[o.id] : o.probability;
          return (
            <div key={o.id} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
              <span className="text-[#9AA0A6] text-xs">{o.name}</span>
              <span className="text-white text-xs font-bold">
                {Number(liveVal ?? o.probability).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* The chart itself */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 48, left: 0, bottom: 0 }}
          onMouseMove={(e: any) => {
            if (e?.activeTooltipIndex !== undefined) {
              setHoverIndex(e.activeTooltipIndex);
              setHoverData(chartData[e.activeTooltipIndex] ?? null);
            }
          }}
          onMouseLeave={() => {
            setHoverIndex(null);
            setHoverData(null);
          }}
        >
          <CartesianGrid horizontal vertical={false} stroke="#2A2D35" strokeDasharray="3 3" opacity={0.5} />

          <XAxis
            dataKey="timestamp"
            scale="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => {
              const d = new Date(v);
              if (timeFilter === '1D') return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              if (timeFilter === 'ALL') return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
            tick={{ fill: '#9AA0A6', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />

          <YAxis
            orientation="right"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${Math.round(v)}%`}
            tick={{ fill: '#9AA0A6', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={42}
          />

          <Tooltip content={() => null} />

          {outcomes.map((outcome) => (
            <Line
              key={outcome.id}
              type="basis"
              dataKey={outcome.id}
              stroke={outcome.color}
              strokeWidth={2}
              isAnimationActive={!drawComplete}
              animationDuration={1200}
              animationEasing="ease-out"
              dot={(props: any) => renderDot(props, outcome)}
              activeDot={false}
            />
          ))}

          {drawComplete && hoverIndex !== null && hoverData && (
            <ReferenceLine
              x={hoverData.timestamp}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
              label={{
                value: new Date(hoverData.timestamp).toLocaleDateString('en-US', {
                  month: 'short', day: '2-digit', hour: 'numeric', hour12: true,
                }).toUpperCase(),
                position: 'top',
                fill: '#ffffff',
                fontSize: 11,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export const MarketDetail: React.FC<MarketDetailProps> = ({ marketId, onBack, onMarketClick }) => {
   const { addToast } = useToast();
   const { markets, buy } = useApp();
   const { userProfile } = useAuth();
   const { currency, setCurrency, usdToNprRate } = useCurrency();
   const market = markets.find(m => m.id === marketId);

   const [activeSide, setActiveSide] = useState<Side>(Side.YES);
   const [activeOutcomeId, setActiveOutcomeId] = useState<string | undefined>(undefined);
   const [quantity, setQuantity] = useState<string>('');
   const [isProcessing, setIsProcessing] = useState(false);

   // Currency display config — symbol/label follow the user's selected currency.
   // NOTE: the database stores NPR (rupees) as its base currency (see CurrencyContext.formatMoney),
   // so all internal trade math runs in NPR and we only swap the *displayed* symbol/label.
   const currencyConfig: Record<CurrencyType, { symbol: string; label: string; dropdownLabel: string }> = {
      NPR: { symbol: 'Rs.', label: 'Rupees', dropdownLabel: 'RUPEES' },
      USD: { symbol: '$', label: 'Dollars', dropdownLabel: 'DOLLARS' },
   };
   const config = currencyConfig[currency];
   const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

   const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
   const [tradesLoading, setTradesLoading] = useState(true);

   // Chart & Interactivity state
   const [activeTimeFilter, setActiveTimeFilter] = useState('ALL');
   const [animationActive, setAnimationActive] = useState(true);
   const hasAnimated = useRef(false);

   useEffect(() => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;
      const timer = setTimeout(() => {
         setAnimationActive(false);
      }, 1400);
      return () => clearTimeout(timer);
   }, []);

   const handleTimeFilterChange = useCallback((filter: string) => {
      setActiveTimeFilter(filter);
   }, []);
   const [chartHistory, setChartHistory] = useState<any[]>([]);
   const [chartLoading, setChartLoading] = useState(true);
   const [showError, setShowError] = useState(false);

   // UI states
   const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);

   // Hide mobile bottom nav when trade panel is open
   useEffect(() => {
      const nav = document.getElementById('mobile-bottom-nav');
      if (nav) {
         if (isTradePanelOpen) {
            nav.style.display = 'none';
         } else {
            nav.style.display = '';
         }
      }
      return () => {
         if (nav) nav.style.display = '';
      }
   }, [isTradePanelOpen]);

   const [isRulesOpen, setIsRulesOpen] = useState(false);
   const [timelineOpen, setTimelineOpen] = useState(false);
   const [insiderOpen, setInsiderOpen] = useState(false);
   const [relatedMarkets, setRelatedMarkets] = useState<any[]>([]);

   // Realtime local outcomes state
   const [localOutcomes, setLocalOutcomes] = useState(market?.outcomes || []);

   // Refs
   const tradePanelRef = useRef<HTMLDivElement>(null);
   const chartContainerRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      if (market?.outcomes && market.outcomes.length > 0) {
         // Kalshi-style color palette: blue, red, white, purple, green, orange
         const colors = ['#4B9EFF', '#FF4444', '#C8CCD0', '#9B6FFF', '#00CC88', '#FF8C42'];
         setLocalOutcomes(market.outcomes.map((o, i) => ({
            ...o,
            color: colors[i % colors.length]
         })));
      } else if (market) {
         // Binary market: synthesize a single outcome so the chart has a line to draw
         setLocalOutcomes([{
            id: 'main',
            name: market.title || 'Yes',
            probability: market.probability || 50,
            color: '#00E5CC',
         }]);
      }
   }, [market?.outcomes, market?.probability]);

   useEffect(() => {
      if (!marketId) return;
      let isMounted = true;
      setTradesLoading(true);
      getMarketRecentTrades(marketId, 50)
         .then(data => { if (isMounted) setRecentTrades(data); })
         .catch(console.error)
         .finally(() => { if (isMounted) setTradesLoading(false); });
      return () => { isMounted = false; };
   }, [marketId, isProcessing]);

   useEffect(() => {
      if (!marketId) return;
      const channel = supabase.channel(`outcomes-${marketId}`)
         .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'outcomes',
            filter: `market_id=eq.${marketId}`
         }, (payload) => {
            setLocalOutcomes(prev => prev.map(o => o.id === payload.new.id ? { ...o, probability: payload.new.probability } : o));
         })
         .subscribe();
      return () => { supabase.removeChannel(channel); };
   }, [marketId]);

   // Fetch related markets for "People are also trading"
   useEffect(() => {
      if (!market) return;
      let isMounted = true;
      async function fetchRelated() {
         const { data } = await supabase
            .from('markets')
            .select('id, title, category, icon_url')
            .neq('id', market.id)
            .eq('category', market.category)
            .limit(3);

         if (!data || data.length < 3) {
            const { data: fallback } = await supabase
               .from('markets')
               .select('id, title, category, icon_url')
               .neq('id', market.id)
               .limit(3);
            if (isMounted) setRelatedMarkets(fallback ?? []);
         } else {
            if (isMounted) setRelatedMarkets(data);
         }
      }
      fetchRelated();
      return () => { isMounted = false; };
   }, [market?.id, market?.category]);

   useEffect(() => {
      if (!marketId || !market) return;
      let isMounted = true;
      setChartLoading(true);

      const fetchHistory = async () => {
         const now = new Date();
         let startDate = new Date(0);
         if (activeTimeFilter === '6H') startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
         else if (activeTimeFilter === '1D') startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
         else if (activeTimeFilter === '1W') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
         else if (activeTimeFilter === '1M') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

         const outcomeIds = market.outcomes?.map(o => o.id) || [];

         const { data, error } = await supabase.from('probability_history')
            .select('outcome_id, probability, recorded_at')
            .eq('market_id', market.id)
            .in('outcome_id', outcomeIds.length > 0 ? outcomeIds : ['main'])
            .gte('recorded_at', startDate.toISOString())
            .order('recorded_at', { ascending: true });

         if (error || !data || data.length === 0) {
            const numPoints = 150;
            const points: any[] = [];
            let currentProbs = (market.outcomes && market.outcomes.length > 0)
               ? market.outcomes.map(o => ({ id: o.id, val: o.probability, trend: (Math.random() - 0.5) * 0.5 }))
               : [{ id: 'main', val: market.probability || 50, trend: (Math.random() - 0.5) * 0.5 }];

            let timeStep = 86400000;
            if (activeTimeFilter === '6H') timeStep = (6 * 60 * 60 * 1000) / numPoints;
            else if (activeTimeFilter === '1D') timeStep = (24 * 60 * 60 * 1000) / numPoints;
            else if (activeTimeFilter === '1W') timeStep = (7 * 24 * 60 * 60 * 1000) / numPoints;
            else if (activeTimeFilter === '1M') timeStep = (30 * 24 * 60 * 60 * 1000) / numPoints;
            else timeStep = (60 * 24 * 60 * 60 * 1000) / numPoints; // ALL

            for (let i = 0; i < numPoints; i++) {
               const time = new Date(now.getTime() - i * timeStep);
               const point: any = { timestamp: time.getTime() };
               currentProbs.forEach((p) => {
                  point[p.id] = Math.round(p.val * 10) / 10;
                  
                  // Walk backwards logic
                  if (Math.random() < 0.05) p.trend = (Math.random() - 0.5) * 0.8;
                  const volatility = 1.0 + Math.random() * 2.5;
                  const jumpChance = Math.random();
                  
                  let delta = 0;
                  if (jumpChance > 0.98) delta = (Math.random() * 15 + 5); 
                  else if (jumpChance < 0.02) delta = -(Math.random() * 15 + 5); 
                  else delta = -p.trend + (Math.random() - 0.5) * volatility;
                  
                  p.val = Math.max(2, Math.min(97, p.val + delta));
               });
               points.unshift(point);
            }
            if (isMounted) setChartHistory(points);
         } else {
            const grouped = data.reduce((acc: any, row: any) => {
               const exactTime = new Date(row.recorded_at).getTime();
               if (!acc[exactTime]) acc[exactTime] = { timestamp: exactTime };
               acc[exactTime][row.outcome_id] = row.probability;
               return acc;
            }, {});
            if (isMounted) setChartHistory(Object.values(grouped).sort((a: any, b: any) => a.timestamp - b.timestamp));
         }
         if (isMounted) setChartLoading(false);
      };

      fetchHistory();
      return () => { isMounted = false; };
   }, [marketId, activeTimeFilter, market]);

   if (!market) {
      return (
         <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#000]">
            <h2 className="text-xl font-bold text-white mb-2 uppercase">Market Not Found</h2>
            <Button onClick={onBack} variant="primary">Return Home</Button>
         </div>
      );
   }

   if (market.status === 'resolved' || !!market.outcome) {
      return (
         <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-6">
            <div className="bg-[#15171C] border border-[#22252B] rounded-2xl p-8 max-w-md w-full text-center">
               <div className="text-5xl mb-4">🔒</div>
               <h2 className="text-white text-xl font-bold mb-2">Market Resolved</h2>
               <p className="text-[#9AA0A6] text-sm mb-2">
                  This market has been closed and resolved.
               </p>
               {market.resolved_outcome && (
                  <p className="text-[#9AA0A6] text-sm mb-6">
                     Resolved outcome: <span className="text-[#00D4AA] font-bold">{market.resolved_outcome}</span>
                  </p>
               )}
               <button
                  onClick={onBack}
                  className="bg-[#00D4AA] text-[#0A0C10] font-bold px-6 py-3 rounded-xl"
               >
                  Back to Markets
               </button>
            </div>
         </div>
      );
   }

   useEffect(() => {
      if (market) {
         document.title = market.title.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) + " | PredictKit";
      }
   }, [market?.title]);

   useEffect(() => {
      if (!activeOutcomeId && localOutcomes.length > 0) {
         setActiveOutcomeId(localOutcomes[0].id);
      }
   }, [localOutcomes, activeOutcomeId]);

   const getProbability = () => {
      if (activeOutcomeId && localOutcomes.length > 0) {
         const outcome = localOutcomes.find(o => o.id === activeOutcomeId);
         return outcome ? outcome.probability : 50;
      }
      return market.probability || 50;
   };

   const selectedOutcome = localOutcomes.find(o => o.id === activeOutcomeId) || localOutcomes[0];
   const yes_price = selectedOutcome ? Math.round(selectedOutcome.probability) : 50;
   const no_price = selectedOutcome ? Math.round(100 - selectedOutcome.probability) : 50;

   const price = activeSide === Side.YES ? yes_price / 100 : no_price / 100;

   // The user types in their selected currency. The DB stores NPR (rupees), so
   // convert the typed amount into NPR rupees for all internal calc + order placement.
   const typedAmount = parseFloat(quantity) || 0;
   const inputDollars = currency === 'NPR' ? typedAmount : typedAmount * usdToNprRate;

   const maxPayout = inputDollars > 0 && price > 0
      ? parseFloat((inputDollars / price).toFixed(2))
      : 0;

   // ── Unit model (verified against migrations 002/017/018 resolve_market) ──
   // 1 share has a Rs.1.00 face value (100 paisa). On a win, payout = quantity * 100
   // paisa. So the per-share BUY price at probability P% is P paisa (e.g. 54% → 54 paisa,
   // i.e. Rs.0.54/share). The DB's execute_buy computes v_cost = p_price * p_quantity,
   // with both balance and v_cost in paisa. Therefore p_price MUST be the raw 1–99
   // probability integer (paisa/share), NOT probability × 100.
   const sidePrice = activeSide === Side.YES ? yes_price : no_price; // 1–99 paisa/share
   const numContracts = sidePrice > 0 ? Math.floor((inputDollars * 100) / sidePrice) : 0;

   // Payout is computed in NPR rupees; display in the user's selected currency.
   const maxPayoutDisplay = currency === 'NPR' ? maxPayout : maxPayout / usdToNprRate;

   const resolutionDate = (() => {
      try {
         return market.closeDate ? format(new Date(market.closeDate), 'MMM d, yyyy') : 'Jul 18, 2028';
      } catch (e) {
         return 'Jul 18, 2028';
      }
   })();

   const handleOrder = async () => {
      if (inputDollars <= 0 || numContracts <= 0) {
         setShowError(true);
         return;
      }
      setShowError(false);
      setIsProcessing(true);
      try {
         await buy(market.id, activeSide, sidePrice, numContracts, activeOutcomeId);
         addToast('Order placed successfully!', 'success');
         setQuantity('');
         setIsTradePanelOpen(false);
      } catch (e: any) {
         // The DB raises "Insufficient funds: need <paisa> have <paisa>".
         // Translate that raw-paisa message into a clear, currency-aware one.
         const msg: string = e?.message || '';
         const m = msg.match(/Insufficient funds: need\s+(\d+)\s+have\s+(\d+)/i);
         if (m) {
            const needPaisa = Number(m[1]);
            const havePaisa = Number(m[2]);
            const toUnits = (p: number) =>
               currency === 'USD'
                  ? `$${(p / 100 / usdToNprRate).toFixed(2)}`
                  : `Rs. ${(p / 100).toFixed(2)}`;
            addToast(
               `Not enough balance — you have ${toUnits(havePaisa)} but this order needs ${toUnits(needPaisa)}. Deposit more to place it.`,
               'error'
            );
         } else {
            addToast(msg || 'Order failed. Please try again.', 'error');
         }
      } finally {
         setIsProcessing(false);
      }
   };

   const formatVol = (cents: number) => {
      return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
   };

   const selectOutcomeForTrade = (id: string, side: Side) => {
      setActiveOutcomeId(id);
      setActiveSide(side);
      if (window.innerWidth < 1024) {
         setIsTradePanelOpen(true);
      } else {
         tradePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
   };

   const displayData = sampleData(chartHistory, 150);

   const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!chartContainerRef.current || displayData.length === 0) return;
      
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth = rect.width - 48; // subtract right margin
      
      // Map x to index
      const index = Math.round((x / chartWidth) * (displayData.length - 1));
      const clampedIndex = Math.max(0, Math.min(index, displayData.length - 1));
      const point = displayData[clampedIndex];
      
      if (!point) return;

      // Update legend values directly
      localOutcomes.forEach((o: any) => {
         const el = document.getElementById(`legend-val-${o.id}`);
         if (el && point[o.id] !== undefined) {
            el.textContent = `${Number(point[o.id]).toFixed(1)}%`;
         }
      });

      // Update binary single outcome legend if present
      if (localOutcomes.length === 1) {
         const mainEl = document.getElementById(`legend-val-main`);
         if (mainEl && point[localOutcomes[0].id] !== undefined) {
            mainEl.textContent = `${Number(point[localOutcomes[0].id]).toFixed(0)}% chance`;
         }
      }

      // Update custom cursor
      const cursorEl = document.getElementById('chart-cursor');
      if (cursorEl) {
         const pct = (clampedIndex / (displayData.length - 1)) * 100;
         // Adjust pct slightly to account for the margin
         const adjustedPct = (x / rect.width) * 100;
         cursorEl.style.left = `${Math.min(100, Math.max(0, adjustedPct))}%`;
         cursorEl.style.display = 'block';
         
         // Update timestamp label on cursor
         const timeEl = document.getElementById('chart-cursor-time');
         if (timeEl) {
            const date = new Date(point.timestamp);
            timeEl.textContent = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() + ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).toUpperCase();
         }
      }
   }, [displayData, localOutcomes]);

   const handleMouseLeave = useCallback(() => {
      // Reset legend to original
      localOutcomes.forEach((o: any) => {
         const el = document.getElementById(`legend-val-${o.id}`);
         if (el) el.textContent = `${Number(o.probability).toFixed(1)}%`;
      });
      
      if (localOutcomes.length === 1) {
         const mainEl = document.getElementById(`legend-val-main`);
         if (mainEl) mainEl.textContent = `${Number(localOutcomes[0].probability).toFixed(0)}% chance`;
      }

      const cursorEl = document.getElementById('chart-cursor');
      if (cursorEl) cursorEl.style.display = 'none';
   }, [localOutcomes]);

   return (
      <div className="min-h-screen bg-[#080808] lg:pb-24 text-white flex flex-col font-sans selection:bg-[#00D964]/30 relative">

         {/* MOBILE TOP NAVIGATION REMOVED */}

         <div className="max-w-[1200px] mx-auto w-full px-0 lg:px-4 py-4 lg:py-8 flex flex-col lg:flex-row gap-8 lg:gap-12 flex-1">

            {/* LEFT COLUMN: Main Content */}
            <div className="lg:flex-1 flex flex-col min-w-0">

               {/* Header Section */}
               <div className="px-4 lg:px-0 mb-6">
                  {/* Breadcrumb */}
                  <div className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1.5">
                     {market.category || 'SPORTS'} · {market.subcategory || 'SOCCER'} · FIFA WORLD CUP
                  </div>

                  <div className="flex justify-between items-start mb-1.5">
                     <h1 className="text-xl sm:text-[24px] md:text-[32px] font-bold text-white leading-tight break-words tracking-tight max-w-2xl capitalize">{market.title}</h1>
                     {/* Desktop icons */}
                     <div className="hidden lg:flex items-center gap-4 text-gray-400 pt-1">
                        <Calendar size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <MessageCircle size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <Share2 size={18} className="cursor-pointer hover:text-white transition-colors" />
                        <Download size={18} className="cursor-pointer hover:text-white transition-colors" />
                     </div>
                  </div>

                  {/* Countdown Row */}
                  <div className="text-[12px] text-gray-400 font-medium">
                     Begins in 34 days · Jul 19, 3:00pm EDT
                  </div>
               </div>

               {/* Chart Area */}
               <div className="mb-0 relative group w-full">
                  <div className="flex justify-between items-center mb-0 px-4 lg:px-0 flex-wrap gap-y-1">
                     <div className="text-[11px] md:text-[13px] font-bold text-gray-400 tracking-tight select-none pointer-events-none pr-4 lg:pr-0">PredictKit</div>
                  </div>

                  {/* Chart Container */}
                  <div className="w-full relative pt-2">
                     {chartLoading ? (
                        /* Skeleton loading state while data fetches */
                        <div className="w-full h-[220px] flex flex-col justify-end gap-2 pb-4 px-2">
                           <div className="w-full h-[2px] bg-gradient-to-r from-[#15171C] via-[#00E5CC]/30 to-[#15171C] rounded animate-pulse" />
                           <div className="flex gap-1 items-end h-32">
                              {Array.from({ length: 40 }).map((_, i) => (
                                 <div
                                    key={i}
                                    className="flex-1 bg-[#1E2025] rounded-sm animate-pulse"
                                    style={{
                                       height: `${30 + Math.sin(i * 0.4) * 20 + Math.random() * 15}%`,
                                       animationDelay: `${i * 20}ms`
                                    }}
                                 />
                              ))}
                           </div>
                           <div className="flex justify-between px-2">
                              {['May', 'Jun'].map(d => (
                                 <span key={d} className="text-[#9AA0A6] text-xs animate-pulse">{d}</span>
                              ))}
                           </div>
                        </div>
                     ) : displayData.length > 0 ? (
                        <div
                           className="w-full h-full"
                           style={{ opacity: 1, transition: 'opacity 500ms ease-in-out' }}
                        >
                           <MarketChart
                              chartData={displayData}
                              outcomes={localOutcomes}
                              timeFilter={activeTimeFilter}
                           />
                        </div>
                     ) : (
                        <div className="w-full h-[220px] flex items-center justify-center text-gray-500 text-sm font-bold">
                           No chart data available
                        </div>
                     )}
                  </div>
               </div>

                  {/* Chart controls rows */}
                  <div className="px-4 lg:px-0">
                     <div className="flex items-center justify-between mt-2 mb-4 gap-2">
                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                           <span className="px-2 py-0.5 rounded-full border border-[#00E5CC] text-[#00E5CC] text-[10px] font-bold uppercase tracking-wide">
                              No fees
                           </span>
                           <span className="text-xs md:text-[13px] font-medium text-[#9AA0A6]">
                              {formatVol(market.volume || 3140658200)} vol
                           </span>
                        </div>
                        <div className="flex gap-2 md:gap-4 text-xs md:text-[13px] font-bold text-[#9AA0A6] overflow-x-auto no-scrollbar">
                           {TIME_FILTERS.map(tf => (
                              <button
                                 key={tf}
                                 onClick={() => handleTimeFilterChange(tf)}
                                 className={`px-2 py-1 md:px-3 transition-colors border-none bg-transparent whitespace-nowrap ${activeTimeFilter === tf ? 'text-white' : 'hover:text-gray-300'}`}
                              >
                                 {tf}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Outcomes List — Kalshi-style inline expandable rows */}
               <div className="px-4 lg:px-0 mt-4">
                  <MarketOutcomeList market={market} onTradeClick={selectOutcomeForTrade} />
               </div>

               {/* Market Rules Section */}
               <div className="px-4 lg:px-0 mt-12 mb-8">
                  <div
                     className="flex justify-between items-center cursor-pointer border-b border-[#1E2440] pb-3"
                     onClick={() => setIsRulesOpen(!isRulesOpen)}
                  >
                     <h2 className="text-xl font-bold text-white">Market Rules</h2>
                     {isRulesOpen ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </div>

                  {isRulesOpen && (
                     <div className="pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                           <button className="flex items-center gap-1.5 text-[#00D964] text-[13px] font-bold">
                              Spain <ChevronDown size={14} />
                           </button>
                           <Info size={16} className="text-gray-400" />
                        </div>
                        <p className="text-[13px] text-gray-300 leading-relaxed">
                           If Spain wins the 2026 Men's World Cup, then the market resolves to <span className="text-[#00D964]">Yes</span>.
                           Sources from <strong>Fox Sports, ESPN</strong>, and <strong>The Wall Street Journal</strong>.
                        </p>
                        <p className="text-[13px] text-gray-300 leading-relaxed">
                           This market and these products have not been endorsed by FIFA. Any references to "FIFA", the "FIFA World Cup", or any other associated marks are descriptive only, and do not indicate an endorsement of this product or any affiliation between FIFA and Kalshi.
                        </p>
                        <p className="text-[13px] text-gray-400 italic">
                           Note: this event is mutually exclusive.
                        </p>
                        <div className="flex gap-4 pt-4 border-t border-[#1E2440]">
                           <button className="px-4 py-2 border border-[#333] rounded-lg text-[13px] font-bold text-gray-300">View full rules</button>
                           <button className="px-4 py-2 border border-[#333] rounded-lg text-[13px] font-bold text-gray-300">Help center</button>
                        </div>
                     </div>
                  )}

                  {/* Timeline and Payout */}
                  <div className="border-t border-[#22252B]">
                     <button
                        onClick={() => setTimelineOpen(!timelineOpen)}
                        className="w-full flex items-center justify-between py-4 px-0 bg-transparent border-none cursor-pointer"
                     >
                        <div className="flex items-center gap-3">
                           <span className="text-[#9AA0A6]">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                 <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                                 <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                           </span>
                           <span className="text-white font-medium text-sm">Timeline and payout</span>
                        </div>
                        <span className="text-[#9AA0A6] text-xs">
                           {timelineOpen ? '▲' : '▼'}
                        </span>
                     </button>

                     {timelineOpen && (
                        <div className="pb-4 text-sm text-[#9AA0A6] space-y-2 leading-relaxed">
                           <p>
                              This market resolves to <span className="text-white font-medium">Yes</span> if
                              the event occurs before the resolution date, otherwise resolves to{' '}
                              <span className="text-white font-medium">No</span>.
                           </p>
                           <p>
                              Resolution date: <span className="text-white">{resolutionDate}</span>
                           </p>
                           <p>
                              Payout: Winners receive their payout automatically after resolution.
                              The payout per contract is $1.00.
                           </p>
                        </div>
                     )}
                  </div>

                  {/* Insider Trading is Prohibited */}
                  <div className="border-t border-[#22252B]">
                     <button
                        onClick={() => setInsiderOpen(!insiderOpen)}
                        className="w-full flex items-center justify-between py-4 px-0 bg-transparent border-none cursor-pointer"
                     >
                        <div className="flex items-center gap-3">
                           <span className="text-[#9AA0A6]">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                 <circle cx="12" cy="12" r="10" />
                                 <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                           </span>
                           <span className="text-white font-medium text-sm">Insider trading is prohibited</span>
                        </div>
                        <span className="text-[#9AA0A6] text-xs">
                           {insiderOpen ? '▲' : '▼'}
                        </span>
                     </button>

                     {insiderOpen && (
                        <div className="pb-4 text-sm text-[#9AA0A6] leading-relaxed">
                           <p className="mb-2">The following are prohibited from trading this contract:</p>
                           <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>
                                 Persons who are employed by any of the Source Agencies are not
                                 permitted to trade on the Contract.
                              </li>
                              <li>
                                 Persons who hold any material, non-public information on the
                                 Underlying are not permitted to trade on the Contract.
                              </li>
                           </ul>
                        </div>
                     )}
                  </div>
               </div>

               {/* People Are Also Trading Section */}
               {relatedMarkets.length > 0 && (
                  <div className="px-4 lg:px-0 mt-8 mb-8">
                     <h3 className="text-white text-lg font-bold mb-4">
                        People are also trading
                     </h3>

                     <div className="space-y-0">
                        {relatedMarkets.map((related: any, index: number) => (
                           <div key={related.id}>
                              <button
                                 onClick={() => {
                                    if (onMarketClick) {
                                       onMarketClick(related.id);
                                    }
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                 }}
                                 className="w-full flex items-center gap-3 py-4 hover:bg-[#15171C] rounded-lg px-2 -mx-2 transition-colors text-left bg-transparent border-none cursor-pointer"
                              >
                                 {related.icon_url ? (
                                    <img
                                       src={related.icon_url}
                                       alt={related.title}
                                       className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                    />
                                 ) : (
                                    <div className="w-10 h-10 rounded-lg bg-[#22252B] flex items-center justify-center flex-shrink-0">
                                       <span className="text-[#9AA0A6] text-sm font-bold">
                                          {related.title.charAt(0).toUpperCase()}
                                       </span>
                                    </div>
                                 )}

                                 <span className="text-white text-sm font-medium leading-snug flex-1 line-clamp-2 text-left">
                                    {related.title}
                                 </span>
                              </button>

                              {index < relatedMarkets.length - 1 && (
                                 <div className="h-px bg-[#22252B] mx-0" />
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>

            {/* Mobile Bottom Trading Panel */}
            {isTradePanelOpen && (
               <>
                  {/* Backdrop */}
                  <div
                     className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
                     onClick={() => setIsTradePanelOpen(false)}
                  />

                  {/* Bottom Sheet — fixed height, no scroll */}
                  <div
                     className="fixed bottom-0 left-0 right-0 z-50 bg-[#15171C] rounded-t-3xl flex flex-col lg:hidden"
                     style={{ height: '72vh' }}
                  >
                     {/* Drag handle */}
                     <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
                        <div className="w-10 h-1 bg-[#2A2D35] rounded-full cursor-pointer" onClick={() => setIsTradePanelOpen(false)} />
                     </div>

                     {/* All content — no scroll, fits on screen */}
                     <div className="flex-1 flex flex-col px-4 pt-2 pb-0 min-h-0">

                        {(market.status as string) === 'resolved' ? (
                           <div className="flex flex-col items-center justify-center flex-1 h-full py-8 text-center">
                              <div className="w-16 h-16 rounded-full bg-[#1E2440] flex items-center justify-center mb-4">
                                 <span className="text-2xl">🏁</span>
                              </div>
                              <h3 className="text-white text-lg font-bold mb-2">Market Resolved</h3>
                              <p className="text-[#9AA0A6] text-sm leading-relaxed mb-6">
                                 This market has concluded and resolved to <span className="text-white font-bold">{market.resolved_outcome || market.outcome}</span>.
                              </p>
                              <Button onClick={() => setIsTradePanelOpen(false)} variant="secondary" className="w-full py-3.5 rounded-xl">Close Panel</Button>
                           </div>
                        ) : (
                           <>
                              {/* Header row: BUY + currency switcher + X */}
                              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                                 <div className="flex items-center gap-4">
                                    <span className="text-white text-sm font-bold border-b-2 border-white pb-0.5">BUY</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <div className="relative">
                                       <button
                                          onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                          className="text-[#9AA0A6] text-sm flex items-center gap-1 hover:text-white"
                                       >
                                          {config.dropdownLabel} ▾
                                       </button>
                                       {showCurrencyDropdown && (
                                          <div className="absolute right-0 top-7 bg-[#1E2025] border border-[#2A2D35] rounded-lg overflow-hidden z-20 min-w-[150px] shadow-xl">
                                             {(['NPR', 'USD'] as CurrencyType[]).map((c) => (
                                                <button
                                                   key={c}
                                                   onClick={() => { setCurrency(c); setShowCurrencyDropdown(false); }}
                                                   className={`block w-full text-left px-4 py-2.5 text-sm ${currency === c ? 'text-[#00D964] bg-[#15171C]' : 'text-white hover:bg-[#15171C]'
                                                      }`}
                                                >
                                                   {c === 'NPR' ? '🇳🇵 NPR — Rupees' : '🇺🇸 USD — Dollars'}
                                                </button>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                    <button
                                       onClick={() => setIsTradePanelOpen(false)}
                                       className="text-[#9AA0A6] hover:text-white text-lg leading-none bg-transparent border-none cursor-pointer"
                                    >✕</button>
                                 </div>
                              </div>

                              {/* Market title — 1 line only */}
                              <p className="text-[#9AA0A6] text-xs mb-1.5 truncate flex-shrink-0">
                                 {market.title}
                              </p>

                              {/* Outcome name — 1 line only */}
                              {activeOutcomeId && (
                                 <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                    {selectedOutcome?.icon ? (
                                       selectedOutcome.icon.length <= 4 ? (
                                          <div className="text-base flex items-center justify-center flex-shrink-0">{selectedOutcome.icon}</div>
                                       ) : (
                                          <img src={selectedOutcome.icon} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                                       )
                                    ) : (
                                       <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">{selectedOutcome?.name?.charAt(0) || 'S'}</div>
                                    )}
                                    <span className="text-white text-base font-bold truncate">{selectedOutcome?.name}</span>
                                 </div>
                              )}

                              {/* YES / NO buttons + Interest */}
                              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                 <button onClick={() => setActiveSide(Side.YES)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${activeSide === Side.YES
                                          ? 'bg-[#00D964] border-[#00D964] text-black'
                                          : 'bg-transparent border-[#00D964] text-[#00D964]'
                                       }`}>
                                    YES {yes_price}¢
                                 </button>
                                 <button onClick={() => setActiveSide(Side.NO)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${activeSide === Side.NO
                                          ? 'bg-[#9AA0A6] border-[#9AA0A6] text-black'
                                          : 'bg-transparent border-[#9AA0A6] text-[#9AA0A6]'
                                       }`}>
                                    NO {no_price}¢
                                 </button>
                                 <span className="ml-auto text-[#9AA0A6] text-xs flex-shrink-0">3.25% Interest</span>
                              </div>

                              {/* Amount input — symbol & label follow selected currency */}
                              <div className="flex items-center justify-between bg-[#1E2025] rounded-lg px-4 py-2.5 mb-1 border border-[#2A2D35] focus-within:border-gray-500 transition-colors group flex-shrink-0">
                                 <span className="text-[#9AA0A6] text-sm font-medium">{config.label}</span>
                                 <div className="flex items-center justify-end flex-1">
                                    <span className="text-white text-lg font-medium mr-1 group-focus-within:text-[#00D964] transition-colors">{config.symbol}</span>
                                    <input
                                       type="number"
                                       inputMode="numeric"
                                       value={quantity || ''}
                                       onChange={(e) => { setQuantity(e.target.value); setShowError(false); }}
                                       placeholder="0"
                                       className="bg-transparent text-white text-right text-lg font-medium outline-none w-20 placeholder:text-[#333]"
                                    />
                                 </div>
                              </div>
                              {/* Live conversion hint — shows the equivalent in the other currency */}
                              {typedAmount > 0 && (
                                 <p className="text-[#9AA0A6] text-xs mb-2 px-1 flex-shrink-0">
                                    {currency === 'NPR'
                                       ? `≈ $${(typedAmount / usdToNprRate).toFixed(2)} USD`
                                       : `≈ Rs. ${(typedAmount * usdToNprRate).toFixed(2)} NPR`}
                                 </p>
                              )}
                              {showError && (
                                 <p className="text-[#FF4D4D] text-xs mb-2 text-center font-bold flex-shrink-0">Please enter an amount</p>
                              )}

                              {/* Odds + Max payout — COMBINED compact row */}
                              <div className="flex items-center justify-between mb-3 bg-[#1E2025] rounded-lg px-3 py-2.5 flex-shrink-0">
                                 <div>
                                    <p className="text-[#9AA0A6] text-xs">Odds</p>
                                    <p className="text-white text-sm font-medium">
                                       {activeSide === Side.YES ? yes_price : no_price}% chance
                                    </p>
                                 </div>
                                 <div className="w-px h-8 bg-[#2A2D35]" />
                                 <div className="text-right">
                                    <p className="text-[#9AA0A6] text-xs">Max payout · {resolutionDate}</p>
                                    <p className="text-white text-sm font-bold">{config.symbol} {maxPayoutDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                 </div>
                              </div>

                              {/* Spacer pushes button to bottom */}
                              <div className="flex-1" />

                              {/* Place Order button — always visible at bottom */}
                              <div
                                 className="flex-shrink-0 pb-4"
                                 style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
                              >
                                 <Button
                                    onClick={handleOrder}
                                    disabled={isProcessing}
                                    className="w-full bg-[#00D964] text-black font-bold text-base py-3.5 rounded-xl hover:bg-[#00c255] active:scale-[0.98] transition-all h-auto"
                                 >
                                    {isProcessing ? <Spinner size="sm" /> : (userProfile ? 'Place Order' : 'Sign up to trade')}
                                 </Button>
                                 <p className="text-center mt-3 text-xs text-[#9AA0A6] font-medium">Positions are held until market resolution.</p>
                              </div>

                           </>
                        )}
                     </div>
                  </div>
               </>
            )}

            {/* DESKTOP TRADING PANEL */}
            <div className="hidden lg:block w-72 xl:w-80 flex-shrink-0">
               <div className="sticky top-6 bg-[#15171C] border border-[#22252B] rounded-2xl p-5 w-full">

                  {(market.status as string) === 'resolved' ? (
                     <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#1E2440] flex items-center justify-center mb-4">
                           <span className="text-2xl">🏁</span>
                        </div>
                        <h3 className="text-white text-lg font-bold mb-2">Market Resolved</h3>
                        <p className="text-[#9AA0A6] text-sm leading-relaxed">
                           This market has concluded and resolved to <span className="text-white font-bold">{market.resolved_outcome || market.outcome}</span>. Trading is closed.
                        </p>
                     </div>
                  ) : (
                     <>
                        {/* Header tabs */}
                        <div className="flex items-center justify-between mb-4">
                           <div className="flex gap-4">
                              <span className="text-white text-sm font-bold border-b-2 border-white pb-1">BUY</span>
                           </div>
                           <div className="relative">
                              <button
                                 onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                                 className="text-[#9AA0A6] text-sm flex items-center gap-1 hover:text-white"
                              >
                                 {config.dropdownLabel} ▾
                              </button>
                              {showCurrencyDropdown && (
                                 <div className="absolute right-0 top-7 bg-[#1E2025] border border-[#22252B] rounded-lg overflow-hidden z-20 min-w-[160px] shadow-xl">
                                    {(['NPR', 'USD'] as CurrencyType[]).map((c) => (
                                       <button
                                          key={c}
                                          onClick={() => { setCurrency(c); setShowCurrencyDropdown(false); }}
                                          className={`block w-full text-left px-4 py-2.5 text-sm ${currency === c ? 'text-[#00D964] bg-[#15171C]' : 'text-white hover:bg-[#15171C]'
                                             }`}
                                       >
                                          {c === 'NPR' ? '🇳🇵 NPR — Rupees' : '🇺🇸 USD — Dollars'}
                                       </button>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* Market title */}
                        <p className="text-[#9AA0A6] text-sm mb-1 capitalize">
                           {market.title}
                        </p>

                        {/* Selected outcome row (icon + bold name) */}
                        <div className="flex items-center gap-2 mb-4">
                           {selectedOutcome?.icon ? (
                              selectedOutcome.icon.length <= 4 ? (
                                 <span className="text-2xl leading-none">{selectedOutcome.icon}</span>
                              ) : (
                                 <img src={selectedOutcome.icon} className="w-7 h-7 rounded-sm object-cover" alt="" />
                              )
                           ) : (
                              <div className="w-7 h-7 rounded-sm bg-gray-700 flex items-center justify-center text-xs text-white font-bold shrink-0">
                                 {selectedOutcome?.name?.charAt(0) || 'S'}
                              </div>
                           )}
                           <span className="text-white text-xl font-bold">
                              {selectedOutcome?.name}
                           </span>
                        </div>

                        {/* YES / NO toggle buttons + Interest link */}
                        <div className="flex items-center gap-2 mb-4">
                           {/* YES button */}
                           <button
                              onClick={() => setActiveSide(Side.YES)}
                              className={`px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all ${activeSide === Side.YES
                                    ? 'bg-[#00D964] text-black border-2 border-[#00D964]'
                                    : 'bg-transparent text-[#00D964] border-2 border-[#00D964]'
                                 }`}
                           >
                              YES {yes_price}¢
                           </button>

                           {/* NO button */}
                           <button
                              onClick={() => setActiveSide(Side.NO)}
                              className={`px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all ${activeSide === Side.NO
                                    ? 'bg-[#9AA0A6] text-black border-2 border-[#9AA0A6]'
                                    : 'bg-transparent text-[#9AA0A6] border-2 border-[#9AA0A6]'
                                 }`}
                           >
                              NO {no_price}¢
                           </button>

                           {/* Interest link — far right */}
                           <span className="ml-auto text-[#9AA0A6] text-xs cursor-pointer hover:text-white">
                              3.25% Interest
                           </span>
                        </div>

                        {/* Amount input — symbol & label follow selected currency */}
                        <div className="flex items-center justify-between bg-[#1E2025] rounded-lg px-4 py-3 mb-1 border border-[#2A2D35] focus-within:border-gray-500 transition-colors">
                           <span className="text-[#9AA0A6] text-sm">{config.label}</span>
                           <div className="flex items-center">
                              <span className="text-[#00D964] text-base font-medium mr-1">{config.symbol}</span>
                              <input
                                 type="number"
                                 min="0"
                                 step="1"
                                 value={quantity}
                                 onChange={(e) => { setQuantity(e.target.value); setShowError(false); }}
                                 placeholder="0"
                                 className="bg-transparent text-white text-right text-base font-medium outline-none w-24"
                              />
                           </div>
                        </div>
                        {/* Live conversion hint */}
                        {typedAmount > 0 ? (
                           <p className="text-[#9AA0A6] text-xs mb-3 px-1">
                              {currency === 'NPR'
                                 ? `≈ $${(typedAmount / usdToNprRate).toFixed(2)} USD`
                                 : `≈ Rs. ${(typedAmount * usdToNprRate).toFixed(2)} NPR`}
                           </p>
                        ) : (
                           <div className="mb-3" />
                        )}
                        {showError && <p className="text-[#FF4D4D] text-xs mb-3">Please enter an amount</p>}

                        {/* Odds row */}
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-1">
                              <span className="text-[#9AA0A6] text-sm">Odds</span>
                              <span className="text-[#9AA0A6] text-xs cursor-help" title="Probability of this outcome">ⓘ</span>
                           </div>
                           <span className="text-white text-sm font-medium">
                              {activeSide === Side.YES ? yes_price : no_price}% chance
                           </span>
                        </div>

                        {/* Max payout row */}
                        <div className="flex items-center justify-between mb-5">
                           <div>
                              <p className="text-[#9AA0A6] text-sm">Max payout</p>
                              <p className="text-[#9AA0A6] text-xs">{resolutionDate}</p>
                           </div>
                           <span className="text-white text-2xl font-bold">
                              {config.symbol} {maxPayoutDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                        </div>

                        {/* CTA Button — always bright green */}
                        <button
                           onClick={handleOrder}
                           disabled={isProcessing}
                           className="w-full bg-[#00D964] text-black font-bold text-base py-3.5 rounded-xl hover:bg-[#00c255] active:scale-[0.98] transition-all flex items-center justify-center"
                        >
                           {isProcessing ? <Spinner size="sm" /> : (userProfile ? 'Place Order' : 'Sign up to trade')}
                        </button>
                        <p className="text-center mt-3 text-xs text-[#9AA0A6] font-medium">Positions are held until market resolution.</p>
                     </>
                  )}
               </div>
            </div>

            {/* Mobile Backdrop for bottom sheet */}
            {isTradePanelOpen && (
               <div
                  className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                  onClick={() => setIsTradePanelOpen(false)}
               ></div>
            )}

         </div>
   );
};
