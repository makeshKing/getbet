
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft, Upload, CloudUpload, Bold, Italic, Underline,
    List, Link as LinkIcon, Image as ImageIcon, AlignLeft,
    AlignCenter, AlignRight, Type, Strikethrough, Code, Quote, X,
    Vote, Zap, Trophy, TrendingUp, Users, Swords, Palette, Plus, Trash2, Pencil
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { MarketTemplate, Market } from '../../types';
import { FeaturedMarketCard } from '../../components/FeaturedMarketCard';
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
    const { 
        adminCreateMarket, categories, adminCreateCategory,
        marketTemplates, adminCreateMarketTemplate, adminUpdateMarketTemplate, adminDeleteMarketTemplate
    } = useApp();
    const { isAdmin } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const candAFileInputRef = useRef<HTMLInputElement>(null);
    const candBFileInputRef = useRef<HTMLInputElement>(null);

    // Minimum selectable datetime = now (no past deadlines)
    const nowString = toDatetimeLocalString(new Date());

    // Template Editor State
    const [editingTemplate, setEditingTemplate] = useState<MarketTemplate | 'new' | null>(null);

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
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

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

    const addOutcome = () => {
        const id = 'o' + Math.random().toString(36).substr(2, 5);
        const newOutcomes = [...outcomes, { id, name: `Outcome ${outcomes.length + 1}`, probability: 0, color: '#64748b' }];
        setOutcomes(newOutcomes);
    };

    const removeOutcome = (id: string) => {
        if (outcomes.length <= 2) {
            addToast('Minimum 2 outcomes required', 'error');
            return;
        }
        const newOutcomes = outcomes.filter(o => o.id !== id);
        setOutcomes(newOutcomes);
    };

    const updateOutcome = (id: string, field: keyof typeof outcomes[0], value: any) => {
        setOutcomes(outcomes.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    // Template Logic
    const applyTemplateFromDb = (template: MarketTemplate) => {
        const now = new Date();

        // Default deadline: 1 month from now (always in the future)
        const oneMonth = new Date(now);
        oneMonth.setMonth(now.getMonth() + 1);
        const oneMonthStr = toDatetimeLocalString(oneMonth);

        // Vs template deadline: 2 weeks from now
        const twoWeeks = new Date(now);
        twoWeeks.setDate(now.getDate() + 14);
        const twoWeeksStr = toDatetimeLocalString(twoWeeks);

        if (template.layout === 'VERSUS') {
            setIsVsMode(true);
            setIsMultiOutcome(false);
            setEndDate(twoWeeksStr);
        } else if (template.layout === 'MULTI_CHOICE') {
            setIsMultiOutcome(true);
            setIsVsMode(false);
            setEndDate(oneMonthStr);
        } else {
            setIsVsMode(false);
            setIsMultiOutcome(false);
            setEndDate(oneMonthStr);
        }

        setTitle(template.titleTemplate || '');
        setCategory(template.category || '');
        setSubcategory(template.subcategory || '');
        setDescription(template.rulesTemplate || '');
        setResolutionSource(template.resolutionSourceTemplate || '');
        setImageUrl(template.iconUrl || '');

        if (template.defaultOutcomes) {
            if (template.layout === 'VERSUS' && !Array.isArray(template.defaultOutcomes)) {
                const config = template.defaultOutcomes as any;
                if (config.candidateA) {
                    setCandAName(config.candidateA.name || '');
                    setCandAImg(config.candidateA.imageUrl || '');
                    setCandAColor(config.candidateA.color || '#ef4444');
                }
                if (config.candidateB) {
                    setCandBName(config.candidateB.name || '');
                    setCandBImg(config.candidateB.imageUrl || '');
                    setCandBColor(config.candidateB.color || '#3b82f6');
                }
            } else if (template.layout === 'MULTI_CHOICE' && Array.isArray(template.defaultOutcomes)) {
                setOutcomes(template.defaultOutcomes);
            }
        }

        addToast(`Template "${template.name}" applied!`, 'success');
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

    // Validation
    const isTitleValid = title.trim().length > 0 && title.length <= 120;
    const isResSourceValid = resolutionSource.trim().length > 0;
    const parsedEndDate = new Date(endDate);
    const isEndDateValid = endDate !== '' && !isNaN(parsedEndDate.getTime()) && parsedEndDate > new Date();
    
    // Outcomes Validation
    const isCandValid = !isVsMode || (candAName.trim() !== '' && candBName.trim() !== '');
    const isOutcomesValid = !isMultiOutcome || (outcomes.length >= 2 && outcomes.every(o => o.name.trim() !== ''));

    const isFormValid = isTitleValid && isResSourceValid && isEndDateValid && isCandValid && isOutcomesValid;

    // Mock Market for Preview
    const mockMarket: Market = {
        id: 'preview-market',
        title: title || 'Enter a market title...',
        slug: slug || 'preview-market',
        category: category || 'Category',
        subcategory: isVsMode ? 'Head-to-Head' : (isMultiOutcome ? 'Multi Choice' : (subcategory || 'Subcategory')),
        description: description || 'Market rules and details will appear here.',
        resolutionSource: resolutionSource || 'Resolution Source',
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=400&h=200&auto=format&fit=crop',
        probability: initProb,
        volume: 0,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        endDate: endDate ? datetimeLocalToISO(endDate) : new Date(Date.now() + 86400000).toISOString(),
        commission: commission,
        ...(isVsMode ? {
            candidateA: { name: candAName || 'Participant A', color: candAColor, imageUrl: candAImg },
            candidateB: { name: candBName || 'Participant B', color: candBColor, imageUrl: candBImg },
        } : isMultiOutcome ? {
            outcomes: outcomes.map(o => ({ id: o.id, name: o.name || 'Outcome', probability: o.probability, color: o.color }))
        } : {})
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setHasAttemptedSubmit(true);
        if (!isFormValid) {
            addToast('Please fix the errors before launching the market.', 'error');
            return;
        }

        // Convert startDate from datetime-local → ISO UTC as well (if provided)
        const startDateISO = startDate ? datetimeLocalToISO(startDate) : new Date().toISOString();
        const closeDateISO = datetimeLocalToISO(endDate);

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
        <div className="max-w-[1600px] mx-auto pb-12 px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tight">Create Market</h1>
                    <p className="text-sm text-[#9AA0A6] mt-1 font-medium">Configure your bet parameters or use a high-engagement template.</p>
                </div>
                <Button variant="outline" onClick={onBack} className="border-slate-800 text-white hover:bg-slate-800">
                    <ArrowLeft size={16} className="mr-2" /> Back
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 items-start">
                {/* Left Column: Form Sections */}
                <div className="space-y-8">
                    
                    {/* SECTION: Layout & Template */}
                    <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#00D4AA]/10 text-[#00D4AA] rounded-xl"><Palette size={20} /></div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Layout & Template</h2>
                        </div>
                        
                        <div className="mb-8">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Quick Templates</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {marketTemplates.map(template => (
                                    <div key={template.id} className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => applyTemplateFromDb(template)}
                                            className="w-full h-full flex items-center gap-3 p-4 bg-[#0A0C10] rounded-2xl border border-slate-800/60 hover:border-[#00D4AA]/50 hover:shadow-[0_0_15px_rgba(0,212,170,0.15)] transition-all text-left"
                                        >
                                            <div className="p-2 bg-[#14161B] text-[#9AA0A6] rounded-xl group-hover:scale-110 group-hover:bg-[#00D4AA]/10 group-hover:text-[#00D4AA] transition-all shrink-0">
                                                <Zap size={18} />
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="text-xs font-bold text-white truncate" title={template.name}>{template.name}</div>
                                                <div className="text-[9px] text-[#00D4AA] uppercase font-black truncate" title={template.description || template.layout + ' Layout'}>{template.description || template.layout + ' Layout'}</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setEditingTemplate(template); }}
                                            className="absolute -top-2 -right-2 p-1.5 bg-[#14161B] border border-slate-700 rounded-full text-slate-400 hover:text-[#00D4AA] hover:border-[#00D4AA] opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                                            title="Edit Template"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    </div>
                                ))}
                                
                                <button
                                    type="button"
                                    onClick={() => setEditingTemplate('new')}
                                    className="w-full h-full min-h-[72px] flex flex-col items-center justify-center gap-2 p-4 bg-[#00D4AA]/5 rounded-2xl border-2 border-dashed border-[#00D4AA]/20 hover:border-[#00D4AA] hover:bg-[#00D4AA]/10 transition-all text-[#00D4AA] group"
                                >
                                    <Plus size={20} className="group-hover:scale-110 transition-transform" />
                                    <div className="text-[10px] font-black uppercase tracking-widest">New Template</div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Market Layout</h3>
                            <div className="flex flex-wrap bg-[#0A0C10] p-1.5 rounded-2xl w-fit border border-slate-800/60">
                                <button
                                    type="button"
                                    onClick={() => { setIsVsMode(false); setIsMultiOutcome(false); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${!isVsMode && !isMultiOutcome ? 'bg-[#14161B] shadow-sm text-[#00D4AA] border border-slate-800/60' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <List size={14} /> Standard
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsVsMode(true); setIsMultiOutcome(false); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isVsMode ? 'bg-[#00D4AA] text-black shadow-[0_0_15px_rgba(0,212,170,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Swords size={14} /> Versus
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setIsVsMode(false); setIsMultiOutcome(true); }}
                                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isMultiOutcome ? 'bg-[#00D4AA] text-black shadow-[0_0_15px_rgba(0,212,170,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <List size={14} /> Multi Choice
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: Outcomes Config (if VS or Multi) */}
                    {(isMultiOutcome || isVsMode) && (
                        <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-xl animate-fade-in-up">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-[#00D4AA]/10 text-[#00D4AA] rounded-xl">
                                    {isVsMode ? <Swords size={20} /> : <List size={20} />}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight">{isVsMode ? 'Versus Setup' : 'Outcomes Setup'}</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Define participants and initial probabilities</p>
                                </div>
                            </div>

                            {isMultiOutcome && (
                                <div>
                                    <div className="space-y-4">
                                        {outcomes.map((outcome, index) => (
                                            <div key={outcome.id} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center animate-fade-in p-4 bg-[#0A0C10] rounded-2xl border border-slate-800/60">
                                                <div className="flex items-center justify-between w-full sm:w-auto mb-2 sm:mb-0">
                                                    <div className="flex-none p-2 sm:p-3 bg-[#14161B] rounded-xl text-xs font-black text-[#00D4AA] w-10 sm:w-12 text-center border border-[#00D4AA]/20">
                                                        #{index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4">
                                                    <div className="col-span-2 sm:col-span-5">
                                                        <input
                                                            type="text"
                                                            placeholder="Outcome Name"
                                                            value={outcome.name}
                                                            onChange={(e) => updateOutcome(outcome.id, 'name', e.target.value)}
                                                            className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white placeholder-slate-600"
                                                        />
                                                    </div>
                                                    <div className="col-span-1 sm:col-span-3 relative">
                                                        <input
                                                            type="number"
                                                            placeholder="Prob %"
                                                            value={outcome.probability}
                                                            onChange={(e) => updateOutcome(outcome.id, 'probability', Number(e.target.value))}
                                                            className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white tabular-nums pr-8"
                                                        />
                                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                                                    </div>
                                                    <div className="col-span-1 sm:col-span-4 flex items-center gap-2 sm:gap-4">
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                value={outcome.color}
                                                                onChange={(e) => updateOutcome(outcome.id, 'color', e.target.value)}
                                                                className="w-full pl-10 bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none uppercase font-mono text-white"
                                                            />
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-700 shadow-sm" style={{ backgroundColor: outcome.color }} />
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
                                                            className="p-3 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors shrink-0"
                                                            title="Remove Outcome"
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
                                        className="mt-4 w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-400 hover:text-[#00D4AA] hover:border-[#00D4AA]/50 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 transition-all hover:bg-[#00D4AA]/5"
                                    >
                                        <Plus size={16} /> Add Another Outcome
                                    </button>
                                </div>
                            )}

                            {isVsMode && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative mt-2">
                                    <div className="hidden lg:flex absolute left-1/2 top-[50px] -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0A0C10] text-[#9AA0A6] items-center justify-center font-black text-xs shadow-xl z-10 border border-slate-800">
                                        VS
                                    </div>

                                    {/* Candidate A (YES) */}
                                    <div className="space-y-4 p-5 bg-[#0A0C10] rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: candAColor }}></div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/5">YES Option</span>
                                            <div className="flex items-center gap-2">
                                                <Palette size={14} className="text-slate-500" />
                                                <input type="color" value={candAColor} onChange={e => setCandAColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                                            </div>
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={candAName}
                                                onChange={e => setCandAName(e.target.value)}
                                                className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white placeholder-slate-600"
                                                placeholder="Participant A Name"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={candAImg}
                                                onChange={e => setCandAImg(e.target.value)}
                                                className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white placeholder-slate-600"
                                                placeholder="Avatar URL"
                                            />
                                            <Button type="button" variant="outline" className="px-4 border-slate-700 hover:bg-slate-800" onClick={() => candAFileInputRef.current?.click()} title="Upload Image">
                                                <Upload size={16} className="text-slate-300" />
                                            </Button>
                                            <input type="file" ref={candAFileInputRef} className="hidden" accept="image/*" onChange={handleCandAFileChange} />
                                        </div>
                                    </div>

                                    {/* Candidate B (NO) */}
                                    <div className="space-y-4 p-5 bg-[#0A0C10] rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: candBColor }}></div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/5">NO Option</span>
                                            <div className="flex items-center gap-2">
                                                <Palette size={14} className="text-slate-500" />
                                                <input type="color" value={candBColor} onChange={e => setCandBColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                                            </div>
                                        </div>
                                        <div>
                                            <input
                                                type="text"
                                                value={candBName}
                                                onChange={e => setCandBName(e.target.value)}
                                                className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white placeholder-slate-600"
                                                placeholder="Participant B Name"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={candBImg}
                                                onChange={e => setCandBImg(e.target.value)}
                                                className="w-full bg-[#14161B] border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#00D4AA] outline-none text-white placeholder-slate-600"
                                                placeholder="Avatar URL"
                                            />
                                            <Button type="button" variant="outline" className="px-4 border-slate-700 hover:bg-slate-800" onClick={() => candBFileInputRef.current?.click()} title="Upload Image">
                                                <Upload size={16} className="text-slate-300" />
                                            </Button>
                                            <input type="file" ref={candBFileInputRef} className="hidden" accept="image/*" onChange={handleCandBFileChange} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SECTION: Appearance & Classification */}
                    <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#00D4AA]/10 text-[#00D4AA] rounded-xl"><ImageIcon size={20} /></div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Appearance & Category</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Market Banner Image</label>
                                <div className="bg-[#0A0C10] p-1.5 rounded-[1.25rem] border border-slate-800/60">
                                    <ImagePicker selectedUrl={imageUrl} onSelect={(url) => setImageUrl(url)} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Category</label>
                                    <select
                                        className="w-full border border-slate-800 rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] font-bold text-sm"
                                        value={category}
                                        onChange={e => handleCategoryChange(e.target.value)}
                                    >
                                        <option value="">Select Category...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                        {!categories.length && (
                                            <>
                                                <option value="Politics">Politics</option>
                                                <option value="Sports">Sports</option>
                                                <option value="Crypto">Crypto</option>
                                            </>
                                        )}
                                        <option value="__new__" className="font-black text-[#00D4AA] bg-[#14161B]">+ Add New...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Subcategory</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-800 rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] font-bold text-sm placeholder-slate-600"
                                        placeholder="e.g. US Elections"
                                        value={subcategory}
                                        onChange={e => setSubcategory(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: Market Details */}
                    <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#00D4AA]/10 text-[#00D4AA] rounded-xl"><Type size={20} /></div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">Market Details</h2>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Bet Title</label>
                                    <span className={`text-[10px] font-black ${title.length > 120 ? 'text-red-500' : 'text-slate-500'}`}>
                                        {title.length} / 120
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    className={`w-full border ${hasAttemptedSubmit && !isTitleValid ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-[#00D4AA]'} rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 font-black text-base placeholder-slate-600`}
                                    placeholder="e.g. Will [Name] win the election?"
                                    value={title}
                                    onChange={e => {
                                        setTitle(e.target.value);
                                        if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                    }}
                                />
                                {hasAttemptedSubmit && !isTitleValid && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-2">Title is required and must be under 120 characters</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Resolution Source</label>
                                <input
                                    type="text"
                                    className={`w-full border ${hasAttemptedSubmit && !isResSourceValid ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-[#00D4AA]'} rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 font-bold text-sm placeholder-slate-600`}
                                    placeholder="e.g. Associated Press Official Results"
                                    value={resolutionSource}
                                    onChange={e => setResolutionSource(e.target.value)}
                                />
                                {hasAttemptedSubmit && !isResSourceValid && (
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-2">Resolution source is required</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Deadline</label>
                                <div className="space-y-3">
                                    <input
                                        type="datetime-local"
                                        className={`w-full border ${hasAttemptedSubmit && !isEndDateValid ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:ring-[#00D4AA]'} rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 font-bold text-sm [color-scheme:dark]`}
                                        value={endDate}
                                        min={nowString}
                                        onChange={e => setEndDate(e.target.value)}
                                    />
                                    {endDate ? (
                                        (() => {
                                            const isPast = parsedEndDate <= new Date();
                                            return (
                                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold border ${
                                                    isPast
                                                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                                        : 'bg-[#00D4AA]/10 border-[#00D4AA]/30 text-[#00D4AA]'
                                                }`}>
                                                    <span className="text-base">{isPast ? '⚠️' : '🔒'}</span>
                                                    <span>
                                                        {isPast
                                                            ? 'This deadline is in the past — please select a future date.'
                                                            : `Market locks: ${parsedEndDate.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} (local time)`
                                                        }
                                                    </span>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        hasAttemptedSubmit && !isEndDateValid && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-2">Valid future deadline is required</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rules / Description</label>
                                <textarea
                                    className="w-full border border-slate-800 rounded-2xl px-4 py-4 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] min-h-[120px] text-sm leading-relaxed font-medium placeholder-slate-600"
                                    placeholder="Explain exactly how this market resolves..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* SECTION: Advanced */}
                    <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-6 sm:p-8 shadow-xl">
                        <div 
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#0A0C10] text-slate-400 rounded-xl group-hover:text-[#00D4AA] transition-colors"><Code size={20} /></div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-[#00D4AA] transition-colors">Advanced Parameters</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Fees and initial setup</p>
                                </div>
                            </div>
                            <Button type="button" variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-800">
                                {showAdvanced ? 'Hide' : 'Show'}
                            </Button>
                        </div>
                        
                        {showAdvanced && (
                            <div className="mt-6 pt-6 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Initial Prob (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full border border-slate-800 rounded-xl px-4 py-3 bg-[#0A0C10] text-white font-black focus:ring-2 focus:ring-[#00D4AA] outline-none tabular-nums pr-8"
                                            value={initProb}
                                            onChange={e => setInitProb(Number(e.target.value))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">For YES/NO standard markets</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">House Commission (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full border border-slate-800 rounded-xl px-4 py-3 bg-[#0A0C10] text-white font-black focus:ring-2 focus:ring-[#00D4AA] outline-none tabular-nums pr-8"
                                            value={commission}
                                            onChange={e => setCommission(Number(e.target.value))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">%</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1.5 font-medium">Fee taken from winnings</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Mobile Only: Launch Button (appears at bottom of stack) */}
                    <div className="xl:hidden pb-12">
                        <Button 
                            className={`w-full py-5 text-base font-black uppercase tracking-widest transition-all ${hasAttemptedSubmit && !isFormValid ? 'bg-red-500/20 text-red-400 cursor-not-allowed' : 'bg-[#00D4AA] hover:bg-[#00b38f] text-black shadow-[0_0_20px_rgba(0,212,170,0.3)]'}`}
                            onClick={handleSubmit}
                        >
                            {hasAttemptedSubmit && !isFormValid ? 'Fix Errors to Launch' : 'Launch New Market'}
                        </Button>
                    </div>
                </div>

                {/* Right Column: Live Preview & Desktop Launch Button */}
                <div className="sticky top-8 space-y-6">
                    <div className="bg-[#14161B] rounded-[2rem] border border-slate-800/60 p-5 shadow-xl">
                        <h3 className="text-[10px] font-black text-[#00D4AA] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00D4AA] animate-pulse"></span>
                            Live Card Preview
                        </h3>
                        <div className="pointer-events-none">
                            <FeaturedMarketCard 
                                market={mockMarket}
                                onClick={() => {}}
                            />
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 text-center mt-4">
                            This is how the market will appear on the homepage. Charts are simulated.
                        </p>
                    </div>
                    
                    <div className="hidden xl:block">
                        <Button 
                            className={`w-full py-5 text-base font-black uppercase tracking-widest transition-all ${hasAttemptedSubmit && !isFormValid ? 'bg-red-500/20 text-red-400 cursor-not-allowed' : 'bg-[#00D4AA] hover:bg-[#00b38f] text-black shadow-[0_0_20px_rgba(0,212,170,0.3)]'}`}
                            onClick={handleSubmit}
                        >
                            {hasAttemptedSubmit && !isFormValid ? 'Fix Errors to Launch' : 'Launch New Market'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        {/* ── New Category Modal ─────────────────────────────────────────── */}
        {showNewCatModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCatModal(false)}>
                <div className="absolute inset-0 bg-[#0A0C10]/80 backdrop-blur-sm" />
                <div
                    className="relative bg-[#14161B] rounded-[2rem] border border-slate-800 shadow-2xl p-8 w-full max-w-md animate-fade-in-up"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-[#00D4AA] text-black rounded-2xl">
                            <Plus size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-white uppercase tracking-tight">New Category</h3>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">It will be saved and auto-selected</p>
                        </div>
                        <button onClick={() => setShowNewCatModal(false)} className="ml-auto p-2 text-slate-500 hover:text-white rounded-xl bg-[#0A0C10]">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Name *</label>
                            <input
                                type="text"
                                value={newCatName}
                                onChange={e => setNewCatName(e.target.value)}
                                placeholder="e.g. Entertainment"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreateNewCategory()}
                                className="w-full border border-slate-800 rounded-xl px-4 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] font-bold text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Icon</label>
                                <select
                                    value={newCatIcon}
                                    onChange={e => setNewCatIcon(e.target.value)}
                                    className="w-full border border-slate-800 rounded-xl px-3 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] font-bold text-sm"
                                >
                                    {CAT_ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Accent Color</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={newCatColor}
                                        onChange={e => setNewCatColor(e.target.value)}
                                        className="w-full pl-9 border border-slate-800 rounded-xl px-3 py-3 bg-[#0A0C10] text-white outline-none focus:ring-2 focus:ring-[#00D4AA] font-mono text-sm uppercase"
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: newCatColor }} />
                                    <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button
                            onClick={handleCreateNewCategory}
                            disabled={creatingCat || !newCatName.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#00D4AA] hover:bg-[#00b38f] disabled:opacity-50 text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            {creatingCat ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <Plus size={16} />}
                            Create & Select
                        </button>
                        <button
                            onClick={() => setShowNewCatModal(false)}
                            className="px-6 py-3 border border-slate-800 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#0A0C10] hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
        {/* ── Template Editor Modal ──────────────────────────────────────── */}
        {editingTemplate && (
            <TemplateEditorModal
                template={editingTemplate === 'new' ? null : editingTemplate}
                onClose={() => setEditingTemplate(null)}
            />
        )}
    </>);
};

const TemplateEditorModal = ({ template, onClose }: { template: MarketTemplate | null, onClose: () => void }) => {
    const { addToast } = useToast();
    const { adminCreateMarketTemplate, adminUpdateMarketTemplate, adminDeleteMarketTemplate, categories } = useApp();
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [layout, setLayout] = useState<'STANDARD' | 'VERSUS' | 'MULTI_CHOICE'>(template?.layout || 'STANDARD');
    const [category, setCategory] = useState(template?.category || '');
    const [subcategory, setSubcategory] = useState(template?.subcategory || '');
    const [iconUrl, setIconUrl] = useState(template?.iconUrl || '');
    const [titleTemplate, setTitleTemplate] = useState(template?.titleTemplate || '');
    const [resolutionSourceTemplate, setResolutionSourceTemplate] = useState(template?.resolutionSourceTemplate || '');
    const [rulesTemplate, setRulesTemplate] = useState(template?.rulesTemplate || '');
    
    // For default outcomes we can just use a simple stringified JSON field for now to match spec, 
    // or a specialized form. The spec says: "default_outcomes (jsonb) — array of outcome names/config for multi-choice/versus templates"
    const [defaultOutcomesStr, setDefaultOutcomesStr] = useState(
        template?.defaultOutcomes ? JSON.stringify(template.defaultOutcomes, null, 2) : ''
    );

    const handleSave = async () => {
        if (!name.trim()) {
            addToast('Template name is required', 'error');
            return;
        }

        let parsedOutcomes = null;
        if (defaultOutcomesStr.trim()) {
            try {
                parsedOutcomes = JSON.parse(defaultOutcomesStr);
            } catch (e) {
                addToast('Invalid JSON in Default Outcomes', 'error');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                name, description, layout, category, subcategory, iconUrl,
                titleTemplate, resolutionSourceTemplate, rulesTemplate,
                defaultOutcomes: parsedOutcomes
            };

            if (template) {
                await adminUpdateMarketTemplate(template.id, payload);
                addToast('Template updated successfully', 'success');
            } else {
                await adminCreateMarketTemplate(payload);
                addToast('Template created successfully', 'success');
            }
            onClose();
        } catch (err: any) {
            addToast('Error saving template: ' + err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!template) return;
        if (!window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) return;
        
        setSaving(true);
        try {
            await adminDeleteMarketTemplate(template.id);
            addToast('Template deleted', 'success');
            onClose();
        } catch (err: any) {
            addToast('Error deleting template: ' + err.message, 'error');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div 
                className="relative bg-white dark:bg-[#1a1d26] rounded-[2rem] border border-slate-200 dark:border-[#2d3342] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-none p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {template ? 'Edit Template' : 'New Template'}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Configure quick-create presets</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Template Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Political Election"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Short Description</label>
                            <input
                                type="text"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Standard Layout"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Market Layout</label>
                            <select
                                value={layout}
                                onChange={e => setLayout(e.target.value as any)}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            >
                                <option value="STANDARD">STANDARD</option>
                                <option value="VERSUS">VERSUS</option>
                                <option value="MULTI_CHOICE">MULTI_CHOICE</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                >
                                    <option value="">None</option>
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    {!categories.length && (
                                        <>
                                            <option value="Politics">Politics</option>
                                            <option value="Sports">Sports</option>
                                            <option value="Crypto">Crypto</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Subcategory</label>
                                <input
                                    type="text"
                                    value={subcategory}
                                    onChange={e => setSubcategory(e.target.value)}
                                    placeholder="e.g. Bitcoin"
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prefill: Title Template</label>
                        <input
                            type="text"
                            value={titleTemplate}
                            onChange={e => setTitleTemplate(e.target.value)}
                            placeholder="e.g. Will [Name] win?"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prefill: Rules Template</label>
                        <textarea
                            value={rulesTemplate}
                            onChange={e => setRulesTemplate(e.target.value)}
                            placeholder="Rules and resolution instructions..."
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prefill: Resolution Source</label>
                            <input
                                type="text"
                                value={resolutionSourceTemplate}
                                onChange={e => setResolutionSourceTemplate(e.target.value)}
                                placeholder="e.g. Associated Press"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Template Icon/Banner URL</label>
                            <input
                                type="text"
                                value={iconUrl}
                                onChange={e => setIconUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Default Outcomes (JSON)</label>
                        <p className="text-[10px] text-slate-500 mb-2">For Versus layout, define candidateA and candidateB objects. For Multi Choice, define an array of outcome objects.</p>
                        <textarea
                            value={defaultOutcomesStr}
                            onChange={e => setDefaultOutcomesStr(e.target.value)}
                            placeholder={'{\n  "candidateA": { "name": "...", "color": "#ff0000" },\n  "candidateB": { "name": "...", "color": "#0000ff" }\n}'}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs min-h-[120px]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-none p-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 rounded-b-[2rem]">
                    {template && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={saving}
                            className="px-6 py-3 border border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Delete
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="px-6 py-3 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-black text-xs uppercase tracking-widest transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Template'}
                    </button>
                </div>
            </div>
        </div>
    );
};
