
import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { useApp } from '../context/AppContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from './ui/Toast';
import { ShieldCheck, Info, Copy, Check, Upload, X, Image } from 'lucide-react';
import { DepositMethodConfig } from '../types';

interface DepositDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DepositDialog: React.FC<DepositDialogProps> = ({ isOpen, onClose }) => {
  const { formatMoney } = useCurrency();
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setHasCopied(true);
          addToast('Account number copied to clipboard', 'info');
          setTimeout(() => setHasCopied(false), 2000);
        })
        .catch(() => addToast('Copy failed — clipboard not accessible', 'error'));
    } else {
      addToast('Clipboard requires a secure (HTTPS) connection', 'error');
    }
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
    if (!val || val <= 0) {
      addToast('Please enter a valid deposit amount', 'error');
      return;
    }
    // H6: Minimum deposit validation
    if (val < 100) {
      addToast('Minimum deposit amount is NPR 100', 'error');
      return;
    }
    if (!screenshot) {
      addToast('Please upload a screenshot proof of payment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const screenshotUrl = screenshotPreview ?? '';
      await requestDeposit(Math.floor(val * 100), '', activeMethod.name, screenshotUrl);
      addToast('Deposit request submitted! Admin will verify and credit your account shortly.', 'success');
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
        <div className="flex bg-[#1E2025] rounded-lg p-1 border border-[#22252B]">
            {methods.filter(m => m.isActive).map((m) => (
                <button
                    key={m.id}
                    onClick={() => { setActiveMethodId(m.id); setHasCopied(false); }}
                    className={`flex-1 py-2.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors ${
                      activeMethodId === m.id 
                        ? 'bg-[#00D4AA] text-[#0A0C10]' 
                        : 'text-[#9AA0A6] hover:text-white'
                    }`}
                >
                    {m.name}
                </button>
            ))}
        </div>

        <div className="bg-[#1E2025] border border-[#22252B] rounded-xl p-4 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[#00D4AA] text-xs font-bold uppercase tracking-wide">
                  Target Account Details
                </span>
                <span className="bg-[#00D4AA] text-[#0A0C10] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  OFFICIAL
                </span>
            </div>
            
            <p className="text-[#9AA0A6] text-xs mb-1">Account Holder</p>
            <p className="text-white text-base font-bold mb-3">{activeMethod.accountName}</p>

            <div className="border-t border-[#22252B] pt-3">
                <p className="text-[#9AA0A6] text-xs mb-1">Account / Wallet Number</p>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-mono font-bold break-all">
                        {activeMethod.accountNumber}
                    </p>
                    <button 
                        onClick={() => handleCopy(activeMethod.accountNumber)}
                        className="text-[#9AA0A6] hover:text-[#00D4AA] flex-shrink-0 transition-colors"
                    >
                        {hasCopied ? <Check size={16} className="text-[#00D4AA]" /> : <Copy size={16} />}
                    </button>
                </div>
            </div>

            <p className="text-[#9AA0A6] text-xs mt-3">
                <span className="text-[#00D4AA] font-bold">STEPS:</span> {activeMethod.instructions}
            </p>
        </div>
        
        <div className="space-y-4 pt-2">
            <div>
                <label className="block text-xs font-black text-[#9AA0A6] uppercase tracking-widest mb-2">Deposit Amount</label>
                <div className="bg-[#1E2025] border border-[#22252B] rounded-xl px-4 py-3 flex items-center justify-between">
                    <input 
                        type="number" 
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-transparent text-white text-2xl font-bold outline-none flex-1 w-full"
                        placeholder="0"
                    />
                    <span className="text-[#00D4AA] text-sm font-bold">NPR</span>
                </div>
            </div>

            <div className="flex gap-2 flex-wrap">
                {presets.map(val => (
                    <button
                        key={val}
                        onClick={() => setAmount(val.toString())}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          amount === val.toString()
                            ? 'bg-[#00D4AA]/10 border-[#00D4AA] text-[#00D4AA]'
                            : 'bg-[#1E2025] border-[#22252B] text-[#9AA0A6] hover:border-white hover:text-white'
                        }`}
                    >
                        {formatMoney(val * 100)}
                    </button>
                ))}
            </div>

            <div>
                <label className="block text-xs font-black text-[#9AA0A6] uppercase tracking-widest mb-2">Payment Proof Screenshot</label>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleScreenshotUpload}
                    accept="image/*"
                    className="hidden"
                />
                
                {!screenshotPreview ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[#22252B] rounded-xl py-6 flex flex-col items-center gap-2 hover:border-[#00D4AA] transition-colors cursor-pointer"
                    >
                        <Upload size={24} className="text-[#9AA0A6]" />
                        <span className="text-white text-sm font-medium">Upload Screenshot</span>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="border border-[#22252B] rounded-xl overflow-hidden bg-[#1E2025]">
                            <img 
                                src={screenshotPreview} 
                                alt="Payment proof" 
                                className="w-full h-32 object-cover"
                            />
                            <div className="p-3 border-t border-[#22252B] flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#9AA0A6]">
                                    <Image size={16} />
                                    <span className="text-xs font-medium text-white truncate max-w-[200px]">
                                        {screenshot?.name}
                                    </span>
                                </div>
                                <button 
                                    type="button"
                                    onClick={removeScreenshot}
                                    className="p-1 rounded-full hover:bg-[#22252B] transition-colors"
                                >
                                    <X size={14} className="text-[#9AA0A6] hover:text-white" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <p className="text-[#9AA0A6] text-xs mt-1.5">
                    Please upload a clear screenshot of your payment confirmation screen
                </p>
            </div>
        </div>

        <div className="pt-2">
            <button 
                className="w-full bg-[#00D4AA] text-[#0A0C10] font-bold py-3.5 rounded-xl text-sm uppercase tracking-wide hover:bg-[#00bfa0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                onClick={handleRequest}
                disabled={!amount || parseFloat(amount) <= 0 || !screenshot || isSubmitting}
            >
                {isSubmitting ? 'Processing Request...' : 'Submit Deposit With Proof'}
            </button>
            <p className="text-[#9AA0A6] text-[10px] text-center mt-2 uppercase tracking-wide flex items-center justify-center gap-1.5">
                <ShieldCheck size={12} /> Secure deposit verification • Est. 15-60 min
            </p>
        </div>
      </div>
    </Dialog>
  );
};
