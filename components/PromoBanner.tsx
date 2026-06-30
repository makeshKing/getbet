import React, { useRef, useEffect, useState } from 'react';
import { Market } from '../types';
import { X } from 'lucide-react';
import { ACCENT, PAGE_BG, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '../lib/theme';

interface PromoBannerProps {
    featuredMarket?: Market;
    onClick?: (id: string) => void;
}

const PromoBanner: React.FC<PromoBannerProps> = ({ featuredMarket, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dismissed, setDismissed] = useState(false);

    // Rotating torus particle cluster — teal (#00D4AA)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = 200, H = 160;
        const R = 34, r = 12;

        // Generate points on a torus surface
        const points: { x: number; y: number; z: number }[] = [];
        const U = 26, V = 14;
        for (let i = 0; i < U; i++) {
            for (let j = 0; j < V; j++) {
                const u = (i / U) * Math.PI * 2;
                const v = (j / V) * Math.PI * 2;
                points.push({
                    x: (R + r * Math.cos(v)) * Math.cos(u),
                    y: (R + r * Math.cos(v)) * Math.sin(u),
                    z: r * Math.sin(v),
                });
            }
        }

        let A = 0.5, B = 0;
        let raf = 0;
        const K = 200;

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            const cosA = Math.cos(A), sinA = Math.sin(A);
            const cosB = Math.cos(B), sinB = Math.sin(B);

            const projected = points.map((p) => {
                const y1 = p.y * cosA - p.z * sinA;
                const z1 = p.y * sinA + p.z * cosA;
                const x2 = p.x * cosB + z1 * sinB;
                const z2 = -p.x * sinB + z1 * cosB;
                const depth = z2 + K + R + r;
                const scale = K / depth;
                return {
                    sx: W / 2 + x2 * scale,
                    sy: H / 2 + y1 * scale,
                    z: z2,
                };
            });

            projected.sort((a, b) => a.z - b.z);

            for (const pt of projected) {
                const norm = (pt.z + R + r) / (2 * (R + r));
                const alpha = 0.2 + 0.8 * Math.max(0, Math.min(1, norm));
                const size = 1 + 1.6 * Math.max(0, Math.min(1, norm));
                ctx.beginPath();
                ctx.arc(pt.sx, pt.sy, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 212, 170, ${alpha.toFixed(3)})`;
                ctx.fill();
            }

            A += 0.012;
            B += 0.018;
            raf = requestAnimationFrame(draw);
        };

        draw();
        return () => cancelAnimationFrame(raf);
    }, []);

    if (dismissed) return null;

    const headline = featuredMarket ? featuredMarket.title : 'Intro to Perpetuals';
    const body = featuredMarket
        ? (featuredMarket.description || `Trade now on ${featuredMarket.title}.`)
        : 'Trade with leverage, go long or short, and keep positions open with no expiration. 0% fees for a limited time.';
    const cta = featuredMarket ? 'Trade Now' : 'Get started';

    return (
        <div
            className="relative bg-[#111827] rounded-xl p-5 flex flex-col overflow-hidden cursor-pointer"
            onClick={() => featuredMarket && onClick && onClick(featuredMarket.id)}
        >
            {/* Close button */}
            <button
                type="button"
                className="absolute top-3 right-3 z-20 transition-colors duration-150 hover:text-[#F9FAFB]"
                style={{ color: TEXT_TERTIARY }}
                onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
                aria-label="Dismiss"
            >
                <X size={20} />
            </button>

            {/* Animated torus canvas */}
            <div className="flex justify-center mb-4 mt-1">
                <canvas
                    ref={canvasRef}
                    width={200}
                    height={160}
                    className="block"
                    style={{ width: 200, height: 160 }}
                />
            </div>

            {/* Headline */}
            <h3 className="text-[18px] font-bold mb-2 leading-tight line-clamp-2" style={{ color: TEXT_PRIMARY }}>
                {headline}
            </h3>

            {/* Body */}
            <p className="text-[13px] leading-relaxed mb-5 line-clamp-2" style={{ color: TEXT_SECONDARY }}>
                {body}
            </p>

            {/* CTA */}
            <button
                type="button"
                className="w-full h-11 rounded-lg font-bold transition-[filter] duration-150 hover:brightness-110"
                style={{ background: ACCENT, color: PAGE_BG }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (featuredMarket && onClick) onClick(featuredMarket.id);
                }}
            >
                {cta}
            </button>
        </div>
    );
};

export { PromoBanner };
