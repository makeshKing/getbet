import React, { useState, useMemo } from 'react';
import { LedgerEntry, Trade, LedgerType } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface PnLCalendarProps {
  ledger: LedgerEntry[];
  trades: Trade[];
}

export const PnLCalendar: React.FC<PnLCalendarProps> = ({ ledger, trades }) => {
  const { currency, usdToNprRate, formatMoney } = useCurrency();
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 89);
    return d;
  }, [today]);

  const availableMonths = useMemo(() => {
    const months = [];
    let d = new Date(startDate);
    d.setDate(1);
    while (d <= today || (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth())) {
      months.push({ year: d.getFullYear(), month: d.getMonth() });
      d.setMonth(d.getMonth() + 1);
    }
    return months;
  }, [startDate, today]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const prevDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (prevDate < new Date(startDate.getFullYear(), startDate.getMonth(), 1)) return prev;
      return prevDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (nextDate > today) return prev;
      return nextDate;
    });
  };

  const canGoPrev = new Date(currentYear, currentMonth - 1, 1) >= new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const canGoNext = new Date(currentYear, currentMonth + 1, 1) <= new Date(today.getFullYear(), today.getMonth(), 1);

  const formatShortMoney = (cents: number) => {
    if (cents === 0) return currency === 'USD' ? '$0' : 'Rs. 0';
    const sign = cents > 0 ? '+' : '';
    const absCents = Math.abs(cents);
    
    if (currency === 'NPR') {
      const val = absCents / 100;
      if (val >= 1000) return `${sign}Rs. ${(val / 1000).toFixed(1)}k`;
      return `${sign}Rs. ${val.toFixed(0)}`;
    } else {
      const usdDollars = (absCents / 100) / usdToNprRate;
      if (usdDollars >= 1000) return `${sign}$${(usdDollars / 1000).toFixed(1)}k`;
      return `${sign}$${usdDollars.toFixed(0)}`;
    }
  };

  const { calendarDays, monthTotalPnL } = useMemo(() => {
    const days = [];
    let totalPnL = 0;
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    // Padding for the first week
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateLoop = new Date(currentYear, currentMonth, day);
      
      if (dateLoop < startDate || dateLoop > today) {
        days.push({ day, outOfWindow: true, pnl: 0, tradesCount: 0 });
        continue;
      }

      // Filter ledger entries for this day
      const dayLedger = ledger.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate.getFullYear() === currentYear && entryDate.getMonth() === currentMonth && entryDate.getDate() === day;
      });

      // Filter trades for this day
      const dayTrades = trades.filter(trade => {
        const tradeDate = new Date(trade.createdAt);
        return tradeDate.getFullYear() === currentYear && tradeDate.getMonth() === currentMonth && tradeDate.getDate() === day;
      });

      let pnl = 0;
      dayLedger.forEach(entry => {
        if (entry.type === LedgerType.TRADE_PROFIT) {
          pnl += entry.amount;
        } else if (entry.type === LedgerType.TRADE_LOSS) {
          pnl += entry.amount;
        } else if (entry.type === LedgerType.TRADE_FEE) {
          pnl -= Math.abs(entry.amount);
        }
      });

      totalPnL += pnl;

      days.push({
        day,
        month: currentMonth,
        year: currentYear,
        pnl,
        tradesCount: dayTrades.length,
        outOfWindow: false
      });
    }

    return { calendarDays: days, monthTotalPnL: totalPnL };
  }, [currentYear, currentMonth, ledger, trades, startDate, today]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[#15171C] border border-[#22252B] rounded-xl p-4">
      {/* Header — smaller */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-bold">
          Historical Performance
          <span className="text-[#9AA0A6] text-xs font-normal ml-1.5">(90 Days)</span>
        </h3>
      </div>

      {/* Month nav — smaller */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={handlePrevMonth} disabled={!canGoPrev} className={`text-sm ${canGoPrev ? 'text-[#9AA0A6] hover:text-white' : 'text-[#22252B] cursor-not-allowed'}`}>‹</button>
        <select 
          value={`${currentYear}-${currentMonth}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split('-');
            setCurrentDate(new Date(parseInt(y), parseInt(m), 1));
          }}
          className="bg-transparent border-none text-sm font-bold text-white outline-none cursor-pointer appearance-none text-center"
        >
          {availableMonths.map(m => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`} className="bg-[#15171C] text-base">
              {monthNames[m.month]} {m.year}
            </option>
          ))}
        </select>
        <button onClick={handleNextMonth} disabled={!canGoNext} className={`text-sm ${canGoNext ? 'text-[#9AA0A6] hover:text-white' : 'text-[#22252B] cursor-not-allowed'}`}>›</button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-[#9AA0A6] text-[10px] py-1">
            {day.charAt(0)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {calendarDays.map((dateData, index) => {
          if (!dateData) {
            return <div key={`empty-${index}`} className="min-h-[40px] rounded-md border border-transparent"></div>;
          }

          if (dateData.outOfWindow) {
            return (
              <div key={`day-out-${dateData.day}`} className="min-h-[40px] rounded-md border border-transparent flex flex-col justify-between p-1">
                <p className="text-[#9AA0A6] text-[9px] leading-none opacity-30">{String(dateData.day).padStart(2, '0')}</p>
              </div>
            );
          }
          
          const isPositive = dateData.pnl > 0;
          const isNegative = dateData.pnl < 0;
          const hasActivity = dateData.tradesCount > 0 || dateData.pnl !== 0;

          let bgColorClass = hasActivity ? "bg-[#0B0D10] border-[#22252B]" : "bg-transparent border-[#22252B]";
          let textColorClass = "text-[#9AA0A6]";
          
          if (isPositive) {
            bgColorClass = "bg-[#00D4AA]/10 border-[#00D4AA]/30";
            textColorClass = "text-[#00D4AA]";
          } else if (isNegative) {
            bgColorClass = "bg-[#FF4757]/10 border-[#FF4757]/30";
            textColorClass = "text-[#FF4757]";
          }

          return (
            <div key={`day-${index}`} className={`min-h-[40px] rounded-md border p-1 flex flex-col justify-between ${bgColorClass}`} title={`${dateData.pnl !== 0 ? formatMoney(dateData.pnl) : '$0'} P&L\n${dateData.tradesCount} trades\n${monthNames[dateData.month]} ${dateData.day}, ${dateData.year}`}>
              <p className="text-[#9AA0A6] text-[9px] leading-none">
                {String(dateData.day).padStart(2, '0')}
              </p>
              <p className={`text-[10px] font-bold leading-tight ${textColorClass}`}>
                {hasActivity ? formatShortMoney(dateData.pnl) : 'Rs. 0'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#22252B]">
        <span className="text-[#9AA0A6] text-xs">{monthNames[currentMonth]} {currentYear} P&L</span>
        <span className={`text-sm font-bold ${monthTotalPnL >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
          {monthTotalPnL > 0 ? '+' : ''}{formatMoney(monthTotalPnL)}
        </span>
      </div>
    </div>
  );
};
