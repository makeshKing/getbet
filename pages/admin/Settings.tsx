
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Wallet, Info, Save, Eye, EyeOff, Building2, Smartphone, Banknote, Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DepositMethodConfig, WithdrawalMethodConfig, WithdrawalFieldConfig } from '../../types';

const emptyForm = {
    id: '',
    name: '',
    accountName: '',
    accountNumber: '',
    instructions: '',
    qrUrl: '',
};

interface FieldConfigEditorProps {
    fields: WithdrawalFieldConfig[];
    onChange: (fields: WithdrawalFieldConfig[]) => void;
}

const FieldConfigEditor: React.FC<FieldConfigEditorProps> = ({ fields, onChange }) => {
    const addField = () => {
        onChange([...fields, { key: `field_${Date.now()}`, label: '', type: 'text', required: false }]);
    };

    const updateField = (index: number, updates: Partial<WithdrawalFieldConfig>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...updates };
        if (updates.label !== undefined) {
            newFields[index].key = newFields[index].label.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (!newFields[index].key) newFields[index].key = `field_${Date.now()}`;
        }
        onChange(newFields);
    };

    const removeField = (index: number) => {
        onChange(fields.filter((_, i) => i !== index));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === fields.length - 1) return;
        
        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        const temp = newFields[index];
        newFields[index] = newFields[targetIndex];
        newFields[targetIndex] = temp;
        
        onChange(newFields);
    };

    return (
        <div className="space-y-3">
            {fields.map((field, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex gap-1 flex-col sm:flex-row sm:items-center w-full">
                        <div className="flex gap-1 mr-2">
                            <button
                                onClick={() => moveField(index, 'up')}
                                disabled={index === 0}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={() => moveField(index, 'down')}
                                disabled={index === fields.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={field.label}
                            onChange={e => updateField(index, { label: e.target.value })}
                            placeholder="Field Label (e.g. Account Number)"
                            className="flex-1 min-w-[150px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-3 items-center w-full sm:w-auto">
                        <select
                            value={field.type}
                            onChange={e => updateField(index, { type: e.target.value as 'text' | 'number' })}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={field.required}
                                onChange={e => updateField(index, { required: e.target.checked })}
                                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            Required
                        </label>
                        <button
                            onClick={() => removeField(index)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-auto sm:ml-0"
                            title="Remove Field"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
            <button
                onClick={addField}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 py-1"
            >
                <Plus size={14} /> Add Field
            </button>
        </div>
    );
};

export const AdminSettings: React.FC = () => {
    const { addToast } = useToast();
    const { 
        config, 
        depositMethods: methods, 
        withdrawalMethods,
        adminUpdateConfig, 
        adminCreateDepositMethod, 
        adminUpdateDepositMethod, 
        adminDeleteDepositMethod,
        adminCreateWithdrawalMethod,
        adminUpdateWithdrawalMethod,
        adminDeleteWithdrawalMethod
    } = useApp();
    const [jsonValue, setJsonValue] = useState(JSON.stringify(config.value, null, 2));
    const [error, setError] = useState<string>('');

    // Create form state
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(emptyForm);
    const [creating, setCreating] = useState(false);

    // Create withdrawal form state
    const emptyWithdrawalForm = { id: '', name: '', instructions: '' };
    const [showCreateWithdrawalForm, setShowCreateWithdrawalForm] = useState(false);
    const [createWithdrawalForm, setCreateWithdrawalForm] = useState(emptyWithdrawalForm);
    const [createWithdrawalFields, setCreateWithdrawalFields] = useState<WithdrawalFieldConfig[]>([]);
    const [creatingWithdrawal, setCreatingWithdrawal] = useState(false);

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

    const handleUpdateWithdrawalMethod = async (id: string, updates: Partial<WithdrawalMethodConfig>) => {
        await adminUpdateWithdrawalMethod(id, updates);
        addToast(`${id.toUpperCase()} withdrawal method updated.`, 'success');
    };

    const handleDeleteWithdrawalMethod = async (id: string) => {
        if (!window.confirm(`Are you sure you want to delete the ${id.toUpperCase()} withdrawal method?`)) return;
        try {
            await adminDeleteWithdrawalMethod(id);
            addToast(`${id.toUpperCase()} withdrawal method deleted.`, 'success');
        } catch (e: any) {
            addToast(`Failed to delete withdrawal method: ${e.message}`, 'error');
        }
    };

    const handleCreateWithdrawalMethod = async () => {
        if (!createWithdrawalForm.id.trim()) {
            addToast('Method ID is required.', 'error');
            return;
        }
        if (!createWithdrawalForm.name.trim()) {
            addToast('Method Name is required.', 'error');
            return;
        }
        if (withdrawalMethods.some(m => m.id === createWithdrawalForm.id.trim().toLowerCase())) {
            addToast('A withdrawal method with this ID already exists.', 'error');
            return;
        }

        setCreatingWithdrawal(true);
        try {
            await adminCreateWithdrawalMethod({
                id: createWithdrawalForm.id.trim().toLowerCase(),
                name: createWithdrawalForm.name.trim(),
                fieldsConfig: createWithdrawalFields,
                instructions: createWithdrawalForm.instructions.trim(),
                isActive: true,
            });
            addToast(`${createWithdrawalForm.name.toUpperCase()} withdrawal method created successfully!`, 'success');
            setCreateWithdrawalForm(emptyWithdrawalForm);
            setCreateWithdrawalFields([]);
            setShowCreateWithdrawalForm(false);
        } catch (e: any) {
            addToast(`Failed to create withdrawal method: ${e.message}`, 'error');
        } finally {
            setCreatingWithdrawal(false);
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

            {/* Withdrawal Methods Management */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg">
                            <Wallet size={20} />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Withdrawal Methods (Admin Side)</h2>
                    </div>
                    <button
                        onClick={() => setShowCreateWithdrawalForm(!showCreateWithdrawalForm)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200 shadow-sm ${
                            showCreateWithdrawalForm
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200 dark:shadow-amber-900/30'
                        }`}
                    >
                        {showCreateWithdrawalForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                        {showCreateWithdrawalForm ? 'Cancel' : 'Add New Method'}
                    </button>
                </div>

                {/* Create New Withdrawal Method Form */}
                {showCreateWithdrawalForm && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-amber-300 dark:border-amber-700 shadow-lg shadow-amber-100 dark:shadow-amber-900/20 overflow-hidden animate-in">
                        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-100 dark:border-amber-800">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                                    <Plus size={14} />
                                </div>
                                <span className="text-sm font-black text-amber-900 dark:text-amber-200 uppercase tracking-widest">Create New Withdrawal Method</span>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Method ID <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createWithdrawalForm.id}
                                        onChange={(e) => setCreateWithdrawalForm(prev => ({ ...prev, id: e.target.value }))}
                                        placeholder="e.g. esewa, khalti, bank"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">Unique lowercase identifier</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                        Display Name <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createWithdrawalForm.name}
                                        onChange={(e) => setCreateWithdrawalForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. eSewa, Khalti, Bank Transfer"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Custom Instructions</label>
                                    <textarea
                                        value={createWithdrawalForm.instructions}
                                        onChange={(e) => setCreateWithdrawalForm(prev => ({ ...prev, instructions: e.target.value }))}
                                        rows={2}
                                        placeholder="Instructions shown to users when withdrawing via this method..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-medium leading-relaxed focus:ring-2 focus:ring-amber-500 outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Fields Configuration</label>
                                        {createWithdrawalFields.length === 0 && (
                                            <span className="text-[10px] font-bold text-amber-500 uppercase">
                                                (At least one field is required)
                                            </span>
                                        )}
                                    </div>
                                    <FieldConfigEditor
                                        fields={createWithdrawalFields}
                                        onChange={setCreateWithdrawalFields}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => { setCreateWithdrawalForm(emptyWithdrawalForm); setCreateWithdrawalFields([]); setShowCreateWithdrawalForm(false); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                >
                                    <X size={14} />
                                    Discard
                                </button>
                                <button
                                    onClick={handleCreateWithdrawalMethod}
                                    disabled={creatingWithdrawal || createWithdrawalFields.length === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-200 dark:shadow-amber-900/30"
                                >
                                    {creatingWithdrawal ? (
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

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {withdrawalMethods.map((m) => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {m.id === 'bank' ? <Building2 size={20} className="text-slate-400" /> : <Smartphone size={20} className="text-slate-400" />}
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{m.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateWithdrawalMethod(m.id, { isActive: !m.isActive })}
                                        className={`p-2 rounded-xl transition-all ${m.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}
                                        title={m.isActive ? 'Method is LIVE' : 'Method is HIDDEN'}
                                    >
                                        {m.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteWithdrawalMethod(m.id)}
                                        className="p-2 rounded-xl transition-all bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                                        title="Delete Withdrawal Method"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Fields Configuration</label>
                                        {(!m.fieldsConfig || m.fieldsConfig.length === 0) && (
                                            <span className="text-[10px] font-bold text-amber-500 uppercase">
                                                (At least one field is required)
                                            </span>
                                        )}
                                    </div>
                                    <FieldConfigEditor
                                        fields={m.fieldsConfig || []}
                                        onChange={newFields => handleUpdateWithdrawalMethod(m.id, { fieldsConfig: newFields })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Custom Instructions</label>
                                    <textarea
                                        defaultValue={m.instructions}
                                        onBlur={(e) => handleUpdateWithdrawalMethod(m.id, { instructions: e.target.value })}
                                        rows={2}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-[11px] font-medium leading-relaxed focus:ring-2 focus:ring-amber-500 outline-none resize-none"
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
                        <div className="flex-1 w-full flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                    Base Exchange Rate (1 USD = X NPR)
                                </label>
                                <input
                                    id="exchange-rate-input"
                                    key={`usd-rate-${config.value.usdToNprRate || 130}`}
                                    type="number"
                                    step="0.01"
                                    defaultValue={config.value.usdToNprRate || 130.0}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <button
                                onClick={async () => {
                                    const input = document.getElementById('exchange-rate-input') as HTMLInputElement;
                                    if (input) {
                                        const val = parseFloat(input.value);
                                        if (!isNaN(val) && val > 0) {
                                            await adminUpdateConfig({ ...config.value, usdToNprRate: val });
                                            addToast('Exchange rate updated successfully.', 'success');
                                        }
                                    }
                                }}
                                className="h-[52px] px-6 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 transition-all flex items-center justify-center"
                            >
                                Update
                            </button>
                        </div>
                        <div className="text-xs text-slate-500 mb-3 md:w-1/3">
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
