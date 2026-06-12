
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
import { useAuth } from '../../context/AuthContext';

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

// Convert a JS Date → the format required by <input type="datetime-local">: "YYYY-MM-DDTHH:mm"
function toDatetimeLocalString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Convert the datetime-local string (local time) to a full ISO 8601 UTC string for storage
function datetimeLocalToISO(value: string): string {
    if (!value) return '';
    // new Date(value) interprets it as local time in modern browsers
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
}

export const AdminMarketCreate: React.FC<AdminMarketCreateProps> = ({ onBack }) => {
    const { addToast } = useToast();
    const { adminCreateMarket, categories, adminCreateCategory } = useApp();
    const { isAdmin } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const candAFileInputRef = useRef<HTMLInputElement>(null);
    const candBFileInputRef = useRef<HTMLInputElement>(null);

    // Minimum selectable datetime = now (no past deadlines)
    const nowString = toDatetimeLocalString(new Date());

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

    // New Category Modal state
    const [showNewCatModal, setShowNewCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#6366f1');
    const [newCatIcon, setNewCatIcon] = useState('Tag');
    const [creatingCat, setCreatingCat] = useState(false);

    const CAT_ICON_OPTIONS = [
        'Landmark', 'Bitcoin', 'Trophy', 'FlaskConical', 'BarChart3',
        'TrendingUp', 'Music', 'Globe2', 'Zap', 'Star', 'Flame',
        'Heart', 'Shield', 'Target', 'Rocket', 'Crown', 'Tag'
    ];

    const handleCategoryChange = (value: string) => {
        if (value === '__new__') {
            setShowNewCatModal(true);
        } else {
            setCategory(value);
        }
    };

    const handleCreateNewCategory = async () => {
        if (!newCatName.trim()) { addToast('Category name is required', 'error'); return; }
        setCreatingCat(true);
        try {
            const created = await adminCreateCategory(newCatName.trim(), newCatIcon, newCatColor);
            setCategory(created.name);
            setShowNewCatModal(false);
            setNewCatName('');
            setNewCatColor('#6366f1');
            setNewCatIcon('Tag');
            addToast(`Category "${created.name}" created and selected!`, 'success');
        } catch (err: any) {
            addToast('Error creating category: ' + err.message, 'error');
        } finally {
            setCreatingCat(false);
        }
    };

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

    const distributeEvenly = (currentOutcomes: typeof outcomes) => {
        const count = currentOutcomes.length;
        const baseProb = Math.floor(100 / count);
        let remainder = 100 - (baseProb * count);
        
        return currentOutcomes.map((o) => {
            const prob = baseProb + (remainder > 0 ? 1 : 0);
            remainder--;
            return { ...o, probability: prob };
        });
    };

    const addOutcome = () => {
        const id = 'o' + Math.random().toString(36).substr(2, 5);
        const newOutcomes = [...outcomes, { id, name: `Outcome ${outcomes.length + 1}`, probability: 0, color: '#64748b' }];
        setOutcomes(distributeEvenly(newOutcomes));
    };

    const removeOutcome = (id: string) => {
        if (outcomes.length <= 2) {
            addToast('Minimum 2 outcomes required', 'error');
            return;
        }
        const newOutcomes = outcomes.filter(o => o.id !== id);
        setOutcomes(distributeEvenly(newOutcomes));
    };

    const updateOutcome = (id: string, field: keyof typeof outcomes[0], value: any) => {
        setOutcomes(outcomes.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    // Template Logic
    const applyTemplate = (type: 'election' | 'trump-vs-melania' | 'crypto' | 'sports') => {
        const now = new Date();

        // Default deadline: 1 month from now (always in the future)
        const oneMonth = new Date(now);
        oneMonth.setMonth(now.getMonth() + 1);
        const oneMonthStr = toDatetimeLocalString(oneMonth);

        // Vs template deadline: 2 weeks from now
        const twoWeeks = new Date(now);
        twoWeeks.setDate(now.getDate() + 14);
        const twoWeeksStr = toDatetimeLocalString(twoWeeks);

        switch (type) {
            case 'election':
                setIsVsMode(false);
                setTitle('Will [Candidate Name] win the upcoming General Election?');
                setCategory('Politics');
                setSubcategory('Elections');
                setDescription('This market resolves to YES if the specified candidate wins the majority of votes or is declared the winner by the official Election Commission. This follows standard electoral guidelines.');
                setResolutionSource('Official Election Commission Website & AP Projections');
                setEndDate(oneMonthStr);
                setImageUrl('https://images.unsplash.com/photo-1541872703-74c5e443d1f9?q=80&w=400&h=200&auto=format&fit=crop');
                break;
            case 'trump-vs-melania':
                setIsVsMode(true);
                setTitle('Trump vs Melania: Who wins the Electoral Count?');
                setCategory('Politics');
                setSubcategory('Head-to-Head');
                setDescription('This market resolves to YES if Donald Trump secures more votes/points than Melania Trump in the official specified event poll.');
                setResolutionSource('Associated Press (AP)');
                setEndDate(twoWeeksStr);
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
                setEndDate(oneMonthStr);
                setImageUrl('https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=400&h=200&auto=format&fit=crop');
                break;
            case 'sports':
                setIsVsMode(false);
                setTitle('Will [Team A] beat [Team B] in the upcoming tournament final?');
                setCategory('Sports');
                setSubcategory('Tournament');
                setDescription('Market resolves based on the official final score including overtime.');
                setResolutionSource('ESPN / Official League Website');
                setEndDate(oneMonthStr);
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

    const handleCandAFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            addToast('Please select a valid image file', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setCandAImg(event.target.result as string);
                addToast('Candidate A image uploaded', 'success');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleCandBFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            addToast('Please select a valid image file', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setCandBImg(event.target.result as string);
                addToast('Candidate B image uploaded', 'success');
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

        // Validate the deadline is in the future
        const closeDateISO = datetimeLocalToISO(endDate);
        if (!closeDateISO) {
            addToast('Invalid deadline date. Please select a valid date and time.', 'error');
            return;
        }
        if (new Date(closeDateISO) <= new Date()) {
            addToast('Deadline must be in the future.', 'error');
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
            if (outcomes.some(o => !o.name.trim())) {
                addToast('All outcomes must have a name.', 'error');
                return;
            }
            const totalProb = outcomes.reduce((sum, o) => sum + Number(o.probability), 0);
            if (totalProb !== 100) {
                addToast(`Total probability must equal 100%. Currently it is ${totalProb}%.`, 'error');
                return;
            }
        }

        // Convert startDate from datetime-local → ISO UTC as well (if provided)
        const startDateISO = startDate ? datetimeLocalToISO(startDate) : new Date().toISOString();

        try {
            await adminCreateMarket({
                title, slug, category,
                subcategory: isVsMode ? 'Head-to-Head' : (isMultiOutcome ? 'Multi Choice' : subcategory),
                description,
                startDate: startDateISO,
                closeDate: closeDateISO,   // ← proper UTC ISO string
                resolutionSource, imageUrl,
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
        <>
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
                        <div className="py-6 sm:py-8 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-[2rem] border-2 border-indigo-100 dark:border-indigo-900/30 px-4 sm:px-8 mb-8 animate-fade-in-up">
                            <div className="flex items-center gap-4 mb-6 sm:mb-8">
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
                                    <div key={outcome.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center animate-fade-in p-3 sm:p-0 bg-white dark:bg-slate-900/40 sm:bg-transparent rounded-2xl sm:rounded-none border border-slate-200 dark:border-slate-800 sm:border-none">
                                        <div className="flex items-center justify-between w-full sm:w-auto mb-2 sm:mb-0">
                                            <div className="flex-none p-2 sm:p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-black text-slate-500 w-10 sm:w-12 text-center">
                                                #{index + 1}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeOutcome(outcome.id)}
                                                className="p-2 sm:hidden text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-900"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4">
                                            <div className="col-span-2 sm:col-span-6">
                                                <input
                                                    type="text"
                                                    placeholder="Outcome Name"
                                                    value={outcome.name}
                                                    onChange={(e) => updateOutcome(outcome.id, 'name', e.target.value)}
                                                    className="w-full bg-slate-50 sm:bg-white dark:bg-slate-950 sm:dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div className="col-span-1 sm:col-span-3">
                                                <input
                                                    type="number"
                                                    placeholder="Prob %"
                                                    value={outcome.probability}
                                                    onChange={(e) => updateOutcome(outcome.id, 'probability', Number(e.target.value))}
                                                    className="w-full bg-slate-50 sm:bg-white dark:bg-slate-950 sm:dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none tabular-nums"
                                                />
                                            </div>
                                            <div className="col-span-1 sm:col-span-3 flex items-center gap-2 sm:gap-4">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={outcome.color}
                                                        onChange={(e) => updateOutcome(outcome.id, 'color', e.target.value)}
                                                        className="w-full pl-10 bg-slate-50 sm:bg-white dark:bg-slate-950 sm:dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono"
                                                    />
                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: outcome.color }} />
                                                    <input
                                                        type="color"
                                                        value={outcome.color}
                                                        onChange={(e) => updateOutcome(outcome.id, 'color', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOutcome(outcome.id)}
                                                    className="hidden sm:block p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 px-2 gap-4 sm:gap-0">
                                <div className="text-sm font-bold text-slate-500 w-full sm:w-auto text-center sm:text-left">
                                    Total Probability: <span className={outcomes.reduce((s, o) => s + Number(o.probability), 0) === 100 ? 'text-emerald-500' : 'text-red-500'}>{outcomes.reduce((s, o) => s + Number(o.probability), 0)}%</span>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setOutcomes(distributeEvenly(outcomes))}
                                    className="w-full sm:w-auto text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-500 transition-colors bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-lg"
                                >
                                    Distribute Evenly
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={addOutcome}
                                className="mt-4 w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-400 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all hover:bg-white dark:hover:bg-slate-800"
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
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={candAImg}
                                                onChange={e => setCandAImg(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="https://..."
                                            />
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="px-4"
                                                onClick={() => candAFileInputRef.current?.click()}
                                                title="Upload Image"
                                            >
                                                <Upload size={16} />
                                            </Button>
                                            <input type="file" ref={candAFileInputRef} className="hidden" accept="image/*" onChange={handleCandAFileChange} />
                                        </div>
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
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={candBImg}
                                                onChange={e => setCandBImg(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="https://..."
                                            />
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="px-4"
                                                onClick={() => candBFileInputRef.current?.click()}
                                                title="Upload Image"
                                            >
                                                <Upload size={16} />
                                            </Button>
                                            <input type="file" ref={candBFileInputRef} className="hidden" accept="image/*" onChange={handleCandBFileChange} />
                                        </div>
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
                                onChange={e => handleCategoryChange(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {categories.length > 0 ? (
                                    categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))
                                ) : (
                                    // Fallback if categories table not yet seeded
                                    <>
                                        <option value="Politics">Politics</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Stock Market">Stock Market</option>
                                        <option value="Crypto">Crypto</option>
                                        <option value="Culture">Culture</option>
                                    </>
                                )}
                                <option value="__new__" className="font-black text-indigo-600">+ Add New Category...</option>
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

                    <FormRow label="Deadline" helper="When does betting stop? Market auto-locks at this time.">
                        <div className="space-y-3">
                            <input
                                type="datetime-local"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                value={endDate}
                                min={nowString}
                                onChange={e => setEndDate(e.target.value)}
                                required
                            />
                            {endDate ? (
                                (() => {
                                    const parsed = new Date(endDate);
                                    const isValid = !isNaN(parsed.getTime());
                                    const isPast = isValid && parsed <= new Date();
                                    return (
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border ${
                                            isPast
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600'
                                                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700'
                                        }`}>
                                            <span className="text-base">{isPast ? '⚠️' : '🔒'}</span>
                                            <span>
                                                {isPast
                                                    ? 'This deadline is in the past — please select a future date.'
                                                    : `Market locks: ${parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (your local time)`
                                                }
                                            </span>
                                        </div>
                                    );
                                })()
                            ) : (
                                <p className="text-xs text-slate-400 italic px-1">No deadline set — please pick a date and time above.</p>
                            )}
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

        {/* ── New Category Modal ─────────────────────────────────────────── */}
        {showNewCatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCatModal(false)}>
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <div
                    className="relative bg-white dark:bg-[#1a1d26] rounded-[2rem] border border-slate-200 dark:border-[#2d3342] shadow-2xl p-8 w-full max-w-md animate-fade-in-up"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-2xl">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">New Category</h3>
                            <p className="text-xs text-slate-500 mt-0.5">It will be saved and auto-selected</p>
                        </div>
                        <button onClick={() => setShowNewCatModal(false)} className="ml-auto p-2 text-slate-400 hover:text-slate-600 rounded-xl">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Name *</label>
                            <input
                                type="text"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="e.g. Entertainment"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreateNewCategory()}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Icon</label>
                                <select
                                    value={newCatIcon}
                                    onChange={e => setNewCatIcon(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                >
                                    {CAT_ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Accent Color</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newCatColor}
                                        onChange={e => setNewCatColor(e.target.value)}
                                        className="w-full pl-9 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: newCatColor }} />
                                    <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleCreateNewCategory}
                            disabled={creatingCat || !newCatName.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            {creatingCat ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                            Create & Select
                        </button>
                        <button
                            onClick={() => setShowNewCatModal(false)}
                            className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>);
};
