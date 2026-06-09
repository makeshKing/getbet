import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCurrency } from '../context/CurrencyContext';
import { Button } from './ui/Button';
import { LedgerEntry } from '../types';
import { Check, X, Clock, Wallet, ExternalLink, Image, Eye, AlertCircle } from 'lucide-react';
import { useToast } from './ui/Toast';
import { ImageViewerModal } from './ImageViewerModal';

export const AdminDepositQueue: React.FC = () => {
  const { formatMoney } = useCurrency();
  const { addToast } = useToast();
  const { getPendingDeposits, approveDeposit, rejectDeposit } = useApp();
  const deposits = getPendingDeposits();

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (confirm('Approve this deposit based on the provided payment proof? This will credit the user balance.')) {
        await approveDeposit(id);
        addToast('Deposit approved and credited based on payment proof.', 'success');
    }
  };

  const handleReject = async (id: string) => {
    if (confirm('Reject this deposit request? No funds will be credited. The user will need to resubmit with valid proof.')) {
        await rejectDeposit(id);
        addToast('Deposit request rejected. User notified to provide valid payment proof.', 'info');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Wallet size={18} />
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Deposit Review Queue</h3>
        </div>
        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
            {deposits.length} Awaiting
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50/50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Proof</th>
              <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {deposits.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{d.userId}</div>
                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {d.screenshotProof ? (
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <img 
                            src={d.screenshotProof} 
                            alt="Payment proof" 
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              console.log('Opening screenshot in modal:', d.screenshotProof);
                              setSelectedImageUrl(d.screenshotProof || null);
                              setImageViewerOpen(true);
                            }}
                            onLoad={(e) => {
                              console.log('Image loaded successfully:', d.screenshotProof?.substring(0, 100));
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', d.screenshotProof);
                              console.error('Error event:', e);
                              const target = e.target as HTMLImageElement;
                              // Show a placeholder with the data type info
                              if (d.screenshotProof?.startsWith('data:image')) {
                                target.alt = 'Base64 Image (click to view)';
                                target.title = 'Base64 encoded image - click to view in modal';
                              } else {
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iOCIgZmlsbD0iI2VmNDQ0NCIvPgo8cGF0aCBkPSJNMjQgMzJDMjguNDIxIDMyIDMyIDI4LjQyMSAzMiAyNEMzMiAxOS41NzkgMjguNDIxIDE2IDI0IDE2QzE5LjU3OSAxNiAxNiAxOS41NzkgMTYgMjRDMTYgMjguNDIxIDE5LjU3OSAzMiAyNCAzMloiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yNCAzMUMyMi44OTU0IDMxIDIyIDMwLjEwNDYgMjIgMjlDMjIgMjcuODk1NCAyMi44OTU0IDI3IDI0IDI3QzI1LjEwNDYgMjcgMjYgMjcuODk1NCAyNiAyOUMyNiAzMC4xMDQ2IDI1LjEwNDYgMzEgMjQgMzFaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                        <span className="text-xs font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                          Screenshot Provided
                        </span>
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => {
                              console.log('Screenshot data:', d.screenshotProof);
                              navigator.clipboard.writeText(d.screenshotProof || '');
                              addToast('Screenshot data copied to clipboard', 'info');
                            }}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            Copy Data
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Opening screenshot in modal:', d.screenshotProof);
                              setSelectedImageUrl(d.screenshotProof || null);
                              setImageViewerOpen(true);
                            }}
                            className="text-xs text-green-500 hover:text-green-700"
                          >
                            View Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle size={20} className="text-amber-500" />
                        <span className="text-xs font-black bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-amber-800">
                          No Proof
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-slate-900 dark:text-white tabular-nums">
                  {formatMoney(d.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="kalshi" 
                      className="h-9 px-3 text-[10px] font-black uppercase tracking-widest w-full sm:w-auto"
                      onClick={() => handleApprove(d.id)}
                      disabled={!d.screenshotProof}
                    >
                      <Check size={14} className="mr-1.5" /> Approve
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-9 px-3 text-[10px] font-black uppercase tracking-widest border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white w-full sm:w-auto"
                      onClick={() => handleReject(d.id)}
                    >
                      <X size={14} className="mr-1.5" /> Reject
                    </Button>
                  </div>
                  {!d.screenshotProof && (
                    <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 text-center sm:text-left">
                      Cannot approve without payment proof
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center opacity-40">
                            <Check size={32} className="text-slate-300 mb-2" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Queue Clear</p>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setSelectedImageUrl(null);
        }}
        imageUrl={selectedImageUrl}
        title="Payment Proof Screenshot"
      />
    </div>
  );
};
