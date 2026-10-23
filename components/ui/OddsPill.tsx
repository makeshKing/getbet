import React from 'react';
import { Check } from 'lucide-react';

interface OddsPillProps {
    probability: number;
    color: string;
    isWinning?: boolean;
    className?: string;
    variant?: 'pill' | 'plain';
}

export const OddsPill: React.FC<OddsPillProps> = ({ 
    probability, 
    color, 
    isWinning = false, 
    className = '',
    variant = 'pill'
}) => {
    // Increase padding, bump font-weight to bold, increase font size to text-sm
    const baseClasses = variant === 'plain'
        ? `inline-flex items-center justify-center font-bold text-[17px] md:text-[20px] ${className}`
        : `inline-flex items-center justify-center rounded-full border transition-all duration-150 font-bold px-3 py-1 text-sm shrink-0 min-w-[3.5rem] ${className}`;
    
    if (isWinning && variant !== 'plain') {
        return (
            <span 
                className={baseClasses}
                style={{ backgroundColor: color, color: '#0A0C10', borderColor: color }}
            >
                <Check size={16} />
            </span>
        );
    }
    
    return (
        <span 
            className={baseClasses}
            style={variant === 'plain' ? { color: '#ffffff' } : { color: color, borderColor: color }}
        >
            {Math.round(probability)}%
        </span>
    );
};
