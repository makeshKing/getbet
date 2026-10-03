import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, RefreshCw, Trash2, ImageOff, AlertCircle, Link2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import {
    uploadDepositQr,
    validateDepositQrFile,
    getDepositQrStoragePath,
    deleteDepositQrByUrl,
} from '../../services/supabaseService';

interface QrImageFieldProps {
    /** Unique prefix for element ids (browser testing / a11y). */
    id: string;
    /** Current effective QR URL ('' when none). */
    value: string;
    /** Called with the new URL ('' to clear). May be async (e.g. persist to DB). */
    onChange: (url: string) => void | Promise<void>;
    /** Notifies parent while an upload/save is in flight (to disable Create/Save). */
    onBusyChange?: (busy: boolean) => void;
    /**
     * Create-form mode: the URL is not persisted yet, so a previously uploaded
     * file is deleted from storage when it is replaced/removed here.
     * In edit mode the service layer cleans up the old file after the DB update.
     */
    cleanupUnsaved?: boolean;
    /** Ask for confirmation before removing (used for already-saved methods). */
    confirmRemove?: boolean;
}

const ACCEPT = 'image/png,image/jpeg,image/webp';

const inputClass =
    'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed';

export const QrImageField: React.FC<QrImageFieldProps> = ({
    id,
    value,
    onChange,
    onBusyChange,
    cleanupUnsaved = false,
    confirmRemove = false,
}) => {
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Local object-URL preview, tied to the URL it represents (`forUrl`) so it
    // is dropped automatically when the parent resets/changes `value`.
    const [local, setLocal] = useState<{ objectUrl: string; forUrl: string | null } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imgFailed, setImgFailed] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');

    const isUploaded = !!getDepositQrStoragePath(value);

    // Keep the paste-URL input in sync with external (non-uploaded) URLs
    useEffect(() => {
        setUrlDraft(isUploaded ? '' : value || '');
    }, [value, isUploaded]);

    // Drop stale local preview when value changes externally (reset / discard / created)
    useEffect(() => {
        if (local && !busy && local.forUrl !== value) {
            URL.revokeObjectURL(local.objectUrl);
            setLocal(null);
        }
    }, [value, busy, local]);

    // Revoke on unmount
    const localRef = useRef(local);
    localRef.current = local;
    useEffect(() => () => {
        if (localRef.current) URL.revokeObjectURL(localRef.current.objectUrl);
    }, []);

    const setBusyState = useCallback((b: boolean) => {
        setBusy(b);
        onBusyChange?.(b);
    }, [onBusyChange]);

    const displaySrc = local && (busy || local.forUrl === value) ? local.objectUrl : value;

    useEffect(() => { setImgFailed(false); }, [displaySrc]);

    const handleFile = async (file: File | undefined | null) => {
        if (!file) return;
        setError(null);

        const validationError = validateDepositQrFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        // Instant local preview
        if (local) URL.revokeObjectURL(local.objectUrl);
        const objectUrl = URL.createObjectURL(file);
        setLocal({ objectUrl, forUrl: null });

        const previousUrl = value;
        let uploadedUrl: string | null = null;
        setBusyState(true);
        try {
            const { url } = await uploadDepositQr(file);
            uploadedUrl = url;
            setLocal({ objectUrl, forUrl: url });
            await onChange(url);
            if (cleanupUnsaved && previousUrl) await deleteDepositQrByUrl(previousUrl);
            addToast('QR image uploaded.', 'success');
        } catch (e: any) {
            URL.revokeObjectURL(objectUrl);
            setLocal(null);
            if (uploadedUrl) await deleteDepositQrByUrl(uploadedUrl); // saving failed → don't leave an orphan
            const msg = e?.message || 'Upload failed';
            setError(`Upload failed: ${msg}`);
            addToast(`QR upload failed: ${msg}`, 'error');
        } finally {
            setBusyState(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = async () => {
        if (confirmRemove && !window.confirm('Remove the QR image from this deposit method?')) return;
        const previousUrl = value;
        setError(null);
        setBusyState(true);
        try {
            await onChange('');
            if (cleanupUnsaved && previousUrl) await deleteDepositQrByUrl(previousUrl);
            if (local) { URL.revokeObjectURL(local.objectUrl); setLocal(null); }
            addToast('QR image removed.', 'info');
        } catch (e: any) {
            addToast(`Failed to remove QR: ${e?.message || 'Unknown error'}`, 'error');
        } finally {
            setBusyState(false);
        }
    };

    const commitUrlDraft = async () => {
        const next = urlDraft.trim();
        if (isUploaded || next === (value || '')) return;
        if (next && !/^https?:\/\//i.test(next)) {
            setError('URL must start with http:// or https://');
            return;
        }
        setError(null);
        setBusyState(true);
        try {
            await onChange(next);
        } catch (e: any) {
            addToast(`Failed to save QR URL: ${e?.message || 'Unknown error'}`, 'error');
        } finally {
            setBusyState(false);
        }
    };

    const openPicker = () => { if (!busy) fileInputRef.current?.click(); };

    return (
        <div className="space-y-2">
            <input
                id={`${id}-file`}
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {displaySrc ? (
                <div className="flex items-start gap-3">
                    <div className="relative w-40 h-40 shrink-0 rounded-xl bg-white p-2 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center">
                        {imgFailed ? (
                            <div className="flex flex-col items-center gap-1 text-slate-400 text-center px-2">
                                <ImageOff size={22} />
                                <span className="text-[10px] font-bold uppercase tracking-wide">Could not load image</span>
                            </div>
                        ) : (
                            <img
                                id={`${id}-preview`}
                                src={displaySrc}
                                alt="QR code preview"
                                className="w-full h-full object-contain"
                                onError={() => setImgFailed(true)}
                            />
                        )}
                        {busy && (
                            <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center gap-2">
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Uploading…</span>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-0">
                        <button
                            id={`${id}-replace`}
                            type="button"
                            onClick={openPicker}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <RefreshCw size={12} /> Replace
                        </button>
                        <button
                            id={`${id}-remove`}
                            type="button"
                            onClick={handleRemove}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Trash2 size={12} /> Remove
                        </button>
                        {isUploaded && !busy && (
                            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-wide">
                                <CheckCircle2 size={11} /> Uploaded
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    id={`${id}-dropzone`}
                    role="button"
                    tabIndex={0}
                    onClick={openPicker}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
                        dragOver
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-indigo-400'
                    } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
                >
                    {busy ? (
                        <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                    ) : (
                        <Upload size={20} className="text-slate-400" />
                    )}
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">Upload QR image</span>
                    <span className="text-[10px] font-medium text-slate-400">PNG, JPG or WEBP, max 2 MB</span>
                </div>
            )}

            {error && (
                <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 ml-1">
                    <AlertCircle size={12} /> {error}
                </p>
            )}

            <div>
                <label htmlFor={`${id}-url`} className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                    <Link2 size={10} /> Or paste a URL
                </label>
                <input
                    id={`${id}-url`}
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onBlur={commitUrlDraft}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
                    disabled={busy || isUploaded}
                    placeholder={isUploaded ? 'Using uploaded image' : 'https://example.com/qr.png'}
                    className={inputClass}
                />
            </div>
        </div>
    );
};
