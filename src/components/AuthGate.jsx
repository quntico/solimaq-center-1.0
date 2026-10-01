import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, KeyRound, Mail, ArrowRight, Loader2, CheckCircle2, Lock } from 'lucide-react';


// You can edit these lists to add or remove access credentials
const ALLOWED_EMAILS = [
    'admin@solimaq.com',
    'gerencia@solimaq.com',
    'contacto@solimaq.com',
    'freddy@solimaq.com', // user 'fredd'
    'moises.lopez@conagua.gob.mx' // client in screenshot
];

const ALLOWED_CODES = [
    'SOLIMAQ2026',
    'MIRAMAR600',
    'ADMIN600',
    'PANDORA'
];

export default function AuthGate({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const authStatus = localStorage.getItem('solimaq_secure_access');
        if (authStatus === 'master' || authStatus === 'view') {
            setIsAuthorized(true);
        }
    }, []);

    const handleVerify = (e) => {
        e.preventDefault();
        setError('');

        if (!inputValue.trim()) {
            setError('Por favor, ingrese un código válido.');
            return;
        }

        setIsChecking(true);

        setTimeout(() => {
            const codeVal = inputValue.trim();

            const masterKey = localStorage.getItem('solimaq_master_key') || 'ADMIN600';
            const viewKey = localStorage.getItem('solimaq_view_key') || 'MIRAMAR600';

            let role = null;
            if (codeVal === masterKey || codeVal === 'SOLIMAQ2026') {
                role = 'master';
            } else if (codeVal === viewKey) {
                role = 'view';
            }

            const isValidEmail = ALLOWED_EMAILS.includes(codeVal.toLowerCase());
            if (isValidEmail) {
                role = 'master'; // assume known emails are master
            }

            if (role) {
                setShowSuccess(true);
                localStorage.setItem('solimaq_secure_access', role);
                setTimeout(() => {
                    setIsAuthorized(true);
                    setShowSuccess(false);
                }, 1500);
            } else {
                setError('Acceso denegado. Credencial no reconocida.');
                setInputValue('');
            }
            setIsChecking(false);
        }, 1200);
    };

    if (!mounted) return null;

    if (isAuthorized) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#070707] flex items-center justify-center relative overflow-hidden font-sans text-slate-200">
            {/* Background aesthetics */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
                <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"></div>
            </div>

            <AnimatePresence>
                {!showSuccess ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="z-10 w-full max-w-md p-8 bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden"
                    >
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600" />

                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-white/5 relative">
                                <Lock className="w-8 h-8 text-emerald-400" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full" />
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight text-center">Protocolo de Seguridad</h2>
                            <p className="text-sm text-slate-400 mt-2 text-center">
                                El acceso a CENTRO SOLIMAQ está restringido.
                                Ingrese su <span className="text-white font-medium">correo autorizado</span> o <span className="text-white font-medium">código de acceso</span>.
                            </p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-5">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <KeyRound className={`w-5 h-5 transition-colors duration-300 ${inputValue ? 'text-emerald-400' : 'text-slate-500 group-focus-within:text-emerald-400'}`} />
                                </div>
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    disabled={isChecking}
                                    placeholder="ej. MIRAMAR600 o correo@solimaq.com"
                                    className="w-full bg-black/40 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50"
                                    autoComplete="off"
                                    spellCheck="false"
                                />
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-500/20">
                                            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                                            <p>{error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <button
                                type="submit"
                                disabled={isChecking || !inputValue}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98]"
                            >
                                {isChecking ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Verificando Credenciales...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Autorizar Acceso</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-slate-500">
                            <ShieldAlert className="w-4 h-4" />
                            <span>Conexión cifrada de extremo a extremo (AES-256)</span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="z-10 flex flex-col items-center justify-center text-emerald-400"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        >
                            <CheckCircle2 className="w-24 h-24 mb-6 shadow-2xl rounded-full bg-emerald-400/10" />
                        </motion.div>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold text-white tracking-wider"
                        >
                            ACCESO CONCEDIDO
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-emerald-500/80 mt-2 uppercase text-sm tracking-[0.2em]"
                        >
                            Iniciando entorno seguro...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
