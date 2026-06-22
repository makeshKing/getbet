import React, { useRef, useState } from 'react';

interface WinCardProps {
  brandName?: string;
  marketTitle: string;
  predictedOutcome: string;
  invested: number;
  won: number;
  currency?: string;
  tagline?: string;
  onClose: () => void;
}

export function WinCard({
  brandName = 'oddara',
  marketTitle,
  predictedOutcome,
  invested,
  won,
  currency = 'NPR',
  tagline = 'Trade What You Know',
  onClose,
}: WinCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const profit = won - invested;

  async function handleDownload() {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);

    try {
      const html2canvasModule = await import(
        /* @vite-ignore */
        'https://esm.sh/html2canvas@1.4.1'
      );
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${brandName}-win.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('Please take a screenshot of your win card to share!');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
      <div
        className="flex flex-col items-center gap-4 w-full"
        style={{ maxWidth: '400px', animation: 'slideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* THE CARD */}
        <div
          ref={cardRef}
          className="w-full relative overflow-hidden"
          style={{
            background: '#0A0D0A',
            border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: '16px',
            padding: '20px 24px',
          }}
        >
          {/* Background glow effect */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: '220px',
              height: '220px',
              background: 'radial-gradient(circle, rgba(0,212,170,0.18) 0%, transparent 65%)',
              transform: 'translate(35%, -35%)',
            }}
          />

          {/* TOP ROW — brand + WIN badge */}
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span style={{
              color: '#00D4AA',
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '-0.02em',
            }}>
              {brandName}
            </span>
            <span style={{
              color: '#00D4AA',
              border: '1px solid #00D4AA',
              borderRadius: '999px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              background: 'rgba(0,212,170,0.08)',
            }}>
              WIN
            </span>
          </div>

          {/* MARKET TITLE */}
          <p className="relative z-10" style={{
            color: '#9AA0A6',
            fontSize: '12px',
            marginBottom: '4px',
          }}>
            {marketTitle}
          </p>

          {/* PREDICTED OUTCOME */}
          <p className="relative z-10" style={{
            fontSize: '14px',
            marginBottom: '20px',
            color: 'rgba(255,255,255,0.6)',
          }}>
            Predicted:{' '}
            <span style={{ color: '#00D4AA', fontWeight: '700' }}>
              {predictedOutcome}
            </span>
          </p>

          {/* NUMBERS ROW */}
          <div className="flex items-end justify-between relative z-10 mb-4">
            {/* Left — Invested */}
            <div>
              <p style={{
                color: '#9AA0A6',
                fontSize: '10px',
                fontWeight: '500',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}>
                Invested
              </p>
              <p style={{
                color: '#FFFFFF',
                fontSize: '18px',
                fontWeight: '500',
              }}>
                {currency} {invested.toLocaleString()}
              </p>
            </div>

            {/* Right — Won (hero number) */}
            <div className="text-right">
              <p style={{
                color: '#9AA0A6',
                fontSize: '10px',
                fontWeight: '500',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '2px',
              }}>
                Won
              </p>
              <p style={{
                color: '#00D4AA',
                fontSize: '44px',
                fontWeight: '900',
                lineHeight: '1',
                letterSpacing: '-0.02em',
              }}>
                {currency} {won.toLocaleString()}
              </p>
            </div>
          </div>

          {/* PROFIT PILL */}
          <div className="relative z-10 mb-5">
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#00D4AA',
              border: '1px solid rgba(0,212,170,0.4)',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '600',
              background: 'rgba(0,212,170,0.06)',
            }}>
              <span style={{ fontSize: '14px' }}>↑</span>
              +{currency} {profit.toLocaleString()} profit
            </span>
          </div>

          {/* BOTTOM ROW — website + tagline */}
          <div className="flex items-center justify-between relative z-10">
            <span style={{ color: '#9AA0A6', fontSize: '11px' }}>
              {brandName}.com
            </span>
            <span style={{ color: '#9AA0A6', fontSize: '11px' }}>
              {tagline}
            </span>
          </div>
        </div>

        {/* ACTION BUTTONS (outside card — not captured in screenshot) */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 bg-[#00D4AA] text-[#0A0C10] font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isDownloading ? 'Saving...' : '↓ Download & Share'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 border border-[#22252B] text-[#9AA0A6] rounded-xl text-sm hover:text-white"
          >
            Close
          </button>
        </div>

        <p className="text-[#9AA0A6] text-xs text-center">
          Share on WhatsApp, Instagram, or Twitter 🎉
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(20px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>
    </div>
  );
}
