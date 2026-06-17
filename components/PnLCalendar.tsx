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
    <div className="bg-[#0b101a] text-[#f5f9fc] rounded-lg p-6 shadow-lg border border-slate-700/50 relative overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
           <div className="text-slate-400 text-sm font-medium mb-1">Historical Performance (90 Days)</div>
           <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
             <button onClick={handlePrevMonth} disabled={!canGoPrev} className={`p-1 rounded-lg transition-colors ${canGoPrev ? 'hover:bg-slate-800 text-slate-300' : 'text-slate-700 cursor-not-allowed'}`}><ChevronLeft size={20}/></button>
             
             <select 
               value={`${currentYear}-${currentMonth}`}
               onChange={(e) => {
                 const [y, m] = e.target.value.split('-');
                 setCurrentDate(new Date(parseInt(y), parseInt(m), 1));
               }}
               className="bg-transparent border-none text-xl sm:text-2xl font-bold text-white outline-none cursor-pointer appearance-none text-center"
             >
               {availableMonths.map(m => (
                 <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`} className="bg-slate-900 text-base">
                   {monthNames[m.month]} {m.year}
                 </option>
               ))}
             </select>

             <button onClick={handleNextMonth} disabled={!canGoNext} className={`p-1 rounded-lg transition-colors ${canGoNext ? 'hover:bg-slate-800 text-slate-300' : 'text-slate-700 cursor-not-allowed'}`}><ChevronRight size={20}/></button>
           </h2>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-slate-400 font-medium text-sm py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {calendarDays.map((dateData, index) => {
          if (!dateData) {
            return <div key={`empty-${index}`} className="aspect-square rounded-md border border-slate-800/50 bg-[#121722]/50"></div>;
          }

          if (dateData.outOfWindow) {
            return (
              <div key={`day-out-${dateData.day}`} className="aspect-square rounded-md border border-slate-800/20 bg-[#121722]/20 flex flex-col p-2 opacity-30 cursor-not-allowed" title="Outside 90-day window">
                <div className="text-xs text-slate-600 font-medium truncate">
                  {String(dateData.day).padStart(2, '0')}
                </div>
              </div>
            );
          }
          
          const isPositive = dateData.pnl > 0;
          const isNegative = dateData.pnl < 0;

          let bgColorClass = "bg-[#121722] border-slate-800/50";
          let textColorClass = "text-slate-400";
          
          if (isPositive) {
            bgColorClass = "bg-emerald-900/20 border-emerald-900/50";
            textColorClass = "text-emerald-400";
          } else if (isNegative) {
            bgColorClass = "bg-red-900/20 border-red-900/50";
            textColorClass = "text-red-400";
          }

          return (
            <div key={`day-${index}`} className={`aspect-square rounded-md border p-2 flex flex-col justify-between transition-all hover:border-slate-600 cursor-pointer ${bgColorClass}`} title={`${dateData.pnl !== 0 ? formatMoney(dateData.pnl) : '$0'} P&L\n${dateData.tradesCount} trades\n${monthNames[dateData.month]} ${dateData.day}, ${dateData.year}`}>
              <div className="text-xs text-slate-500 font-medium truncate">
                {String(dateData.day).padStart(2, '0')}
              </div>
              <div>
                <div className={`font-bold text-sm sm:text-base ${textColorClass}`}>
                  {formatShortMoney(dateData.pnl)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {dateData.tradesCount > 0 ? `${dateData.tradesCount} trade${dateData.tradesCount > 1 ? 's' : ''}` : '- trades'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-end border-t border-slate-800/50 pt-4">
        <div>
          <div className="text-slate-400 text-sm mb-1">{monthNames[currentMonth]} {currentYear} P&L</div>
          <div className={`text-2xl font-bold ${monthTotalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {monthTotalPnL > 0 ? '+' : ''}{formatMoney(monthTotalPnL)}
          </div>
        </div>
      </div>
    </div>
  );
};
