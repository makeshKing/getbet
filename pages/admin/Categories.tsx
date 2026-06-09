
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { Category } from '../../types';
import {
    Tag, Plus, Trash2, Edit3, Check, X, ToggleLeft, ToggleRight,
    Palette, AlertCircle, Layers
} from 'lucide-react';

// ── Small icon preview ──────────────────────────────────────────
const ICON_OPTIONS = [
    'Landmark', 'Bitcoin', 'Trophy', 'FlaskConical', 'BarChart3',
    'TrendingUp', 'Music', 'Globe2', 'Zap', 'Star', 'Flame',
    'Heart', 'Shield', 'Target', 'Rocket', 'Crown'
];

export const AdminCategories: React.FC = () => {
    const { addToast } = useToast();
    const {
        adminGetAllCategories, adminCreateCategory,
        adminUpdateCategory, adminDeleteCategory, refreshCategories
    } = useApp();

    const [allCats, setAllCats] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // id being saved

    // Create form state
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('Tag');
    const [newColor, setNewColor] = useState('#6366f1');
    const [creating, setCreating] = useState(false);

    // Inline edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('');
    const [editColor, setEditColor] = useState('');

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const cats = await adminGetAllCategories();
            setAllCats(cats);
        } catch (err: any) {
            addToast('Failed to load categories: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [adminGetAllCategories, addToast]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ── Create ────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) { addToast('Category name is required', 'error'); return; }
        setCreating(true);
        try {
            await adminCreateCategory(newName.trim(), newIcon, newColor);
            addToast(`Category "${newName.trim()}" created!`, 'success');
            setNewName(''); setNewIcon('Tag'); setNewColor('#6366f1');
            await loadAll();
        } catch (err: any) {
            addToast('Error: ' + err.message, 'error');
        } finally {
            setCreating(false);
        }
    };

    // ── Toggle active ─────────────────────────────────────────
    const handleToggleActive = async (cat: Category) => {
        setSaving(cat.id);
        try {
            await adminUpdateCategory(cat.id, { isActive: !cat.isActive });
            await loadAll();
            addToast(`"${cat.name}" ${!cat.isActive ? 'activated' : 'deactivated'}`, 'success');
        } catch (err: any) {
            addToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(null);
        }
    };

    // ── Start editing ──────────────────────────────────────────
    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditIcon(cat.icon || 'Tag');
        setEditColor(cat.color || '#6366f1');
    };

    const cancelEdit = () => setEditingId(null);

    const saveEdit = async (id: string) => {
        if (!editName.trim()) { addToast('Name cannot be empty', 'error'); return; }
        setSaving(id);
        try {
            await adminUpdateCategory(id, { name: editName.trim(), icon: editIcon, color: editColor });
            setEditingId(null);
            await loadAll();
            addToast('Category updated', 'success');
        } catch (err: any) {
            addToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(null);
        }
    };

    // ── Delete ─────────────────────────────────────────────────
    const handleDelete = async (cat: Category) => {
        if (!window.confirm(`Delete "${cat.name}"? Markets using this category won't be affected, but it will no longer appear in filters.`)) return;
        setSaving(cat.id);
        try {
            await adminDeleteCategory(cat.id);
            addToast(`"${cat.name}" deleted`, 'success');
            await loadAll();
        } catch (err: any) {
            addToast('Error: ' + err.message, 'error');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                    <Layers size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                        Category Management
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Create and manage market categories. Changes reflect instantly across the platform.
                    </p>
                </div>
            </div>

            {/* ── Create Form ───────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1d26] rounded-[2rem] border border-slate-200 dark:border-[#2d3342] shadow-sm p-6 mb-8">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                    + New Category
                </h2>
                <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
                    {/* Name */}
                    <div className="flex-1 min-w-[180px]">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="e.g. Entertainment"
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        />
                    </div>

                    {/* Icon */}
                    <div className="w-40">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Icon Name
                        </label>
                        <select
                            value={newIcon}
                            onChange={e => setNewIcon(e.target.value)}
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                        >
                            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                        </select>
                    </div>

                    {/* Color */}
                    <div className="w-32">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                            Color
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={newColor}
                                onChange={e => setNewColor(e.target.value)}
                                className="w-full pl-10 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                            />
                            <div
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-200 cursor-pointer"
                                style={{ backgroundColor: newColor }}
                            />
                            <input
                                type="color"
                                value={newColor}
                                onChange={e => setNewColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={creating || !newName.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20"
                    >
                        {creating ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Plus size={16} />
                        )}
                        Create
                    </button>
                </form>
            </div>

            {/* ── Category Table ────────────────────────────────── */}
            <div className="bg-white dark:bg-[#1a1d26] rounded-[2rem] border border-slate-200 dark:border-[#2d3342] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2d3342] flex items-center justify-between">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        All Categories
                    </span>
                    <span className="text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg tracking-widest">
                        {allCats.length} total
                    </span>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : allCats.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Tag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-sm">No categories yet</p>
                        <p className="text-xs mt-1">Create your first category above</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#2d3342]">
                        {allCats.map(cat => (
                            <div key={cat.id} className={`flex items-center gap-4 px-6 py-4 transition-colors ${!cat.isActive ? 'opacity-50' : ''}`}>

                                {/* Color swatch */}
                                <div
                                    className="w-8 h-8 rounded-xl flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: editingId === cat.id ? editColor : (cat.color || '#6366f1') }}
                                />

                                {editingId === cat.id ? (
                                    /* ── Inline edit mode ── */
                                    <div className="flex-1 flex flex-wrap items-center gap-3">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="border border-indigo-400 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 w-44"
                                            autoFocus
                                        />
                                        <select
                                            value={editIcon}
                                            onChange={e => setEditIcon(e.target.value)}
                                            className="border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 w-36"
                                        >
                                            {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                                        </select>
                                        <div className="relative w-28">
                                            <input
                                                type="text"
                                                value={editColor}
                                                onChange={e => setEditColor(e.target.value)}
                                                className="w-full pl-8 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-mono bg-white dark:bg-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-slate-200" style={{ backgroundColor: editColor }} />
                                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                        </div>
                                        <button onClick={() => saveEdit(cat.id)} disabled={saving === cat.id} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                                            {saving === cat.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                                        </button>
                                        <button onClick={cancelEdit} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    /* ── Display mode ── */
                                    <>
                                        <div className="flex-1">
                                            <div className="font-black text-slate-900 dark:text-white text-sm">{cat.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {cat.icon || 'Tag'} &bull; {cat.color || '#6366f1'} &bull; order {cat.sortOrder}
                                            </div>
                                        </div>

                                        {/* Active badge */}
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${cat.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {cat.isActive ? 'Active' : 'Inactive'}
                                        </span>

                                        {/* Toggle */}
                                        <button
                                            onClick={() => handleToggleActive(cat)}
                                            disabled={saving === cat.id}
                                            title={cat.isActive ? 'Deactivate' : 'Activate'}
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            {cat.isActive ? <ToggleRight size={20} className="text-indigo-600 dark:text-indigo-400" /> : <ToggleLeft size={20} />}
                                        </button>

                                        {/* Edit */}
                                        <button
                                            onClick={() => startEdit(cat)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        >
                                            <Edit3 size={16} />
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDelete(cat)}
                                            disabled={saving === cat.id}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            {saving === cat.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={16} />}
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info notice */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-2xl">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                    Deleting a category doesn't affect existing markets — they retain their category name.
                    Inactive categories are hidden from users but remain editable here.
                </p>
            </div>
        </div>
    );
};
