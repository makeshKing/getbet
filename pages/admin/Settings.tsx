
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Wallet, Info, Save, Eye, EyeOff, Building2, Smartphone, Banknote, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DepositMethodConfig } from '../../types';

const emptyForm = {
    id: '',
    name: '',
    accountName: '',
    accountNumber: '',
    instructions: '',
    qrUrl: '',
};

export const AdminSettings: React.FC = () => {
    const { addToast } = useToast();
    const { config, depositMethods: methods, adminUpdateConfig, adminCreateDepositMethod, adminUpdateDepositMethod, adminDeleteDepositMethod } = useApp();
    const [jsonValue, setJsonValue] = useState(JSON.stringify(config.value, null, 2));
    const [error, setError] = useState<string>('');

    // Create form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        setJsonValue(JSON.stringify(config.value, null, 2));
    }, [config]);

    const handleSaveJson = async () => {
        try {
            const parsed = JSON.parse(jsonValue);
            await adminUpdateConfig(parsed);
            addToast('Configuration saved successfully.', 'success');
            setError('');
        } catch (e) {
            setError('Invalid JSON format.');
            addToast('Error saving config: Invalid JSON', 'error');
        }
    };

    const handleUpdateMethod = async (id: string, updates: Partial<DepositMethodConfig>) => {
        await adminUpdateDepositMethod(id, updates);
        addToast(`${id.toUpperCase()} details updated.`, 'success');
    };

    const handleDeleteMethod = async (id: string) => {
        if (!window.confirm(`Are you sure you want to delete the ${id.toUpperCase()} deposit method?`)) return;
        try {
            await adminDeleteDepositMethod(id);
            addToast(`${id.toUpperCase()} deposit method deleted.`, 'success');
        } catch (e: any) {
            addToast(`Failed to delete deposit method: ${e.message}`, 'error');
        }
    };

    const handleCreateMethod = async () => {
        // Validation
        if (!createForm.id.trim()) {
            addToast('Method ID is required.', 'error');
            return;
        }
        if (!createForm.name.trim()) {
            addToast('Method Name is required.', 'error');
            return;
        }
        if (methods.some(m => m.id === createForm.id.trim().toLowerCase())) {
            addToast('A deposit method with this ID already exists.', 'error');
            return;
        }

        setCreating(true);
        try {
            await adminCreateDepositMethod({
                id: createForm.id.trim().toLowerCase(),
                name: createForm.name.trim(),
                accountName: createForm.accountName.trim(),
                accountNumber: createForm.accountNumber.trim(),
                instructions: createForm.instructions.trim(),
                qrUrl: createForm.qrUrl.trim() || undefined,
                isActive: true,
            });
            addToast(`${createForm.name.toUpperCase()} deposit method created successfully!`, 'success');
            setCreateForm(emptyForm);
            setShowCreateForm(false);
        } catch (e: any) {
            addToast(`Failed to create deposit method: ${e.message}`, 'error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Configuration</h1>
                    <p className="text-sm font-medium text-slate-500">Manage payment gateways and global app parameters.</p>
                </div>
            </div>

            {/* Payment Methods Management */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                            <Wallet size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Deposit Methods (User Side)</h2>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-sm ${
                            showCreateForm
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/30'
                        }`}
                    >
                        {showCreateForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                        {showCreateForm ? 'Cancel' : 'Add New Method'}
                    </button>
                </div>

                {/* Create New Method Form */}
                {showCreateForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20 overflow-hidden animate-in">
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 border-b border-indigo-100 dark:border-indigo-800">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                                    <Plus size={14} />
                                </div>
                                <span className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-widest">Create New Deposit Method</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Method ID <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.id}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, id: e.target.value }))}
                                        placeholder="e.g. esewa, khalti, bank"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">Unique lowercase identifier</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Display Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. eSewa, Khalti, Bank Transfer"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account Holder Name</label>
                                    <input
                                        type="text"
                                        value={createForm.accountName}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, accountName: e.target.value }))}
                                        placeholder="e.g. John Doe"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account / ID Number</label>
                                    <input
                                        type="text"
                                        value={createForm.accountNumber}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                                        placeholder="e.g. 9812345678"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">QR Code URL</label>
                                    <input
                                        type="url"
                                        value={createForm.qrUrl}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, qrUrl: e.target.value }))}
                                        placeholder="https://example.com/qr.png"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-2 xl:col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Custom Instructions</label>
                                    <textarea
                                        value={createForm.instructions}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, instructions: e.target.value }))}
                                        rows={3}
                                        placeholder="Instructions shown to users when depositing via this method..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-medium leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => { setCreateForm(emptyForm); setShowCreateForm(false); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                >
                                    <X size={14} />
                                    Discard
                                </button>
                                <button
                                    onClick={handleCreateMethod}
                                    disabled={creating}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={14} />
                                            Create Method
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {methods.map((m) => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {m.id === 'bank' ? <Building2 size={20} className="text-slate-400" /> : <Smartphone size={20} className="text-slate-400" />}
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{m.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateMethod(m.id, { isActive: !m.isActive })}
                                        className={`p-2 rounded-xl transition-all ${m.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}
                                        title={m.isActive ? 'Method is LIVE' : 'Method is HIDDEN'}
                                    >
                                        {m.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteMethod(m.id)}
                                        className="p-2 rounded-xl transition-all bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                                        title="Delete Deposit Method"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account Holder Name</label>
                                    <input
                                        type="text"
                                        defaultValue={m.accountName}
                                        onBlur={(e) => handleUpdateMethod(m.id, { accountName: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account / ID Number</label>
                                    <input
                                        type="text"
                                        defaultValue={m.accountNumber}
                                        onBlur={(e) => handleUpdateMethod(m.id, { accountNumber: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Custom Instructions</label>
                                    <textarea
                                        defaultValue={m.instructions}
                                        onBlur={(e) => handleUpdateMethod(m.id, { instructions: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-medium leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <Info size={12} /> Auto-saves on field blur
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Currency Settings */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg">
                            <Banknote size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Currency Settings</h2>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                Base Exchange Rate (1 USD = X NPR)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                defaultValue={config.value.usdToNprRate || 130.0}
                                onBlur={async (e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0) {
                                        await adminUpdateConfig({ ...config.value, usdToNprRate: val });
                                        addToast('Exchange rate updated successfully.', 'success');
                                    }
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="text-xs text-slate-500 mb-3">
                            Modifies how prices convert from NPR to USD for users.
                        </div>
                    </div>
                </div>
            </section>

            {/* JSON Config section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl">
                            <Save size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Advanced JSON Config</h2>
                    </div>
                    <Button onClick={handleSaveJson} className="h-10 text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">Apply Changes</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Core Application JSON</h3>
                            <textarea
                                className="w-full h-96 font-mono text-xs p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700 dark:text-indigo-300 leading-relaxed"
                                value={jsonValue}
                                onChange={(e) => setJsonValue(e.target.value)}
                            />
                            {error && <p className="text-red-500 text-[10px] font-bold mt-2 uppercase tracking-widest">{error}</p>}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                            <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4">Metadata Info</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Last Updated</span>
                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">{new Date(config.updatedAt).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Admin Auth</span>
                                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{config.updatedBy}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Registry Key</span>
                                    <code className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-black text-slate-600 dark:text-slate-400">{config.key}</code>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-[1.5rem] border border-amber-200 dark:border-amber-900/30 p-6 text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed font-bold">
                            <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-500">
                                <Info size={16} /> <span>System Integrity Warning</span>
                            </div>
                            Improper configuration can break the application logic. Ensure valid JSON structure before applying changes. Always backup complex configurations before modifying.
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
