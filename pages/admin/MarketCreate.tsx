
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft, Upload, CloudUpload, Bold, Italic, Underline,
    List, Link as LinkIcon, Image as ImageIcon, AlignLeft,
    AlignCenter, AlignRight, Type, Strikethrough, Code, Quote, X,
    Vote, Zap, Trophy, TrendingUp, Users, Swords, Palette, Plus, Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';

interface AdminMarketCreateProps {
    onBack: () => void;
}

const FormRow = ({
    label,
    helper,
    children
}: {
    label: string,
    helper?: string,
    children?: React.ReactNode
}) => (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 border-b border-slate-100 dark:border-[#2d3342] last:border-0">
        <div className="md:col-span-4 lg:col-span-3">
            <label className="block text-sm font-bold text-slate-900 dark:text-[#f5f9fc] mb-1">{label}</label>
            {helper && <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
        </div>
        <div className="md:col-span-8 lg:col-span-9">
            {children}
        </div>
    </div>
);

export const AdminMarketCreate: React.FC<AdminMarketCreateProps> = ({ onBack }) => {
    const { addToast } = useToast();
    const { adminCreateMarket } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mode State
    const [isVsMode, setIsVsMode] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [resolutionSource, setResolutionSource] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [initProb, setInitProb] = useState(50);
    const [commission, setCommission] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Versus specific state
    const [candAName, setCandAName] = useState('');
    const [candAImg, setCandAImg] = useState('');
    const [candAColor, setCandAColor] = useState('#3b82f6');

    const [candBName, setCandBName] = useState('');
    const [candBImg, setCandBImg] = useState('');
    const [candBColor, setCandBColor] = useState('#ef4444');

    // Multi-Outcome specific state
    const [isMultiOutcome, setIsMultiOutcome] = useState(false);
    const [outcomes, setOutcomes] = useState<{ id: string, name: string, probability: number, color: string }[]>([
        { id: 'o1', name: 'Outcome 1', probability: 50, color: '#3b82f6' },
        { id: 'o2', name: 'Outcome 2', probability: 50, color: '#ef4444' }
    ]);

    const addOutcome = () => {
        const id = 'o' + Math.random().toString(36).substr(2, 5);
        setOutcomes([...outcomes, { id, name: `Outcome ${outcomes.length + 1}`, probability: 0, color: '#64748b' }]);
    };

    const removeOutcome = (id: string) => {
        if (outcomes.length <= 2) {
            addToast('Minimum 2 outcomes required', 'error');
            return;
        }
        setOutcomes(outcomes.filter(o => o.id !== id));
    };

    const updateOutcome = (id: string, field: keyof typeof outcomes[0], value: any) => {
        setOutcomes(outcomes.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    // Template Logic
    const applyTemplate = (type: 'election' | 'trump-vs-melania' | 'crypto' | 'sports') => {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setMonth(now.getMonth() + 1);
        const dateStr = futureDate.toISOString().slice(0, 16);

        switch (type) {
            case 'election':
                setIsVsMode(false);
                setTitle('Will [Candidate Name] win the upcoming General Election?');
                setCategory('Politics');
                setSubcategory('Elections');
                setDescription('This market resolves to YES if the specified candidate wins the majority of votes or is declared the winner by the official Election Commission. This follows standard electoral guidelines.');
                setResolutionSource('Official Election Commission Website & AP Projections');
                setEndDate(dateStr);
                setImageUrl('https://images.unsplash.com/photo-1541872703-74c5e443d1f9?q=80&w=400&h=200&auto=format&fit=crop');
                break;
            case 'trump-vs-melania':
                setIsVsMode(true);
                setTitle('Trump vs Melania: Who wins the Electoral Count?');
                setCategory('Politics');
                setSubcategory('Head-to-Head');
                setDescription('This market resolves to YES if Donald Trump secures more votes/points than Melania Trump in the official specified event poll.');
                setResolutionSource('Associated Press (AP)');
                setEndDate('2024-11-05T20:00');
                setImageUrl('https://images.unsplash.com/photo-1523995462485-3d171b5c8fa9?q=80&w=400&h=200&auto=format&fit=crop');
                setCandAName('Donald Trump');
                setCandAImg('https://picsum.photos/200?random=trump');
                setCandAColor('#ef4444');
                setCandBName('Melania Trump');
                setCandBImg('https://picsum.photos/200?random=melania');
                setCandBColor('#3b82f6');
                break;
            case 'crypto':
                setIsVsMode(false);
                setTitle('Will Bitcoin (BTC) price stay above $[Target] until the end of the month?');
                setCategory('Crypto');
                setSubcategory('Bitcoin');
                setDescription('Resolves based on the closing price of Bitcoin as reported by major exchanges.');
                setResolutionSource('Binance / CoinGecko Daily Close');
                setEndDate(dateStr);
                setImageUrl('https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=400&h=200&auto=format&fit=crop');
                break;
            case 'sports':
                setIsVsMode(false);
                setTitle('Will [Team A] beat [Team B] in the upcoming tournament final?');
                setCategory('Sports');
                setSubcategory('Tournament');
                setDescription('Market resolves based on the official final score including overtime.');
                setResolutionSource('ESPN / Official League Website');
                setEndDate(dateStr);
                setImageUrl('https://picsum.photos/400/200?random=sports');
                break;
        }
        addToast(`${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')} template applied!`, 'success');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            addToast('Please select a valid image file', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setImageUrl(event.target.result as string);
                addToast('Image uploaded successfully', 'success');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !category || !endDate || !resolutionSource) {
            addToast('Please fill in all required fields.', 'error');
            return;
        }

        if (isVsMode && (!candAName || !candBName)) {
            addToast('Please provide names for both candidates in VS mode.', 'error');
            return;
        }

        if (isMultiOutcome) {
            if (outcomes.length < 2) {
                addToast('Multi-outcome markets need at least 2 options.', 'error');
                return;
            }
            if (outcomes.some(o => !o.name)) {
                addToast('All outcomes must have a name.', 'error');
                return;
            }
        }

        try {
            await adminCreateMarket({
                title, slug, category, subcategory: isVsMode ? 'Head-to-Head' : (isMultiOutcome ? 'Multi Choice' : subcategory), description,
                startDate: startDate || new Date().toISOString(),
                closeDate: endDate, resolutionSource, imageUrl,
                probability: Number(initProb), commission: Number(commission),
                candidateA: isVsMode ? { name: candAName, imageUrl: candAImg || imageUrl, color: candAColor } : undefined,
                candidateB: isVsMode ? { name: candBName, imageUrl: candBImg || imageUrl, color: candBColor } : undefined,
                outcomes: isMultiOutcome ? outcomes : undefined
            });
            addToast('Market created successfully!', 'success');
            onBack();
        } catch (err: any) {
            addToast('Error creating market: ' + err.message, 'error');
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-[#f5f9fc] uppercase tracking-tight">Create Market</h1>
                    <p className="text-sm text-slate-500 mt-1">Configure your bet parameters or use a high-engagement template.</p>
                </div>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
            </div>

            {/* Quick Template Picker */}
            <div className="bg-indigo-600/5 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-6 rounded-[2rem] mb-8">
                <h3 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Quick Templates (Easy Create)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        onClick={() => applyTemplate('election')}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                    >
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl group-hover:scale-110 transition-transform"><Vote size={20} /></div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Generic Election</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">Standard Layout</div>
                        </div>
                    </button>
                    <button
                        onClick={() => applyTemplate('trump-vs-melania')}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border-indigo-500/30 dark:border-indigo-500/30 bg-indigo-50/10 dark:bg-indigo-900/10 border-2 hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                    >
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><Users size={20} /></div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Trump vs Melania</div>
                            <div className="text-[9px] text-indigo-600 font-black uppercase">Versus Layout</div>
                        </div>
                    </button>
                    <button
                        onClick={() => applyTemplate('crypto')}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                    >
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl group-hover:scale-110 transition-transform"><Zap size={20} /></div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Crypto Spike</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">Standard Layout</div>
                        </div>
                    </button>
                    <button
                        onClick={() => applyTemplate('sports')}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:shadow-lg transition-all text-left group"
                    >
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><Trophy size={20} /></div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">Sports Final</div>
                            <div className="text-[9px] text-slate-500 uppercase font-black">Standard Layout</div>
                        </div>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1a1d26] rounded-[2.5rem] border border-slate-200 dark:border-[#2d3342] shadow-sm p-8 sm:p-12">
                <form onSubmit={handleSubmit}>

                    <FormRow label="Market Layout" helper="Choose between standard and battle mode">
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => { setIsVsMode(false); setIsMultiOutcome(false); }}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isVsMode && !isMultiOutcome ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                            >
                                Standard
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsVsMode(true); setIsMultiOutcome(false); }}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isVsMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}
                            >
                                <Swords size={14} /> Versus
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsVsMode(false); setIsMultiOutcome(true); }}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isMultiOutcome ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500'}`}
                            >
                                <List size={14} /> Multi Choice
                            </button>
                        </div>
                    </FormRow>

                    {/* Multi-Outcome Configuration Section */}
                    {isMultiOutcome && (
                        <div className="py-8 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/30 px-8 mb-8 animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                                    <List size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Outcomes Configuration</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Define all possible winning outcomes</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {outcomes.map((outcome, index) => (
                                    <div key={outcome.id} className="flex gap-4 items-start animate-fade-in">
                                        <div className="flex-none p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-black text-slate-500 w-12 text-center">
                                            #{index + 1}
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="col-span-1 md:col-span-6">
                                                <input
                                                    type="text"
                                                    placeholder="Outcome Name"
                                                    value={outcome.name}
                                                    onChange={(e) => updateOutcome(outcome.id, 'name', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-3">
                                                <input
                                                    type="number"
                                                    placeholder="Prob %"
                                                    value={outcome.probability}
                                                    onChange={(e) => updateOutcome(outcome.id, 'probability', Number(e.target.value))}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-3 flex items-center gap-4">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={outcome.color}
                                                        onChange={(e) => updateOutcome(outcome.id, 'color', e.target.value)}
                                                        className="w-full pl-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                                                    />
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: outcome.color }} />
                                                    <input
                                                        type="color"
                                                        value={outcome.color}
                                                        onChange={(e) => updateOutcome(outcome.id, 'color', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOutcome(outcome.id)}
                                                    className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={addOutcome}
                                className="mt-6 w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all hover:bg-white dark:hover:bg-slate-800"
                            >
                                <Plus size={16} /> Add Another Outcome
                            </button>
                        </div>
                    )}

                    {/* VS Mode Configuration Section */}
                    {isVsMode && (
                        <div className="py-8 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/30 px-8 mb-8 animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                                    <Swords size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Versus Configuration</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Setup the head-to-head battle participants</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
                                {/* Separator VS */}
                                <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-indigo-600 text-white items-center justify-center font-black text-sm shadow-xl z-10 border-4 border-white dark:border-slate-800">
                                    VS
                                </div>

                                {/* Candidate A (YES) */}
                                <div className="space-y-6 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">YES Option</span>
                                        <div className="flex items-center gap-2">
                                            <Palette size={14} className="text-slate-400" />
                                            <input type="color" value={candAColor} onChange={e => setCandAColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Participant A Name</label>
                                        <input
                                            type="text"
                                            value={candAName}
                                            onChange={e => setCandAName(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. Donald Trump"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avatar URL (Candidate A)</label>
                                        <input
                                            type="text"
                                            value={candAImg}
                                            onChange={e => setCandAImg(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>

                                {/* Candidate B (NO) */}
                                <div className="space-y-6 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full">NO Option</span>
                                        <div className="flex items-center gap-2">
                                            <Palette size={14} className="text-slate-400" />
                                            <input type="color" value={candBColor} onChange={e => setCandBColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Participant B Name</label>
                                        <input
                                            type="text"
                                            value={candBName}
                                            onChange={e => setCandBName(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. Kamala Harris"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Avatar URL (Candidate B)</label>
                                        <input
                                            type="text"
                                            value={candBImg}
                                            onChange={e => setCandBImg(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="https://..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <FormRow label="Market Banner" helper="Main thumbnail for the market card">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-full h-[220px] border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-3xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-slate-100 dark:hover:bg-slate-800 group">
                                {imageUrl ? (
                                    <>
                                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="bg-white text-slate-900 px-6 py-2 rounded-xl text-sm font-bold">Change Image</div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setImageUrl(''); }} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600"><X size={16} /></button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <CloudUpload size={40} className="text-slate-400 mb-3" />
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Click to upload or drag & drop</p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                    </FormRow>

                    <FormRow label="Category" helper="The main grouping for this bet">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <select
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                <option value="Politics">Politics</option>
                                <option value="Sports">Sports</option>
                                <option value="Stock Market">Stock Market</option>
                                <option value="Crypto">Crypto</option>
                                <option value="Culture">Culture</option>
                            </select>
                            <input
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                placeholder="Subcategory (e.g. US Elections)"
                                value={subcategory}
                                onChange={e => setSubcategory(e.target.value)}
                            />
                        </div>
                    </FormRow>

                    <FormRow label="Bet Title" helper="The specific question users are predicting">
                        <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-black"
                            placeholder="e.g. Will [Name] win the election?"
                            value={title}
                            onChange={e => {
                                setTitle(e.target.value);
                                if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                            }}
                        />
                    </FormRow>

                    <FormRow label="Resolution Source" helper="Where to verify the outcome">
                        <input
                            type="text"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                            placeholder="e.g. Associated Press Official Results"
                            value={resolutionSource}
                            onChange={e => setResolutionSource(e.target.value)}
                        />
                    </FormRow>

                    <FormRow label="Deadlines" helper="When does the betting stop?">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input
                                type="datetime-local"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-xs text-slate-500 italic font-bold">
                                Note: Market will auto-lock for orders at this time.
                            </div>
                        </div>
                    </FormRow>

                    <FormRow label="Rules / Description" helper="Detailed breakdown of the bet resolution">
                        <textarea
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-2xl px-4 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px] text-sm leading-relaxed font-medium"
                            placeholder="Explain exactly how this market resolves..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </FormRow>

                    <div className="py-6">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline"
                        >
                            {showAdvanced ? 'Hide Market Settings' : 'Market Parameters (Advanced)'}
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Initial Prob (%)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black"
                                        value={initProb}
                                        onChange={e => setInitProb(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">House Commission (%)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black"
                                        value={commission}
                                        onChange={e => setCommission(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-4 text-base font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">Launch New Market</Button>
                        <Button type="button" variant="outline" className="px-8 text-xs font-black uppercase tracking-widest" onClick={() => {
                            setTitle(''); setDescription(''); setCategory(''); setSubcategory(''); setResolutionSource(''); setImageUrl('');
                            setIsVsMode(false); setIsMultiOutcome(false); setCandAName(''); setCandBName('');
                        }}>Reset Form</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
