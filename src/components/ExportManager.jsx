import React, { useState, useRef } from 'react';
import * as tus from 'tus-js-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    FileSpreadsheet,
    Download,
    Table,
    FileCheck,
    Zap,
    Upload,
    ExternalLink,
    Link as LinkIcon,
    Trash2,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/customSupabaseClient';
import { getActiveBucket } from '@/lib/bucketResolver';
import { useToast } from '@/components/ui/use-toast';

const DATA_SECTION_ID = 'export_resources';

const ExportProgress = ({ isOpen, type, progress, status }) => {
    const titles = {
        propuesta: 'Propuesta Económica',
        masterplan: 'Master Plan Técnico',
        fichas: 'Fichas de Ingeniería',
        excel: 'Estructura de Datos',
        project_a: 'Proyecto A',
        project_b: 'Proyecto B',
        comparative: 'Comparativa',
        concentrado_a: 'MASTER PLAN A',
        concentrado_b: 'MASTER PLAN B'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Dialog open={isOpen}>
                    <DialogContent className="sm:max-w-[500px] bg-black/90 border-primary/20 text-white backdrop-blur-2xl overflow-hidden p-0">
                        {/* Scanline Effect */}
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50 opacity-20" />

                        <div className="p-8 relative">
                            {/* Neon Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                            <div className="relative z-10 flex flex-col items-center text-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center relative overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 border-t-2 border-primary"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        />
                                        <Zap className="w-8 h-8 text-primary animate-pulse" />
                                    </div>
                                    {/* Outer Orbitals */}
                                    <motion.div
                                        className="absolute -inset-4 border border-primary/10 rounded-full"
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">
                                        PREPARANDO <span className="text-primary">{titles[type] || 'DOCUMENTO'}</span>
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 text-[10px] text-primary/60 font-black tracking-[0.2em] uppercase">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                        {status || 'Analizando Matrices de Datos...'}
                                    </div>
                                </div>

                                {/* Futuristic Progress Bar */}
                                <div className="w-full space-y-4">
                                    <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                        <motion.div
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-primary"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.5 }}
                                        />
                                        {/* Pulsing light effect on the bar */}
                                        <motion.div
                                            className="absolute inset-y-0 w-20 bg-white/20 blur-sm"
                                            animate={{ left: ["-20%", "120%"] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                        <span>SECTOR_0X{Math.floor(progress * 1.6).toString(16).toUpperCase()}</span>
                                        <span className="text-primary font-bold">{Math.floor(progress)}%</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 w-full pt-4 border-t border-white/5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex flex-col gap-1 items-center">
                                            <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-primary/20"
                                                    animate={{ width: ["10%", "90%", "30%"] }}
                                                    transition={{ duration: 2 + i, repeat: Infinity }}
                                                />
                                            </div>
                                            <span className="text-[7px] text-zinc-600 font-black tracking-widest uppercase">System_{i}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
};

const ExportManager = ({ isOpen, onClose, onExport, isEditorMode, quotationData, onUpdate, onAtomicUpdate, activeTheme }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [exportType, setExportType] = useState(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const { toast } = useToast();

    // Resources Logic
    const resourcesSection = quotationData?.sections_config?.find(s => s.id === DATA_SECTION_ID);
    const resources = resourcesSection?.content || {};

    const updateResource = (key, url) => {
        if (onAtomicUpdate) {
            console.log(`[ExportManager] Updating resource ${key} via atomic update`);
            onAtomicUpdate(DATA_SECTION_ID, { [key]: url });
        } else {
            // Fallback for robustness
            let config = quotationData.sections_config || [];
            config = JSON.parse(JSON.stringify(config));

            const existingIndex = config.findIndex(s => s.id === DATA_SECTION_ID);
            const newContent = existingIndex >= 0 ? config[existingIndex].content || {} : {};
            newContent[key] = url;

            const newSection = {
                id: DATA_SECTION_ID,
                isVisible: false, // Always hidden from UI main loop
                content: newContent
            };

            if (existingIndex >= 0) {
                config[existingIndex] = newSection;
            } else {
                config.push(newSection);
            }

            if (onUpdate) {
                onUpdate(config);
            }
        }
    };

    const handleUploadClick = (targetKey) => {
        setUploadTarget(targetKey);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadTarget) return;

        setIsUploading(true);
        let bucket = 'Desconocido';

        try {
            bucket = await getActiveBucket();
            const ext = file.name.split('.').pop();
            const fileName = `${activeTheme}/${uploadTarget}_${Date.now()}.${ext}`;

            // LIMIT: 50MB (Gateway Limit). If larger, use TUS to bypass.
            if (file.size > 50 * 1024 * 1024) {
                const { data: { session } } = await supabase.auth.getSession();
                const upload = new tus.Upload(file, {
                    endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
                    retryDelays: [0, 3000, 5000, 10000, 20000],
                    headers: {
                        authorization: `Bearer ${session?.access_token || supabaseAnonKey}`,
                        'x-upsert': 'true',
                        apikey: supabaseAnonKey,
                    },
                    uploadDataDuringCreation: true,
                    removeFingerprintOnSuccess: true,
                    metadata: {
                        bucketName: bucket,
                        objectName: fileName,
                        contentType: file.type || 'application/octet-stream',
                        cacheControl: '3600',
                    },
                    chunkSize: 6 * 1024 * 1024,
                    onError: function (error) {
                        console.error('TUS upload failed:', error);
                        toast({
                            title: "Error de Subida (TUS)",
                            description: `Bucket: ${bucket} | Error: ${error.message}`,
                            variant: "destructive"
                        });
                        setIsUploading(false);
                        setUploadTarget(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    },
                    onSuccess: function () {
                        const { data: { publicUrl } } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(fileName);

                        updateResource(uploadTarget, publicUrl);
                        toast({ title: "Archivo Grande Subido", description: "El documento se ha procesado con éxito (TUS)." });
                        setIsUploading(false);
                        setUploadTarget(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    },
                });

                const previousUploads = await upload.findPreviousUploads();
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                }
                upload.start();

            } else {
                // --- STANDARD UPLOAD (Small Files < 50MB) ---
                const { data, error } = await supabase.storage
                    .from(bucket)
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(fileName);

                updateResource(uploadTarget, publicUrl);
                toast({ title: "Archivo Subido Correctamente", description: "El documento se ha guardado." });

                setIsUploading(false);
                setUploadTarget(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }

        } catch (error) {
            console.error("Upload error:", error);
            const msg = error?.message || "Error desconocido";
            toast({
                title: "Error al subir archivo",
                description: `Bucket: ${bucket} | Detalle: ${msg}`,
                variant: "destructive"
            });
            setIsUploading(false);
            setUploadTarget(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleManualLink = (key) => {
        const url = window.prompt("Ingresa el enlace directo del archivo (URL):");
        if (url) {
            updateResource(key, url);
            toast({ title: "Enlace Vinculado", description: "El recurso se ha actualizado manualmente." });
        }
    };

    const handleDeleteResource = (key) => {
        updateResource(key, null);
        toast({ title: "Archivo Eliminado", description: "El enlace ha sido removido." });
    };

    const runExport = async (type, customAction = null) => {
        setExportType(type);
        setIsExporting(true);
        setProgress(0);
        setStatus('Iniciando Protocolo de Descarga...');

        const steps = [
            { p: 15, s: 'Verificando seguridad del archivo...' },
            { p: 40, s: 'Recuperando documento cifrado...' },
            { p: 75, s: 'Descomprimiendo assets...' },
            { p: 100, s: 'Descarga lista para iniciar.' }
        ];

        for (const step of steps) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
            setProgress(step.p);
            setStatus(step.s);
        }

        if (customAction) {
            await customAction();
        } else {
            onExport(type);
        }

        await new Promise(r => setTimeout(r, 800));
        setIsExporting(false);
        onClose();
    };

    // FIXED ORDER DEFINITION (No DND)
    // Row 1: Project A, Master Plan A
    // Row 2: Project B, Master Plan B
    // Row 3: Propuesta, Fichas
    // Row 4: Comparativa
    const fixedItems = [
        {
            id: 'project_a',
            type: 'resource',
            title: 'Proyecto A (PDF)',
            description: 'Documentación técnica del Proyecto A.',
            icon: <FileText className="w-6 h-6 text-indigo-400" />,
            color: 'hover:border-indigo-400/50'
        },
        {
            id: 'concentrado_a',
            type: 'resource',
            title: 'MASTER PLAN A',
            description: 'Listado detallado de equipos - Opción A.',
            icon: <Zap className="w-6 h-6 text-cyan-400" />,
            color: 'hover:border-cyan-400/50'
        },
        {
            id: 'project_b',
            type: 'resource',
            title: 'Proyecto B (PDF)',
            description: 'Documentación técnica del Proyecto B.',
            icon: <FileText className="w-6 h-6 text-pink-400" />,
            color: 'hover:border-pink-400/50'
        },
        {
            id: 'concentrado_b',
            type: 'resource',
            title: 'MASTER PLAN B',
            description: 'Listado detallado de equipos - Opción B.',
            icon: <Zap className="w-6 h-6 text-emerald-400" />,
            color: 'hover:border-emerald-400/50'
        },
        {
            id: 'propuesta',
            type: 'export',
            title: 'Propuesta Económica (PDF)',
            description: 'Generar PDF comercial de la inversión y conceptos.',
            icon: <FileText className="w-6 h-6 text-primary" />,
            action: () => runExport('propuesta'),
            color: 'hover:border-primary/50'
        },
        {
            id: 'fichas',
            type: 'export',
            title: 'Fichas Técnicas (PDF)',
            description: 'Descargar especificaciones en alta resolución.',
            icon: <FileCheck className="w-6 h-6 text-blue-400" />,
            action: () => runExport('fichas'),
            color: 'hover:border-blue-400/50'
        },
        {
            id: 'comparative',
            type: 'resource',
            title: 'Comparativa (PDF)',
            description: 'Análisis comparativo de opciones.',
            icon: <FileText className="w-6 h-6 text-orange-400" />,
            color: 'hover:border-orange-400/50',
            fullWidth: true // Special flag for the last item
        },
    ];

    // Use fixedItems directly to preserve layout structure
    const displayItems = fixedItems;

    return (
        <>
            <Dialog open={isOpen && !isExporting} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[1000px] w-full bg-zinc-950 border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
                            CENTRO DE <span className="text-primary text-3xl">EXPORTACIÓN</span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 text-base">
                            Documentación y Archivos del Proyecto.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Fixed 2-column Grid for "Line by Line" look */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        {displayItems.map((item) => {
                            const isResource = item.type === 'resource';
                            const hasFile = isResource ? !!resources[item.id] : true;
                            const isDisabled = !hasFile && !isEditorMode;

                            const handleClick = () => {
                                if (isDisabled) return;

                                if (item.type === 'export') {
                                    item.action();
                                } else {
                                    if (hasFile) {
                                        // Simple direct access - open in new tab
                                        window.open(resources[item.id], '_blank');
                                    } else if (isEditorMode) {
                                        handleUploadClick(item.id);
                                    }
                                }
                            };

                            return (
                                <div
                                    key={item.id}
                                    onClick={handleClick}
                                    className={`relative flex flex-col gap-3 p-6 border rounded-2xl text-left transition-all duration-300 group
                                    ${item.fullWidth ? 'md:col-span-2' : ''}
                                    ${isDisabled
                                            ? 'bg-zinc-900/20 border-white/5 opacity-50 cursor-not-allowed grayscale'
                                            : `bg-zinc-900/50 border-white/5 ${item.color} hover:bg-zinc-900 active:scale-95 cursor-pointer`
                                        }`}
                                >
                                    <div className="flex justify-between items-start w-full">
                                        <div className={`p-3 rounded-xl w-fit transition-transform text-white ${isDisabled ? 'bg-zinc-800' : 'bg-black/40 group-hover:scale-110'}`}>
                                            {item.icon}
                                        </div>

                                        {/* Controls for Resources */}
                                        {isResource && isEditorMode && (
                                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                <div
                                                    className="p-2 hover:bg-blue-500/10 rounded-full cursor-pointer transition-colors"
                                                    onClick={() => handleManualLink(item.id)}
                                                    title="Vincular enlace manual"
                                                >
                                                    <LinkIcon size={14} className="text-zinc-500 hover:text-blue-400" />
                                                </div>
                                                <div
                                                    className="p-2 hover:bg-white/10 rounded-full cursor-pointer transition-colors"
                                                    onClick={() => handleUploadClick(item.id)}
                                                    title="Subir archivo"
                                                >
                                                    <Upload size={14} className="text-zinc-500 hover:text-white" />
                                                </div>
                                                {hasFile && (
                                                    <div
                                                        className="p-2 hover:bg-red-500/10 rounded-full cursor-pointer transition-colors"
                                                        onClick={() => handleDeleteResource(item.id)}
                                                        title="Eliminar archivo"
                                                    >
                                                        <Trash2 size={14} className="text-zinc-500 hover:text-red-400" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Disabled Badge for Users */}
                                        {isDisabled && (
                                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded">
                                                No Disponible
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg transition-colors flex items-center gap-2 ${isDisabled ? 'text-zinc-500' : 'text-white group-hover:text-primary'}`}>
                                            {item.title}
                                            {hasFile && isResource && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">DISPONIBLE</span>}
                                        </h3>
                                        <p className="text-sm text-zinc-500 leading-snug">{item.description}</p>
                                    </div>
                                    {!hasFile && isResource && isEditorMode && (
                                        <div className="mt-2 text-[10px] items-center flex gap-1 text-primary font-bold uppercase tracking-wider">
                                            <Upload size={10} />
                                            Click para subir
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm rounded-xl">
                            <div className="flex flex-col items-center gap-4 animate-pulse">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <span className="text-primary font-bold tracking-widest text-xs">SUBIENDO DOCUMENTO...</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 tracking-widest uppercase font-black">
                        <span>SOLIMAQ CENTER v3.75</span>
                        <span>Estructura Simplificada</span>
                    </div>
                </DialogContent>
            </Dialog>

            <ExportProgress
                isOpen={isExporting}
                type={exportType}
                progress={progress}
                status={status}
            />
        </>
    );
};

export default ExportManager;
