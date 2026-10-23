// Oddara design tokens — Kalshi-inspired dark theme

export const ACCENT = '#00D4AA';
export const PAGE_BG = '#0A0C10';
export const CARD_BG = '#111827';
export const HOVER_BG = '#1F2937';
export const HOVER_BG_ALT = '#1A2235';
export const DIVIDER = '#1F2937';
export const BORDER_SUBTLE = '#374151';

export const TEXT_PRIMARY = '#F9FAFB';
export const TEXT_SECONDARY = '#9CA3AF';
export const TEXT_TERTIARY = '#6B7280';

// Chart line palette (first / second / third outcome)
export const LINE_COLORS = ['#00D4AA', '#3B82F6', '#F59E0B'];

// Per-category accent colors
export const CATEGORY_ACCENTS: Record<string, string> = {
    sports: '#3B82F6',
    politics: '#8B5CF6',
    crypto: '#F59E0B',
    finance: '#10B981',
};

// Resolve a category accent from a free-form label (e.g. "SPORTS", "World Cup")
export const categoryAccent = (label?: string): string => {
    if (!label) return ACCENT;
    const key = label.toLowerCase();
    for (const k of Object.keys(CATEGORY_ACCENTS)) {
        if (key.includes(k)) return CATEGORY_ACCENTS[k];
    }
    return ACCENT;
};
