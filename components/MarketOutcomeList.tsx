import React, { useState, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ListFilter } from 'lucide-react';
import { Market, Side } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from './ui/Toast';
import { Spinner } from './ui/Spinner';
import { useIsMobile } from '../lib/useIsMobile';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderBookRow {
  price: number;     // cents (e.g. 9.9)
  contracts: number;
  total: number;
}

interface OutcomeData {
  id: string;
  name: string;
  probability: number;
  change?: number;       // positive = up
  change_24h?: number;   // 24h direction change
  yesPrice: number;      // cents
  noPrice: number;       // cents
  // These are used as fallback; live data is fetched per-outcome
  asks: OrderBookRow[];
  bids: OrderBookRow[];
  priceHistory: { date: string; price: number }[];
}

type ActiveTab = 'yes' | 'no' | 'graph';
type TimeFilter = '1D' | '1W' | '1M' | 'ALL';

export interface MarketOutcomeListProps {
  market: Market;
  onTradeClick?: (outcomeId: string, side: Side) => void;
}

function sampleData(data: any[], maxPoints = 150) {
  if (data.length <= maxPoints) return data;
  const step = Math.floor(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0);
}

// ─── Seeded Order-Book Generator ──────────────────────────────────────────────

/** Deterministic pseudo-random: same seed+index → same number every time */
function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = seed + ':' + index;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // force 32-bit
  }
  return Math.abs(Math.sin(hash * 9301 + 49297)) % 1;
}

/**
 * Generate a realistic order-book centred on `currentPriceCents`.
 * `seedId` should be unique per outcome+side so every combo gets different data.
 */
function generateOrderBook(
  currentPriceCents: number,
  seedId: string,
): { asks: OrderBookRow[]; bids: OrderBookRow[] } {
  const asks: OrderBookRow[] = [];
  const bids: OrderBookRow[] = [];

  // ── Asks: 6-7 levels ABOVE current price ──
  const askCount = 6 + Math.floor(seededRandom(seedId, 999) * 2); // 6 or 7
  let askPrice = currentPriceCents;
  for (let i = 0; i < askCount; i++) {
    const step = 0.3 + seededRandom(seedId, i) * 1.2; // 0.3–1.5¢ increments
    askPrice = Math.min(99.9, askPrice + step);
    const contracts = Math.round((20 + seededRandom(seedId, i + 100) * 1200) * 100) / 100;
    const total = Math.round(contracts * (askPrice / 100) * 100) / 100;
    asks.push({ price: Math.round(askPrice * 10) / 10, contracts, total });
  }

  // ── Bids: 3-5 levels BELOW current price ──
  const bidCount = 3 + Math.floor(seededRandom(seedId, 200) * 3); // 3-5
  let bidPrice = currentPriceCents;
  for (let i = 0; i < bidCount; i++) {
    const step = 0.3 + seededRandom(seedId, i + 300) * 1.5; // 0.3–1.8¢ decrements
    bidPrice = Math.max(0.1, bidPrice - step);
    const contracts = Math.round((30 + seededRandom(seedId, i + 400) * 900) * 100) / 100;
    const total = Math.round(contracts * (bidPrice / 100) * 100) / 100;
    bids.push({ price: Math.round(bidPrice * 10) / 10, contracts, total });
  }

  // asks: highest first (farthest from mid at top, closest at bottom)
  asks.reverse();
  // bids: highest first (closest to mid at top)
  return { asks, bids };
}

/** Generate realistic price history for an outcome */
function generatePriceHistory(basePrice: number, days: number): { date: string; price: number }[] {
  const result: { date: string; price: number }[] = [];
  const start = new Date('2026-05-28');
  let price = basePrice - 6;
  for (let i = 0; i <= days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const seed = i * 13.7 + basePrice;
    const delta = (Math.sin(seed) * 0.7 + (Math.random() - 0.46) * 1.0);
    price = Math.max(basePrice - 8, Math.min(basePrice + 2, price + delta));
    result.push({ date: label, price: parseFloat(price.toFixed(2)) });
  }
  result[result.length - 1].price = basePrice;
  return result;
}

// ─── Order Book Table ─────────────────────────────────────────────────────────

interface OrderBookProps {
  outcome: OutcomeData;
  side: 'yes' | 'no';
}

const OrderBook: React.FC<OrderBookProps> = ({ outcome, side }) => {
  const [liveAsks, setLiveAsks] = useState<OrderBookRow[] | null>(null);
  const [liveBids, setLiveBids] = useState<OrderBookRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function fetchOrderBook() {
      try {
        // Fetch trades for this outcome/side from the trades table.
        // We group by price to create order book levels.
        const dbSide = side === 'yes' ? 'YES' : 'NO';
        const { data, error } = await supabase
          .from('trades')
          .select('price, shares, amount, status')
          .eq('outcome_id', outcome.id)
          .eq('side', dbSide)
          .eq('status', 'WAITING') // WAITING = open/unfilled trades
          .order('price', { ascending: false })
          .limit(100);

        if (error || !data || data.length === 0) {
          // Use fallback mock data
          if (isMounted) {
            setLiveAsks(null);
            setLiveBids(null);
            setLoading(false);
          }
          return;
        }

        // Group by price level
        const grouped: Record<number, { contracts: number; total: number }> = {};
        data.forEach((row: any) => {
          const priceCents = Number(row.price) / 100; // price stored as paisa/100, display as cents
          if (!grouped[priceCents]) grouped[priceCents] = { contracts: 0, total: 0 };
          grouped[priceCents].contracts += row.shares ?? 1;
          grouped[priceCents].total += (row.amount ?? 0) / 100; // paisa → rupee-dollars
        });

        const priceList = Object.entries(grouped).map(([p, v]) => ({
          price: Number(p),
          contracts: v.contracts,
          total: v.total,
        }));

        const mid = priceList.length > 0
          ? priceList.reduce((s, r) => s + r.price, 0) / priceList.length
          : (side === 'yes' ? outcome.yesPrice : outcome.noPrice);

        const asks = priceList.filter(r => r.price > mid).sort((a, b) => b.price - a.price);
        const bids = priceList.filter(r => r.price <= mid).sort((a, b) => b.price - a.price);

        if (isMounted) {
          setLiveAsks(asks.length > 0 ? asks : null);
          setLiveBids(bids.length > 0 ? bids : null);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLiveAsks(null);
          setLiveBids(null);
          setLoading(false);
        }
      }
    }

    fetchOrderBook();
    return () => { isMounted = false; };
  }, [outcome.id, side]);

  // Use live data if available, fall back to generated data from the outcome object
  const asks = liveAsks ?? outcome.asks;
  const bids = liveBids ?? outcome.bids;
  const lastPrice = side === 'yes' ? outcome.yesPrice : outcome.noPrice;

  const localMax = Math.max(
    ...asks.map(r => r.contracts),
    ...bids.map(r => r.contracts),
    1, // avoid 0
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#8A9099', fontSize: 12 }}>
        Loading order book...
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          padding: '8px 0 4px',
          color: '#8A9099',
          fontSize: 11,
          fontWeight: 500,
        }}
      >
        <span style={{ textAlign: 'center' }}>Price</span>
        <span style={{ textAlign: 'center' }}>Contracts</span>
        <span style={{ textAlign: 'right', paddingRight: 12 }}>Total</span>
      </div>

      {/* Ask rows */}
      {asks.map((row, i) => {
        const isLastAsk = i === asks.length - 1;
        const depthPct = (row.contracts / localMax) * 100;
        return (
          <div
            key={`ask-${i}`}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              alignItems: 'center',
              height: 32,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: 12,
            }}
          >
            {/* Depth bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${depthPct * 0.45}%`,
                background: 'rgba(255,71,87,0.18)',
                pointerEvents: 'none',
              }}
            />
            {/* Asks label on last ask row */}
            {isLastAsk && (
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#FF4757',
                  zIndex: 10,
                }}
              >
                Asks
              </span>
            )}
            <span style={{ textAlign: 'center', color: '#FF4757', fontWeight: 600, position: 'relative', zIndex: 1 }}>
              {row.price.toFixed(1)}¢
            </span>
            <span style={{ textAlign: 'center', color: '#8A9099', position: 'relative', zIndex: 1 }}>
              {row.contracts.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span style={{ textAlign: 'right', paddingRight: 12, color: '#8A9099', position: 'relative', zIndex: 1 }}>
              ${row.total.toFixed(2)}
            </span>
          </div>
        );
      })}

      {/* Divider row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 0',
          color: '#00D4AA',
          fontSize: 13,
          fontWeight: 700,
          borderTop: '1px solid rgba(0,212,170,0.2)',
          borderBottom: '1px solid rgba(0,212,170,0.2)',
          background: 'rgba(0,212,170,0.04)',
        }}
      >
        <span>Trade {side === 'yes' ? 'Yes' : 'No'}</span>
        <span style={{ color: '#8A9099', fontWeight: 400 }}>
          Last {lastPrice}¢
        </span>
      </div>

      {/* Bid rows */}
      {bids.map((row, i) => {
        const isFirstBid = i === 0;
        const depthPct = (row.contracts / localMax) * 100;
        return (
          <div
            key={`bid-${i}`}
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              alignItems: 'center',
              height: 32,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              fontSize: 12,
            }}
          >
            {/* Depth bar */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${depthPct * 0.45}%`,
                background: 'rgba(0,212,170,0.18)',
                pointerEvents: 'none',
              }}
            />
            {/* Bids label on first bid row */}
            {isFirstBid && (
              <span
                style={{
                  position: 'absolute',
                  left: 8,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#00D4AA',
                  zIndex: 10,
                }}
              >
                Bids
              </span>
            )}
            <span style={{ textAlign: 'center', color: '#00D4AA', fontWeight: 600, position: 'relative', zIndex: 1 }}>
              {row.price.toFixed(1)}¢
            </span>
            <span style={{ textAlign: 'center', color: '#8A9099', position: 'relative', zIndex: 1 }}>
              {row.contracts.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span style={{ textAlign: 'right', paddingRight: 12, color: '#8A9099', position: 'relative', zIndex: 1 }}>
              ${row.total.toFixed(2)}
            </span>
          </div>
        );
      })}

      {/* Action icons row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9099', fontSize: 14, padding: '2px 4px' }}
          title="Help"
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A9099')}
        >
          ❓
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9099', fontSize: 14, padding: '2px 4px' }}
          title="Settings"
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A9099')}
        >
          ⚙
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9099', fontSize: 14, padding: '2px 4px' }}
          title="Swap"
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A9099')}
        >
          ⇅
        </button>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A9099', fontSize: 14, padding: '2px 4px' }}
          title="Lock"
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8A9099')}
        >
          🔒
        </button>
      </div>
    </div>
  );
};

// ─── Price Graph ──────────────────────────────────────────────────────────────

interface PriceGraphProps {
  outcome: OutcomeData;
}

const TIME_SLICES: Record<TimeFilter, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  'ALL': 999,
};

/** Small vertical tick marks representing trade activity */
const ActivityTicks: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 12, padding: '0 4px' }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          width: 1,
          height: `${40 + Math.sin(i * 2.3) * 40}%`,
          background: '#8A9099',
          opacity: 0.5,
        }}
      />
    ))}
  </div>
);

// Custom badge label for current price on chart
const CurrentPriceBadge = (props: any) => {
  const { viewBox, value } = props;
  if (!viewBox) return null;
  const { x, y } = viewBox;
  return (
    <g>
      <rect x={x + 2} y={y - 9} width={26} height={16} rx={3} fill="#00D4AA" />
      <text
        x={x + 15}
        y={y + 4}
        textAnchor="middle"
        fill="#0A0C10"
        fontSize={10}
        fontWeight={700}
      >
        {value}
      </text>
    </g>
  );
};

interface PriceGraphProps {
  outcome: OutcomeData;
  market: Market;
}

const PriceGraph: React.FC<PriceGraphProps> = ({ outcome, market }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const TIME_FILTERS: TimeFilter[] = ['1D', '1W', '1M', 'ALL'];
  const [liveHistory, setLiveHistory] = useState<{ date: string; price: number }[] | null>(null);
  const [histLoading, setHistLoading] = useState(true);

  const hasAnimated = useRef(false);
  const [animActive, setAnimActive] = useState(true);
  const [showLiveDot, setShowLiveDot] = useState(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const timer = setTimeout(() => {
      setAnimActive(false);
      setShowLiveDot(true);
    }, 900); // slightly longer than 800ms animationDuration
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setHistLoading(true);

    async function fetchHistory() {
      try {
        // Try probability_history table first
        const { data: phData, error: phError } = await supabase
          .from('probability_history')
          .select('probability, recorded_at')
          .eq('market_id', market.id)
          .eq('outcome_id', outcome.id)
          .order('recorded_at', { ascending: true })
          .limit(200);

        if (!phError && phData && phData.length > 0) {
          const mapped = phData.map((d: any) => ({
            date: new Date(d.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: Number(d.probability),
          }));
          if (isMounted) {
            setLiveHistory(mapped);
            setHistLoading(false);
          }
          return;
        }

        // Fallback: derive from trades price history for this outcome
        const { data: tradeData, error: tradeError } = await supabase
          .from('trades')
          .select('price, created_at')
          .eq('outcome_id', outcome.id)
          .order('created_at', { ascending: true })
          .limit(200);

        if (!tradeError && tradeData && tradeData.length > 0) {
          const mapped = tradeData.map((d: any) => ({
            date: new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: Math.round(Number(d.price) / 100), // paisa → 1-99 scale
          }));
          if (isMounted) {
            setLiveHistory(mapped);
            setHistLoading(false);
          }
          return;
        }

        // Final fallback: generated mock
        if (isMounted) {
          setLiveHistory(null);
          setHistLoading(false);
        }
      } catch {
        if (isMounted) {
          setLiveHistory(null);
          setHistLoading(false);
        }
      }
    }

    fetchHistory();
    return () => { isMounted = false; };
  }, [outcome.id]);

  const baseHistory = liveHistory ?? outcome.priceHistory;

  const sliceDays = TIME_SLICES[timeFilter];
  const rawData = baseHistory.slice(-sliceDays);
  const data = sampleData(rawData, 150);
  const lastPrice = rawData[rawData.length - 1]?.price ?? outcome.yesPrice;

  // Pick evenly spaced X ticks
  const step = Math.max(1, Math.floor(data.length / 5));
  const xTicks = data
    .filter((_, i) => i % step === 0)
    .map(d => d.date);

  if (histLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#8A9099', fontSize: 12 }}>
        Loading chart...
      </div>
    );
  }

  return (
    <div style={{ background: '#14161B', width: '100%' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 12px 4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#00D4AA' }}>
            Yes {lastPrice}¢
          </span>
          <span style={{ fontSize: 11, color: '#8A9099' }}>last traded</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#00D4AA' }}>
            ▲ {outcome.change ?? 4}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {TIME_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                color: timeFilter === f ? '#ffffff' : '#8A9099',
                background: timeFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              {f}
            </button>
          ))}
          <span style={{ fontSize: 11, fontWeight: 700, color: '#8A9099', marginLeft: 8 }}>
            PredictKit
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 52, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8A9099', fontSize: 10 }}
              ticks={xTicks}
              interval="preserveStartEnd"
              dy={6}
            />
            <YAxis
              orientation="right"
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8A9099', fontSize: 10 }}
              tickFormatter={v => `${v}`}
              width={40}
              dx={8}
            />
            {/* Current price badge */}
            <ReferenceLine
              y={lastPrice}
              stroke="transparent"
              label={<CurrentPriceBadge value={lastPrice} />}
            />
            <Line
              key={timeFilter}
              type="basis"
              dataKey="price"
              stroke="#00D4AA"
              strokeWidth={2}
              isAnimationActive={animActive}
              animationDuration={800}
              animationEasing="ease-out"
              dot={(props: any) => {
                if (animActive) return <g key={props.index} />;
                if (props.index !== data.length - 1 || !showLiveDot) return <g key={props.index} />;
                const { cx, cy } = props;
                return (
                  <g key={props.index}>
                    <circle cx={cx} cy={cy} r={5} fill="#00D4AA" className="live-dot-glow" />
                    <circle cx={cx} cy={cy} r={7} fill="#00D4AA" opacity={0.15} />
                    <circle cx={cx} cy={cy} r={3.5} fill="#00D4AA" stroke="#14161B" strokeWidth={1.5} />
                  </g>
                );
              }}
              activeDot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Activity tick marks */}
      <div style={{ padding: '0 8px 8px' }}>
        <ActivityTicks count={42} />
      </div>
    </div>
  );
};

// ─── Expanded Content (tabs) ──────────────────────────────────────────────────

interface ExpandedContentProps {
  outcome: OutcomeData;
  initialTab: ActiveTab;
  market: Market;
  onClose: () => void;
}

const ExpandedContent: React.FC<ExpandedContentProps> = ({ outcome, initialTab, market, onClose }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [inlineAmount, setInlineAmount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const { userProfile } = useAuth();
  const { buy } = useApp();
  const { currency, usdToNprRate } = useCurrency();
  const { addToast } = useToast();

  // Reset amount when switching outcomes or tabs:
  useEffect(() => {
    setInlineAmount(0);
  }, [outcome.id, activeTab]);

  // When parent switches the tab (e.g. Yes vs No button click on a different row),
  // sync the local tab state.
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleInlinePlaceOrder = async (side: 'YES' | 'NO') => {
    if (inlineAmount <= 0) {
      addToast('Please enter an amount', 'error');
      return;
    }
    if (!userProfile) {
      addToast('Sign up to trade', 'error');
      return;
    }

    const priceInCents = side === 'YES' ? outcome.yesPrice : outcome.noPrice;
    const amountInUSD = currency === 'NPR' ? inlineAmount / usdToNprRate : inlineAmount;
    const numContracts = priceInCents > 0 ? Math.floor((amountInUSD * 100) / priceInCents) : 0;

    if (numContracts <= 0) {
      addToast('Amount too small for 1 contract', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await buy(market.id, side === 'YES' ? Side.YES : Side.NO, priceInCents, numContracts, outcome.id);
      addToast(`Order placed! ${side} on ${outcome.name}`, 'success');
      setInlineAmount(0);
      onClose(); // collapse after order
    } catch (e: any) {
      const msg: string = e?.message || '';
      const m = msg.match(/Insufficient funds: need\s+(\d+)\s+have\s+(\d+)/i);
      if (m) {
        addToast(`Not enough balance.`, 'error');
      } else {
        addToast(msg || 'Failed to place order', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs: { key: ActiveTab; label: string }[] = [
    { key: 'yes', label: 'Trade Yes' },
    { key: 'no',  label: 'Trade No' },
    { key: 'graph', label: 'Graph' },
  ];

  return (
    <div style={{ background: '#1A1C22', width: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1E2028',
          padding: '0 8px',
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              position: 'relative',
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === tab.key ? '#ffffff' : '#8A9099',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 150ms',
            }}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  borderRadius: '2px 2px 0 0',
                  background: '#00D4AA',
                }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ paddingBottom: 8 }}>
        {activeTab === 'yes'   && <OrderBook outcome={outcome} side="yes" />}
        {activeTab === 'no'    && <OrderBook outcome={outcome} side="no"  />}
        {activeTab === 'graph' && <PriceGraph outcome={outcome} market={market} />}
      </div>
    </div>
  );
};

// ─── Animated Expand Wrapper ──────────────────────────────────────────────────

interface AnimatedExpandProps {
  open: boolean;
  children: React.ReactNode;
}

const AnimatedExpand: React.FC<AnimatedExpandProps> = ({ open, children }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Measure and set height when open state changes
  useEffect(() => {
    if (!innerRef.current) return;
    setHeight(open ? innerRef.current.scrollHeight : 0);
  }, [open]);

  // Re-measure when tab content changes (ResizeObserver)
  useEffect(() => {
    if (!open || !innerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (innerRef.current) setHeight(innerRef.current.scrollHeight);
    });
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div
      style={{
        height,
        overflow: 'hidden',
        transition: 'height 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
};

// ─── Single Outcome Row ───────────────────────────────────────────────────────

interface OutcomeRowProps {
  outcome: OutcomeData;
  isExpanded: boolean;
  expandedTab: ActiveTab;
  onToggle: (id: string, tab?: ActiveTab) => void;
  isLast: boolean;
  market: Market;
  onTradeClick?: (outcomeId: string, side: Side) => void;
}

const OutcomeRow: React.FC<OutcomeRowProps> = ({
  outcome,
  isExpanded,
  expandedTab,
  onToggle,
  isLast,
  market,
  onTradeClick,
}) => {
  const isMobile = useIsMobile();

  const handleYes = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTradeClick) onTradeClick(outcome.id, Side.YES);
  };
  const handleNo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTradeClick) onTradeClick(outcome.id, Side.NO);
  };

  // Responsive sizing — the row is built with inline styles (Tailwind breakpoints
  // can't reach it), so pick widths via the useIsMobile hook instead. On a 375px
  // screen the fixed-width column + two buttons must shrink or the name overlaps.
  const probWidth = isMobile ? 64 : 110;
  const btnMinWidth = isMobile ? 62 : 82;
  const btnPadding = isMobile ? '5px 9px' : '6px 14px';
  const btnFontSize = isMobile ? 11 : 12;
  const btnGap = isMobile ? 6 : 8;
  const probFont = isMobile ? 17 : 20;

  return (
    <div
      style={{
        borderBottom: isLast && !isExpanded ? 'none' : '1px solid #1E2028',
      }}
    >
      {/* Collapsed header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 0',
          background: 'transparent',
          transition: 'background 150ms',
        }}
      >
        {/* Left Side — clickable to open/close order book */}
        <div
          style={{ flex: 1, minWidth: 0, paddingRight: isMobile ? 8 : 12, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onToggle(outcome.id)}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: '#ffffff',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {outcome.name}
            </span>
          </div>

          <div
            style={{
              width: probWidth,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: probFont, fontWeight: 700, color: '#ffffff' }}>
              {outcome.probability}%
            </span>
            {outcome.change_24h !== undefined && outcome.change_24h !== 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: outcome.change_24h > 0 ? '#00D4AA' : '#FF4757',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {outcome.change_24h > 0 ? '▲' : '▼'}
              </span>
            )}
          </div>

          <span style={{ color: '#8A9099', fontSize: 12, marginLeft: 4 }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>

        {/* Yes / No buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: btnGap, flexShrink: 0, marginLeft: isMobile ? 6 : 8 }}>
          <button
            onClick={handleYes}
            style={{
              padding: btnPadding,
              borderRadius: 999,
              border: '1.5px solid #00D4AA',
              color: '#00D4AA',
              background: 'transparent',
              fontSize: btnFontSize,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: btnMinWidth,
              transition: 'background 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            Yes {outcome.yesPrice}¢
          </button>
          <button
            onClick={handleNo}
            style={{
              padding: btnPadding,
              borderRadius: 999,
              border: '1.5px solid #FF4757',
              color: '#FF4757',
              background: 'transparent',
              fontSize: btnFontSize,
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: btnMinWidth,
              transition: 'background 150ms',
              whiteSpace: 'nowrap',
            }}
          >
            No {outcome.noPrice}¢
          </button>
        </div>
      </div>

      {/* Smooth animated expand section */}
      <AnimatedExpand open={isExpanded}>
        <ExpandedContent 
          outcome={outcome} 
          initialTab={expandedTab} 
          market={market} 
          onClose={() => onToggle(outcome.id)} 
        />
      </AnimatedExpand>
    </div>
  );
};

// ─── MarketOutcomeList (main export) ─────────────────────────────────────────

export const MarketOutcomeList: React.FC<MarketOutcomeListProps> = ({ market, onTradeClick }) => {
  // Convert real market outcomes into OutcomeData — mock order book/history as
  // initial state; live data is fetched inside OrderBook/PriceGraph components.
  const outcomes: OutcomeData[] = React.useMemo(() => {
    const rawOutcomes = market.outcomes;

    // Multi-choice market with real outcomes
    if (rawOutcomes && rawOutcomes.length > 0) {
      return rawOutcomes.map((o) => {
        const prob = Math.round(o.probability);
        const yesP = prob;
        const noP = 100 - prob;
        const yesBook = generateOrderBook(yesP, `${o.id}-yes`);
        const noBook  = generateOrderBook(noP,  `${o.id}-no`);
        return {
          id: o.id,
          name: o.name,
          probability: prob,
          yesPrice: yesP,
          noPrice: noP,
          // Fallback asks/bids use YES-side book; OrderBook component
          // regenerates per-side anyway via the live-fetch path.
          asks: yesBook.asks,
          bids: yesBook.bids,
          priceHistory: generatePriceHistory(prob, 27),
        };
      });
    }

    // Binary market — synthesise a single "Yes" outcome row
    const bp = market.probability || 50;
    const binaryYes = generateOrderBook(bp, `${market.id}-binary-yes`);
    return [
      {
        id: 'binary-main',
        name: market.title,
        probability: bp,
        yesPrice: bp,
        noPrice: 100 - bp,
        asks: binaryYes.asks,
        bids: binaryYes.bids,
        priceHistory: generatePriceHistory(bp, 27),
      },
    ];
  }, [market.outcomes, market.probability, market.title, market.id]);

  // Fetch 24h change for each outcome from probability_history
  const [changes24h, setChanges24h] = useState<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;
    async function fetch24hChanges() {
      const outcomeIds = outcomes.map(o => o.id);
      if (outcomeIds.length === 0) return;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      try {
        const { data, error } = await supabase
          .from('probability_history')
          .select('outcome_id, probability, recorded_at')
          .eq('market_id', market.id)
          .in('outcome_id', outcomeIds)
          .lte('recorded_at', since)
          .order('recorded_at', { ascending: false })
          .limit(outcomeIds.length);

        if (!error && data && data.length > 0 && isMounted) {
          const changes: Record<string, number> = {};
          data.forEach((row: any) => {
            if (changes[row.outcome_id] === undefined) {
              const currentOutcome = outcomes.find(o => o.id === row.outcome_id);
              if (currentOutcome) {
                changes[row.outcome_id] = currentOutcome.probability - Math.round(row.probability);
              }
            }
          });
          setChanges24h(changes);
        }
      } catch {
        // Silently fail — change indicators just won't show
      }
    }
    fetch24hChanges();
    return () => { isMounted = false; };
  }, [market.id, outcomes]);

  // Merge 24h changes into outcomes
  const outcomesWithChanges = React.useMemo(() =>
    outcomes.map(o => ({
      ...o,
      change_24h: changes24h[o.id] ?? 0,
    })),
    [outcomes, changes24h]
  );

  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<ActiveTab>('yes');

  const handleToggle = (id: string, tab?: ActiveTab) => {
    if (expandedId === id) {
      if (tab && tab !== expandedTab) {
        // Same row, different tab → switch without collapsing
        setExpandedTab(tab);
      } else {
        // Same row, same tab → collapse
        setExpandedId(null);
      }
    } else {
      setExpandedId(id);
      setExpandedTab(tab ?? 'yes');
    }
  };

  return (
    <div
      style={{
        background: '#14161B',
        border: '1px solid #1E2028',
        borderRadius: 12,
        overflow: 'hidden',
        overflowX: 'hidden',
        width: '100%',
        maxWidth: '100%',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderBottom: '1px solid #1E2028',
          padding: '8px 12px',
        }}
      >
        {/* Centred "Chance" label — positioned so it roughly aligns with the probability column */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', paddingRight: 0 }}>
          <span style={{ fontSize: 12, color: '#8A9099', fontWeight: 500 }}>Chance</span>
        </div>
        <ListFilter size={14} style={{ color: '#8A9099', cursor: 'pointer', flexShrink: 0 }} />
      </div>

      {/* Outcome rows */}
      <div style={{ padding: '0 12px' }}>
        {outcomesWithChanges.map((outcome, idx) => (
          <OutcomeRow
            key={outcome.id}
            outcome={outcome}
            isExpanded={expandedId === outcome.id}
            expandedTab={expandedId === outcome.id ? expandedTab : 'yes'}
            onToggle={handleToggle}
            isLast={idx === outcomesWithChanges.length - 1}
            market={market}
            onTradeClick={onTradeClick}
          />
        ))}
      </div>
    </div>
  );
};

export default MarketOutcomeList;
