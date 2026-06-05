
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Wallet, Info, Save, Eye, EyeOff, Building2, Smartphone, Banknote } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { DepositMethodConfig } from '../../types';

export const AdminSettings: React.FC = () => {
    const { addToast } = useToast();
    const { config, depositMethods: methods, adminUpdateConfig, adminUpdateDepositMethod } = useApp();
    const [jsonValue, setJsonValue] = useState(JSON.stringify(config.value, null, 2));
    const [error, setError] = useState<string>('');

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

    return (
        <div className="space-y-10 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Configuration</h1>
                    <p className="text-sm font-medium text-slate-500">Manage payment gateways and global app parameters.</p>
                </div>
            </div>

            {/* Trading Fees Configuration */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                        <Banknote size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Trading Fees</h2>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 max-w-xl transition-all hover:shadow-md">
                    <div className="flex items-center justify-between gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Fixed Trading Fee</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Amount charged per trade (Buy/Sell) in Cents (NPR).</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-black text-slate-400 uppercase ml-1">Fee:</span>
                            <input
                                type="number"
                                min="0"
                                value={(config.value.tradingFee || 0)}
                                onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    adminUpdateConfig({ ...config.value, tradingFee: val });
                                }}
                                className="w-24 bg-transparent text-right font-black text-slate-900 dark:text-white focus:outline-none"
                            />
                            <span className="text-xs font-black text-slate-400 mr-1">¢</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Payment Methods Management */}
            <section className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                        <Wallet size={20} />
                    </div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-widest">Deposit Methods (User Side)</h2>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {methods.map((m) => (
                        <div key={m.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {m.id === 'bank' ? <Building2 size={20} className="text-slate-400" /> : <Smartphone size={20} className="text-slate-400" />}
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{m.name}</span>
                                </div>
                                <button
                                    onClick={() => handleUpdateMethod(m.id, { isActive: !m.isActive })}
                                    className={`p-2 rounded-xl transition-all ${m.isActive ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}
                                    title={m.isActive ? 'Method is LIVE' : 'Method is HIDDEN'}
                                >
                                    {m.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
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
