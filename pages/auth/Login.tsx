import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../../services/supabaseService';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Just authenticate — AuthContext picks up the session change and
            // loads the full profile (including role and isBanned).
            // ProtectedRoute then enforces authorization on every protected page.
            await signIn(email, password);
            // Navigate to home; ProtectedRoute will redirect admins or block banned users
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfd] dark:bg-[#0f111a] p-4 animate-fade-in relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white mb-6 shadow-xl shadow-indigo-500/20">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Enter your credentials to access your portfolio</p>
                </div>

                <div className="glass-panel p-8 rounded-[2rem] border border-slate-200/50 dark:border-white/5 shadow-2xl backdrop-blur-xl bg-white/50 dark:bg-slate-900/50">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 transition-all"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 focus:bg-white dark:focus:bg-white/10 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full h-14 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] transition-all"
                                disabled={isLoading}
                                type="submit"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-2">Sign In <ArrowRight size={16} /></span>}
                            </Button>
                        </div>
                    </form>
                </div>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-sm font-bold text-slate-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                            Create Account
                        </Link>
                    </p>
                    <div className="flex items-center justify-center gap-2 opacity-50">
                        <div className="h-px w-12 bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or</span>
                        <div className="h-px w-12 bg-slate-300 dark:bg-slate-700" />
                    </div>
                </div>
            </div>
        </div>
    );
};
