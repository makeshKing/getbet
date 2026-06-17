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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

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
    
    // Previous month padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      // Filter ledger entries for this day
      const dayLedger = ledger.filter(entry => {
        const entryDate = new Date(entry.createdAt);
        return entryDate.getFullYear() === year && entryDate.getMonth() === month && entryDate.getDate() === day;
      });

      // Filter trades for this day
      const dayTrades = trades.filter(trade => {
        const tradeDate = new Date(trade.createdAt);
        return tradeDate.getFullYear() === year && tradeDate.getMonth() === month && tradeDate.getDate() === day;
      });

      let pnl = 0;
      dayLedger.forEach(entry => {
        if (entry.type === LedgerType.TRADE_PROFIT) {
          pnl += entry.amount;
        } else if (entry.type === LedgerType.TRADE_LOSS) {
          pnl += entry.amount; // amount is negative for loss
        } else if (entry.type === LedgerType.TRADE_FEE) {
          pnl -= Math.abs(entry.amount);
        }
      });

      totalPnL += pnl;

      days.push({
        day,
        pnl,
        tradesCount: dayTrades.length
      });
    }

    return { calendarDays: days, monthTotalPnL: totalPnL };
  }, [year, month, ledger, trades]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-[#0b101a] text-[#f5f9fc] rounded-lg p-6 shadow-lg border border-slate-700/50 relative overflow-hidden">
      <div className="flex justify-between items-end mb-6">
        <div>
           <div className="text-slate-400 text-sm font-medium mb-1">P&L Calendar</div>
           <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
             <button onClick={handlePrevMonth} className="hover:text-slate-300"><ChevronLeft size={20}/></button>
             <span>{monthNames[month]} {year}</span>
             <button onClick={handleNextMonth} className="hover:text-slate-300"><ChevronRight size={20}/></button>
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
            <div key={`day-${dateData.day}`} className={`aspect-square rounded-md border p-2 flex flex-col justify-between transition-all hover:border-slate-600 cursor-pointer ${bgColorClass}`} title={`${dateData.pnl !== 0 ? formatMoney(dateData.pnl) : '$0'} P&L\n${dateData.tradesCount} trades`}>
              <div className="text-xs text-slate-500 font-medium">
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
          <div className="text-slate-400 text-sm mb-1">{monthNames[month]} P&L</div>
          <div className={`text-2xl font-bold ${monthTotalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {monthTotalPnL > 0 ? '+' : ''}{formatMoney(monthTotalPnL)}
          </div>
        </div>
      </div>
    </div>
  );
};
