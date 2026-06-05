
import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { ShieldCheck, Info, Copy, Check, Upload, X, Image } from 'lucide-react';
import { DepositMethodConfig } from '../types';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositDialog: React.FC<DepositDialogProps> = ({ isOpen, onClose }) => {
  const { addToast } = useToast();
  const { depositMethods: methods, requestDeposit } = useApp();
  const [activeMethodId, setActiveMethodId] = useState<string>('esewa');
  const [amount, setAmount] = useState<string>('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const activeMethod = methods.find(m => m.id === activeMethodId) || methods[0];
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    addToast('Account number copied to clipboard', 'info');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        addToast('Please upload a valid image file', 'error');
        return;
      }
        
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        addToast('Image size must be less than 5MB', 'error');
        return;
      }
        
      setScreenshot(file);
        
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const handleRequest = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (!screenshot) {
        addToast('Please upload a screenshot proof of payment', 'error');
        return;
    }
      
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
  
    try {
      // In a real implementation, you would upload the file to a storage service
      // and get a URL. For this demo, we'll simulate with a base64 data URL.
      let screenshotUrl = '';
      if (screenshotPreview) {
        screenshotUrl = screenshotPreview;
      }
        
      console.log('About to submit deposit with screenshot length:', screenshotUrl.length);
      console.log('Screenshot URL starts with:', screenshotUrl.substring(0, 50));
      await requestDeposit(Math.floor(val * 100), '', activeMethod.name, screenshotUrl);
      console.log('Deposit submitted successfully');
      addToast('Deposit request submitted with screenshot proof! Admin will verify and credit your account shortly.', 'success');
      setAmount('');
      removeScreenshot();
      onClose();
    } catch (e: any) {
      addToast(e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presets = [500, 1000, 5000, 10000];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manual Deposit">
      <div className="space-y-6">
        {/* Method Selector Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            {methods.filter(m => m.isActive).map((m) => (
                <button
                    key={m.id}
                    onClick={() => { setActiveMethodId(m.id); setHasCopied(false); }}
                    className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeMethodId === m.id ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    {m.name}
                </button>
            ))}
        </div>

        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Target Account Details</div>
                <div className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-black uppercase">Official</div>
            </div>
            
            <div className="space-y-3">
                <div className="flex justify-between items-end border-b border-indigo-100 dark:border-indigo-900/50 pb-2">
                    <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Account Holder</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white uppercase">{activeMethod.accountName}</span>
                    </div>
                </div>
                <div className="flex justify-between items-end">
                    <div>
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Account / Wallet Number</span>
                        <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{activeMethod.accountNumber}</span>
                    </div>
                    <button 
                        onClick={() => handleCopy(activeMethod.accountNumber)}
                        className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all group"
                    >
                        {hasCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400 group-hover:text-indigo-500" />}
                    </button>
                </div>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-relaxed pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                <span className="font-black uppercase text-indigo-600 not-italic mr-1">Steps:</span> {activeMethod.instructions}
            </p>
        </div>
        
        <div className="space-y-4 pt-2">
            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deposit Amount (Rs.)</label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-xl font-black focus:outline-none focus:border-indigo-500 bg-white/50 dark:bg-slate-950 transition-all"
                        placeholder="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300">NPR</div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {presets.map(val => (
                    <button
                        key={val}
                        onClick={() => setAmount(val.toString())}
                        className="py-2.5 text-[9px] font-black bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 rounded-xl transition-all uppercase tracking-widest border border-transparent active:scale-95"
                    >
                        Rs. {val}
                    </button>
                ))}
            </div>

            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Payment Proof Screenshot</label>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleScreenshotUpload}
                    accept="image/*"
                    className="hidden"
                />
                
                {!screenshotPreview ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-12 px-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:border-indigo-500 bg-white/50 dark:bg-slate-950 transition-all flex items-center justify-center gap-2 hover:border-indigo-400"
                    >
                        <Upload size={16} />
                        Upload Screenshot
                    </button>
                ) : (
                    <div className="relative">
                        <div className="border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                            <img 
                                src={screenshotPreview} 
                                alt="Payment proof" 
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Image size={16} className="text-slate-500" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                        {screenshot?.name}
                                    </span>
                                </div>
                                <button 
                                    type="button"
                                    onClick={removeScreenshot}
                                    className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X size={14} className="text-slate-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                    Please upload a clear screenshot of your payment confirmation screen
                </p>
            </div>
        </div>

        <div className="pt-2">
            <Button 
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all" 
                onClick={handleRequest}
                disabled={!amount || parseFloat(amount) <= 0 || !screenshot || isSubmitting}
            >
                {isSubmitting ? 'Processing Request...' : 'Submit Deposit with Proof'}
            </Button>
            <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-[0.1em] mt-4 flex items-center justify-center gap-1.5 opacity-60">
                <ShieldCheck size={12} /> Secure Play-Money Verification • Est. 15-60 min
            </p>
        </div>
      </div>
    </Dialog>
  );
};
