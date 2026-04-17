import React, { useEffect, useMemo, useState, useRef } from "react";
// V1.0.2-TECH-CONSOLE-FIX
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExportTemplateEditor from '../components/ExportTemplateEditor';
import { supabase } from "@/lib/customSupabaseClient";
import PasswordPrompt from '@/components/PasswordPrompt';
import { getActiveBucket } from "@/lib/bucketResolver";
import { sanitizeFileName } from "@/lib/utils";
import SectionHeader from '@/components/SectionHeader';

import { Activity, Camera, Video, Image as ImageIcon, X, Check, Maximize2, Minimize2, Upload, Loader2, Play, Power, Lock, Unlock, Settings, Edit, Shield, AlignLeft, AlignCenter, AlignRight, AlignJustify, Calendar, User, Briefcase, ChevronRight, ChevronDown, ChevronsDown, ChevronsRight, FileSpreadsheet, Download, Plus, Minus, FileText, GripVertical, ChevronUp, ChevronsUp, Zap, Trash, Percent, RotateCcw, Search, PieChart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import { initialSections } from "@/data/initialMasterPlan";

const STORAGE_KEY = "solimaq_masterplan_v1_autonomo";
const DEFAULT_CLOUD_SLUG = "master-plan-concentrado";

const STICKY_OFFSETS = {
    header_compact: 64,
    module_title: 56,
};

const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};

const money = (v) => {
    const val = Number(v);
    if (!Number.isFinite(val)) return "$0.00";
    return val.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

const fmt = money;

const parseFinancial = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const clean = String(val).replace(/[$,%\s]/g, ''); // Remove $ , % and spaces
    const num = parseFloat(clean);
    return isFinite(num) ? num : 0;
};

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

const cleanTitle = (text) => {
    if (!text) return "";
    let clean = String(text);
    while (/^\d+[\.\-\)]?\s*/.test(clean)) {
        clean = clean.replace(/^\d+[\.\-\)]?\s*/, "");
    }
    return clean.trim().toUpperCase();
};

export default function MasterPlan({ slug: propSlug, parentSlug, legacySlug, isSubmenuMode = false, isAdmin: propIsAdmin, isEditorMode, isAdminAuthenticated: propIsAdminAuth, quotationData, isStandalone = true, activeTab, sectionData, setActiveSection }) {
    const { slug: paramsSlug } = useParams();

    // RESOLUTION LOGIC: 
    // 1. propSlug (passed directly)
    // 2. paramsSlug (from URL)
    // 3. quotationData.slug (from parent viewer)
    // 4. Default fallback
    const baseSlug = propSlug || paramsSlug || quotationData?.slug || DEFAULT_CLOUD_SLUG;

    const CLOUD_SLUG = baseSlug.startsWith('mp-') ? baseSlug : `mp-${baseSlug}`;
    const navigate = useNavigate();
    const { toast } = useToast();

    console.log("[MasterPlan] 🔍 Initialization:", {
        propSlug,
        paramsSlug,
        quotationDataSlug: quotationData?.slug,
        baseSlug,
        CLOUD_SLUG,
        isStandalone,
        hasQuotationData: !!quotationData,
        brandColor: quotationData?.brand_color
    });

    // State
    const [horasDia, setHorasDia] = useState(16);
    const [tipoCambio, setTipoCambio] = useState(18.5);
    const [ivaPct, setIvaPct] = useState(16);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
    const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [colsLocked, setColsLocked] = useState(() => localStorage.getItem("solimaq_masterplan_colsLocked") === "true");
    const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);

    const [clientName, setClientName] = useState(() => quotationData?.client || "CLIENTE");
    const [projectName, setProjectName] = useState(() => quotationData?.project || "PROYECTO");
    const [projectDesc, setProjectDesc] = useState(() => "Resumen ejecutivo del proyecto industrial.");
    const [projectDate, setProjectDate] = useState(() => new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }));
    const [logoUrl, setLogoUrl] = useState(() => quotationData?.logo || "/solimaq_logo.png");

    const [mpTitle, setMpTitle] = useState(() => localStorage.getItem("solimaq_mp_title") || "MASTER PLAN");
    const [mpSubTitle, setMpSubTitle] = useState(() => localStorage.getItem("solimaq_mp_subtitle") || "SOLIMAQ CENTER");
    const [heroVideoUrl, setHeroVideoUrl] = useState(() => localStorage.getItem("solimaq_mp_hero_video") || "");
    const [isHeroVideoActive, setIsHeroVideoActive] = useState(false);
    const [heroVideoIsIntegrated, setHeroVideoIsIntegrated] = useState(() => localStorage.getItem("solimaq_mp_hero_integrated") === "true");
    const [heroVideoScale, setHeroVideoScale] = useState(() => Number(localStorage.getItem("solimaq_mp_hero_scale")) || 100);
    const [heroVideoBorderRadius, setHeroVideoBorderRadius] = useState(() => Number(localStorage.getItem("solimaq_mp_hero_radius")) || 20);
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [lastCloudSync, setLastCloudSync] = useState(null);
    const [tableFontSize, setTableFontSize] = useState(() => Number(localStorage.getItem("solimaq_mp_table_font_size")) || 14);
    const [isHydrated, setIsHydrated] = useState(false);
    const [importedFileName, setImportedFileName] = useState(() => localStorage.getItem("solimaq_mp_imported_filename") || "");
    const [globalUtilVal, setGlobalUtilVal] = useState(10);
    const [globalQtyVal, setGlobalQtyVal] = useState(1);
    const [isPriceEditMode, setIsPriceEditMode] = useState(false);
    const [targetAmountModalOpen, setTargetAmountModalOpen] = useState(false);
    const [targetAmountValue, setTargetAmountValue] = useState(0);
    const [isExportFilenameModalOpen, setIsExportFilenameModalOpen] = useState(false);
    const [exportFilename, setExportFilename] = useState("");
    const [exportTitle, setExportTitle] = useState("");
    const [exportClient, setExportClient] = useState("");
    const [exportProject, setExportProject] = useState("");
    const [exportTC, setExportTC] = useState(18.5);
    const [pdfExportType, setPdfExportType] = useState(null); // 'master' or 'equipment-list'
    const [backupSections, setBackupSections] = useState(null);
    const [isRestoratable, setIsRestoratable] = useState(false);
    const [preloadedLogo, setPreloadedLogo] = useState(null);
    const [showDescriptions, setShowDescriptions] = useState(true);
    const [showMedia, setShowMedia] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [availableProjects, setAvailableProjects] = useState([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    
    // Cálculo de Masas
    const [isMassCalcModalOpen, setIsMassCalcModalOpen] = useState(false);
    const [totalDailyTons, setTotalDailyTons] = useState(2250);
    const [workingHours, setWorkingHours] = useState(8);
    const [hoveredItem, setHoveredItem] = useState(null);
    const [lockedItem, setLockedItem] = useState('organic'); // Default lock on organic
    const [tableColumnScale, setTableColumnScale] = useState(1.0);
    const [wasteColWidths, setWasteColWidths] = useState({
        num: 40, label: 190, percent: 80, tonsDay: 100, tonsHr: 100, dirty: 110, recycled: 100, util: 140
    });
    const [isWasteTableLocked, setIsWasteTableLocked] = useState(false);
    const [wasteColOrder, setWasteColOrder] = useState(['num', 'label', 'percent', 'tonsDay', 'tonsHr', 'dirty', 'recycled', 'util']);
    const [draggedWasteCol, setDraggedWasteCol] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [currencyMode, setCurrencyMode] = useState('MXN'); // 'MXN' or 'USD'

    // ESC Key to unlock
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setLockedItem(null);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        if (activeTab === 'balance_masas') {
            setIsMassCalcModalOpen(true);
        }
    }, [activeTab]);
    const [wasteComposition, setWasteComposition] = useState([
        { id: 'organic', label: 'Orgánicos', color: '#A3E635', percent: 44, priceDirty: 0, priceRecycled: 450 },
        { id: 'others', label: 'Otros', color: '#65A30D', percent: 25, priceDirty: -200, priceRecycled: 0 },
        { id: 'plastics', label: 'Plásticos', color: '#10B981', percent: 16, priceDirty: 3500, priceRecycled: 8500 },
        { id: 'paper', label: 'Papel/Cartón', color: '#2D9CDB', percent: 11, priceDirty: 2100, priceRecycled: 4200 },
        { id: 'glass', label: 'Vidrio', color: '#F2994A', percent: 2, priceDirty: 800, priceRecycled: 1500 },
        { id: 'metals', label: 'Metales', color: '#EB5757', percent: 2, priceDirty: 12000, priceRecycled: 18500 }
    ]);

    const updateItemData = (id, field, value) => {
        setWasteComposition(prev => prev.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleExportMassPDF = async () => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const primaryColor = '#A3E635';
        const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // 1. CARGAR LOGO BLANCO
        const finalUrl = "/solimaq_logo_white.png";
        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const startExport = () => {
            // HEADER BOX (HEIGHT REDUCED 20%)
            doc.setFillColor(40, 40, 40);
            doc.rect(0, 0, 210, 36, 'F');

            // 1. LOGO AL LADO IZQUIERDO
            if (logoImg) {
                try {
                    const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                    const targetHeight = 13;
                    const targetWidth = targetHeight * ratio;
                    doc.addImage(logoImg, 'PNG', 20, 11, targetWidth, targetHeight, undefined, 'FAST');
                } catch (e) { console.error("PDF Logo Error", e); }
            }

            // 2. TEXTO AL LADO DERECHO (TITULOS)
            doc.setTextColor(primaryColor);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("RADIOGRAFÍA DE MASAS", 190, 18, { align: 'right' });
            
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(150, 150, 150);
            const labelX = 140;
            const valX = 165;
            doc.text(`PROYECTO:`, labelX, 26);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(255, 255, 255);
            doc.text(`${String(projectName || CLOUD_SLUG).toUpperCase()}`, valX, 26);
            
            doc.setFont("helvetica", "bold");
            doc.setTextColor(150, 150, 150);
            doc.text(`FECHA:`, labelX, 31);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(255, 255, 255);
            doc.text(`${date}`, valX, 31);

            // 3. RESUMEN EJECUTIVO (CORREGIDO OVERLAP)
            doc.setFillColor(245, 245, 245);
            doc.roundedRect(20, 50, 80, 45, 4, 4, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.text("CAPACIDAD INSTALADA TOTAL", 30, 68);
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(28);
            const tonsText = totalDailyTons.toLocaleString();
            const tonsWidth = doc.getTextWidth(tonsText); // Medir con fuente 28
            doc.text(tonsText, 30, 82);
            doc.setFontSize(12);
            doc.text(`T/D`, 35 + tonsWidth, 82); // Añadir margen extra (35 en lugar de 30)

            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text(`PROCESO: ${workingHours} HORAS/DÍA`, 30, 90);

            // 4. GRÁFICA CIRCULAR CORREGIDA (SECTORES LIMPIOS)
            const centerX = 125; // Movido un poco a la izquierda para dejar espacio a leyenda
            const centerY = 70;
            const radius = 22;
            let currentAngle = -Math.PI / 2;

            wasteComposition.forEach(item => {
                const sliceAngle = (item.percent / 100) * (2 * Math.PI);
                doc.setFillColor(item.color);
                
                const segments = 20;
                const path = [];
                for(let i=0; i<=segments; i++){
                    const ang = currentAngle + (sliceAngle * (i/segments));
                    path.push({
                        x: centerX + Math.cos(ang) * radius,
                        y: centerY + Math.sin(ang) * radius
                    });
                }
                
                // Real sector drawing (Fill only to avoid lines)
                for(let i=0; i<segments; i++){
                    doc.triangle(
                        centerX, centerY,
                        path[i].x, path[i].y,
                        path[i+1].x, path[i+1].y,
                        'F'
                    );
                }
                currentAngle += sliceAngle;
            });

            // Donut Center
            doc.setFillColor(255, 255, 255);
            doc.circle(centerX, centerY, radius * 0.5, 'F');
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(`${totalDailyTons}`, centerX, centerY + 1, { align: 'center' });

            // 5. LEYENDA DE COLORES
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(7);
            doc.setFont("helvetica", "bold");
            doc.text("DESGLOSE DE MEZCLA:", 160, 50);

            let legendY = 55;
            const legendX = 160;
            wasteComposition.forEach(item => {
                doc.setFillColor(item.color);
                doc.circle(legendX, legendY - 1, 1.5, 'F');
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.text(`${item.label.toUpperCase()} (${item.percent}%)`, legendX + 4, legendY);
                legendY += 5;
            });

            // 6. MATRIZ OPERATIVA (AUTO-TABLE)
            const tableRows = wasteComposition.map((item, idx) => {
                const tonsDay = (totalDailyTons * item.percent) / 100;
                const tonsHr = tonsDay / workingHours;
                const pDirty = currencyMode === 'MXN' ? item.priceDirty : item.priceDirty / tipoCambio;
                const pRecycled = currencyMode === 'MXN' ? item.priceRecycled : item.priceRecycled / tipoCambio;
                const utility = tonsDay * (item.priceRecycled - item.priceDirty);
                const pUtil = currencyMode === 'MXN' ? utility : utility / tipoCambio;

                return [
                    idx + 1,
                    item.label.toUpperCase(),
                    `${item.percent}%`,
                    tonsDay.toLocaleString(undefined, { maximumFractionDigits: 1 }),
                    tonsHr.toFixed(2),
                    `$ ${pDirty.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    `$ ${pRecycled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    `$ ${pUtil.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                ];
            });

            const totalUtilityVal = wasteComposition.reduce((sum, item) => sum + ((totalDailyTons * item.percent / 100) * (item.priceRecycled - item.priceDirty)), 0);
            const dispTotalUtil = currencyMode === 'MXN' ? totalUtilityVal : totalUtilityVal / tipoCambio;

            const totalCompactVal = wasteComposition.reduce((sum, item) => sum + ((totalDailyTons * item.percent / 100) * item.priceDirty), 0);
            const dispTotalCompact = currencyMode === 'MXN' ? totalCompactVal : totalCompactVal / tipoCambio;

            const totalRecycledVal = wasteComposition.reduce((sum, item) => sum + ((totalDailyTons * item.percent / 100) * item.priceRecycled), 0);
            const dispTotalRecycled = currencyMode === 'MXN' ? totalRecycledVal : totalRecycledVal / tipoCambio;

            doc.autoTable({
                startY: 105,
                head: [['#', 'FRACCIÓN', '%', 'TON/D', 'TON/H', 'P. COMP. ($/T)', 'P. RECIC. ($/T)', 'UTILIDAD ($/D)']],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [30,30,30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7 },
                styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { fontStyle: 'bold', cellWidth: 35 },
                    2: { halign: 'center', cellWidth: 12 },
                    3: { halign: 'center', cellWidth: 20 },
                    4: { halign: 'center', cellWidth: 20 },
                    5: { halign: 'right' },
                    6: { halign: 'right' },
                    7: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] }
                },
                foot: [[
                    { content: 'TOTALES / BALANCE DIARIO', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalDailyTons.toLocaleString()} T/D`, styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: `${(totalDailyTons / workingHours).toFixed(1)} T/H`, styles: { halign: 'center', fontStyle: 'bold' } },
                    { content: `$ ${dispTotalCompact.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `$ ${dispTotalRecycled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `$ ${dispTotalUtil.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currencyMode}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [163, 230, 53], textColor: [0, 0, 0] } }
                ]],
                margin: { left: 20, right: 20 },
                didDrawPage: (data) => {
                    doc.setFontSize(7);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`SOLIMAQ CENTER v1.0 | Radiografía de Masas | Página ${data.pageNumber}`, 105, 285, { align: 'center' });
                }
            });

            const cleanName = `RADIOGRAFIA_MASAS_${String(projectName || "PROYECTO").replace(/\s+/g, '_')}`.toUpperCase();
            doc.save(`${cleanName}.pdf`);
            toast({ title: "Reporte Técnico Generado", description: "La Radiografía de Masas ha sido exportada correctamente." });
        };

        startExport();
    };

    const updateItemColor = (id, newColor) => {

        setWasteComposition(prev => prev.map(item => 
            item.id === id ? { ...item, color: newColor } : item
        ));
    };

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        // Always use the physical logo from public folder for exports
        img.src = "/solimaq_logo.png?v=" + Date.now();
        img.onload = () => setPreloadedLogo(img);
    }, []);


    const [pdfSettings, setPdfSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('solimaq_pdf_template_v11');
            return saved ? JSON.parse(saved) : {
                primaryColor: '#9BD428',
                secondaryColor: '#000000',
                headerBg: '#9BD428',
                headerText: '#000000',
                titleText: 'CONCENTRADO',
                logoPos: { x: 235, y: 0, width: 45, height: 25 },
                headerBox: { x: 15, y: 0, width: 95, height: 15 },
                metaPos: { x: 120, y: 3 },
                colWidths: { item: 15, equipo: 45, desc: 85, foto: 35, qty: 15, unit: 32, total: 32 },
                fontSize: 9,
                rowHeight: 25,
                showImages: true,
                imgSize: 18,
            };
        } catch { return null; }
    });

    const logoRef = useRef(null);
    const heroVideoInputRef = useRef(null);
    const fileInputRef = useRef(null);
    const tableRefs = useRef({});
    const headerRefs = useRef({});
    const tableContainerRefs = useRef({});
    const virtualHeaderRefs = useRef({});

    const [colWidths, setColWidths] = useState(() => {
        try {
            const saved = localStorage.getItem("solimaq_masterplan_colWidths_v2");
            return saved ? JSON.parse(saved) : {
                item: 80, equipo: 250, descripcion: 350, media: 120, qty: 80, costo: 130, util: 80, unitario: 140, total: 160, action: 60
            };
        } catch { return { item: 80, equipo: 250, descripcion: 350, media: 120, qty: 80, costo: 130, util: 80, unitario: 140, total: 160, action: 60 }; }
    });

    const [sections, setSections] = useState(() => {
        // AGGRESSIVE FIX: Always start with expanded default sections
        // This bypasses all localStorage issues
        console.log("[MasterPlan] 🔧 FORCE-LOADING expanded default sections");
        return initialSections;
    });

    useEffect(() => {
        if (propIsAdminAuth !== undefined) setIsAdminAuthenticated(propIsAdminAuth);
    }, [propIsAdminAuth]);

    useEffect(() => {
        if (propIsAdmin !== undefined) setIsAdmin(propIsAdmin);
        // CRITICAL FIX: To allow "User Mode" toggle even when authenticated,
        // we must strictly follow isEditorMode if it's available.
        // isAdminAuthenticated enables the toggle, but isEditorMode determines the state.
        else setIsAdmin(Boolean(isEditorMode));
    }, [propIsAdmin, isEditorMode]);

    useEffect(() => {
        if (quotationData) {
            if (quotationData.client) setClientName(quotationData.client);
            if (quotationData.project) setProjectName(quotationData.project);
            if (quotationData.logo) setLogoUrl(quotationData.logo);
        }
    }, [quotationData?.client, quotationData?.project, quotationData?.logo]);

    useEffect(() => {
        if (!isHydrated) return;
        localStorage.setItem("solimaq_mp_client", clientName);
        localStorage.setItem("solimaq_mp_project", projectName);
        localStorage.setItem("solimaq_mp_desc", projectDesc);
        localStorage.setItem("solimaq_mp_date", projectDate);
        localStorage.setItem("solimaq_mp_logo", logoUrl);
        localStorage.setItem("solimaq_mp_title", mpTitle);
        localStorage.setItem("solimaq_mp_subtitle", mpSubTitle);
        localStorage.setItem("solimaq_mp_hero_video", heroVideoUrl);
        localStorage.setItem("solimaq_mp_hero_integrated", heroVideoIsIntegrated);
        localStorage.setItem("solimaq_mp_hero_scale", heroVideoScale);
        localStorage.setItem("solimaq_mp_hero_radius", heroVideoBorderRadius);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
        localStorage.setItem("solimaq_masterplan_colsLocked", colsLocked);
        localStorage.setItem("solimaq_masterplan_colWidths_v2", JSON.stringify(colWidths));
        localStorage.setItem("solimaq_mp_table_font_size", tableFontSize);
        if (pdfSettings) localStorage.setItem('solimaq_pdf_template_v11', JSON.stringify(pdfSettings));
    }, [clientName, projectName, projectDesc, projectDate, mpTitle, mpSubTitle, heroVideoUrl, heroVideoIsIntegrated, heroVideoScale, heroVideoBorderRadius, sections, colsLocked, colWidths, tableFontSize, pdfSettings, isHydrated]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 100);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setSelectedMedia(null);
                setIsHeroVideoActive(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        const handleGlobalExport = (e) => {
            if (e.detail?.type === 'masterplan' || e.detail?.type === 'excel') {
                if (e.detail?.type === 'excel') {
                    handleExportExcel();
                } else {
                    // Logic: If on regular user view, direct download. If Admin, maybe editor?
                    // User requested direct export from Global Center.
                    generateDirectPDF();
                }
            }
        };
        window.addEventListener('EXPORT_QUOTATION', handleGlobalExport);
        return () => window.removeEventListener('EXPORT_QUOTATION', handleGlobalExport);
    }, [sections, clientName, projectName, pdfSettings, logoUrl]);

    // Logic for Cloud Syncing and Data management...
    const fetchCloudData = async () => {
        console.log("[MasterPlan] Fetching cloud data for:", CLOUD_SLUG);
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select('*')
                .eq('slug', CLOUD_SLUG)
                .single();

            if (error) {
                if (error.code !== 'PGRST116') {
                    console.warn("[MasterPlan] Supabase error:", error);
                } else {
                    console.log("[MasterPlan] No specific cloud record found for:", CLOUD_SLUG);
                }
            }

            let finalData = data;

            // FALLBACK LOGIC
            // If mp-XXX doesn't exist, try parent XXX
            // If parent XXX is what we are currently trying, skip to avoid loops
            if (!finalData && parentSlug && parentSlug !== CLOUD_SLUG && parentSlug !== baseSlug) {
                console.log("[MasterPlan] Trying parent slug fallback:", parentSlug);
                const { data: pData } = await supabase.from('quotations').select('*').eq('slug', parentSlug).single();
                if (pData) {
                    console.log("[MasterPlan] Using parent slug data as fallback");
                    finalData = pData;
                }
            }

            // If still nothing, try the baseSlug without mp- prefix if it's different
            if (!finalData && baseSlug !== CLOUD_SLUG) {
                console.log("[MasterPlan] Trying base slug fallback:", baseSlug);
                const { data: bData } = await supabase.from('quotations').select('*').eq('slug', baseSlug).single();
                if (bData) {
                    console.log("[MasterPlan] Using base slug data as fallback");
                    finalData = bData;
                }
            }

            console.log("[MasterPlan] 📦 Query result:", {
                found: !!finalData,
                slug: finalData?.slug,
                hasSectionsConfig: !!finalData?.sections_config
            });

            if (finalData) {
                console.log("[MasterPlan] ✅ Cloud data received:", finalData.slug);
                const config = finalData.sections_config || {};
                const isProjectSpecificData = finalData.slug === CLOUD_SLUG;

                if (isProjectSpecificData) {
                    if (config.mpTitle) setMpTitle(config.mpTitle);
                    if (config.mpSubTitle) setMpSubTitle(config.mpSubTitle);
                    if (config.projectDesc) setProjectDesc(config.projectDesc);
                }

                if (finalData.logo) setLogoUrl(finalData.logo);
                if (finalData.client) setClientName(finalData.client);
                if (finalData.project) setProjectName(finalData.project);

                if (quotationData) {
                    // Props take precedence if provided (e.g. wrapper overrides)
                    if (quotationData.client) setClientName(quotationData.client);
                    if (quotationData.project) setProjectName(quotationData.project);
                    if (quotationData.logo) setLogoUrl(quotationData.logo);
                }

                if (finalData.video_url || config.heroVideoUrl) setHeroVideoUrl(finalData.video_url || config.heroVideoUrl);
                if (config.heroVideoIsIntegrated !== undefined) setHeroVideoIsIntegrated(config.heroVideoIsIntegrated);
                if (config.heroVideoScale) setHeroVideoScale(config.heroVideoScale);
                if (config.pdfSettings) setPdfSettings(config.pdfSettings);
                if (config.heroVideoBorderRadius) setHeroVideoBorderRadius(config.heroVideoBorderRadius);
                if (config.tableFontSize) setTableFontSize(config.tableFontSize);

                if (finalData.slug === CLOUD_SLUG || finalData.slug === parentSlug || finalData.slug === baseSlug) {
                    const sectionsToSet = config.sections || (Array.isArray(config) ? config : null);
                    if (sectionsToSet && sectionsToSet.length > 0) {
                        const cleaned = sectionsToSet.filter(s => s).map(s => ({ ...s, titulo: cleanTitle(s.titulo) }));
                        setSections(isAdmin ? cleaned : cleaned.map(s => ({ ...s, collapsed: true })));
                    } else {
                        // If we have no cloud sections but we matched a record, 
                        // reset to expanded defaults to be visible
                        setSections(initialSections.map(s => ({ ...s, collapsed: true })));
                    }
                }
                setLastCloudSync(new Date());
            } else {
                console.log("[MasterPlan] ⚠️ No cloud data found, using default sections (Expanded)");
                setSections(initialSections.map(s => ({ ...s, collapsed: true })));
            }
            console.log("[MasterPlan] ✅ Hydration complete - rendering content", { sectionsCount: sections.length });
            setIsHydrated(true);
        } catch (error) {
            console.error("[MasterPlan] ❌ Cloud fetch error, but forcing hydration anyway:", error);
            // ENSURE we have sections even on error
            if (sections.length === 0) {
                console.log("[MasterPlan] 🔧 Loading default sections due to error");
                setSections(initialSections.map(s => ({ ...s, collapsed: true })));
            }
            setIsHydrated(true);
        }
    };

    useEffect(() => { fetchCloudData(); }, [CLOUD_SLUG]);

    // Safety timeout: force hydration after 3s if not already hydrated
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!isHydrated) {
                console.warn("[MasterPlan] ⚠️ Forcing hydration after 3s timeout - data loading may have failed");
                setIsHydrated(true);
            }
        }, 3000);
        return () => clearTimeout(timeout);
    }, [isHydrated]);

    // REMOVED: Auto-expand in integrated mode - sections should be collapsed by default
    // const hasExpandedRef = useRef(false);
    // useEffect(() => {
    //     if (!isStandalone && sections.length > 0 && !hasExpandedRef.current) {
    //         const hasCollapsed = sections.some(s => s.collapsed);
    //         if (hasCollapsed) {
    //             console.log("[MasterPlan] 🔧 Forcing expansion in integrated mode");
    //             hasExpandedRef.current = true;
    //             setSections(prev => prev.map(s => ({ ...s, collapsed: false })));
    //         } else {
    //             hasExpandedRef.current = true; // Mark as done even if no collapsed sections
    //         }
    //     }
    // }, [isStandalone]); // Only depend on isStandalone, not sections.length


    const saveToCloud = async (overrideData = null, configOverrides = {}) => {
        setIsCloudSyncing(true);
        try {
            const sectionsToSave = (overrideData || sections).map(s => ({
                ...s,
                items: (s.items || []).map(it => ({ ...it, ventaUSD: calcItem(it).ventaUnitFinal }))
            }));

            // Resolving values: priority to overrides, then state
            const finalMpTitle = configOverrides.mpTitle || mpTitle;
            const finalMpSubTitle = configOverrides.mpSubTitle || mpSubTitle;
            const finalProjectDesc = configOverrides.projectDesc || projectDesc;
            const finalHeroVideo = configOverrides.heroVideoUrl || heroVideoUrl;
            const finalHeroIntegrated = configOverrides.heroVideoIsIntegrated !== undefined ? configOverrides.heroVideoIsIntegrated : heroVideoIsIntegrated;
            const finalHeroScale = configOverrides.heroVideoScale || heroVideoScale;
            const finalHeroRadius = configOverrides.heroVideoBorderRadius || heroVideoBorderRadius;
            const finalTableFontSize = configOverrides.tableFontSize || tableFontSize;
            const finalPdfSettings = configOverrides.pdfSettings || pdfSettings;

            const finalClient = configOverrides.client || clientName;
            const finalProject = configOverrides.project || projectName;
            const finalLogo = configOverrides.logo || logoUrl;

            const configObject = {
                sections: sectionsToSave,
                mpTitle: finalMpTitle,
                mpSubTitle: finalMpSubTitle,
                projectDesc: finalProjectDesc,
                heroVideoUrl: finalHeroVideo,
                heroVideoIsIntegrated: finalHeroIntegrated,
                heroVideoScale: finalHeroScale,
                heroVideoBorderRadius: finalHeroRadius,
                tableFontSize: finalTableFontSize,
                pdfSettings: finalPdfSettings
            };

            const { error } = await supabase.from('quotations').upsert({
                slug: CLOUD_SLUG,
                theme_key: CLOUD_SLUG,
                project: finalProject,
                client: finalClient,
                logo: finalLogo,
                sections_config: configObject,
                video_url: finalHeroVideo,
                updated_at: new Date().toISOString()
            }, { onConflict: 'slug' });

            if (error) throw error;
            setLastCloudSync(new Date());
        } catch (error) {
            console.error("Cloud save error:", error);
            toast({ title: "Error de Sincronización", description: "No se pudo guardar en la nube.", variant: "destructive" });
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const calcItem = (it) => {
        const cost = n(it.costoUSD);
        const util = n(it.utilidad);
        const quantity = n(it.qty);
        // INDUSTRIAL MARKUP: Price = Cost * (1 + Util/100)
        // 100% util means doubling the cost
        const ventaUnit = cost * (1 + (util / 100));
        return {
            ventaUnitFinal: ventaUnit,
            totalVenta: ventaUnit * quantity
        };
    };

    const sectionTotals = useMemo(() => {
        if (!Array.isArray(sections)) return [];
        return sections.map(s => {
            const items = Array.isArray(s.items) ? s.items : [];
            // If section is inactive, its total is 0
            const isActive = s.activo !== false;
            const totalVenta = isActive ? items.reduce((acc, it) => it.activo !== false ? acc + calcItem(it).totalVenta : acc, 0) : 0;
            const totalCosto = isActive ? items.reduce((acc, it) => it.activo !== false ? acc + (n(it.costoUSD) * n(it.qty)) : acc, 0) : 0;
            return { sectionId: s.id, totalVenta, totalCosto, isActive };
        });
    }, [sections]);

    const grandTotals = useMemo(() => {
        const totalVenta = sectionTotals.reduce((acc, s) => acc + s.totalVenta, 0);
        const totalCosto = sectionTotals.reduce((acc, s) => acc + s.totalCosto, 0);
        const totalKW = (sections || []).reduce((acc, s) => {
            if (s.activo === false) return acc;
            return acc + (s.items || []).reduce((iAcc, it) => it.activo !== false ? iAcc + (n(it.potencia) * n(it.qty)) : iAcc, 0);
        }, 0);
        const mxnSinIvaVenta = totalVenta * tipoCambio;
        const ivaVenta = mxnSinIvaVenta * (ivaPct / 100);
        
        const utilidadUSD = totalVenta - totalCosto;
        const utilidadMXN = utilidadUSD * tipoCambio;
        const utilidadPromedioPct = totalCosto > 0 ? (utilidadUSD / totalCosto) * 100 : 0;

        return { 
            totalVenta, 
            totalCosto,
            totalKW, 
            mxnSinIvaVenta, 
            ivaVenta, 
            totalVentaMXN: mxnSinIvaVenta + ivaVenta,
            utilidadUSD,
            utilidadMXN,
            utilidadPromedioPct
        };
    }, [sections, sectionTotals, tipoCambio, ivaPct]);

    // Handlers
    const updateSection = (id, fields) => setSections(prev => prev.map(s => s.id === id ? { ...s, ...fields } : s));
    const updateSectionTitle = (id, val) => updateSection(id, { titulo: val.toUpperCase() });
    const toggleSection = (id) => updateSection(id, { collapsed: !sections.find(s => s.id === id).collapsed });
    const toggleSectionActive = (id) => {
        const current = sections.find(s => s.id === id);
        updateSection(id, { activo: current.activo === false ? true : false });
        // Don't saveToCloud here, useEffect on sections will handle it or we can call it manually
    };

    const toggleAllSections = (val) => {
        setSections(sections.map(s => ({ ...s, collapsed: val })));
    };

    const deselectAllModules = () => {
        const newSections = sections.map(s => ({ ...s, activo: false }));
        setSections(newSections);
        saveToCloud(newSections);
        toast({ title: "Módulos Desactivados", description: "Todos los módulos han sido desactivados para selección manual." });
    };

    const addSection = () => {
        const nextSecIdx = sections.length + 1;
        const newSec = {
            id: `sec_${uid()}`,
            collapsed: false,
            titulo: "NUEVO MÓDULO",
            tag: "BORRADOR",
            items: [{
                id: uid(),
                activo: true,
                codigo: `${nextSecIdx}.1`,
                equipo: "NUEVO EQUIPO",
                descripcion: "",
                potencia: 0,
                qty: 1,
                costoUSD: 0,
                utilidad: 10
            }]
        };
        const newSections = [...sections, newSec];
        setSections(newSections);
        saveToCloud(newSections);
    };

    const reindexAll = () => {
        const newSections = sections.map((s, sIdx) => {
            let activeCount = 0;
            return {
                ...s,
                items: (s.items || []).map((it) => {
                    if (it.activo !== false) {
                        activeCount++;
                        return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
                    }
                    return { ...it, codigo: "-" };
                })
            };
        });
        setSections(newSections);
        saveToCloud(newSections);
        toast({ title: "Numeración Normalizada", description: "Todos los ítems han sido renumerados correctamente." });
    };

    const toggleItemActive = (sId, iId) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;

        let activeCount = 0;
        const newItems = (sections[sIdx].items || []).map(it => {
            const isTarget = it.id === iId;
            const newStatus = isTarget ? !it.activo : it.activo;

            if (newStatus !== false) {
                activeCount++;
                return { ...it, activo: newStatus, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, activo: newStatus, codigo: "-" };
        });

        const newSections = sections.map(sec => sec.id === sId ? { ...sec, items: newItems } : sec);
        setSections(newSections);
        saveToCloud(newSections);
    };

    const moveSection = (id, direction) => {
        const idx = sections.findIndex(s => s.id === id);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= sections.length) return;

        const newSections = [...sections];
        const [moved] = newSections.splice(idx, 1);
        newSections.splice(newIdx, 0, moved);

        // Reindex item codes (like 1.1, 1.2) for the affected blocks
        const reindexed = newSections.map((s, sIdx) => ({
            ...s,
            items: (s.items || []).map((it, iIdx) => ({
                ...it,
                codigo: `${sIdx + 1}.${iIdx + 1}`
            }))
        }));

        setSections(reindexed);
        saveToCloud(reindexed);
    };

    const removeSection = (id) => {
        if (window.confirm("¿Eliminar este módulo completo?")) {
            const filtered = sections.filter(s => s.id !== id);
            // Reindex everything after removal
            const reindexed = filtered.map((s, sIdx) => ({
                ...s,
                items: (s.items || []).map((it, iIdx) => ({
                    ...it,
                    codigo: `${sIdx + 1}.${iIdx + 1}`
                }))
            }));
            setSections(reindexed);
            saveToCloud(reindexed);
        }
    };

    const updateItem = (sId, iId, fields) => {
        setSections(prev => prev.map(s => s.id === sId ? { ...s, items: (s.items || []).map(it => it.id === iId ? { ...it, ...fields } : it) } : s));
    };

    const updateItemByTotalVenta = (sId, iId, targetTotal) => {
        const s = sections.find(x => x.id === sId);
        const it = s.items.find(x => x.id === iId);
        const qty = n(it.qty) || 1;
        const targetVentaUnit = targetTotal / qty;
        const cost = n(it.costoUSD);
        // Inverse of Markup: (Price / Cost - 1) * 100
        let newUtil = cost === 0 ? 0 : ((targetVentaUnit / cost) - 1) * 100;
        updateItem(sId, iId, { utilidad: newUtil });
    };

    const addItem = (sId) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;
        const s = sections[sIdx];
        const oldItems = [...(s.items || [])];

        const newItem = {
            id: uid(),
            activo: true,
            codigo: "", // will be set below
            equipo: "NUEVO EQUIPO",
            descripcion: "",
            potencia: 0,
            qty: 1,
            costoUSD: 0,
            utilidad: globalUtilVal
        };

        const tempItems = [...oldItems, newItem];
        let activeCount = 0;
        const newItems = tempItems.map(it => {
            if (it.activo !== false) {
                activeCount++;
                return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, codigo: "-" };
        });

        updateSection(sId, { items: newItems });
    };

    const removeItem = (sId, iId) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;
        const filtered = (sections[sIdx].items || []).filter(it => it.id !== iId);

        // REINDEX AFTER REMOVE
        let activeCount = 0;
        const reindexed = filtered.map((it) => {
            if (it.activo !== false) {
                activeCount++;
                return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, codigo: "-" };
        });

        const newSections = sections.map(sec => sec.id === sId ? { ...sec, items: reindexed } : sec);
        setSections(newSections);
        saveToCloud(newSections);
    };

    const moveItem = (sId, iId, direction) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;
        const items = [...(sections[sIdx].items || [])];
        const idx = items.findIndex(it => it.id === iId);
        if (idx === -1) return;
        const nextIdx = idx + direction;
        if (nextIdx < 0 || nextIdx >= items.length) return;

        const [removed] = items.splice(idx, 1);
        items.splice(nextIdx, 0, removed);

        // REINDEX
        let activeCount = 0;
        const reindexed = items.map((it) => {
            if (it.activo !== false) {
                activeCount++;
                return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, codigo: "-" };
        });

        const newSections = sections.map(sec => sec.id === sId ? { ...sec, items: reindexed } : sec);
        setSections(newSections);
        saveToCloud(newSections);
    };

    const moveItemToStart = (sId, iId) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;
        const items = [...(sections[sIdx].items || [])];
        const idx = items.findIndex(it => it.id === iId);
        if (idx <= 0) return;
        const [removed] = items.splice(idx, 1);
        items.unshift(removed);

        // REINDEX
        let activeCount = 0;
        const reindexed = items.map((it) => {
            if (it.activo !== false) {
                activeCount++;
                return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, codigo: "-" };
        });

        const newSections = sections.map(sec => sec.id === sId ? { ...sec, items: reindexed } : sec);
        setSections(newSections);
        saveToCloud(newSections);
    };

    const moveItemToEnd = (sId, iId) => {
        const sIdx = sections.findIndex(x => x.id === sId);
        if (sIdx === -1) return;
        const items = [...(sections[sIdx].items || [])];
        const idx = items.findIndex(it => it.id === iId);
        if (idx === -1 || idx === items.length - 1) return;
        const [removed] = items.splice(idx, 1);
        items.push(removed);

        // REINDEX
        let activeCount = 0;
        const reindexed = items.map((it) => {
            if (it.activo !== false) {
                activeCount++;
                return { ...it, codigo: `${sIdx + 1}.${activeCount}` };
            }
            return { ...it, codigo: "-" };
        });

        const newSections = sections.map(sec => sec.id === sId ? { ...sec, items: reindexed } : sec);
        setSections(newSections);
        saveToCloud(newSections);
    };

    const justifyAllDescriptions = () => {
        setSections(prev => prev.map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, descAlign: "justify" }))
        })));
        toast({ title: "Justificación Completa", description: "Todas las descripciones han sido justificadas." });
    };

    const applyGlobalUtilization = () => {
        // Guardar respaldo antes de aplicar
        setBackupSections(JSON.parse(JSON.stringify(sections)));
        setIsRestoratable(true);

        setSections(sections.map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, utilidad: globalUtilVal }))
        })));
        toast({ title: "Utilidad aplicada", description: `Se aplicó ${globalUtilVal}% de utilidad a todo el proyecto.` });
    };

    const restoreOriginalUtilization = () => {
        if (!backupSections) return;
        setSections(backupSections);
        setBackupSections(null);
        setIsRestoratable(false);
        toast({ title: "Valores Restablecidos", description: "Se han recuperado los valores originales (Utilidades/Qty)." });
    };

    const applyGlobalQty = () => {
        // Guardar respaldo antes de aplicar
        setBackupSections(JSON.parse(JSON.stringify(sections)));
        setIsRestoratable(true);

        setSections(sections.map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, qty: globalQtyVal }))
        })));
        toast({ title: "QTY Aplicado", description: `Se aplicó cantidad ${globalQtyVal} a todos los ítems del proyecto.` });
    };

    const apply50PercentUtilization = () => {
        // Guardar respaldo antes de aplicar
        setBackupSections(JSON.parse(JSON.stringify(sections)));
        setIsRestoratable(true);

        setSections(sections.map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, utilidad: 50 }))
        })));
        toast({ title: "Utilidad 50% Aplicada", description: "Todos los equipos se han actualizado al 50% de utilidad." });
    };

    const applyTargetAmount = () => {
        // Guardar respaldo antes de aplicar ajuste de monto
        setBackupSections(JSON.parse(JSON.stringify(sections)));
        setIsRestoratable(true);

        const currentTotal = grandTotals.totalVenta;
        const target = n(targetAmountValue);
        if (currentTotal === 0 || target <= 0) return;
        const factor = target / currentTotal;

        setSections(sections.map(s => ({
            ...s,
            items: (s.items || []).map(it => {
                const r = calcItem(it);
                const targetVentaUnit = r.ventaUnitFinal * factor;
                const cost = n(it.costoUSD);
                // Inverse of Markup for Target Amount
                let newUtil = cost === 0 ? 0 : ((targetVentaUnit / cost) - 1) * 100;
                return { ...it, utilidad: newUtil };
            })
        })));
        setTargetAmountModalOpen(false);
        toast({ title: "Ajuste de Monto Exitoso", description: `El proyecto se ajustó a un total de ${money(target)}` });
    };

    const scrollToItem = (sId, iId) => {
        // Expandir la sección si está cerrada
        setSections(prev => prev.map(s => s.id === sId ? { ...s, collapsed: false } : s));
        
        setTimeout(() => {
            const el = document.getElementById(`item-${iId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-4', 'ring-primary', 'ring-offset-4', 'ring-offset-black', 'bg-primary/20', 'transition-all', 'duration-500');
                setTimeout(() => el.classList.remove('ring-4', 'ring-primary', 'ring-offset-4', 'ring-offset-black', 'bg-primary/20'), 3000);
            }
        }, 300);
        setSearchTerm(""); // Limpiar búsqueda al seleccionar
    };

    // Media Handlers
    const handleModuleMediaUpload = async (sId, file) => {
        if (!file) return;
        setUploadingId(`module_${sId}`);
        try {
            const bucket = await getActiveBucket();
            const fileName = `module_${sId}_${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `masterplan/${fileName}`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
            updateSection(sId, { moduleImage: publicUrl });
            toast({ title: "Imagen de Módulo Cargada" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error al subir imagen", variant: "destructive" });
        } finally {
            setUploadingId(null);
        }
    };

    const handleItemMediaUpload = async (sId, iId, file) => {
        if (!file) return;
        setUploadingId(iId);
        try {
            const bucket = await getActiveBucket();
            const type = file.type.startsWith('video') ? 'video' : 'image';
            const fileName = `item_${iId}_${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `masterplan/${fileName}`;
            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
            updateItem(sId, iId, { media_url: publicUrl, media_type: type });
            toast({ title: "Media de Item Cargada" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error al subir media", variant: "destructive" });
        } finally {
            setUploadingId(null);
        }
    };

    const handleBulkMediaUpload = async (files) => {
        if (!files.length) return;
        setIsCloudSyncing(true);
        let count = 0;
        try {
            const bucket = await getActiveBucket();
            // Deep copy current sections to working state
            const finalSections = JSON.parse(JSON.stringify(sections));

            for (const file of files) {
                const nameParts = file.name.split('.');
                const code = nameParts[0];
                const ext = nameParts.pop();
                const type = file.type.startsWith('video') ? 'video' : 'image';

                for (const s of finalSections) {
                    if (!s.items) continue;
                    const it = s.items.find(x => x.codigo === code);
                    if (it) {
                        const filePath = `masterplan/bulk_${sanitizeFileName(code)}_${Date.now()}.${ext}`;
                        try {
                            const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);
                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
                            it.media_url = publicUrl;
                            it.media_type = type;
                            count++;
                        } catch (e) {
                            console.error(`Failed to upload ${file.name}`, e);
                        }
                        break;
                    }
                }
            }

            if (count > 0) {
                setSections(finalSections);
                saveToCloud(finalSections);
                toast({ title: "Carga Masiva Exitosa", description: `Se actualizaron ${count} items.` });
            } else {
                toast({ title: "Ningún archivo coincidente", description: "Asegúrate de que los nombres de archivo coincidan con los códigos (ej. 1.jpg)" });
            }

        } catch (error) {
            console.error(error);
            toast({ title: "Error crítico en carga masiva", variant: "destructive" });
        } finally {
            setIsCloudSyncing(false);
        }
    };

    // Helper for fuzzy header matching
    const getValue = (row, possibleKeys) => {
        const rowKeys = Object.keys(row);
        for (const target of possibleKeys) {
            const normalizedTarget = target.toUpperCase().trim();
            // Try exact match first
            if (row[target] !== undefined) return row[target];

            // Try normalized match
            const foundKey = rowKeys.find(k => k.toUpperCase().trim() === normalizedTarget);
            if (foundKey) return row[foundKey];
        }

        // SPECIAL FALLBACK: If we are looking for description, try "contains"
        if (possibleKeys.some(k => k.includes("DESC"))) {
            const descKey = rowKeys.find(k => k.toUpperCase().includes("DESC") && !k.toUpperCase().includes("ITEM_DESC")); // Avoid ITEM_DESC alias for Equipo
            if (descKey) return row[descKey];
        }

        return undefined;
    };

    // Excel Handlers
    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImportedFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Treat everything as text initially to avoid weird number formatting
            const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

            if (data.length > 0) {
                console.log("Excel Import Debug - First Row Keys:", Object.keys(data[0]));
                console.log("Excel Import Debug - First Row Data:", data[0]);
            }

            const newSections = [];
            const sectionMap = new Map(); // Title -> Section Reference

            data.forEach((row, idx) => {
                // Fuzzy match module name
                const rawName = getValue(row, ["NOMBRE", "MODULO", "Modulo", "Módulo", "TITULO"]) || "";
                const moduloName = String(rawName).trim();

                const rawTag = getValue(row, ["FASE", "TAG", "Tag"]) || "IMPORTADO";
                const faseTag = String(rawTag).trim();

                if (!moduloName) return; // Skip rows without module name

                // Find or Create Section
                let currentSec = sectionMap.get(moduloName);
                if (!currentSec) {
                    currentSec = {
                        id: `sec_${uid()}_${idx}`, // Unique ID
                        collapsed: false,
                        titulo: cleanTitle(moduloName),
                        tag: faseTag,
                        items: []
                    };
                    newSections.push(currentSec);
                    sectionMap.set(moduloName, currentSec);
                }

                // Parse Item Data knowing headers might be messy
                const eq = getValue(row, ["EQUIPO", "Equipo", "ITEM_DESC"]);
                if (eq) {
                    currentSec.items.push({
                        id: uid(),
                        activo: true,
                        codigo: String(getValue(row, ["NUM", "ITEM", "Item", "CÓDIGO", "Código"]) || ""),
                        equipo: String(eq),
                        // getValue now handles partial "DESC" matching via fallback
                        descripcion: String(getValue(row, ["DESCRIPCION", "DECRIPCION", "DESCRIPCIÓN", "Descripción", "Description", "DESC", "Desc"]) || ""),
                        potencia: parseFinancial(getValue(row, ["Potencia (kW)", "POTENCIA", "Potencia", "KW"])),
                        qty: parseFinancial(getValue(row, ["QTY", "Qty", "CANTIDAD", "Cantidad"]) || 1),
                        costoUSD: parseFinancial(getValue(row, ["COSTO", "Costo", "COSTOS", "PRECIO"]) || 0),
                        utilidad: (() => {
                            const raw = getValue(row, ["UTILIDAD", "UTIL", "Util", "Util %"]);
                            let val = parseFinancial(raw);
                            // If user provides no value, use global. If 0, use 0.
                            if (val === 0 && (raw === 0 || raw === "0")) return 0;
                            if (!val) return globalUtilVal;
                            // Heuristic: If <= 5, assume Ratio (e.g. 1 = 100%, 0.3 = 30%)
                            if (val <= 5.0) return val * 100;
                            return val;
                        })(),
                        media_url: getValue(row, ["MEDIA", "Media", "FOTO"]) || null,
                        media_type: 'image'
                    });
                }
            });

            if (newSections.length > 0) {
                setSections(newSections);
                toast({ title: "Excel Importado", description: `Se cargaron ${newSections.length} módulos.` });
                saveToCloud(newSections);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleExportExcel = () => {
        const data = [];
        sections.forEach(s => {
            if (s.activo === false) return; // SKIP INACTIVE
            s.items.forEach(it => {
                const r = calcItem(it);
                data.push({
                    NUM: it.codigo,
                    FASE: s.tag,
                    NOMBRE: s.titulo,
                    EQUIPO: it.equipo,
                    "Potencia (kW)": it.potencia || 0,
                    COSTOS: it.costoUSD,
                    UTILIDAD: it.utilidad,
                    SUBTOTAL: r.totalVenta
                });
            });
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master Plan");
        XLSX.writeFile(wb, `MasterPlan_SOLIMAQ_${projectName}.xlsx`);
    };

    const handleExportSectionExcel = (s) => {
        const data = s.items.map(it => ({
            ITEM: it.codigo,
            EQUIPO: it.equipo,
            DESCRIPCION: it.descripcion,
            QTY: it.qty,
            COSTO: it.costoUSD,
            UTIL: it.utilidad
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, String(s.titulo).substring(0, 30));
        XLSX.writeFile(wb, `Modulo_${String(s.titulo || "Modulo").replace(/\s+/g, '_')}.xlsx`);
    };

    const fetchAvailableProjects = async () => {
        setIsLoadingProjects(true);
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select('slug, project, client, updated_at')
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            const filtered = data.filter(q => q.slug && !q.slug.startsWith('mp-'));
            setAvailableProjects(filtered);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setIsLoadingProjects(false);
        }
    };

    const handleImportFromProject = async (targetSlug) => {
        setIsImportModalOpen(false);
        setIsCloudSyncing(true);
        try {
            const slugsToTry = [`mp-${targetSlug}`, targetSlug];
            let foundData = null;

            for (const s of slugsToTry) {
                const { data, error } = await supabase
                    .from('quotations')
                    .select('sections_config')
                    .eq('slug', s)
                    .single();
                
                if (!error && data?.sections_config) {
                    let importedSections = null;
                    const config = data.sections_config;
                    if (config.sections) {
                        importedSections = config.sections;
                    } else if (Array.isArray(config)) {
                        importedSections = config;
                    } else if (Array.isArray(config)) {
                         const mpSection = config.find(sec => sec.id === 'master_plan');
                         if (mpSection?.content?.sections) importedSections = mpSection.content.sections;
                    }

                    if (importedSections?.length > 0) {
                        foundData = importedSections;
                        break;
                    }
                }
            }

            if (foundData) {
                const cleaned = foundData.map(s => ({
                    ...s,
                    id: `sec_${uid()}`,
                    items: (s.items || []).map(it => ({ ...it, id: uid() }))
                }));
                setSections(cleaned);
                saveToCloud(cleaned);
                toast({ title: "Importación Exitosa", description: `Se cargaron ${cleaned.length} módulos del proyecto ${targetSlug}.` });
            } else {
                toast({ title: "No se encontraron datos", description: "Este proyecto no tiene un Master Plan configurado.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error al importar", variant: "destructive" });
        } finally {
            setIsCloudSyncing(false);
        }
    };

    const handleImportSectionExcel = (sId, file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws);
            const items = data.map(row => ({
                id: uid(),
                activo: true,
                codigo: String(getValue(row, ["NUM", "ITEM", "Item", "CÓDIGO", "Código"]) || ""),
                equipo: String(getValue(row, ["EQUIPO", "Equipo", "ITEM_DESC"]) || ""),
                descripcion: String(getValue(row, ["DESCRIPCION", "DECRIPCION", "DESC", "DESCRIPCIÓN", "Descripción", "Description", "Desc"]) || ""),
                potencia: parseFinancial(getValue(row, ["Potencia (kW)", "POTENCIA", "Potencia", "KW"])),
                qty: parseFinancial(getValue(row, ["QTY", "Qty", "CANTIDAD", "Cantidad"]) || 1),
                costoUSD: parseFinancial(getValue(row, ["COSTO", "Costo", "COSTOS", "PRECIO"]) || 0),
                utilidad: (() => {
                    const raw = getValue(row, ["UTILIDAD", "UTIL", "Util", "Util %"]);
                    let val = parseFinancial(raw);
                    if (val === 0 && (raw === 0 || raw === "0")) return 0;
                    if (!val) return globalUtilVal;
                    if (val <= 5.0) return val * 100;
                    return val;
                })()
            }));
            // Perform update and save immediately
            // Perform update and save immediately
            const updatedSections = sections.map(s => s.id === sId ? { ...s, items } : s);
            setSections(updatedSections);
            toast({ title: "Módulo Actualizado" });
            saveToCloud(updatedSections);
        };
        reader.readAsBinaryString(file);
    };

    const generateDirectPDF = async (customFilename = "", customClient = "", customProject = "") => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText, titleText, logoPos, colWidths, fontSize, rowHeight, imgSize, metaPos, headerBox } = pdfSettings;

        const activeClient = customClient || clientName;
        const activeProject = customProject || projectName;

        // Always use the physical logo from public folder for exports to ensure it's the latest dark version
        const finalUrl = "/solimaq_logo.png";

        // Load image first to ensure it's available and dimensions are known
        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const topMargin = 8;
            const drawHeader = () => {
                doc.setFillColor(headerBg);
                doc.rect(headerBox.x, headerBox.y + topMargin, headerBox.width, headerBox.height, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(22);
                doc.setTextColor(headerText);
                doc.text(titleText, headerBox.x + (headerBox.width / 2), headerBox.y + topMargin + (headerBox.height / 2) + 4, { align: 'center' });

                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", metaPos.x, metaPos.y + topMargin);
                doc.setFont("helvetica", "normal");
                doc.text(String(activeClient || "CLIENTE").toUpperCase(), metaPos.x + 23, metaPos.y + topMargin);
                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", metaPos.x, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "normal");
                doc.text(String(activeProject || "PROYECTO").toUpperCase(), metaPos.x + 23, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", metaPos.x, metaPos.y + topMargin + 10);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), metaPos.x + 23, metaPos.y + topMargin + 10);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        // Align to the RIGHT of the original logo box
                        const xPos = logoPos.x + logoPos.width - targetWidth;
                        doc.addImage(logoImg, 'PNG', xPos, logoPos.y + topMargin, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("Direct PDF Logo Draw Error", e);
                    }
                }
            };

            let tableData = [];
            let activeModuleCounter = 0;
            sections.forEach((s, sIdx) => {
                if (s.activo === false) return; // SKIP INACTIVE MODULES
                activeModuleCounter++;
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                const displayModuleNum = activeModuleCounter;

                tableData.push([
                    { content: `MÓDULO ${displayModuleNum}: ${s.titulo}`, colSpan: 7, styles: { fillColor: [120, 120, 120], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 } }
                ]);

                let modSum = 0;
                activeItems.forEach((it, idx) => {
                    const r = calcItem(it);
                    modSum += r.totalVenta;
                    tableData.push([
                        { content: `${displayModuleNum}.${idx + 1}`, styles: { textColor: pdfSettings.primaryColor, fontStyle: 'bold' } },
                        String(it.equipo || "N/A").toUpperCase(),
                        String(it.descripcion || ""),
                        { content: "", image: it.media_url && it.media_type !== 'video' ? it.media_url : null },
                        it.qty,
                        money(r.ventaUnitFinal),
                        money(r.totalVenta)
                    ]);
                });

                tableData.push([
                    { content: `SUBTOTAL MÓDULO ${displayModuleNum}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fontSize: fontSize + 2, textColor: [60, 60, 60] } },
                    { content: money(modSum), styles: { halign: 'right', fontStyle: 'bold', fontSize: fontSize + 2, textColor: [60, 60, 60] } }
                ]);
            });

            doc.autoTable({
                startY: 40,
                head: [['ITEM', 'EQUIPO', 'DESCRIPCIÓN', 'FOTO', 'QTY', 'UNITARIO', 'TOTAL']],
                body: tableData,
                theme: 'plain',
                headStyles: { fillColor: pdfSettings.primaryColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', minCellHeight: 12 },
                styles: { fontSize, cellPadding: 2, valign: 'middle', lineWidth: 0.1, minCellHeight: rowHeight },
                columnStyles: {
                    0: { halign: 'center', cellWidth: colWidths.item },
                    1: { fontStyle: 'bold', cellWidth: colWidths.equipo },
                    2: { halign: 'justify', cellWidth: colWidths.desc },
                    3: { halign: 'center', cellWidth: colWidths.foto },
                    4: { halign: 'center', cellWidth: colWidths.qty },
                    5: { halign: 'right', cellWidth: colWidths.unit },
                    6: { halign: 'right', cellWidth: colWidths.total }
                },
                rowPageBreak: 'avoid',
                margin: { top: 40, left: 15, right: 15, bottom: 20 },
                didDrawPage: (data) => {
                    drawHeader();
                    doc.setFontSize(7);
                    doc.setTextColor(180, 180, 180);
                    doc.text(`Página ${doc.internal.getNumberOfPages()} | www.solimaq.site`, 282, 202, { align: 'right' });
                },
                didDrawCell: (data) => {
                    if (data.section === 'body' && data.column.index === 3) {
                        const img = tableData[data.row.index]?.[3]?.image;
                        if (img) try { doc.addImage(img, 'JPEG', data.cell.x + (data.cell.width - imgSize) / 2, data.cell.y + 2, imgSize, imgSize, undefined, 'FAST'); } catch (e) { }
                    }
                }
            });

            const finalY = (doc.lastAutoTable?.finalY || 40) + 8;
            if (finalY < 185) {
                const totalBoxWidth = pdfSettings.colWidths.total + pdfSettings.colWidths.unit + 45;
                const tableRightPos = 282;

                doc.setFillColor(0, 0, 0);
                doc.rect(tableRightPos - totalBoxWidth, finalY, totalBoxWidth, 20, 'F');

                doc.setTextColor(255, 255, 255);

                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("TOTAL GENERAL", tableRightPos - totalBoxWidth + 5, finalY + 9);

                doc.setFontSize(14);
                doc.text(money(grandTotals.totalVenta) + " USD", tableRightPos - 5, finalY + 9, { align: 'right' });

                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text("(Precios más 16% de I.V.A.)", tableRightPos - 5, finalY + 16, { align: 'right' });
            }

            const cleanName = String(customFilename || `SOLIMAQ_MASTERPLAN_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`).replace(/[/\\?%*:|"<>]/g, '-');
            const finalFilename = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
            doc.save(finalFilename);
            toast({ title: "PDF Generado Correctamente" });
        };

        start();
    };

    const generateEquipmentList50PDF = async (customFilename = "", customTitle = "", customClient = "", customProject = "") => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText } = pdfSettings;
        const titleText = customTitle || "LISTADO DE EQUIPOS (50% UTILIDAD)";

        const activeClient = customClient || clientName;
        const activeProject = customProject || projectName;

        const finalUrl = "/solimaq_logo.png";

        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const drawHeader = () => {
                const headerStart = 10;
                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", 15, headerStart + 4);
                doc.setFont("helvetica", "normal");
                doc.text((activeClient || "").toUpperCase(), 45, headerStart + 4);

                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", 15, headerStart + 9);
                doc.setFont("helvetica", "normal");
                doc.text((activeProject || "").toUpperCase(), 45, headerStart + 9);

                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", 15, headerStart + 14);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), 45, headerStart + 14);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        const xPos = 282 - targetWidth;
                        doc.addImage(logoImg, 'PNG', xPos, headerStart + 2, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("Equipment List 50 Logo Draw Error", e);
                    }
                }

                const titleY = headerStart + 21;
                doc.setFillColor(headerBg);
                doc.rect(15, titleY, 267, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(headerText);
                doc.text(titleText, 148.5, titleY + 7, { align: 'center' });
            };

            let currentY = 56;
            let grandTotalKw = 0;
            let totalVenta50 = 0;
            let activeModuleCounter = 0;
            
            sections.forEach((s, sIdx) => {
                if (s.activo === false) return;
                activeModuleCounter++;
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                if (activeModuleCounter > 1) {
                    doc.addPage();
                    currentY = 46;
                }

                const displayModuleNum = activeModuleCounter;
                let moduleTableData = [];
                moduleTableData.push([
                    {
                        content: `MÓDULO ${displayModuleNum}: ${s.titulo}`,
                        colSpan: 8,
                        styles: { fillColor: [155, 212, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', minCellHeight: 12, fontSize: 12 }
                    }
                ]);

                activeItems.forEach((it, idx) => {
                    const cost = n(it.costoUSD);
                    const ventaUnit50 = cost * 1.50; // APLICA 50% FIJO
                    const subTotalItem = ventaUnit50 * n(it.qty);
                    totalVenta50 += subTotalItem;

                    const kwU = n(it.potencia);
                    const kwT = kwU * n(it.qty);
                    grandTotalKw += kwT;

                    moduleTableData.push([
                        `${displayModuleNum}.${idx + 1}`,
                    String(it.equipo || "N/A").toUpperCase(),
                    String(it.descripcion || ""),
                    it.qty,
                    kwU > 0 ? kwU.toFixed(1) : "-",
                    kwT > 0 ? kwT.toFixed(1) : "-",
                    money(ventaUnit50),
                    money(subTotalItem)
                    ]);
                });

                const moduleKw = activeItems.reduce((acc, it) => acc + (n(it.potencia) * n(it.qty)), 0);
                const moduleTotal50 = activeItems.reduce((acc, it) => acc + (n(it.costoUSD) * 1.50 * n(it.qty)), 0);
                
                moduleTableData.push([
                    {
                        content: `RESUMEN MÓDULO ${displayModuleNum}:  ${activeItems.length} EQUIPOS  |  POTENCIA: ${moduleKw.toFixed(1)} KW  |  SUBTOTAL (50%): ${money(moduleTotal50)} USD`,
                        colSpan: 8,
                        styles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right', fontSize: 10 }
                    }
                ]);

                doc.autoTable({
                    startY: currentY,
                    margin: { top: 40, bottom: 8 },
                    head: [['#', 'EQUIPO', 'DESCRIPCIÓN', 'QTY', 'KW UNIT', 'KW TOTALES', 'P. UNITARIO (50%)', 'SUBTOTAL (50%)']],
                    body: moduleTableData,
                    theme: 'striped',
                    headStyles: { fillColor: [85, 85, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 },
                    styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { fontStyle: 'bold', cellWidth: 35 },
                        2: { halign: 'justify', cellWidth: 'auto' },
                        3: { halign: 'center', cellWidth: 15 },
                        4: { halign: 'center', cellWidth: 20 },
                        5: { halign: 'center', cellWidth: 20 },
                        6: { halign: 'right', cellWidth: 25 },
                        7: { halign: 'right', cellWidth: 25 }
                    },
                    didDrawPage: (data) => {
                        drawHeader();
                        doc.setFontSize(7);
                        doc.setTextColor(150, 150, 150);
                        doc.text(`Página ${doc.internal.getNumberOfPages()} | www.solimaq.site | Utilidad 50% considerada`, 148.5, 204, { align: 'center' });
                    }
                });

                currentY = doc.lastAutoTable.finalY + 5;
            });

            let finalY = currentY + 15;
            if (finalY > 170) {
                doc.addPage();
                drawHeader();
                finalY = 65;
            }

            const boxH = 25;
            doc.setFillColor(85, 85, 85);
            doc.rect(130, finalY - 10, 152, boxH, 'F');

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            
            doc.text("POTENCIA TOTAL INSTALADA:", 215, finalY, { align: 'right' });
            doc.text(grandTotalKw.toFixed(2) + " KW", 280, finalY, { align: 'right' });

            doc.text("TOTAL GENERAL (50% UTIL):", 215, finalY + 9, { align: 'right' });
            doc.text(money(totalVenta50) + " USD", 280, finalY + 9, { align: 'right' });

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("CI CON 50% DE UTILIDAD CONSIDERADA", 280, finalY + 14, { align: 'right' });

            const cleanName = String(customFilename || `LISTADO_50_UTIL_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`).replace(/[/\\?%*:|"<>]/g, '-');
            const finalFilename = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
            doc.save(finalFilename);
            toast({ title: "Listado (50% Utilidad) Exportado" });
        };

        start();
    };

    const generateEquipmentListPDF = async (customFilename = "", customTitle = "", customClient = "", customProject = "") => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText } = pdfSettings;
        const titleText = customTitle || pdfSettings.titleText;

        const activeClient = customClient || clientName;
        const activeProject = customProject || projectName;

        // Always use the physical logo from public folder for exports to ensure it's the latest dark version
        const finalUrl = "/solimaq_logo.png";

        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const drawHeader = () => {
                const headerStart = 10;
                const pageW = 297;

                // 1. INFO DEL CLIENTE & LOGO (ARRIBA)
                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", 15, headerStart + 4);
                doc.setFont("helvetica", "normal");
                doc.text((activeClient || "").toUpperCase(), 45, headerStart + 4);

                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", 15, headerStart + 9);
                doc.setFont("helvetica", "normal");
                doc.text((activeProject || "").toUpperCase(), 45, headerStart + 9);

                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", 15, headerStart + 14);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), 45, headerStart + 14);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        const xPos = 282 - targetWidth;
                        doc.addImage(logoImg, 'PNG', xPos, headerStart + 2, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("Equipment List Logo Draw Error", e);
                    }
                }

                // 2. FRANJA DE TÍTULO (ABAJO) - REDUCED GAP
                const titleY = headerStart + 21;
                doc.setFillColor(headerBg);
                doc.rect(15, titleY, 267, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(headerText);
                const displayTitle = titleText === 'CONCENTRADO' ? "CONCENTRADO DE EQUIPOS" : titleText;
                doc.text(displayTitle, 148.5, titleY + 7, { align: 'center' });
            };

            let currentY = 56;
            let grandTotalKw = 0;
            let activeModuleCounter = 0;
            sections.forEach((s, sIdx) => {
                if (s.activo === false) return; // SKIP INACTIVE
                activeModuleCounter++;
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                if (activeModuleCounter > 1) {
                    doc.addPage();
                    currentY = 46;
                }

                const displayModuleNum = activeModuleCounter;

                let moduleTableData = [];
                // Cabecera de Módulo en Verde Solimaq
                moduleTableData.push([
                    {
                        content: `MÓDULO ${displayModuleNum}: ${s.titulo}`,
                        colSpan: 8,
                        styles: { fillColor: [155, 212, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', minCellHeight: 12, fontSize: 12 }
                    }
                ]);

                activeItems.forEach((it, idx) => {
                    const r = calcItem(it);
                    const kwU = n(it.potencia);
                    const kwT = kwU * n(it.qty);
                    grandTotalKw += kwT;

                    moduleTableData.push([
                        `${displayModuleNum}.${idx + 1}`,
                        String(it.equipo || "N/A").toUpperCase(),
                        String(it.descripcion || ""),
                        it.qty,
                        kwU > 0 ? kwU.toFixed(1) : "-",
                        kwT > 0 ? kwT.toFixed(1) : "-",
                        money(r.ventaUnitFinal),
                        money(r.totalVenta)
                    ]);
                });

                // --- MODULO SUMMARY ROW ---
                const moduleKw = activeItems.reduce((acc, it) => acc + (n(it.potencia) * n(it.qty)), 0);
                const moduleTotal = activeItems.reduce((acc, it) => acc + calcItem(it).totalVenta, 0);
                moduleTableData.push([
                    {
                        content: `RESUMEN MÓDULO ${displayModuleNum}:  ${activeItems.length} EQUIPOS  |  POTENCIA: ${moduleKw.toFixed(1)} KW  |  SUBTOTAL: ${money(moduleTotal)} USD`,
                        colSpan: 8,
                        styles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right', fontSize: 10 }
                    }
                ]);

                doc.autoTable({
                    startY: currentY,
                    margin: { top: 40, bottom: 8 },
                    head: [['#', 'EQUIPO', 'DESCRIPCIÓN', 'QTY', 'KW UNIT', 'KW TOTALES', 'P. UNITARIO', 'SUBTOTAL']],
                    body: moduleTableData,
                    theme: 'striped',
                    headStyles: { fillColor: [85, 85, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 },
                    styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { fontStyle: 'bold', cellWidth: 35 },
                        2: { halign: 'justify', cellWidth: 'auto' },
                        3: { halign: 'center', cellWidth: 15 },
                        4: { halign: 'center', cellWidth: 20 },
                        5: { halign: 'center', cellWidth: 20 },
                        6: { halign: 'right', cellWidth: 25 },
                        7: { halign: 'right', cellWidth: 25 }
                    },
                    margin: { top: 40, bottom: 8 },
                    didDrawPage: (data) => {
                        drawHeader();
                        doc.setFontSize(7);
                        doc.setTextColor(150, 150, 150);
                        doc.text(`Página ${doc.internal.getNumberOfPages()} | www.solimaq.site`, 148.5, 204, { align: 'center' });
                    }
                });

                currentY = doc.lastAutoTable.finalY + 5;
            });

            let finalY = currentY + 15;

            // Handle page break for total box
            if (finalY > 170) {
                doc.addPage();
                drawHeader();
                finalY = 65;
            }

            // RECUADRO DE TOTALES AJUSTADO (FUENTES 14PT Y TAMAÑO COMPACTO)
            const boxH = 25;
            doc.setFillColor(85, 85, 85);
            // El cuadro ahora empieza en x:130 (más a la derecha) y tiene x:152 de ancho
            doc.rect(130, finalY - 10, 152, boxH, 'F');

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            
            // Etiquetas cerca de los totales (alineado a x:215)
            doc.text("POTENCIA TOTAL INSTALADA:", 215, finalY, { align: 'right' });
            doc.text(grandTotalKw.toFixed(2) + " KW", 280, finalY, { align: 'right' });

            doc.text("TOTAL GENERAL:", 215, finalY + 9, { align: 'right' });
            doc.text(money(grandTotals.totalVenta) + " USD", 280, finalY + 9, { align: 'right' });

            // Leyenda IVA
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("MÁS 16% DE I.V.A.", 280, finalY + 14, { align: 'right' });

            const cleanName = String(customFilename || `LISTADO_EQUIPOS_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`).replace(/[/\\?%*:|"<>]/g, '-');
            const finalFilename = cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
            doc.save(finalFilename);
            toast({ title: "Listado de Equipos Exportado" });
        };

        start();
    };

    const generateEquipmentListMXNPDF = async (customFilename = "", customTitle = "", customTC = null, customClient = "", customProject = "") => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText } = pdfSettings;
        const titleText = customTitle || "LISTADO DE EQUIPOS (MXN)";
        const tc = n(customTC || tipoCambio);

        const activeClient = customClient || clientName;
        const activeProject = customProject || projectName;

        const moneyMXN = (v) => {
            const val = n(v);
            return "$" + val.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN";
        };

        const finalUrl = "/solimaq_logo.png";
        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const drawHeader = () => {
                const headerStart = 10;
                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", 15, headerStart + 4);
                doc.setFont("helvetica", "normal");
                doc.text((activeClient || "").toUpperCase(), 45, headerStart + 4);
                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", 15, headerStart + 9);
                doc.setFont("helvetica", "normal");
                doc.text((activeProject || "").toUpperCase(), 45, headerStart + 9);
                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", 15, headerStart + 14);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), 45, headerStart + 14);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        doc.addImage(logoImg, 'PNG', 282 - targetWidth, headerStart + 2, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) { }
                }

                const titleY = headerStart + 21;
                doc.setFillColor(headerBg);
                doc.rect(15, titleY, 267, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(headerText);
                doc.text(titleText, 148.5, titleY + 7, { align: 'center' });
            };

            let currentY = 56;
            let grandTotalKw = 0;
            let grandTotalMXN = 0;
            let activeModuleCounter = 0;
            sections.forEach((s, sIdx) => {
                if (s.activo === false) return; // SKIP INACTIVE
                activeModuleCounter++;
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                if (activeModuleCounter > 1) {
                    doc.addPage();
                    currentY = 46;
                }

                const displayModuleNum = activeModuleCounter;

                let moduleTableData = [];
                moduleTableData.push([
                    {
                        content: `MÓDULO ${displayModuleNum}: ${s.titulo}`,
                        colSpan: 8,
                        styles: { fillColor: [155, 212, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', minCellHeight: 12, fontSize: 12 }
                    }
                ]);

                activeItems.forEach((it, idx) => {
                    const r = calcItem(it);
                    const sellUnitMXN = r.ventaUnitFinal * tc;
                    const totalSellMXN = r.totalVenta * tc;
                    grandTotalMXN += totalSellMXN;

                    const kwU = n(it.potencia);
                    const kwT = kwU * n(it.qty);
                    grandTotalKw += kwT;

                    moduleTableData.push([
                        `${displayModuleNum}.${idx + 1}`,
                        String(it.equipo || "N/A").toUpperCase(),
                        String(it.descripcion || ""),
                        it.qty,
                        kwU > 0 ? kwU.toFixed(1) : "-",
                        kwT > 0 ? kwT.toFixed(1) : "-",
                        moneyMXN(sellUnitMXN),
                        moneyMXN(totalSellMXN)
                    ]);
                });

                const moduleKw = activeItems.reduce((acc, it) => acc + (n(it.potencia) * n(it.qty)), 0);
                const moduleTotalMXN = activeItems.reduce((acc, it) => acc + (calcItem(it).totalVenta * tc), 0);
                moduleTableData.push([
                    {
                        content: `RESUMEN MÓDULO ${displayModuleNum}:  ${activeItems.length} EQUIPOS  |  POTENCIA: ${moduleKw.toFixed(1)} KW  |  SUBTOTAL: ${moneyMXN(moduleTotalMXN)}`,
                        colSpan: 8,
                        styles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right', fontSize: 10 }
                    }
                ]);

                doc.autoTable({
                    startY: currentY,
                    margin: { top: 40, bottom: 8 },
                    head: [['#', 'EQUIPO', 'DESCRIPCIÓN', 'QTY', 'KW UNIT', 'KW TOTALES', 'P. UNITARIO', 'SUBTOTAL']],
                    body: moduleTableData,
                    theme: 'striped',
                    headStyles: { fillColor: [85, 85, 85], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 },
                    styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { fontStyle: 'bold', cellWidth: 35 },
                        2: { halign: 'justify', cellWidth: 'auto' },
                        3: { halign: 'center', cellWidth: 15 },
                        4: { halign: 'center', cellWidth: 20 },
                        5: { halign: 'center', cellWidth: 20 },
                        6: { halign: 'right', cellWidth: 32 },
                        7: { halign: 'right', cellWidth: 32 }
                    },
                    margin: { top: 40, bottom: 8 },
                    didDrawPage: (data) => {
                        drawHeader();
                        doc.setFontSize(7);
                        doc.setTextColor(150, 150, 150);
                        doc.text(`T.C. $${tc.toFixed(2)} | Página ${doc.internal.getNumberOfPages()}`, 148.5, 204, { align: 'center' });
                    }
                });

                currentY = doc.lastAutoTable.finalY + 5;
            });

            let finalY = currentY + 15;
            if (finalY > 170) { doc.addPage(); drawHeader(); finalY = 65; }

            // RECUADRO DE TOTALES AJUSTADO (FUENTES 14PT Y TAMAÑO COMPACTO)
            const boxH = 25;
            doc.setFillColor(85, 85, 85);
            // El cuadro ahora empieza en x:130 (más a la derecha) y tiene x:152 de ancho
            doc.rect(130, finalY - 10, 152, boxH, 'F');

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);

            // Etiquetas cerca de los totales (alineado a x:215)
            doc.text("POTENCIA TOTAL INSTALADA:", 215, finalY, { align: 'right' });
            doc.text(grandTotalKw.toFixed(2) + " KW", 280, finalY, { align: 'right' });

            doc.text("TOTAL GENERAL:", 215, finalY + 9, { align: 'right' });
            doc.text(moneyMXN(grandTotalMXN), 280, finalY + 9, { align: 'right' });

            // Leyenda IVA
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text(`MÁS 16% DE I.V.A. (T.C. ${tc.toFixed(2)})`, 280, finalY + 14, { align: 'right' });

            const cleanName = String(customFilename || `LISTADO_MXN_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`).replace(/[/\\?%*:|"<>]/g, '-');
            doc.save(cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`);
            toast({ title: "Listado MXN Exportado" });
        };
        start();
    };

    const generateInternalRadiographyPDF = async (customFilename = "", customTitle = "", customTC = null, customClient = "", customProject = "") => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const { headerBg, headerText } = pdfSettings;
        const titleText = customTitle || "RADIOGRAFÍA INTERNA";
        const finalTC = n(customTC || tipoCambio);

        const activeClient = customClient || clientName;
        const activeProject = customProject || projectName;

        // Always use the physical logo from public folder for exports to ensure it's the latest dark version
        const finalUrl = "/solimaq_logo.png";

        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const drawHeader = () => {
                const headerStart = 10;
                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", 15, headerStart + 4);
                doc.setFont("helvetica", "normal");
                doc.text((activeClient || "").toUpperCase(), 45, headerStart + 4);
                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", 15, headerStart + 9);
                doc.setFont("helvetica", "normal");
                doc.text((activeProject || "").toUpperCase(), 45, headerStart + 9);
                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", 15, headerStart + 14);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), 45, headerStart + 14);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        doc.addImage(logoImg, 'PNG', 195 - targetWidth, headerStart + 2, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) { console.error("Radiography Logo Draw Error", e); }
                }

                const titleY = headerStart + 21;
                doc.setFillColor(headerBg);
                doc.rect(15, titleY, 180, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(headerText);
                doc.text(titleText, 105, titleY + 7, { align: 'center' });
            };

            let tableData = [];
            let totalCost = 0;
            let totalSell = 0;
            let totalProfit = 0;
            let activeModuleCounter = 0;
            sections.forEach((s, sIdx) => {
                if (s.activo === false) return; // SKIP INACTIVE
                activeModuleCounter++;
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                const displayModuleNum = activeModuleCounter;

                tableData.push([
                    { content: `MÓDULO ${displayModuleNum}: ${s.titulo}`, colSpan: 8, styles: { fillColor: [80, 80, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', minCellHeight: 10 } }
                ]);

                activeItems.forEach((it, idx) => {
                    const r = calcItem(it);
                    const cost = n(it.costoUSD);
                    const qty = n(it.qty);
                    const sellUnit = r.ventaUnitFinal;
                    const subtotalSell = r.totalVenta;
                    const itemProfit = (sellUnit - cost) * qty;

                    totalCost += cost * qty;
                    totalSell += subtotalSell;
                    totalProfit += itemProfit;

                    tableData.push([
                        `${displayModuleNum}.${idx + 1}`,
                        String(it.equipo || "N/A").toUpperCase(),
                        qty,
                        money(cost),
                        n(it.utilidad).toFixed(1) + "%",
                        money(sellUnit),
                        money(subtotalSell),
                        money(itemProfit)
                    ]);
                });
            });

            doc.autoTable({
                startY: 50,
                margin: { top: 50, bottom: 20 },
                head: [['#', 'EQUIPO', 'QTY', 'COSTO UNIT', '% UTIL', 'P. VENTA UNIT', 'SUBT. VENTA', 'UTILIDAD']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 },
                styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { fontStyle: 'bold', cellWidth: 40 },
                    2: { halign: 'center', cellWidth: 10 },
                    3: { halign: 'right' },
                    4: { halign: 'center', cellWidth: 13 },
                    5: { halign: 'right' },
                    6: { halign: 'right' },
                    7: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] }
                },
                didDrawPage: (data) => {
                    drawHeader();
                    doc.setFontSize(7);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Radiografía Interna | Página ${doc.internal.getNumberOfPages()}`, 105, 285, { align: 'center' });
                }
            });

            // FINAL SUMMARY BOX (INTERNAL USE)
            const boxHeight = 68;
            let finalY = (doc.lastAutoTable?.finalY || 50) + 12;

            // Handle page break for the full box
            if (finalY + boxHeight > 280) {
                doc.addPage();
                drawHeader();
                finalY = 60;
            }

            doc.setFillColor(40, 40, 40);
            doc.rect(15, finalY - 8, 180, boxHeight, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");

            // --- SECCIÓN USD ---
            doc.text("TOTAL COSTO PROYECTO:", 20, finalY - 1);
            doc.text(money(totalCost) + " USD", 190, finalY - 1, { align: 'right' });

            doc.text("TOTAL VENTA (SIN IVA):", 20, finalY + 5);
            doc.text(money(totalSell) + " USD", 190, finalY + 5, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(155, 212, 40); // Solimaq Green
            doc.text("UTILIDAD BRUTA ESTIMADA:", 20, finalY + 11);
            doc.text(money(totalProfit) + " USD", 190, finalY + 11, { align: 'right' });

            doc.setFontSize(9);
            doc.setTextColor(250, 219, 20); // Bright Yellow
            doc.text("UTILIDAD DIVIDIDA (ENTRE 2):", 20, finalY + 17);
            doc.text(money(totalProfit / 2) + " USD", 190, finalY + 17, { align: 'right' });

            // --- SECCIÓN MXN UTILIDADES ---
            doc.setDrawColor(80, 80, 80);
            doc.line(20, finalY + 21, 190, finalY + 21);

            doc.setTextColor(200, 200, 200);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "italic");
            doc.text(`T.C. UTILIZADO: ${finalTC.toFixed(2)} MXN/USD`, 105, finalY + 24, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            const profitMXN = totalProfit * finalTC;
            doc.text("TOTAL UTILIDAD BRUTA (MXN):", 20, finalY + 29);
            doc.text("$" + profitMXN.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN", 190, finalY + 29, { align: 'right' });

            doc.setTextColor(250, 219, 20); // Bright Yellow
            doc.text("UTILIDAD COMPARTIDA (ENTRE 2 - MXN):", 20, finalY + 34);
            doc.text("$" + (profitMXN / 2).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN", 190, finalY + 34, { align: 'right' });

            // --- SECCIÓN MXN IVA & TOTALES ---
            doc.line(20, finalY + 38, 190, finalY + 38);

            const sellMXN = totalSell * finalTC;
            const ivaMXN = sellMXN * 0.16;
            const grandTotalMXN = sellMXN + ivaMXN;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.text("MONTO I.V.A. (16%) MXN:", 20, finalY + 43);
            doc.text("$" + ivaMXN.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN", 190, finalY + 43, { align: 'right' });

            doc.setTextColor(250, 219, 20); // Bright Yellow
            doc.text("I.V.A. COMPARTIDO (ENTRE 2 - MXN):", 20, finalY + 48);
            doc.text("$" + (ivaMXN / 2).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN", 190, finalY + 48, { align: 'right' });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.setTextColor(255, 255, 255);
            doc.text("TOTAL PROYECTO (CON IVA) MXN:", 20, finalY + 55);
            doc.text("$" + grandTotalMXN.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN", 190, finalY + 55, { align: 'right' });

            const cleanName = String(customFilename || `RADIOGRAFIA_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`).replace(/[/\\?%*:|"<>]/g, '-');
            doc.save(cleanName.toLowerCase().endsWith('.pdf') ? cleanName : `${cleanName}.pdf`);
            toast({ title: "Radiografía Interna Generada" });
        };

        if (logoImg) start();
        else start(); // Fallback if image failed to load
    };

    const generateModulePDF = async (s, sIdx) => {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const { headerBg, headerText } = pdfSettings;

        // Always use the physical logo from public folder for exports to ensure it's the latest dark version
        const finalUrl = "/solimaq_logo.png";

        const logoImg = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = finalUrl + "?v=" + Date.now();
        });

        const start = () => {
            const drawHeader = () => {
                const headerStart = 10;
                doc.setTextColor(40, 40, 40);
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.text("CLIENTE:", 15, headerStart + 4);
                doc.setFont("helvetica", "normal");
                doc.text((clientName || "").toUpperCase(), 45, headerStart + 4);

                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", 15, headerStart + 9);
                doc.setFont("helvetica", "normal");
                doc.text((projectName || "").toUpperCase(), 45, headerStart + 9);

                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", 15, headerStart + 14);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), 45, headerStart + 14);

                if (logoImg) {
                    try {
                        const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
                        const targetHeight = 16;
                        const targetWidth = targetHeight * ratio;
                        doc.addImage(logoImg, 'PNG', 195 - targetWidth, headerStart + 2, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("Module PDF Logo Draw Error", e);
                    }
                }

                const titleY = headerStart + 21;
                doc.setFillColor(headerBg);
                doc.rect(15, titleY, 180, 10, 'F');
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.setTextColor(headerText);
                doc.text(s.titulo.toUpperCase(), 105, titleY + 7, { align: 'center' });
            };

            let tableData = [];
            const activeItems = (s.items || []).filter(it => it.activo);

            let moduleTotal = 0;
            activeItems.forEach((it, idx) => {
                const r = calcItem(it);
                moduleTotal += r.totalVenta;
                tableData.push([
                    idx + 1,
                    String(it.equipo || "N/A").toUpperCase(),
                    String(it.descripcion || ""),
                    it.qty,
                    money(r.ventaUnitFinal),
                    money(r.totalVenta)
                ]);
            });

            doc.autoTable({
                startY: 50,
                margin: { top: 50, bottom: 20 },
                head: [['#', 'EQUIPO', 'DESCRIPCIÓN', 'QTY', 'P. UNITARIO', 'SUBTOTAL']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 },
                styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { fontStyle: 'bold', cellWidth: 35 },
                    2: { halign: 'justify', cellWidth: 'auto' },
                    3: { halign: 'center', cellWidth: 12 },
                    4: { halign: 'right', cellWidth: 23 },
                    5: { halign: 'right', cellWidth: 25 }
                },
                didDrawPage: (data) => {
                    drawHeader();
                    doc.setFontSize(7);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Módulo ${sIdx + 1} | Página ${data.pageNumber} | www.solimaq.site`, 105, 285, { align: 'center' });
                }
            });

            let finalY = (doc.lastAutoTable?.finalY || 50) + 15;
            if (finalY > 270) { doc.addPage(); drawHeader(); finalY = 65; }

            doc.setFillColor(60, 60, 60);
            doc.rect(15, finalY - 8, 180, 16, 'F');
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text("TOTAL MÓDULO:", 20, finalY);
            doc.text(money(moduleTotal) + " USD", 190, finalY, { align: 'right' });

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("MÁS 16% DE I.V.A.", 190, finalY + 5, { align: 'right' });

            const cleanName = `LISTADO_${sIdx + 1}_${String(s.titulo).replace(/\s+/g, '_')}`.replace(/[/\\?%*:|"<>]/g, '-');
            doc.save(`${cleanName.toLowerCase()}.pdf`);
            toast({ title: `Módulo ${sIdx + 1} Exportado como PDF` });
        };

        if (logoImg) start();
        else start(); // Fallback if image failed to load
    };

    const triggerExportWithFilename = (type) => {
        setPdfExportType(type);
        let defaultName = "";

        if (type === 'master') {
            defaultName = `SOLIMAQ_MASTERPLAN_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`;
        } else if (type === 'equipment-list') {
            defaultName = `LISTADO_EQUIPOS_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`;
        } else if (type === 'equipment-list-mxn') {
            defaultName = `LISTADO_MXN_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`;
        } else if (type === 'radiography') {
            defaultName = `RADIOGRAFIA_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`;
        } else if (type === 'equipment-list-50') {
            defaultName = `LISTADO_EQUIPOS_50_${String(projectName || "Proyecto").replace(/\s+/g, '_')}`;
        }

        setExportFilename(defaultName);
        setExportTitle(type === 'radiography' ? "RADIOGRAFÍA INTERNA" : type === 'equipment-list-mxn' ? "LISTADO DE EQUIPOS (MXN)" : pdfSettings.titleText);
        setExportClient(clientName);
        setExportProject(projectName);
        setExportTC(tipoCambio);
        setIsExportFilenameModalOpen(true);
    };

    const handleConfirmExport = () => {
        const currentTC = n(exportTC);
        if (currentTC && currentTC > 0) {
            setTipoCambio(currentTC);
        }

        // Actualizar estados principales para que los cambios permanezcan
        setClientName(exportClient);
        setProjectName(exportProject);

        if (isAdmin) {
            saveToCloud(sections, {
                client: exportClient,
                project: exportProject,
                pdfSettings: { ...pdfSettings, titleText: exportTitle }
            });
        }

        if (pdfExportType === 'master') {
            generateDirectPDF(exportFilename, exportClient, exportProject);
        } else if (pdfExportType === 'equipment-list') {
            generateEquipmentListPDF(exportFilename, exportTitle, exportClient, exportProject);
        } else if (pdfExportType === 'equipment-list-mxn') {
            generateEquipmentListMXNPDF(exportFilename, exportTitle, n(exportTC), exportClient, exportProject);
        } else if (pdfExportType === 'radiography') {
            generateInternalRadiographyPDF(exportFilename, exportTitle, n(exportTC), exportClient, exportProject);
        }
        setIsExportFilenameModalOpen(false);
    };

    const handleExportPDF = () => {
        if (isAdmin) {
            setIsTemplateEditorOpen(true);
        } else {
            triggerExportWithFilename('master');
        }
    };

    const handleSavePdfSettings = (newSettings, newClient, newProject, newLogo) => {
        setPdfSettings(newSettings);
        setClientName(newClient);
        setProjectName(newProject);
        setLogoUrl(newLogo);

        if (isAdmin) {
            // CRITICAL: Ensure we don't save the logo inside the JSON blob
            const { logoUrl, ...cleanSettings } = newSettings;
            saveToCloud(null, {
                pdfSettings: cleanSettings,
                client: newClient,
                project: newProject,
                logo: newLogo
            });
        }
        toast({ title: "Plantilla Guardada" });
    };

    const syncScroll = (id, e) => {
        if (virtualHeaderRefs.current[id]) {
            virtualHeaderRefs.current[id].scrollLeft = e.target.scrollLeft;
        }
    };

    const startResize = (colId, e) => {
        const startX = e.pageX;
        const startWidth = colWidths[colId];
        const onMouseMove = (moveEvent) => {
            const delta = moveEvent.pageX - startX;
            setColWidths(prev => ({ ...prev, [colId]: Math.max(50, startWidth + delta) }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const startWasteResize = (colId, e) => {
        const startX = e.pageX;
        const startWidth = wasteColWidths[colId];
        const onMouseMove = (moveEvent) => {
            const delta = moveEvent.pageX - startX;
            setWasteColWidths(prev => ({ ...prev, [colId]: Math.max(40, startWidth + delta) }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };



    const headerStyles = isScrolled ? "bg-black/90 backdrop-blur-2xl border-b border-white/5 py-4 shadow-2xl" : "bg-transparent py-10";

    console.log("[MasterPlan] 🎨 Render check:", { isHydrated, sectionsCount: sections.length, isStandalone });

    if (sectionData?.id === 'balance_masas') {
        return (
            <AnimatePresence>
                {isMassCalcModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[1000] bg-[#020202] flex flex-col overflow-hidden"
                    >
                        {/* Header de la Página */}
                        <header className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-xl px-12 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={() => {
                                        setIsMassCalcModalOpen(false);
                                        if (setActiveSection) setActiveSection('master_plan');
                                    }}
                                    className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
                                >
                                    <X size={20} className="text-zinc-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Radiografía de Masas</h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">{projectName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={handleExportMassPDF}
                                    className="px-4 py-2 bg-[#A3E635] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-110 active:scale-90 transition-all shadow-[0_0_25px_rgba(163,230,53,0.3)] flex items-center gap-2 group"
                                    title="Generar Reporte Técnico"
                                >
                                    <Download size={14} className="stroke-[3] group-hover:bounce" />
                                    PDF Técnico
                                </button>
                                <div className="px-5 py-2 bg-zinc-900 border border-white/5 rounded-full flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#3EB489] animate-pulse" />
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Análisis en Vivo</span>
                                </div>
                            </div>
                        </header>

                        {/* Contenido Principal Full Page (Dashboard Mode) */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Panel Izquierdo: Visualización Core (Compacta) */}
                            <div className="w-full md:w-[350px] p-8 bg-zinc-900/10 border-r border-white/5 flex flex-col items-center justify-center relative shrink-0">
                                <div className="w-full space-y-8 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Total / Día</label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={totalDailyTons}
                                                onChange={(e) => setTotalDailyTons(Number(e.target.value))}
                                                className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-6 py-5 text-5xl font-black text-white outline-none focus:border-[#3EB489]/50 transition-all text-center tabular-nums shadow-xl"
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-700 uppercase tracking-widest pointer-events-none">t/d</div>
                                        </div>
                                    </div>

                                    {/* Donut Chart Compacto */}
                                    <div className="relative w-full aspect-square flex items-center justify-center p-4">
                                        <svg viewBox="0 0 100 100" className="w-[200px] h-[200px] transform -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#111" strokeWidth="12" />
                                            {(() => {
                                                let cumulativePercent = 0;
                                                const radius = 40;
                                                const circumference = 2 * Math.PI * radius;

                                                return wasteComposition.map((item) => {
                                                    const segmentLength = (item.percent / 100) * circumference;
                                                    const strokeDashoffset = -(cumulativePercent / 100) * circumference;
                                                    cumulativePercent += item.percent;
                                                    const isHovered = hoveredItem === item.id;

                                                    return (
                                                        <circle
                                                            key={item.id}
                                                            cx="50"
                                                            cy="50"
                                                            r={radius}
                                                            fill="transparent"
                                                            stroke={item.color}
                                                            strokeWidth={isHovered ? 16 : 12}
                                                            strokeDasharray={`${segmentLength} ${circumference}`}
                                                            strokeDashoffset={strokeDashoffset}
                                                            className="transition-all duration-300 cursor-pointer"
                                                            onMouseEnter={() => setHoveredItem(item.id)}
                                                            onMouseLeave={() => setHoveredItem(null)}
                                                            style={{ 
                                                                filter: isHovered ? `drop-shadow(0 0 10px ${item.color}88)` : 'none',
                                                                opacity: hoveredItem && !isHovered ? 0.3 : 1
                                                            }}
                                                        />
                                                    );
                                                });
                                            })()}
                                        </svg>
                                        
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                                            <AnimatePresence mode="wait">
                                                {(hoveredItem || lockedItem) ? (
                                                    <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.label}</span>
                                                        <span className="text-3xl font-black text-white">{wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent}%</span>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                                        <span className="text-4xl font-black text-white tabular-nums leading-none">{totalDailyTons}</span>
                                                        <span className="text-[8px] font-black text-zinc-600 uppercase mt-1">TOTAL</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleExportMassPDF}
                                        className="w-full py-4 bg-[#A3E635] text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg text-[10px] flex items-center justify-center gap-3">
                                        <Download size={16} className="stroke-[3]" />
                                        Reporte PDF
                                    </button>
                                </div>
                            </div>

                            {/* Panel Derecho: Gestión Detallada (Dashboard Grid) */}
                            <div className="flex-1 p-8 bg-[#050505] flex flex-col overflow-y-auto custom-scrollbar relative">
                                <div className="w-full mx-auto space-y-6">
                                    <div className="flex items-end justify-between border-b border-white/5 pb-4">
                                        <div className="space-y-1">
                                            <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">Análisis Técnico</h3>
                                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Radiografía de <span className="text-[#A3E635]">Fracciones</span></h2>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Proyecto</span>
                                            <span className="text-xs font-black text-white tracking-widest uppercase">{CLOUD_SLUG || 'MP-GENERA-D'}</span>
                                        </div>
                                    </div>

                                    {/* GRID DE 3 COLUMNAS */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {wasteComposition.map((item) => (
                                            <motion.div 
                                                key={`fraction-node-${item.id}`} // Unique key forced
                                                onMouseEnter={() => setHoveredItem(item.id)}
                                                onMouseLeave={() => setHoveredItem(null)}
                                                onClick={() => setLockedItem(item.id)}
                                                className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
                                                    (hoveredItem === item.id || lockedItem === item.id)
                                                    ? 'bg-white/[0.06] border-[#A3E635] shadow-[0_0_30px_rgba(163,230,53,0.15)] scale-[1.02]' 
                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                {lockedItem === item.id && (
                                                    <div className="absolute top-4 right-4 animate-pulse">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#A3E635] shadow-[0_0_10px_#A3E635]" />
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="relative group/color">
                                                            <div 
                                                                className="w-2 h-10 rounded-full cursor-pointer transition-transform hover:scale-x-150 active:scale-95 shadow-sm" 
                                                                style={{ backgroundColor: item.color }} 
                                                            />
                                                            <input 
                                                                type="color"
                                                                value={item.color}
                                                                onChange={(e) => updateItemColor(item.id, e.target.value)}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                title="Cambiar color"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Categoría</span>
                                                            <span className="text-base font-black text-white uppercase tracking-tight truncate max-w-[130px]">{item.label}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-3xl font-black text-white tabular-nums leading-none">
                                                            {((totalDailyTons * item.percent) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                        <span className="text-[10px] font-black text-zinc-600 ml-2 uppercase tracking-widest">T/D</span>
                                                    </div>
                                                </div>
                                                
                                                <div className={`flex items-center justify-between bg-black/40 p-4 rounded-xl border transition-all ${hoveredItem === item.id ? 'border-[#A3E635]/20' : 'border-white/5'}`}>
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Puntaje Fracción</span>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative group/input">
                                                            <input 
                                                                type="number"
                                                                value={item.percent}
                                                                onChange={(e) => {
                                                                    const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                    setWasteComposition(prev => prev.map(p => p.id === item.id ? { ...p, percent: val } : p));
                                                                }}
                                                                className="w-20 bg-zinc-900 border-2 border-transparent group-hover/input:border-[#A3E635]/40 rounded-xl py-2 px-3 text-center text-2xl font-black text-[#A3E635] outline-none focus:border-[#A3E635] transition-all shadow-inner"
                                                            />
                                                        </div>
                                                        <span className="text-xs font-black text-zinc-700">%</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* CONSOLA MAESTRA DE INGENIERÍA (DINÁMICA ABAJO) */}
                                    <div className="mt-8 bg-black/60 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl relative overflow-hidden group/console shadow-2xl">
                                        {/* Glow decorativo de fondo */}
                                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#A3E635]/5 blur-[100px] rounded-full pointer-events-none" />
                                        
                                        <AnimatePresence mode="wait">
                                            {(hoveredItem || lockedItem) ? (
                                                <motion.div 
                                                    key="detail"
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="flex flex-col lg:flex-row items-center gap-12"
                                                >
                                                    {/* Lado A: Identidad */}
                                                    <div className="flex items-center gap-5 border-r border-white/10 pr-8 min-w-[260px]">
                                                        <div className="w-2.5 h-16 rounded-full shadow-[0_0_15px_rgba(163,230,53,0.3)]" style={{ backgroundColor: wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.color }} />
                                                        <div className="overflow-hidden">
                                                            <h4 className="text-[8px] font-black text-[#A3E635] uppercase tracking-[0.4em] mb-1 leading-none">Control</h4>
                                                            <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate drop-shadow-md">
                                                                {wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.label}
                                                            </h2>
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={() => setCurrencyMode(prev => prev === 'MXN' ? 'USD' : 'MXN')}
                                                                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all border ${currencyMode === 'MXN' ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-[#A3E635] border-[#A3E635] text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]'}`}
                                                                >
                                                                    {currencyMode}
                                                                </button>
                                                                <span className="text-[8px] text-zinc-700 font-bold tracking-widest leading-none px-1.5 py-0.5 bg-white/5 rounded border border-white/5">V1.0.2</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Lado B: Métricas */}
                                                    <div className="flex-1 flex items-center justify-between gap-6 overflow-hidden">
                                                        <div className="min-w-fit space-y-0.5">
                                                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Masa</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-4xl font-black text-white tracking-tighter tabular-nums">{(totalDailyTons * (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent || 0) / 100).toLocaleString()}</span>
                                                                <span className="text-[8px] font-black text-zinc-700 uppercase">T/D</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="min-w-fit space-y-0.5">
                                                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Caphr</p>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-4xl font-black text-[#A3E635] tracking-tighter">{(totalDailyTons * (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent || 0) / 100 / workingHours).toFixed(1)}</span>
                                                                <span className="text-[8px] font-black text-zinc-700 uppercase">t/h</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3 scale-90 origin-left">
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">In ({currencyMode})</span>
                                                                <div className="flex items-center bg-zinc-950 px-2 py-1 rounded border border-white/5 w-24">
                                                                    <span className="text-[#A3E635] text-[8px] font-black mr-1">$</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={currencyMode === 'MXN' 
                                                                            ? wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceDirty 
                                                                            : (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceDirty / tipoCambio).toFixed(0)}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                            updateItemData((hoveredItem || lockedItem), 'priceDirty', finalVal);
                                                                        }}
                                                                        className="w-full bg-transparent text-xs font-black text-white focus:outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-[#A3E635] uppercase mb-1">Rec ({currencyMode})</span>
                                                                <div className="flex items-center bg-[#A3E635]/5 px-2 py-1 rounded border border-[#A3E635]/15 w-24">
                                                                    <span className="text-[#A3E635] text-[8px] font-black mr-1">$</span>
                                                                    <input 
                                                                        type="number"
                                                                        value={currencyMode === 'MXN' 
                                                                            ? wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceRecycled 
                                                                            : (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceRecycled / tipoCambio).toFixed(0)}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value);
                                                                            const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                            updateItemData((hoveredItem || lockedItem), 'priceRecycled', finalVal);
                                                                        }}
                                                                        className="w-full bg-transparent text-xs font-black text-[#A3E635] focus:outline-none"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right space-y-0.5 ml-auto border-l border-white/5 pl-6 min-w-fit">
                                                            <p className="text-[9px] font-black text-[#A3E635] uppercase tracking-widest">Utilidad Estimada</p>
                                                            <p className="text-4xl lg:text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl whitespace-nowrap">
                                                                <span className="text-[#A3E635] text-xl mr-1 leading-none">$</span>
                                                                {(() => {
                                                                    const item = wasteComposition.find(i => i.id === (hoveredItem || lockedItem));
                                                                    const tons = (totalDailyTons * (item?.percent || 0) / 100);
                                                                    const diff = (item?.priceRecycled || 0) - (item?.priceDirty || 0);
                                                                    const utility = tons * diff;
                                                                    const displayVal = currencyMode === 'MXN' ? utility : (utility / tipoCambio);
                                                                    return displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 });
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.div 
                                                    key="placeholder"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-12">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-2">Estado Global del Sistema</span>
                                                            <div className="flex items-center gap-6">
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Validación de Datos</span>
                                                                    <span className="text-4xl font-black text-[#A3E635]">100% OK</span>
                                                                    <Check size={28} className="text-[#A3E635] stroke-[4]" />
                                                                </div>
                                                                <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-gradient-to-r from-[#A3E635] to-emerald-500 w-full" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Masa Total Administrada</p>
                                                        <p className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                                            {totalDailyTons.toLocaleString()} <span className="text-xs text-zinc-700 ml-1">T/D</span>
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* TABLA DINÁMICA DE RESIDUOS (MATRIZ OPERATIVA) */}
                                    <div className="mt-8 bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                                        <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-6 bg-[#A3E635] rounded-full shadow-[0_0_15px_#A3E635]" />
                                                <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Matriz Operativa de Residuos (Balance de Masas)</h3>
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                {/* CONTROLES DE VISUALIZACIÓN */}
                                                <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-xl border border-white/5">
                                                    {/* LOCK TOGGLE */}
                                                    <button 
                                                        onClick={() => setIsWasteTableLocked(!isWasteTableLocked)}
                                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isWasteTableLocked ? 'bg-[#A3E635]/10 border-[#A3E635]/30 text-[#A3E635]' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                                                    >
                                                        {isWasteTableLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{isWasteTableLocked ? 'Bloqueado' : 'Abierto'}</span>
                                                    </button>

                                                    <div className="w-px h-6 bg-white/10 mx-1" />

                                                    <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Texto</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => setTableFontSize(prev => Math.max(8, prev - 1))}
                                                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                            >-</button>
                                                            <span className="text-[10px] font-black text-[#A3E635] w-6 text-center">{tableFontSize}</span>
                                                            <button 
                                                                onClick={() => setTableFontSize(prev => Math.min(16, prev + 1))}
                                                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Columnas</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => setTableColumnScale(prev => Math.max(0.5, prev - 0.1))}
                                                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                            >-</button>
                                                            <span className="text-[10px] font-black text-[#A3E635] w-8 text-center">{(tableColumnScale * 100).toFixed(0)}%</span>
                                                            <button 
                                                                onClick={() => setTableColumnScale(prev => Math.min(2.0, prev + 0.1))}
                                                                className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                   <div className="flex flex-col items-end">
                                                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Divisa Actualización</span>
                                                      <span className="text-xs font-black text-[#A3E635]">{currencyMode}</span>
                                                   </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto custom-scrollbar">
                                            <table 
                                                className="w-full text-left border-separate border-spacing-0 table-fixed"
                                                style={{ fontSize: `${tableFontSize}px`, width: 'max-content', minWidth: '100%' }}
                                            >
                                                <thead>
                                                    <tr className="bg-white/[0.01]">
                                                        {wasteColOrder.map((colId) => {
                                                            const colInfo = [
                                                                { id: 'num', label: '#' },
                                                                { id: 'label', label: 'Clasificación Residuo' },
                                                                { id: 'percent', label: 'Mezcla %' },
                                                                { id: 'tonsDay', label: 'Masa (T/D)' },
                                                                { id: 'tonsHr', label: 'Capacidad (T/H)' },
                                                                { id: 'dirty', label: `Compactado ($/T)` },
                                                                { id: 'recycled', label: `Reciclado ($/T)` },
                                                                { id: 'util', label: `Potencial Diario (${currencyMode})`, align: 'right', color: '#A3E635' }
                                                            ].find(c => c.id === colId);

                                                            return (
                                                                <th 
                                                                    key={colId}
                                                                    draggable={!isWasteTableLocked}
                                                                    onDragStart={() => !isWasteTableLocked && setDraggedWasteCol(colId)}
                                                                    onDragOver={(e) => e.preventDefault()}
                                                                    onDrop={() => {
                                                                        if (isWasteTableLocked || !draggedWasteCol || draggedWasteCol === colId) return;
                                                                        const newOrder = [...wasteColOrder];
                                                                        const oldIdx = newOrder.indexOf(draggedWasteCol);
                                                                        const newIdx = newOrder.indexOf(colId);
                                                                        newOrder.splice(oldIdx, 1);
                                                                        newOrder.splice(newIdx, 0, draggedWasteCol);
                                                                        setWasteColOrder(newOrder);
                                                                    }}
                                                                    className={`px-6 py-4 text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5 cursor-move ${colInfo?.align === 'right' ? 'text-right' : ''}`}
                                                                    style={{ width: `${(wasteColWidths[colId] || 100) * tableColumnScale}px` }}
                                                                >
                                                                    {colInfo?.label}
                                                                </th>
                                                            );
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {wasteComposition.map((item, idx) => (
                                                        <tr 
                                                            key={item.id} 
                                                            className={`group/row transition-colors hover:bg-white/[0.02] ${lockedItem === item.id ? 'bg-white/[0.03]' : ''}`}
                                                            onMouseEnter={() => setHoveredItem(item.id)}
                                                            onMouseLeave={() => setHoveredItem(null)}
                                                            onClick={() => setLockedItem(item.id)}
                                                        >
                                                            {wasteColOrder.map((colId) => {
                                                                const tonsDay = (totalDailyTons * item.percent) / 100;
                                                                const tonsHr = tonsDay / workingHours;
                                                                const utility = tonsDay * (item.priceRecycled - item.priceDirty);
                                                                const displayUtility = currencyMode === 'MXN' ? utility : utility / tipoCambio;

                                                                return (
                                                                    <td 
                                                                        key={`${item.id}-${colId}`} 
                                                                        className={`px-6 py-4 border-b border-white/[0.02] text-sm font-black transition-all ${colId === 'util' ? 'text-[#A3E635] text-right' : 'text-white'} ${lockedItem === item.id ? 'border-b-[#A3E635]/20' : ''}`}
                                                                    >
                                                                        {colId === 'num' && <span className="text-zinc-700 font-mono text-[10px]">{idx + 1}</span>}
                                                                        {colId === 'label' && (
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                                                                                <span className="uppercase tracking-tight">{item.label}</span>
                                                                            </div>
                                                                        )}
                                                                        {colId === 'percent' && (
                                                                            <div className="flex items-center gap-2">
                                                                                <input 
                                                                                    type="number"
                                                                                    value={item.percent}
                                                                                    onChange={(e) => {
                                                                                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                                        setWasteComposition(prev => prev.map(p => p.id === item.id ? { ...p, percent: val } : p));
                                                                                    }}
                                                                                    className="w-12 bg-transparent text-white focus:outline-none border-b border-white/5 focus:border-[#A3E635] text-center"
                                                                                />
                                                                                <span className="text-[10px] text-zinc-600">%</span>
                                                                            </div>
                                                                        )}
                                                                        {colId === 'tonsDay' && <span className="tabular-nums">{tonsDay.toLocaleString()}</span>}
                                                                        {colId === 'tonsHr' && <span className="tabular-nums text-zinc-400">{tonsHr.toFixed(1)}</span>}
                                                                        {colId === 'dirty' && (
                                                                             <div className="flex items-center gap-1">
                                                                                <span className="text-[10px] text-zinc-600">$</span>
                                                                                <input 
                                                                                    type="number"
                                                                                    value={currencyMode === 'MXN' ? item.priceDirty : (item.priceDirty / tipoCambio).toFixed(0)}
                                                                                    onChange={(e) => {
                                                                                        const val = Number(e.target.value);
                                                                                        const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                        updateItemData(item.id, 'priceDirty', finalVal);
                                                                                    }}
                                                                                    className="w-16 bg-transparent text-white focus:outline-none border-b border-white/5 focus:border-[#A3E635] tabular-nums"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        {colId === 'recycled' && (
                                                                             <div className="flex items-center gap-1">
                                                                                <span className="text-[10px] text-zinc-600">$</span>
                                                                                <input 
                                                                                    type="number"
                                                                                    value={currencyMode === 'MXN' ? item.priceRecycled : (item.priceRecycled / tipoCambio).toFixed(0)}
                                                                                    onChange={(e) => {
                                                                                        const val = Number(e.target.value);
                                                                                        const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                        updateItemData(item.id, 'priceRecycled', finalVal);
                                                                                    }}
                                                                                    className="w-16 bg-transparent text-[#A3E635] focus:outline-none border-b border-white/5 focus:border-[#A3E635] tabular-nums"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        {colId === 'util' && (
                                                                            <span className="tabular-nums">
                                                                                {displayUtility.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    if (!isHydrated) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2">
                <span className="text-white font-black text-xs uppercase tracking-[0.3em] animate-pulse">Cargando Plan Maestro</span>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{baseSlug}</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-primary selection:text-black">
            {/* 1. Dynamic Header */}
            {isStandalone && (
                <header className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ${headerStyles}`}>
                    <div className="max-w-[1800px] mx-auto px-6 md:px-12 flex items-center justify-between">
                        <div className="flex items-center gap-8 group cursor-pointer" onClick={() => navigate('/')}>
                            <div className="relative overflow-hidden rounded-2xl bg-white/5 p-2 border border-white/10 group-hover:border-primary/50 transition-all duration-500">
                                <img src={logoUrl && !logoUrl.includes('favicon.png') ? logoUrl : '/solimaq_logo.png'} alt="Logo" className="h-10 md:h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white leading-none uppercase">
                                        {mpTitle}
                                    </h1>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-900 border border-white/10 rounded-full cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                                        <span className="text-[9px] font-mono text-gray-400 font-medium tracking-wider">
                                            {isLoadingData ? "SYNCING..." : "VER 7.75"}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-[0.4em] mt-1 group-hover:text-primary/70 transition-colors">
                                    {mpSubTitle}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {isAdmin && (
                                <div className="hidden xl:flex items-center bg-zinc-900/50 border border-white/5 rounded-2xl p-1.5 backdrop-blur-md">
                                    <button
                                        onClick={() => saveToCloud()}
                                        disabled={isCloudSyncing}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isCloudSyncing ? "bg-zinc-800 text-zinc-500" : "bg-primary text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(155,212,40,0.4)]"}`}
                                    >
                                        {isCloudSyncing ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                                        {isCloudSyncing ? "GUARDANDO..." : "SINCRONIZAR"}
                                    </button>
                                    <button onClick={() => setIsTemplateEditorOpen(true)} className="p-2.5 text-gray-400 hover:text-white transition-colors" title="Ajustar Plantilla"><Settings size={18} /></button>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    if (isAdminAuthenticated) {
                                        setIsAdmin(!isAdmin);
                                    } else {
                                        setShowPasswordPrompt(true);
                                    }
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border ${isAdmin ? 'bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30 hover:text-white'}`}
                            >
                                {isAdmin ? <Unlock size={20} /> : <Lock size={20} />}
                            </button>
                        </div>
                    </div>
                </header>
            )}

            {/* 2. Hero Section */}
            {isStandalone && (
                <div className="relative pt-40 pb-20 px-6 md:px-12 max-w-[1800px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
                        <div className="lg:col-span-7 space-y-10">
                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Visor Industrial</span>
                            </div>
                            <h2 className="text-7xl md:text-[10rem] font-black text-white leading-[0.8] tracking-tighter uppercase italic">
                                MASTER <br />
                                <span className="text-primary not-italic">PLAN</span>
                            </h2>
                            <div className="max-w-xl space-y-6">
                                <p className="text-gray-400 text-lg leading-relaxed font-medium">
                                    {projectDesc}
                                </p>
                                <div className="flex flex-wrap gap-8 pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">Inversión Estimada</span>
                                        <span className="text-primary font-black text-xl tracking-tight">{money(grandTotals.totalVenta)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-5 relative group">
                            <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/10 bg-zinc-900/50 backdrop-blur-3xl shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]">
                                {heroVideoUrl ? (
                                    <div className="absolute inset-0">
                                        {heroVideoIsIntegrated ? (
                                            <video
                                                src={heroVideoUrl}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                style={{ borderRadius: `${heroVideoBorderRadius}px`, transform: `scale(${heroVideoScale / 100})` }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                                <Play size={48} className="text-primary opacity-20 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setIsHeroVideoActive(true)}
                                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-black shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                                                <Play size={32} fill="currentColor" />
                                            </div>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-4">
                                        <Video size={64} className="opacity-10" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-20">Sin Video del Proyecto</span>
                                    </div>
                                )}
                            </div>
                            <div className="absolute -inset-20 bg-primary/20 blur-[120px] rounded-full opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none" />
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Main Project Canvas */}
            <div className={`mx-auto pb-40 ${isStandalone ? 'max-w-[1800px] px-6 md:px-12 pt-10' : 'max-w-7xl px-4 py-24 border-t border-white/5'}`}>
                {!isStandalone && (
                    <div className="text-center mb-16 pt-8 relative">

                        <h1 className="text-5xl sm:text-8xl font-black tracking-tighter mb-6 uppercase">
                            MASTER <span className="text-primary">PLAN</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium leading-relaxed mb-8">
                            Aquí puedes ver el desglose de la inversión. Marca o desmarca los componentes para ajustar el costo total.
                        </p>

                        <div className="flex items-center gap-3 justify-center flex-wrap">
                            <button
                                onClick={() => toggleAllSections(false)}
                                className="px-6 py-3 bg-zinc-900 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-800 hover:border-primary/50 transition-all flex items-center gap-2 group"
                            >
                                <Maximize2 size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                                ABRIR MÓDULOS
                            </button>

                            <button
                                onClick={() => toggleAllSections(true)}
                                className="px-6 py-3 bg-zinc-900 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-800 hover:border-primary/50 transition-all flex items-center gap-2 group"
                            >
                                <Minimize2 size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                                CERRAR MÓDULOS
                            </button>

                            {(isAdminAuthenticated || isAdmin) && (
                                <button
                                    onClick={deselectAllModules}
                                    className="px-6 py-3 bg-red-500/10 border border-red-500/40 text-red-500 font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-red-500/20 hover:border-red-500/60 transition-all flex items-center gap-2 group shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                                >
                                    <Power size={14} className="group-hover:rotate-90 transition-transform" />
                                    DESELECCIONAR TODO
                                </button>
                            )}

                            <button
                                onClick={() => triggerExportWithFilename('master')}
                                className="px-6 py-3 bg-zinc-900 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-800 hover:border-primary/50 transition-all flex items-center gap-2 group"
                            >
                                <Download size={14} className="text-primary group-hover:scale-110 transition-transform" />
                                EXPORTAR PDF
                            </button>

                            <button
                                onClick={() => triggerExportWithFilename('equipment-list')}
                                className="px-6 py-3 bg-zinc-900 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-800 hover:border-primary/50 transition-all flex items-center gap-2 group"
                            >
                                <FileSpreadsheet size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
                                EXPORTAR LISTADO
                            </button>

                            <button
                                onClick={() => triggerExportWithFilename('equipment-list-mxn')}
                                className="px-6 py-3 bg-zinc-900 border border-green-500/30 text-green-400 font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-green-500/10 hover:border-green-500/50 transition-all flex items-center gap-2 group"
                            >
                                <Zap size={14} className="text-green-400 group-hover:scale-110 transition-transform" />
                                EXPORTAR MXN
                            </button>

                            <button
                                onClick={apply50PercentUtilization}
                                className="px-6 py-3 bg-red-500/10 border border-red-500/40 text-red-500 font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-red-500/20 hover:border-red-500/60 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all flex items-center gap-2 group"
                                title="Aplicar 50% de utilidad a todo el proyecto"
                            >
                                <Percent size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
                                50%
                            </button>

                            {(isAdminAuthenticated || isAdmin) && (
                                <>
                                    <button
                                        onClick={() => triggerExportWithFilename('radiography')}
                                        className="px-6 py-3 bg-zinc-900 border border-purple-500/30 text-purple-400 font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-purple-500/10 hover:border-purple-500/50 transition-all flex items-center gap-2 group"
                                    >
                                        <Activity size={14} className="group-hover:animate-pulse" />
                                        EXPORTAR RADIOGRAFÍA
                                    </button>

                                    <button
                                        onClick={() => setIsTemplateEditorOpen(true)}
                                        className="px-6 py-3 bg-zinc-900 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-800 hover:border-primary/50 transition-all flex items-center gap-2 group"
                                    >
                                        <Settings size={14} className="text-primary group-hover:rotate-90 transition-transform" />
                                        AJUSTAR PLANTILLA
                                    </button>

                                    <button
                                        onClick={handleExportExcel}
                                        className="px-6 py-3 bg-zinc-900 border border-green-500/30 text-green-500 text-[10px] font-black tracking-widest uppercase hover:bg-green-500/10 transition-all flex items-center gap-2"
                                    >
                                        <FileSpreadsheet size={14} />
                                        EXPORTAR EXCEL
                                    </button>

                                    <button
                                        onClick={() => setIsMassCalcModalOpen(true)}
                                        className="px-6 py-3 bg-zinc-900 border border-emerald-500/30 text-emerald-400 text-[10px] font-black tracking-widest uppercase hover:bg-emerald-500/10 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                    >
                                        <PieChart size={14} />
                                        CÁLCULO DE MASAS
                                    </button>

                                    <button
                                        onClick={() => {
                                            fetchAvailableProjects();
                                            setIsImportModalOpen(true);
                                        }}
                                        className="px-6 py-3 bg-zinc-900 border border-amber-500/30 text-amber-500 text-[10px] font-black tracking-widest uppercase hover:bg-amber-500/10 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                    >
                                        <Briefcase size={14} />
                                        IMPORTAR PROYECTO
                                    </button>

                                    <button
                                        onClick={() => {
                                            const inp = document.createElement('input');
                                            inp.type = 'file';
                                            inp.accept = '.xlsx, .xls';
                                            inp.onchange = handleImportExcel;
                                            inp.click();
                                        }}
                                        className="px-6 py-3 bg-zinc-900 border border-blue-500/30 text-blue-400 text-[10px] font-black tracking-widest uppercase hover:bg-blue-500/10 transition-all flex items-center gap-2"
                                    >
                                        <Upload size={14} />
                                        IMPORTAR EXCEL
                                    </button>

                                    <button
                                        onClick={() => {
                                            setTargetAmountValue(grandTotals.totalVenta.toFixed(2));
                                            setTargetAmountModalOpen(true);
                                        }}
                                        className="px-6 py-3 bg-zinc-900 border border-primary/30 text-white text-[10px] font-black tracking-widest uppercase hover:bg-primary/20 transition-all flex items-center gap-2"
                                    >
                                        <ChevronsDown size={14} className="text-primary" />
                                        AJUSTAR MONTO
                                    </button>

                                    {/* CONTROLES DE PARÁMETROS GLOBALES - RED CRYSTAL STYLE */}
                                    <div className="flex items-center gap-0.5 bg-red-500/5 border border-red-500/30 rounded-xl p-1 overflow-hidden backdrop-blur-sm shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                                        {/* UTILIDAD */}
                                        <div className="flex items-center gap-2 px-3 border-r border-red-500/20" title="Utilidad Global">
                                            <Percent size={12} className="text-red-500" />
                                            <input 
                                                type="number" 
                                                value={globalUtilVal} 
                                                onChange={(e) => setGlobalUtilVal(n(e.target.value))} 
                                                className="w-10 bg-transparent text-white font-black text-[10px] focus:outline-none"
                                            />
                                        </div>

                                        {/* TIPO DE CAMBIO */}
                                        <div className="flex items-center gap-2 px-3 border-r border-red-500/20" title="Tipo de Cambio (TC)">
                                            <span className="text-red-500 font-extrabold text-[9px] min-w-[15px]">TC</span>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={tipoCambio} 
                                                onChange={(e) => setTipoCambio(n(e.target.value))} 
                                                className="w-12 bg-transparent text-white font-black text-[10px] focus:outline-none"
                                            />
                                        </div>

                                        {/* TOGGLE DESCRIPCIONES */}
                                        <button 
                                            onClick={() => setShowDescriptions(!showDescriptions)}
                                            className={`flex items-center gap-2 px-4 py-2 transition-all text-[10px] font-black uppercase tracking-widest border-r border-red-500/20 ${showDescriptions ? 'text-red-400 bg-red-500/10' : 'text-gray-500 hover:text-red-400'}`}
                                            title={showDescriptions ? "Ocultar Descripciones" : "Mostrar Descripciones"}
                                        >
                                            <AlignLeft size={12} className={showDescriptions ? "opacity-100" : "opacity-40"} />
                                            DESC
                                        </button>

                                        {/* TOGGLE MEDIA */}
                                        <button 
                                            onClick={() => setShowMedia(!showMedia)}
                                            className={`flex items-center gap-2 px-4 py-2 transition-all text-[10px] font-black uppercase tracking-widest border-r border-red-500/20 ${showMedia ? 'text-red-400 bg-red-500/10' : 'text-gray-500 hover:text-red-400'}`}
                                            title={showMedia ? "Ocultar Fotos/Videos" : "Mostrar Fotos/Videos"}
                                        >
                                            <Camera size={12} className={showMedia ? "opacity-100" : "opacity-40"} />
                                            MEDIA
                                        </button>

                                        <button 
                                            onClick={applyGlobalUtilization}
                                            className="px-4 py-2 hover:bg-red-500 hover:text-black transition-all text-red-500 hover:font-black font-black text-[10px] uppercase tracking-widest"
                                        >
                                            APLICAR %
                                        </button>

                                        <div className="flex items-center gap-0 border-l border-white/10 ml-2">
                                            <input 
                                                type="number" 
                                                value={globalQtyVal} 
                                                onChange={(e) => setGlobalQtyVal(Math.max(1, parseInt(e.target.value) || 1))}
                                                className="w-12 bg-black/40 border-none text-white text-[10px] font-black text-center outline-none h-10"
                                            />
                                            <button 
                                                onClick={applyGlobalQty}
                                                className="px-4 py-2 bg-primary/20 hover:bg-primary hover:text-black transition-all text-primary hover:font-black font-black text-[10px] uppercase tracking-widest border-l border-white/10 h-10"
                                            >
                                                APLICAR QTY
                                            </button>
                                        </div>
                                        {isRestoratable && (
                                            <button 
                                                onClick={restoreOriginalUtilization}
                                                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-black transition-all text-[10px] font-black uppercase tracking-widest border-l border-red-500/20"
                                                title="Restaurar utilidades originales"
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <button
                                        onClick={justifyAllDescriptions}
                                        className="px-6 py-3 bg-zinc-900 border border-primary/20 text-primary text-[10px] font-black tracking-widest uppercase hover:bg-primary/10 transition-all flex items-center gap-2"
                                    >
                                        <AlignJustify size={14} />
                                        JUSTIFICAR TODO
                                    </button>

                                    <button
                                        onClick={() => {
                                            const inp = document.createElement('input');
                                            inp.type = 'file';
                                            inp.multiple = true;
                                            inp.accept = 'image/*,video/*';
                                            inp.onchange = (e) => handleBulkMediaUpload(e.target.files);
                                            inp.click();
                                        }}
                                        disabled={isCloudSyncing}
                                        className={`px-6 py-3 bg-zinc-900 border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${isCloudSyncing ? 'text-zinc-500 border-zinc-700' : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'}`}
                                    >
                                        {isCloudSyncing ? <Loader2 size={12} className="animate-spin" /> : <Camera size={14} />}
                                        CARGA FOTOS
                                    </button>

                                    <button
                                        onClick={reindexAll}
                                        className="h-8 md:h-10 px-4 bg-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all active:scale-95 flex items-center gap-2"
                                        title="Corregir Numeración en todo el proyecto"
                                    >
                                        <Activity size={12} />
                                        NORMALIZA
                                    </button>
                                    <button
                                        onClick={() => saveToCloud()}
                                        disabled={isCloudSyncing}
                                        className={`px-8 py-3 bg-primary text-black font-black rounded-xl text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(155,212,40,0.3)]`}
                                    >
                                        {isCloudSyncing ? <Loader2 size={12} className="animate-spin" /> : <Shield size={14} />}
                                        {isCloudSyncing ? "GUARDANDO..." : "SINCRONIZAR"}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* BUSCADOR GLOBAL - MODO ADMIN */}
                        {isAdmin && (
                            <div className="mt-8 max-w-4xl mx-auto relative px-4">
                                <div className="relative flex items-center bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 focus-within:border-primary/50 transition-all group overflow-hidden">
                                    <div className="pl-4 pr-2 text-zinc-500 group-focus-within:text-primary transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="BUSCAR EQUIPO O MÓDULO POR NOMBRE..."
                                        className="w-full bg-transparent border-none outline-none text-white font-black text-xs tracking-widest placeholder:text-zinc-600 h-10"
                                    />
                                    
                                    <div className="flex items-center gap-2 px-4 border-l border-white/5">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter leading-none mb-1">Ítems Activos</span>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                                                <span className="text-sm font-mono font-black text-white leading-none">
                                                    {sections.reduce((acc, s) => {
                                                        if (s.activo === false) return acc;
                                                        return acc + (s.items || []).filter(it => it.activo !== false).length;
                                                    }, 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {searchTerm && (
                                        <button onClick={() => setSearchTerm("")} className="px-4 py-2 text-zinc-500 hover:text-white transition-colors">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* TOTALES RÁPIDOS */}
                                <div className="flex flex-wrap gap-4 mt-4 px-2">
                                    <div className="flex-1 min-w-[120px] bg-zinc-900/40 border border-white/5 rounded-2xl p-4 group hover:border-primary/20 transition-all">
                                        <div className="text-[10px] text-zinc-600 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-primary rounded-full" />
                                            Total USD
                                        </div>
                                        <div className="text-xl font-black text-white tracking-tighter group-hover:text-primary transition-colors uppercase">
                                            {money(grandTotals.totalVenta)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-[120px] bg-zinc-900/40 border border-white/5 rounded-2xl p-4 group hover:border-primary/20 transition-all">
                                        <div className="text-[10px] text-zinc-600 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-red-500 rounded-full" />
                                            Total MXN (TC {tipoCambio})
                                        </div>
                                        <div className="text-xl font-black text-white tracking-tighter group-hover:text-red-500 transition-colors uppercase">
                                            {"$" + (grandTotals.totalVenta * tipoCambio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-zinc-600 ml-1">Pesos</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-[120px] bg-zinc-900/40 border border-white/5 rounded-2xl p-4 group hover:border-primary/20 transition-all">
                                        <div className="text-[10px] text-zinc-600 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-blue-500 rounded-full" />
                                            Potencia Total
                                        </div>
                                        <div className="text-xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors uppercase">
                                            {grandTotals.totalKW.toLocaleString()} <span className="text-[10px] text-zinc-600 ml-1">KWs</span>
                                        </div>
                                    </div>

                                    {/* UTILIDAD ESTIMADA */}
                                    <div className="flex-1 min-w-[120px] bg-zinc-900/40 border border-emerald-500/10 rounded-2xl p-4 group hover:border-emerald-500/30 transition-all">
                                        <div className="text-[10px] text-zinc-600 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                            Utilidad Estimada
                                        </div>
                                        <div className="text-xl font-black text-white tracking-tighter group-hover:text-emerald-400 transition-colors uppercase flex items-center gap-3">
                                            <span>
                                                {"$" + grandTotals.utilidadMXN.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-zinc-600 ml-1">Pesos</span>
                                            </span>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <button className="text-sm font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/20 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                                        {grandTotals.utilidadPromedioPct.toFixed(1)}%
                                                    </button>
                                                </DialogTrigger>
                                                <DialogContent className="fixed top-[50%] left-[50%] z-[999] grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-black/95 backdrop-blur-xl p-6 shadow-2xl duration-200 rounded-3xl">
                                                    <DialogHeader>
                                                        <DialogTitle className="text-emerald-500 font-black tracking-tight flex items-center gap-2 text-xl">
                                                            <Percent size={20} className="text-emerald-500" />
                                                            Utilidad Global
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-6 pt-4">
                                                        <div>
                                                            <label className="text-[10px] text-zinc-500 font-extrabold tracking-widest uppercase mb-3 block flex items-center gap-2">
                                                                <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                                                                Porcentaje de Utilidad (%)
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    value={globalUtilVal}
                                                                    onChange={(e) => setGlobalUtilVal(n(e.target.value))}
                                                                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl p-4 text-white font-black text-2xl tracking-tighter focus:border-emerald-500/50 outline-none transition-colors"
                                                                />
                                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50">
                                                                    <Percent size={20} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                applyGlobalUtilization();
                                                                // We will let toast handle confirmation.
                                                            }}
                                                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                                                        >
                                                            <Check size={18} /> Aplicar a Todos
                                                        </button>
                                                        {isRestoratable && (
                                                            <button
                                                                onClick={restoreOriginalUtilization}
                                                                className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px] mt-2 border border-white/5"
                                                            >
                                                                <RotateCcw size={14} /> Restaurar Porcentajes Previos
                                                            </button>
                                                        )}
                                                        <p className="text-[10px] text-zinc-500 text-center font-semibold leading-relaxed border-t border-white/5 pt-4">
                                                            Esta acción sobrescribirá el % individual de <span className="text-white">TODO EL PROYECTO</span>.
                                                        </p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                </div>

                                {/* RESULTADOS DE BÚSQUEDA */}
                                <AnimatePresence>
                                    {searchTerm && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-4 right-4 mt-2 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[500] max-h-[400px] overflow-y-auto"
                                        >
                                            {(() => {
                                                const matches = sections.flatMap((s, sIdx) => 
                                                    (s.items || []).filter(it => {
                                                        const equipo = (it.equipo || "").toString().toLowerCase();
                                                        const titulo = (s.titulo || "").toString().toLowerCase();
                                                        const term = searchTerm.toLowerCase();
                                                        return equipo.includes(term) || titulo.includes(term);
                                                    }).map((it, iIdx) => ({ it, s, sIdx, iIdx }))
                                                );

                                                if (matches.length === 0) {
                                                    return <div className="px-6 py-12 text-center text-zinc-600 font-black text-xs tracking-widest uppercase">No se encontraron coincidencias</div>;
                                                }

                                                return matches.map(({ it, s, sIdx, iIdx }) => {
                                                    const subtotalMXN = calcItem(it).totalVenta * tipoCambio;
                                                    const isActive = it.activo !== false;
                                                    
                                                    return (
                                                        <button 
                                                            key={it.id}
                                                            onClick={() => scrollToItem(s.id, it.id)}
                                                            className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-all border-b border-white/5 last:border-none group text-left ${!isActive ? 'bg-black/20 opacity-70' : ''}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-mono transition-colors ${isActive ? 'bg-zinc-800 text-zinc-500 group-hover:text-primary group-hover:bg-primary/10' : 'bg-red-500/10 text-red-500/50'}`}>
                                                                {sIdx + 1}.{iIdx + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-primary animate-pulse' : 'bg-red-500'}`} />
                                                                    <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">{s.titulo}</div>
                                                                    {!isActive && <span className="text-[8px] font-black bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Inactivo</span>}
                                                                </div>
                                                                <div className={`text-sm font-black transition-colors ${isActive ? 'text-white group-hover:text-primary' : 'text-zinc-500'}`}>{it.equipo}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`text-[11px] font-black tracking-tight ${isActive ? 'text-primary' : 'text-zinc-600'}`}>
                                                                    {"$" + subtotalMXN.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                                                </div>
                                                                <div className="text-[8px] text-zinc-700 font-mono uppercase tracking-tighter">Subtotal Pesos</div>
                                                            </div>
                                                            <ChevronRight size={16} className={`transition-colors ${isActive ? 'text-zinc-700 group-hover:text-primary' : 'text-zinc-800'}`} />
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}

                <div className={`sticky z-[160] transition-all duration-500 ${isScrolled ? 'top-[88px] opacity-100' : 'opacity-0 pointer-events-none translate-y-4'}`}>
                    <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/5 rounded-2xl p-2 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-6 px-4">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Resumen</span>
                                <span className="text-sm font-black text-white">{money(grandTotals.totalVenta)} <span className="text-gray-600 mx-2">|</span> {sections.length} Módulos</span>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setColsLocked(!colsLocked)}
                                    className={`px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${colsLocked ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-white/40 hover:bg-white/10'}`}
                                >
                                    {colsLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                    {colsLocked ? "Celdas" : "Libre"}
                                </button>
                                <button
                                    onClick={() => setIsPriceEditMode(!isPriceEditMode)}
                                    className={`px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${isPriceEditMode ? 'border-green-500 bg-green-500/10 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'}`}
                                >
                                    <FileSpreadsheet size={12} />
                                    {isPriceEditMode ? "Fijar Precios" : "Precio Libre"}
                                </button>
                                <div className="flex items-center gap-0 border-l border-white/10 ml-2">
                                    <input 
                                        type="number" 
                                        value={globalQtyVal} 
                                        onChange={(e) => setGlobalQtyVal(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-10 bg-black/40 border-none text-white text-[10px] font-black text-center outline-none h-8 rounded-l-lg"
                                    />
                                    <button 
                                        onClick={applyGlobalQty}
                                        className="px-3 py-2 bg-primary/20 hover:bg-primary hover:text-black transition-all text-primary hover:font-black font-black text-[9px] uppercase tracking-widest border-l border-white/10 h-8 rounded-r-lg"
                                    >
                                        QTY
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        setTargetAmountValue(grandTotals.totalVenta.toFixed(2));
                                        setTargetAmountModalOpen(true);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-primary/50 bg-primary/20 text-white text-[10px] font-black tracking-widest uppercase hover:bg-primary/30 transition-all flex items-center gap-2"
                                >
                                    <ChevronsDown size={14} className="text-primary" />
                                    Monto
                                </button>
                                <button
                                    onClick={justifyAllDescriptions}
                                    className="px-4 py-2 rounded-xl border border-primary/30 bg-primary/5 text-primary text-[10px] font-black tracking-widest uppercase hover:bg-primary/20 transition-all flex items-center gap-2"
                                    title="Justificar descripciones"
                                >
                                    <AlignJustify size={14} />
                                    Justificar
                                </button>
                                <button
                                    onClick={() => {
                                        const inp = document.createElement('input');
                                        inp.type = 'file';
                                        inp.multiple = true;
                                        inp.accept = 'image/*,video/*';
                                        inp.onchange = (e) => handleBulkMediaUpload(e.target.files);
                                        inp.click();
                                    }}
                                    disabled={isCloudSyncing}
                                    className={`px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${isCloudSyncing ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'border-purple-500/50 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'}`}
                                >
                                    {isCloudSyncing ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                                    {isCloudSyncing ? "Subiendo..." : "Carga Masiva Fotos"}
                                </button>
                                <button
                                    onClick={() => saveToCloud()}
                                    disabled={isCloudSyncing}
                                    className={`px-4 py-2 rounded-xl border text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${isCloudSyncing ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'border-green-500/50 bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                                >
                                    {isCloudSyncing ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                                    {isCloudSyncing ? "..." : "Sincronizar"}
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pr-2 ml-auto">
                            <button onClick={apply50PercentUtilization} className="px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 font-black rounded-xl text-[10px] tracking-widest uppercase text-center flex items-center justify-center hover:scale-105 transition-all gap-2" title="Aplicar 50% de utilidad a todo">
                                <Percent size={12} />
                                50%
                            </button>
                            <button onClick={() => triggerExportWithFilename('master')} className="px-4 py-2 bg-primary text-black font-black rounded-xl text-[10px] tracking-widest uppercase text-center flex items-center justify-center hover:scale-105 transition-all">Exportar PDF</button>
                             <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                                <button onClick={() => toggleAllSections(false)} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all" title="Abrir Todo"><Maximize2 size={12} /></button>
                                <button onClick={() => toggleAllSections(true)} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all" title="Cerrar Todo"><Minimize2 size={12} /></button>
                                {isAdmin && (
                                    <button onClick={deselectAllModules} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500 hover:text-black rounded-lg text-red-500 font-black text-[9px] uppercase tracking-widest transition-all border border-red-500/30" title="Deseleccionar Todo"><Power size={12} /></button>
                                )}
                            </div>
                            {isAdmin && (
                                <div className="flex gap-1">
                                    <button onClick={reindexAll} className="px-5 py-2 bg-zinc-800 text-zinc-400 font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-zinc-700 transition-all">Normaliza</button>
                                    <button onClick={addSection} className="px-6 py-2 bg-white/5 border border-white/10 text-white font-black rounded-xl text-[10px] tracking-widest uppercase hover:bg-white/10">+ Módulo</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SIDEBAR FLOTANTE DESKTOP */}
                <div className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col gap-4 z-[100]">
                    <button
                        onClick={() => setIsMassCalcModalOpen(true)}
                        className="w-14 h-14 bg-black/80 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all hover:scale-110 shadow-[0_0_20px_rgba(16,185,129,0.2)] group relative"
                        title="Cálculo de Masas"
                    >
                        <PieChart size={24} />
                        <span className="absolute left-full ml-4 px-3 py-1 bg-emerald-500 text-black text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">CÁLCULO DE MASAS</span>
                        <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 animate-pulse" />
                    </button>

                    <div className="w-px h-8 bg-white/10 mx-auto" />

                    {sections.map((section, idx) => (
                        <button
                            key={section.id}
                            onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                            className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-black text-zinc-500 hover:text-white hover:border-primary/50 transition-all"
                        >
                            {idx + 1}
                        </button>
                    ))}
                </div>

                <div className="space-y-12 mt-12">
                    {sections.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 bg-zinc-950/40 border border-white/5 rounded-[2rem] border-dashed text-center">
                            <Shield className="w-12 h-12 text-gray-600 mb-6" />
                            <h2 className="text-2xl font-black text-white uppercase mb-2">Plan Maestro Vacío</h2>
                            <button onClick={() => { setSections(initialSections); saveToCloud(initialSections); }} className="px-6 py-3 bg-primary text-black font-black rounded-xl uppercase tracking-widest text-xs hover:scale-105 transition-all">Restaurar Predeterminado</button>
                        </div>
                    )}

                    {sections.map((s, sIdx) => {
                        const isSectionActive = s.activo !== false;
                        const activeModuleCounter = sections.slice(0, sIdx + 1).filter(sec => sec.activo !== false).length;
                        const displayModuleNum = isSectionActive ? activeModuleCounter : null;

                        const visibleCols = isAdmin
                            ? ['item', 'equipo', 'potencia', (showDescriptions ? 'descripcion' : 'subtotal_mxn'), (showMedia ? 'media' : null), 'qty', 'costo', 'util', 'unitario', 'total', 'action'].filter(Boolean)
                            : ['item', 'equipo', 'potencia', (showDescriptions ? 'descripcion' : 'subtotal_mxn'), (showMedia ? 'media' : null), 'qty', 'unitario', 'total'].filter(Boolean);

                        const initialColWidths = {
                            item: 80, equipo: 350, potencia: 100, descripcion: 550, subtotal_mxn: 550, media: 120, qty: 80,
                            costo: 120, util: 80, unitario: 120, total: 150, action: 80
                        };

                        const totalTableWidth = visibleCols.reduce((acc, colId) => {
                            return acc + (colWidths[colId] || initialColWidths[colId] || 100);
                        }, 0);

                        return (
                            <div key={s.id} className={`relative bg-zinc-950/40 border border-white/5 rounded-[2rem] group/section transition-all duration-500 hover:ring-1 hover:ring-primary/40 ${!s.collapsed ? 'ring-1 ring-primary/20 scale-[1.01]' : ''} ${s.activo === false ? 'opacity-50 scale-[0.98] grayscale-[0.5]' : ''}`}>

                                {/* Module Title Bar */}
                                <div className={`sticky z-[150] bg-black/95 border-b border-white/10 backdrop-blur-xl transition-all duration-300 ${s.collapsed ? 'rounded-[2rem]' : 'rounded-t-[2rem]'}`} style={{ top: isScrolled ? '152px' : '0px' }}>
                                    <div className="min-h-[56px] py-3 px-6 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => toggleSection(s.id)}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${s.collapsed ? 'bg-zinc-900 text-gray-500 hover:text-primary' : 'bg-primary text-black shadow-lg hover:scale-110'}`}
                                            >
                                                {s.collapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleSectionActive(s.id); }}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${s.activo === false ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20' : 'bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20'}`}
                                                title={s.activo === false ? "Activar Módulo" : "Desactivar Módulo"}
                                            >
                                                <Power size={18} />
                                            </button>
                                            <div className="flex flex-col">
                                                {isAdmin ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex flex-col items-center scale-90 -mr-1">
                                                            <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, -1); }} className="hover:text-primary transition-colors mb-0.5" disabled={sIdx === 0}><ChevronUp size={16} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); moveSection(s.id, 1); }} className="hover:text-primary transition-colors" disabled={sIdx === sections.length - 1}><ChevronDown size={16} /></button>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={s.activo === false ? "-" : displayModuleNum}
                                                            onChange={(e) => updateSection(s.id, { numero: e.target.value })}
                                                            className="bg-transparent border-b border-primary/20 text-xl font-black text-primary w-12 text-center focus:outline-none focus:border-primary disabled:opacity-30"
                                                            disabled={s.activo === false}
                                                        />
                                                        <input
                                                            value={s.titulo}
                                                            onChange={(e) => updateSectionTitle(s.id, e.target.value)}
                                                            className="bg-transparent border-b border-primary/20 text-xl font-black text-white uppercase tracking-tight focus:outline-none focus:border-primary w-[500px]"
                                                        />
                                                    </div>
                                                ) : (
                                                    <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                                        <span className="text-primary">{s.activo === false ? "" : `${displayModuleNum}.`}</span>
                                                        {s.titulo}
                                                    </h3>
                                                )}
                                                {isAdmin ? (
                                                    <input
                                                        value={s.tag || ""}
                                                        onChange={(e) => updateSection(s.id, { tag: e.target.value.toUpperCase() })}
                                                        className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase tracking-widest w-fit min-w-[80px] outline-none focus:bg-primary/20 transition-colors"
                                                        placeholder="FASE / ESTADO"
                                                    />
                                                ) : (
                                                    <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase tracking-widest w-fit">{s.tag}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {s.collapsed && sectionTotals.find(x => x.sectionId === s.id) && (
                                                <div className="flex flex-col items-end mr-2 shrink-0">
                                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 opacity-50">Subtotal Módulo</span>
                                                    <span className="text-2xl font-black text-primary tracking-tighter">
                                                        {money(sectionTotals.find(x => x.sectionId === s.id).totalVenta)}
                                                    </span>
                                                </div>
                                            )}
                                            {isAdmin && (
                                                <div className="flex gap-2 items-center">
                                                    {s.collapsed && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeSection(s.id); }}
                                                            className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/20 transition-all mr-2"
                                                            title="Eliminar Módulo"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    )}
                                                    {!s.collapsed && (
                                                        <>
                                                            <button onClick={() => generateModulePDF(s, sIdx)} className="p-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20" title="Exportar Módulo PDF"><FileText size={16} /></button>
                                                            <button onClick={() => handleExportSectionExcel(s)} className="p-2 bg-green-500/10 border border-green-500/30 text-green-500 rounded-lg hover:bg-green-500/20" title="Exportar Módulo Excel"><Download size={16} /></button>
                                                            <button onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx, .xls'; inp.onchange = (e) => handleImportSectionExcel(s.id, e.target.files[0]); inp.click(); }} className="p-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 rounded-lg hover:bg-blue-500/20" title="Importar Módulo Excel"><FileSpreadsheet size={16} /></button>
                                                            <button onClick={() => removeSection(s.id)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20">Eliminar</button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Table Header Section */}
                                    {!s.collapsed && (
                                        <div ref={el => virtualHeaderRefs.current[s.id] = el} className="overflow-hidden bg-primary border-t border-black/10">
                                            <div style={{ width: totalTableWidth, minWidth: totalTableWidth }} className="flex h-10">
                                                {visibleCols.map(colId => {
                                                    const labels = { item: "Item", equipo: "Equipo", potencia: "KW", descripcion: "Descripción", subtotal_mxn: "SUBTOTAL MXN", media: "MEDIA", qty: "Qty", costo: "Costo", util: "Util %", unitario: "Unit USD", total: "Total USD", action: "Acc" };
                                                    const aligns = { media: "center", potencia: "center", costo: "right", util: "center", unitario: "right", total: "right", action: "center", subtotal_mxn: "center" };
                                                    const w = colWidths[colId] || initialColWidths[colId] || 100;
                                                    return (
                                                        <div key={colId} style={{ width: w, minWidth: w }} className={`flex-shrink-0 px-4 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-black border-r border-black/10 relative group/cell ${aligns[colId] === "right" ? "justify-end text-right" : aligns[colId] === "center" ? "justify-center text-center" : "justify-start text-left"}`}>
                                                            <span className="truncate">{labels[colId]}</span>
                                                            {!colsLocked && <div onMouseDown={(e) => startResize(colId, e)} className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-black/20 z-10" />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!s.collapsed && (
                                    <div className="flex flex-col">
                                        {(s.moduleImage || s.summaryDesc) && (
                                            <div className="px-6 py-6 flex gap-8 border-b border-white/5 bg-gradient-to-b from-white/[0.01] to-transparent">
                                                {s.moduleImage && (
                                                    <div className="w-64 h-40 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 group/modimg relative">
                                                        <img src={s.moduleImage} className="w-full h-full object-cover group-hover/modimg:scale-105 transition-all duration-500" />
                                                        {isAdmin && <button onClick={() => updateSection(s.id, { moduleImage: null })} className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover/modimg:opacity-100"><X size={12} /></button>}
                                                    </div>
                                                )}
                                                <div className="flex-1 space-y-4">
                                                    {isAdmin ? (
                                                        <textarea value={s.summaryDesc || ""} onChange={(e) => updateSection(s.id, { summaryDesc: e.target.value })} placeholder="Descripción del módulo..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-gray-400 font-medium outline-none focus:border-primary/30 h-32 resize-none" />
                                                    ) : (
                                                        s.summaryDesc && <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-2xl">{s.summaryDesc}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div ref={el => tableContainerRefs.current[s.id] = el} onScroll={(e) => syncScroll(s.id, e)} className="overflow-x-auto custom-scrollbar overflow-y-visible">
                                            <table className="table-fixed border-collapse" style={{ width: totalTableWidth, minWidth: totalTableWidth }}>
                                                <colgroup>
                                                    {visibleCols.map(colId => <col key={colId} style={{ width: colWidths[colId] || initialColWidths[colId] || 100 }} />)}
                                                </colgroup>
                                                <tbody style={{ fontSize: `${tableFontSize}px` }}>
                                                    {(s.items || []).map((it, iIdx) => {
                                                        if (!it) return null;
                                                        const r = calcItem(it);
                                                        return (
                                                            <tr key={it.id} className={`border-b border-white/[0.02] transition-colors ${!it.activo ? 'bg-zinc-950/20' : 'hover:bg-white/[0.01]'}`}>
                                                                {visibleCols.map(colId => {
                                                                    const w = colWidths[colId] || initialColWidths[colId] || 100;
                                                                    const cellStyle = { width: w, minWidth: w };
                                                                    const contentOpacity = !it.activo ? 'opacity-40' : 'opacity-100';

                                                                    if (colId === 'item') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            <div className="flex flex-col items-center gap-2 relative group/item">
                                                                                {/* REORDER CONTROLS (Only for Admin) */}
                                                                                {isAdmin && (
                                                                                    <div className="absolute -left-1 flex flex-col items-center opacity-0 group-hover/item:opacity-100 transition-all scale-75">
                                                                                        <button
                                                                                            onClick={() => moveItemToStart(s.id, it.id)}
                                                                                            className="p-0.5 hover:text-primary transition-colors mb-0.5"
                                                                                            title="Mover al inicio"
                                                                                        >
                                                                                            <ChevronsUp size={14} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => moveItem(s.id, it.id, -1)}
                                                                                            className="p-1 hover:text-primary transition-colors"
                                                                                            title="Subir"
                                                                                        >
                                                                                            <ChevronUp size={16} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => moveItem(s.id, it.id, 1)}
                                                                                            className="p-1 hover:text-primary transition-colors"
                                                                                            title="Bajar"
                                                                                        >
                                                                                            <ChevronDown size={16} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => moveItemToEnd(s.id, it.id)}
                                                                                            className="p-0.5 hover:text-primary transition-colors mt-0.5"
                                                                                            title="Mover al final"
                                                                                        >
                                                                                            <ChevronsDown size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                )}

                                                                                <button
                                                                                    onClick={() => toggleItemActive(s.id, it.id)}
                                                                                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shadow-lg ${it.activo ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/70 hover:border-primary/80 hover:bg-white/10'}`}
                                                                                >
                                                                                    {it.activo && <Check size={14} strokeWidth={4} />}
                                                                                </button>
                                                                                <div className={contentOpacity}>
                                                                                    {isAdmin ? <input value={it.codigo || `${displayModuleNum}.${iIdx + 1}`} onChange={(e) => updateItem(s.id, it.id, { codigo: e.target.value })} className="bg-transparent border-b border-white/5 text-[11px] font-mono text-gray-400 w-full text-center focus:border-primary/50 outline-none" /> : <span className="text-[11px] font-mono text-gray-400">{`${displayModuleNum}.${iIdx + 1}`}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                    if (colId === 'equipo') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            <div className={contentOpacity}>
                                                                                {isAdmin ? <textarea value={it.equipo} onChange={(e) => updateItem(s.id, it.id, { equipo: e.target.value })} className="bg-transparent text-sm font-black text-white w-full border-b border-white/5 outline-none focus:border-primary/50 resize-none overflow-hidden" rows={1} style={{ fieldSizing: "content" }} /> : <span className={`text-sm font-black text-white uppercase tracking-tight ${!it.activo ? 'line-through' : ''}`}>{it.equipo}</span>}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                    if (colId === 'potencia') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            {isAdmin ? (
                                                                                <div className="flex items-center gap-1">
                                                                                    <input type="number" step="0.1" value={it.potencia || 0} onChange={(e) => updateItem(s.id, it.id, { potencia: n(e.target.value) })} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-primary w-full text-center focus:border-primary/50 outline-none" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-center"><span className="text-xs font-mono text-primary">{it.potencia || 0}</span></div>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                    if (colId === 'descripcion') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02] relative group/desc">
                                                                            {isAdmin ? (
                                                                                <div className="flex flex-col gap-2">
                                                                                    <textarea value={it.descripcion} onChange={(e) => updateItem(s.id, it.id, { descripcion: e.target.value })} className="bg-transparent text-gray-500 w-full resize-none border-none outline-none focus:text-gray-300 transition-all" rows={1} style={{ fieldSizing: "content", textAlign: it.descAlign || "left", fontSize: `${it.descFontSize || tableFontSize}px` }} />
                                                                                    <div className="flex items-center gap-1 opacity-0 group-hover/desc:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1 rounded-lg border border-white/10 w-fit self-end">
                                                                                        <button onClick={() => updateItem(s.id, it.id, { descAlign: "left" })} className={`p-1 rounded ${it.descAlign === "left" || !it.descAlign ? "text-primary" : "text-gray-500"}`}><AlignLeft size={10} /></button>
                                                                                        <button onClick={() => updateItem(s.id, it.id, { descAlign: "center" })} className={`p-1 rounded ${it.descAlign === "center" ? "text-primary" : "text-gray-500"}`}><AlignCenter size={10} /></button>
                                                                                        <button onClick={() => updateItem(s.id, it.id, { descAlign: "right" })} className={`p-1 rounded ${it.descAlign === "right" ? "text-primary" : "text-gray-500"}`}><AlignRight size={10} /></button>
                                                                                        <button onClick={() => updateItem(s.id, it.id, { descAlign: "justify" })} className={`p-1 rounded ${it.descAlign === "justify" ? "text-primary" : "text-gray-500"}`}><AlignJustify size={10} /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-gray-500 font-medium leading-relaxed" style={{ textAlign: it.descAlign || "left", fontSize: `${it.descFontSize || tableFontSize}px` }}>{it.descripcion}</p>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                    if (colId === 'subtotal_mxn') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            <div className="flex flex-col items-center justify-center h-full">
                                                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Monto en Pesos</span>
                                                                                <span className="text-xl font-black text-primary tracking-tighter">
                                                                                    {"$" + (calcItem(it).totalVenta * tipoCambio).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                                                                                </span>
                                                                                <span className="text-[9px] font-mono text-gray-600 mt-1 uppercase tracking-tighter">T.C. {tipoCambio.toFixed(2)}</span>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                    if (colId === 'media') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            <div className="flex flex-col items-center justify-center gap-2 group/media relative">
                                                                                {it.media_url ? (
                                                                                    <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10 group-hover:border-primary/50 cursor-pointer" onClick={() => setSelectedMedia({ url: it.media_url, type: it.media_type })}>
                                                                                        {it.media_type === 'video' ? <video src={it.media_url} className="w-full h-full object-cover" /> : <img src={it.media_url} alt="" className="w-full h-full object-cover" />}
                                                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/media:opacity-100"><Maximize2 size={16} className="text-white" /></div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex items-center justify-center">{isAdmin ? <div className="flex gap-1"><label className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-primary cursor-pointer">{uploadingId === it.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}<input type="file" className="hidden" accept="image/*" onChange={(e) => handleItemMediaUpload(s.id, it.id, e.target.files[0])} /></label></div> : <ImageIcon size={16} className="text-white/5" />}</div>
                                                                                )}
                                                                                {isAdmin && it.media_url && <button onClick={() => updateItem(s.id, it.id, { media_url: null, media_type: null })} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/media:opacity-100 scale-75 hover:scale-100"><X size={10} /></button>}
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                    if (colId === 'qty') return (
                                                                        <td key={colId} style={cellStyle} className="p-4 border-r border-white/[0.02]">
                                                                            {isAdmin ? <input type="number" value={it.qty} onChange={(e) => updateItem(s.id, it.id, { qty: n(e.target.value) })} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white w-full focus:border-primary/50 outline-none" /> : <span className="text-xs font-mono text-gray-300">{it.qty}</span>}
                                                                        </td>
                                                                    );
                                                                    if (colId === 'costo' && isAdmin) return (
                                                                        <td key={colId} style={cellStyle} className="p-4 text-right border-r border-white/[0.02]">
                                                                            <input type="number" value={it.costoUSD} onChange={(e) => updateItem(s.id, it.id, { costoUSD: n(e.target.value) })} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono text-white w-full text-right focus:border-primary/50 outline-none" />
                                                                        </td>
                                                                    );
                                                                    if (colId === 'util' && isAdmin) return (
                                                                        <td key={colId} style={cellStyle} className="p-4 text-center border-r border-white/[0.02]">
                                                                            <input type="number" value={it.utilidad} onChange={(e) => updateItem(s.id, it.id, { utilidad: n(e.target.value) })} className="bg-primary/5 border border-primary/20 rounded px-2 py-1 text-xs font-mono text-primary w-full text-center focus:border-primary/50 outline-none" />
                                                                        </td>
                                                                    );
                                                                    if (colId === 'unitario') return (
                                                                        <td key={colId} style={cellStyle} className={`p-4 text-right text-xs font-mono border-r border-white/[0.02] ${!it.activo ? 'line-through text-gray-600' : 'text-gray-400'}`}>{money(r.ventaUnitFinal)}</td>
                                                                    );
                                                                    if (colId === 'total') return (
                                                                        <td key={colId} style={cellStyle} className={`p-4 text-right text-sm font-black tracking-tight border-r border-white/[0.02] ${!it.activo ? 'line-through text-primary/30' : 'text-primary'}`}>
                                                                            {isAdmin && isPriceEditMode ? (
                                                                                <input type="number" defaultValue={r.totalVenta.toFixed(2)} onBlur={(e) => updateItemByTotalVenta(s.id, it.id, n(e.target.value))} className="bg-primary/10 border border-primary/30 rounded px-2 py-1 text-xs font-mono text-primary w-full text-right focus:border-primary/50 outline-none" />
                                                                            ) : (money(r.totalVenta))}
                                                                        </td>
                                                                    );
                                                                    if (colId === 'action' && isAdmin) return (
                                                                        <td key={colId} style={cellStyle} className="p-4 text-center border-l border-white/[0.02]"><button onClick={() => removeItem(s.id, it.id)} className="text-red-500 opacity-20 hover:opacity-100 transition-opacity"><X size={14} /></button></td>
                                                                    );
                                                                    return null;
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                    {isAdmin && <tr><td colSpan={visibleCols.length} className="p-4"><button onClick={() => addItem(s.id)} className="w-full py-3 border border-dashed border-white/10 rounded-xl text-gray-500 hover:text-primary hover:border-primary transition-all text-xs font-bold uppercase tracking-widest">+ Agregar Fila</button></td></tr>}
                                                </tbody>
                                                <tfoot>
                                                    <tr className="bg-white/[0.05] font-black border-t border-white/5">
                                                        <td colSpan={visibleCols.length - 1} className="p-6 text-right text-[10px] text-gray-500 uppercase tracking-[0.2em]">Subtotal Módulo</td>
                                                        <td className="p-6 text-right text-xl text-primary tracking-tighter border-l border-white/5">{money(sectionTotals.find(x => x.sectionId === s.id)?.totalVenta || 0)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {isAdmin && (
                        <button
                            onClick={addSection}
                            className="w-full py-12 border-2 border-dashed border-white/5 rounded-[2.5rem] bg-zinc-950/20 text-gray-600 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all duration-500 group flex flex-col items-center justify-center gap-4"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/20 transition-all duration-500">
                                <Plus size={32} className="text-gray-700 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-black uppercase tracking-[0.3em]">Añadir Nuevo Módulo</span>
                                <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">Crear sección {sections.length + 1} del Plan Maestro</span>
                            </div>
                        </button>
                    )}
                </div>

                {/* Footer Totals */}
                {
                    true && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-20 p-8 bg-zinc-950/40 border border-white/5 rounded-[2.5rem] backdrop-blur-xl group/footer relative overflow-hidden">
                                <div className="space-y-6 flex flex-col justify-center">
                                    <div>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 opacity-40">Resumen de Proyecto</span>
                                        <div className="h-[2px] w-12 bg-primary/30 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-[11px] font-bold uppercase tracking-widest opacity-60">
                                        <div>MXN s/IVA: <span className="text-white ml-2">{grandTotals.mxnSinIvaVenta.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span></div>
                                        <div>IVA {ivaPct}%: <span className="text-white ml-2">{grandTotals.ivaVenta.toLocaleString("es-MX", { style: "currency", currency: "MXN" })}</span></div>
                                    </div>
                                </div>

                                <div
                                    className="px-12 py-10 rounded-[2.5rem] flex flex-col justify-center items-end relative overflow-hidden shadow-2xl scale-[1.02] shadow-[0_0_40px_rgba(155,212,40,0.4)]"
                                    style={{ backgroundColor: '#9BD428' }}
                                >
                                    <span className="relative z-10 font-black uppercase tracking-[0.4em] mb-2 text-[14px] text-black">Precio de Venta USD</span>
                                    <h2 className="relative z-10 text-5xl md:text-7xl font-black tracking-tighter text-black tabular-nums transition-transform duration-300">
                                        {money(grandTotals.totalVenta)}
                                    </h2>
                                    <div className="relative z-10 mt-6 flex flex-col items-end gap-1 font-black uppercase tracking-widest text-black text-[11px]">
                                        ≈ {(grandTotals.mxnSinIvaVenta + grandTotals.ivaVenta).toLocaleString("es-MX", { style: "currency", currency: "MXN" })} MXN <span className="text-[9px] opacity-80">(IVA Incluido)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Brand */}
                            <div className="mt-20 text-center opacity-30">
                                <img src="/solimaq_logo.png" alt="Footer Logo" className="h-8 object-contain mx-auto grayscale brightness-200 mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Solimaq Center · Industrial Planning Solutions · 2024</p>
                            </div>
                        </>
                    )
                }
            </div >

            {/* Overlays (Modals, Lightboxes, Video) */}
            < AnimatePresence >
                {selectedMedia && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.1, opacity: 0 }} className="relative max-w-7xl w-full h-full flex items-center justify-center">
                            {selectedMedia.type === 'video' ? <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-full rounded-2xl" /> : <img src={selectedMedia.url} className="max-w-full max-h-full object-contain rounded-2xl" />}
                            <button onClick={() => setSelectedMedia(null)} className="absolute top-4 right-4 p-4 rounded-full bg-white/10 text-white hover:bg-red-500 transition-all backdrop-blur-md"><X size={24} /></button>
                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >

            {
                isHeroVideoActive && (
                    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center p-10">
                        <video src={heroVideoUrl} autoPlay controls className="max-w-full max-h-full rounded-3xl" />
                        <button onClick={() => setIsHeroVideoActive(false)} className="absolute top-10 right-10 p-4 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"><X size={32} /></button>
                    </div>
                )
            }

            {
                isParamsModalOpen && (
                    <Dialog open={isParamsModalOpen} onOpenChange={setIsParamsModalOpen}>
                        <DialogContent className="max-w-2xl bg-black/60 backdrop-blur-3xl border-white/20 text-white shadow-2xl rounded-[2.5rem] z-[1000]">
                            <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-widest text-primary">⚙️ Parámetros Globales</DialogTitle></DialogHeader>
                            <div className="space-y-8 py-4">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Horas/Día</label>
                                        <input type="number" value={horasDia} onChange={e => setHorasDia(n(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo de Cambio</label>
                                        <input type="number" value={tipoCambio} onChange={e => setTipoCambio(n(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50" />
                                    </div>
                                </div>
                                 <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Utilidad Global (%)</label><span className="text-primary font-black">{globalUtilVal}%</span></div>
                                    <Slider value={[globalUtilVal]} max={100} step={1} onValueChange={(vals) => setGlobalUtilVal(vals[0])} />
                                    <button onClick={applyGlobalUtilization} className="w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">Aplicar {globalUtilVal}% a Todo</button>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cantidad Global (QTY)</label><span className="text-primary font-black">{globalQtyVal}</span></div>
                                    <input 
                                        type="number" 
                                        value={globalQtyVal} 
                                        onChange={(e) => setGlobalQtyVal(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 text-center font-black"
                                    />
                                    <button onClick={applyGlobalQty} className="w-full py-3 bg-primary/10 border border-primary/30 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-black transition-all">Aplicar QTY {globalQtyVal} a Todo</button>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    {isRestoratable && (
                                        <button 
                                            onClick={restoreOriginalUtilization} 
                                            className="w-full py-3 bg-zinc-900 border border-orange-500/30 text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={12} />
                                            Restablecer Valores Originales
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Importar Estructura (Excel)</label>
                                    <button onClick={() => fileInputRef.current.click()} className="w-full py-4 bg-primary/10 border border-primary/30 border-dashed rounded-xl flex items-center justify-center gap-3 text-primary font-black uppercase tracking-widest hover:bg-primary/20 transition-all text-[11px]">
                                        <Upload size={18} /> {importedFileName || "Subir Archivo .xlsx"}
                                    </button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }

            {
                targetAmountModalOpen && (
                    <Dialog open={targetAmountModalOpen} onOpenChange={setTargetAmountModalOpen}>
                        <DialogContent className="max-w-md bg-black/60 backdrop-blur-3xl border-white/20 text-white shadow-2xl rounded-[2.5rem] z-[1000]">
                            <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-widest text-primary">Ajustar Monto de Venta</DialogTitle></DialogHeader>
                            <div className="py-6 space-y-6">
                                <p className="text-xs text-gray-400">Ingresa el monto total objetivo. El sistema redistribuirá las utilidades proporcionalmente.</p>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Monto Total USD</label>
                                    <input type="number" value={targetAmountValue} onChange={e => setTargetAmountValue(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-black text-primary outline-none focus:bg-white/10 transition-all" />
                                </div>
                                <button onClick={applyTargetAmount} className="w-full py-4 bg-primary text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">Ejecutar Ajuste Especial</button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }

            <ExportTemplateEditor
                isOpen={isTemplateEditorOpen}
                onClose={() => setIsTemplateEditorOpen(false)}
                sections={sections}
                grandTotals={grandTotals}
                clientName={clientName}
                projectName={projectName}
                money={money}
                calcItem={calcItem}
                initialSettings={pdfSettings}
                onSave={handleSavePdfSettings}
                logoUrl={logoUrl}
            />

            {
                showPasswordPrompt && (
                    <PasswordPrompt
                        onCorrectPassword={(pw) => {
                            setIsAdminAuthenticated(true);
                            setIsAdmin(true);
                            setShowPasswordPrompt(false);
                        }}
                        onCancel={() => setShowPasswordPrompt(false)}
                    />
                )
            }
            {
                isExportFilenameModalOpen && (
                    <Dialog open={isExportFilenameModalOpen} onOpenChange={setIsExportFilenameModalOpen}>
                        <DialogContent className="max-w-md bg-black/60 backdrop-blur-3xl border-white/20 text-white shadow-2xl rounded-[2.5rem] z-[1000]">
                            <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-widest text-primary">Nombre del Archivo</DialogTitle></DialogHeader>
                            <div className="py-6 space-y-6">
                                <p className="text-xs text-gray-400">Personaliza el nombre con el que se guardará tu documento PDF.</p>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Nombre del PDF</label>
                                    <input
                                        type="text"
                                        value={exportFilename}
                                        onChange={e => setExportFilename(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmExport(); }}
                                        autoFocus
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Título del Documento (Franja Verde)</label>
                                    <input
                                        type="text"
                                        value={exportTitle}
                                        onChange={e => setExportTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-lg font-bold text-primary outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cliente</label>
                                        <input
                                            type="text"
                                            value={exportClient}
                                            onChange={e => setExportClient(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Proyecto</label>
                                        <input
                                            type="text"
                                            value={exportProject}
                                            onChange={e => setExportProject(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo de Cambio (T.C.)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={exportTC}
                                            onChange={e => setExportTC(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-black text-primary outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-500 tracking-widest">MXN/USD</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsExportFilenameModalOpen(false)} className="flex-1 py-4 bg-zinc-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all border border-white/5">Cancelar</button>
                                    <button onClick={handleConfirmExport} className="flex-2 px-8 py-4 bg-primary text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(155,212,40,0.3)]">Exportar</button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            }
            {/* MODAL DE IMPORTACIÓN DE PROYECTOS VISUAL */}
            {isImportModalOpen && (
                <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                    <DialogContent className="fixed top-[50%] left-[50%] z-[999] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-white/10 bg-black/95 backdrop-blur-2xl p-8 shadow-2xl duration-200 rounded-[2.5rem] overflow-hidden outline-none">
                        <DialogHeader>
                            <DialogTitle className="text-amber-500 font-black tracking-tight flex items-center gap-3 text-2xl uppercase">
                                <Briefcase size={24} className="text-amber-500" />
                                Importar desde Proyecto
                            </DialogTitle>
                            <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase mt-1">
                                Selecciona un proyecto para copiar su Master Plan al actual
                            </p>
                        </DialogHeader>

                        <div className="mt-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar space-y-3 pb-4">
                            {isLoadingProjects ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 size={32} className="text-amber-500 animate-spin" />
                                    <span className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">Consultando base de datos...</span>
                                </div>
                            ) : availableProjects.length === 0 ? (
                                <div className="text-center py-20 text-zinc-600 font-black text-xs tracking-widest uppercase border border-dashed border-white/10 rounded-3xl">
                                    No se encontraron proyectos disponibles
                                </div>
                            ) : (
                                availableProjects.map((p) => (
                                    <button
                                        key={p.slug}
                                        onClick={() => handleImportFromProject(p.slug)}
                                        className="w-full p-5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between group hover:bg-amber-500/10 hover:border-amber-500/30 transition-all text-left"
                                    >
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                    {p.slug}
                                                </span>
                                                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                                    {p.client || "SIN CLIENTE"}
                                                </span>
                                            </div>
                                            <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight leading-none mt-1">
                                                {p.project || "Proyecto sin nombre"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter leading-none mb-1">Última edición</span>
                                                <span className="text-[10px] font-mono text-zinc-400">
                                                    {p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-MX') : '---'}
                                                </span>
                                            </div>
                                            <ChevronRight size={18} className="text-zinc-700 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/5 text-center">
                            <p className="text-[10px] text-zinc-600 font-semibold leading-relaxed">
                                <span className="text-amber-500/60 font-black">ADVERTENCIA:</span> Al importar, se reemplazará el Master Plan actual por el del proyecto seleccionado. Esta acción no se puede deshacer.
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
                {/* PÁGINA INDEPENDIENTE: CÁLCULO DE MASAS (RADIOGRAFÍA) */}
                <AnimatePresence>
                    {isMassCalcModalOpen && (
                        <motion.div 
                            initial={{ opacity: 0, x: '100%' }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-0 z-[1000] bg-[#020202] flex flex-col overflow-hidden"
                        >
                            {/* Header de la Página */}
                            <header className="h-20 border-b border-white/5 bg-black/50 backdrop-blur-xl px-12 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-6">
                                    <button 
                                        onClick={() => {
                                            setIsMassCalcModalOpen(false);
                                            if (sectionData?.id === 'balance_masas' && setActiveSection) {
                                                setActiveSection('master_plan');
                                            }
                                        }}
                                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all group"
                                    >
                                        <X size={20} className="text-zinc-400 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter">Radiografía de Masas</h2>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.3em]">{projectName}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={handleExportMassPDF}
                                        className="px-4 py-2 bg-[#A3E635] text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-110 active:scale-90 transition-all shadow-[0_0_25px_rgba(163,230,53,0.3)] flex items-center gap-2 group"
                                        title="Generar Reporte Técnico"
                                    >
                                        <Download size={14} className="stroke-[3] group-hover:bounce" />
                                        PDF Técnico
                                    </button>
                                    <div className="px-5 py-2 bg-zinc-900 border border-white/5 rounded-full flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[#3EB489] animate-pulse" />
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Análisis en Vivo</span>
                                    </div>
                                </div>
                            </header>

                            {/* Contenido Principal Full Page (Dashboard Mode) */}
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                {/* Panel Izquierdo: Visualización Core (Compacta) */}
                                <div className="w-full md:w-[350px] p-8 bg-zinc-900/10 border-r border-white/5 flex flex-col items-center justify-center relative shrink-0">
                                    <div className="w-full space-y-8 relative z-10">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">Total / Día</label>
                                            <div className="relative group">
                                                <input
                                                    type="number"
                                                    value={totalDailyTons}
                                                    onChange={(e) => setTotalDailyTons(Number(e.target.value))}
                                                    className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-6 py-5 text-5xl font-black text-white outline-none focus:border-[#3EB489]/50 transition-all text-center tabular-nums shadow-xl"
                                                />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-700 uppercase tracking-widest pointer-events-none">t/d</div>
                                            </div>
                                        </div>

                                        {/* Donut Chart Compacto */}
                                        <div className="relative w-full aspect-square flex items-center justify-center p-4">
                                            <svg viewBox="0 0 100 100" className="w-[200px] h-[200px] transform -rotate-90">
                                                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#111" strokeWidth="12" />
                                                {(() => {
                                                    let cumulativePercent = 0;
                                                    const radius = 40;
                                                    const circumference = 2 * Math.PI * radius;

                                                    return wasteComposition.map((item) => {
                                                        const segmentLength = (item.percent / 100) * circumference;
                                                        const strokeDashoffset = -(cumulativePercent / 100) * circumference;
                                                        cumulativePercent += item.percent;
                                                        const isHovered = hoveredItem === item.id;

                                                        return (
                                                            <circle
                                                                key={item.id}
                                                                cx="50"
                                                                cy="50"
                                                                r={radius}
                                                                fill="transparent"
                                                                stroke={item.color}
                                                                strokeWidth={isHovered ? 16 : 12}
                                                                strokeDasharray={`${segmentLength} ${circumference}`}
                                                                strokeDashoffset={strokeDashoffset}
                                                                className="transition-all duration-300 cursor-pointer"
                                                                onMouseEnter={() => setHoveredItem(item.id)}
                                                                onMouseLeave={() => setHoveredItem(null)}
                                                                style={{ 
                                                                    filter: isHovered ? `drop-shadow(0 0 10px ${item.color}88)` : 'none',
                                                                    opacity: hoveredItem && !isHovered ? 0.3 : 1
                                                                }}
                                                            />
                                                        );
                                                    });
                                                })()}
                                            </svg>
                                            
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                                                <AnimatePresence mode="wait">
                                                    {(hoveredItem || lockedItem) ? (
                                                        <motion.div key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.label}</span>
                                                            <span className="text-3xl font-black text-white">{wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent}%</span>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                                            <span className="text-4xl font-black text-white tabular-nums leading-none">{totalDailyTons}</span>
                                                            <span className="text-[8px] font-black text-zinc-600 uppercase mt-1">TOTAL</span>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleExportMassPDF}
                                            className="w-full py-4 bg-[#A3E635] text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg text-[10px] flex items-center justify-center gap-3">
                                            <Download size={16} className="stroke-[3]" />
                                            Reporte PDF
                                        </button>
                                    </div>
                                </div>

                                {/* Panel Derecho: Gestión Detallada (Dashboard Grid) */}
                                <div className="flex-1 p-8 bg-[#050505] flex flex-col overflow-y-auto custom-scrollbar relative">
                                    <div className="w-full mx-auto space-y-6">
                                        <div className="flex items-end justify-between border-b border-white/5 pb-4">
                                            <div className="space-y-1">
                                                <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">Análisis Técnico</h3>
                                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Radiografía de <span className="text-[#A3E635]">Fracciones</span></h2>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Proyecto</span>
                                                <span className="text-xs font-black text-white tracking-widest uppercase">{CLOUD_SLUG || 'MP-GENERA-D'}</span>
                                            </div>
                                        </div>

                                        {/* GRID DE 3 COLUMNAS */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {wasteComposition.map((item) => (
                                                <motion.div 
                                                    key={`fraction-node-${item.id}`} // Unique key forced
                                                    onMouseEnter={() => setHoveredItem(item.id)}
                                                    onMouseLeave={() => setHoveredItem(null)}
                                                    onClick={() => setLockedItem(item.id)}
                                                    className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
                                                        (hoveredItem === item.id || lockedItem === item.id)
                                                        ? 'bg-white/[0.06] border-[#A3E635] shadow-[0_0_30px_rgba(163,230,53,0.15)] scale-[1.02]' 
                                                        : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    {lockedItem === item.id && (
                                                        <div className="absolute top-4 right-4 animate-pulse">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-[#A3E635] shadow-[0_0_10px_#A3E635]" />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative group/color">
                                                                <div 
                                                                    className="w-2 h-10 rounded-full cursor-pointer transition-transform hover:scale-x-150 active:scale-95 shadow-sm" 
                                                                    style={{ backgroundColor: item.color }} 
                                                                />
                                                                <input 
                                                                    type="color"
                                                                    value={item.color}
                                                                    onChange={(e) => updateItemColor(item.id, e.target.value)}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                    title="Cambiar color"
                                                                />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Categoría</span>
                                                                <span className="text-base font-black text-white uppercase tracking-tight truncate max-w-[130px]">{item.label}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-3xl font-black text-white tabular-nums leading-none">
                                                                {((totalDailyTons * item.percent) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                            </span>
                                                            <span className="text-[10px] font-black text-zinc-600 ml-2 uppercase tracking-widest">T/D</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`flex items-center justify-between bg-black/40 p-4 rounded-xl border transition-all ${hoveredItem === item.id ? 'border-[#A3E635]/20' : 'border-white/5'}`}>
                                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Puntaje Fracción</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative group/input">
                                                                <input 
                                                                    type="number"
                                                                    value={item.percent}
                                                                    onChange={(e) => {
                                                                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                        setWasteComposition(prev => prev.map(p => p.id === item.id ? { ...p, percent: val } : p));
                                                                    }}
                                                                    className="w-20 bg-zinc-900 border-2 border-transparent group-hover/input:border-[#A3E635]/40 rounded-xl py-2 px-3 text-center text-2xl font-black text-[#A3E635] outline-none focus:border-[#A3E635] transition-all shadow-inner"
                                                                />
                                                            </div>
                                                            <span className="text-xs font-black text-zinc-700">%</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* CONSOLA MAESTRA DE INGENIERÍA (DINÁMICA ABAJO) */}
                                        <div className="mt-8 bg-black/60 border border-white/10 rounded-3xl p-8 backdrop-blur-2xl relative overflow-hidden group/console shadow-2xl">
                                            {/* Glow decorativo de fondo */}
                                            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#A3E635]/5 blur-[100px] rounded-full pointer-events-none" />
                                            
                                            <AnimatePresence mode="wait">
                                                {(hoveredItem || lockedItem) ? (
                                                    <motion.div 
                                                        key="detail"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="flex flex-col lg:flex-row items-center gap-12"
                                                    >
                                                        {/* Lado A: Identidad */}
                                                        <div className="flex items-center gap-5 border-r border-white/10 pr-8 min-w-[260px]">
                                                            <div className="w-2.5 h-16 rounded-full shadow-[0_0_15px_rgba(163,230,53,0.3)]" style={{ backgroundColor: wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.color }} />
                                                            <div className="overflow-hidden">
                                                                <h4 className="text-[8px] font-black text-[#A3E635] uppercase tracking-[0.4em] mb-1 leading-none">Control</h4>
                                                                <h2 className="text-3xl lg:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2 truncate drop-shadow-md">
                                                                    {wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.label}
                                                                </h2>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => setCurrencyMode(prev => prev === 'MXN' ? 'USD' : 'MXN')}
                                                                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all border ${currencyMode === 'MXN' ? 'bg-zinc-900 border-zinc-800 text-zinc-500' : 'bg-[#A3E635] border-[#A3E635] text-black shadow-[0_0_10px_rgba(163,230,53,0.3)]'}`}
                                                                    >
                                                                        {currencyMode}
                                                                    </button>
                                                                    <span className="text-[8px] text-zinc-700 font-bold tracking-widest leading-none px-1.5 py-0.5 bg-white/5 rounded border border-white/5">V1.0.2</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Lado B: Métricas */}
                                                        <div className="flex-1 flex items-center justify-between gap-6 overflow-hidden">
                                                            <div className="min-w-fit space-y-0.5">
                                                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Masa</p>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-4xl font-black text-white tracking-tighter tabular-nums">{(totalDailyTons * (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent || 0) / 100).toLocaleString()}</span>
                                                                    <span className="text-[8px] font-black text-zinc-700 uppercase">T/D</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="min-w-fit space-y-0.5">
                                                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Caphr</p>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-4xl font-black text-[#A3E635] tracking-tighter">{(totalDailyTons * (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.percent || 0) / 100 / workingHours).toFixed(1)}</span>
                                                                    <span className="text-[8px] font-black text-zinc-700 uppercase">t/h</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-3 scale-90 origin-left">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-zinc-600 uppercase mb-1">In ({currencyMode})</span>
                                                                    <div className="flex items-center bg-zinc-950 px-2 py-1 rounded border border-white/5 w-24">
                                                                        <span className="text-[#A3E635] text-[8px] font-black mr-1">$</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={currencyMode === 'MXN' 
                                                                                ? wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceDirty 
                                                                                : (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceDirty / tipoCambio).toFixed(0)}
                                                                            onChange={(e) => {
                                                                                const val = Number(e.target.value);
                                                                                const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                updateItemData((hoveredItem || lockedItem), 'priceDirty', finalVal);
                                                                            }}
                                                                            className="w-full bg-transparent text-xs font-black text-white focus:outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-[8px] font-black text-[#A3E635] uppercase mb-1">Rec ({currencyMode})</span>
                                                                    <div className="flex items-center bg-[#A3E635]/5 px-2 py-1 rounded border border-[#A3E635]/15 w-24">
                                                                        <span className="text-[#A3E635] text-[8px] font-black mr-1">$</span>
                                                                        <input 
                                                                            type="number"
                                                                            value={currencyMode === 'MXN' 
                                                                                ? wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceRecycled 
                                                                                : (wasteComposition.find(i => i.id === (hoveredItem || lockedItem))?.priceRecycled / tipoCambio).toFixed(0)}
                                                                            onChange={(e) => {
                                                                                const val = Number(e.target.value);
                                                                                const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                updateItemData((hoveredItem || lockedItem), 'priceRecycled', finalVal);
                                                                            }}
                                                                            className="w-full bg-transparent text-xs font-black text-[#A3E635] focus:outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="text-right space-y-0.5 ml-auto border-l border-white/5 pl-6 min-w-fit">
                                                                <p className="text-[9px] font-black text-[#A3E635] uppercase tracking-widest">Utilidad Estimada</p>
                                                                <p className="text-4xl lg:text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl whitespace-nowrap">
                                                                    <span className="text-[#A3E635] text-xl mr-1 leading-none">$</span>
                                                                    {(() => {
                                                                        const item = wasteComposition.find(i => i.id === (hoveredItem || lockedItem));
                                                                        const tons = (totalDailyTons * (item?.percent || 0) / 100);
                                                                        const diff = (item?.priceRecycled || 0) - (item?.priceDirty || 0);
                                                                        const utility = tons * diff;
                                                                        const displayVal = currencyMode === 'MXN' ? utility : (utility / tipoCambio);
                                                                        return displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 });
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div 
                                                        key="placeholder"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <div className="flex items-center gap-12">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-2">Estado Global del Sistema</span>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Validación de Datos</span>
                                                                        <span className="text-4xl font-black text-[#A3E635]">100% OK</span>
                                                                        <Check size={28} className="text-[#A3E635] stroke-[4]" />
                                                                    </div>
                                                                    <div className="w-48 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-gradient-to-r from-[#A3E635] to-emerald-500 w-full" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Masa Total Administrada</p>
                                                            <p className="text-4xl font-black text-white tabular-nums tracking-tighter">
                                                                {totalDailyTons.toLocaleString()} <span className="text-xs text-zinc-700 ml-1">T/D</span>
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* TABLA DINÁMICA DE RESIDUOS (MATRIZ OPERATIVA) */}
                                        <div className="mt-8 bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                                            <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-6 bg-[#A3E635] rounded-full shadow-[0_0_15px_#A3E635]" />
                                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.4em]">Matriz Operativa de Residuos (Balance de Masas)</h3>
                                                </div>
                                                
                                                <div className="flex items-center gap-6">
                                                    {/* CONTROLES DE VISUALIZACIÓN */}
                                                    <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-xl border border-white/5">
                                                        {/* LOCK TOGGLE */}
                                                        <button 
                                                            onClick={() => setIsWasteTableLocked(!isWasteTableLocked)}
                                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isWasteTableLocked ? 'bg-[#A3E635]/10 border-[#A3E635]/30 text-[#A3E635]' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                                                        >
                                                            {isWasteTableLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                            <span className="text-[10px] font-black uppercase tracking-widest">{isWasteTableLocked ? 'Bloqueado' : 'Abierto'}</span>
                                                        </button>

                                                        <div className="w-px h-6 bg-white/10 mx-1" />

                                                        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Texto</span>
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => setTableFontSize(prev => Math.max(8, prev - 1))}
                                                                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                                >-</button>
                                                                <span className="text-[10px] font-black text-[#A3E635] w-6 text-center">{tableFontSize}</span>
                                                                <button 
                                                                    onClick={() => setTableFontSize(prev => Math.min(16, prev + 1))}
                                                                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                                >+</button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Columnas</span>
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => setTableColumnScale(prev => Math.max(0.5, prev - 0.1))}
                                                                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                                >-</button>
                                                                <span className="text-[10px] font-black text-[#A3E635] w-8 text-center">{(tableColumnScale * 100).toFixed(0)}%</span>
                                                                <button 
                                                                    onClick={() => setTableColumnScale(prev => Math.min(2.0, prev + 0.1))}
                                                                    className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white text-xs font-black transition-all"
                                                                >+</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Divisa Actualización</span>
                                                        <span className="text-xs font-black text-[#A3E635]">{currencyMode}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto custom-scrollbar">
                                                <table 
                                                    className="w-full text-left border-separate border-spacing-0 table-fixed"
                                                    style={{ fontSize: `${tableFontSize}px`, width: 'max-content', minWidth: '100%' }}
                                                >
                                                    <thead>
                                                        <tr className="bg-white/[0.01]">
                                                            {wasteColOrder.map((colId) => {
                                                                const colInfo = [
                                                                    { id: 'num', label: '#' },
                                                                    { id: 'label', label: 'Clasificación Residuo' },
                                                                    { id: 'percent', label: 'Mezcla %' },
                                                                    { id: 'tonsDay', label: 'Masa (T/D)' },
                                                                    { id: 'tonsHr', label: 'Capacidad (T/H)' },
                                                                    { id: 'dirty', label: `Compactado ($/T)` },
                                                                    { id: 'recycled', label: `Reciclado ($/T)` },
                                                                    { id: 'util', label: `Potencial Diario (${currencyMode})`, align: 'right', color: '#A3E635' }
                                                                ].find(c => c.id === colId);

                                                                return (
                                                                    <th 
                                                                        key={colId}
                                                                        draggable={!isWasteTableLocked}
                                                                        onDragStart={() => !isWasteTableLocked && setDraggedWasteCol(colId)}
                                                                        onDragOver={(e) => e.preventDefault()}
                                                                        onDrop={() => {
                                                                            if (isWasteTableLocked || !draggedWasteCol || draggedWasteCol === colId) return;
                                                                            const newOrder = [...wasteColOrder];
                                                                            const oldIdx = newOrder.indexOf(draggedWasteCol);
                                                                            const newIdx = newOrder.indexOf(colId);
                                                                            newOrder.splice(oldIdx, 1);
                                                                            newOrder.splice(newIdx, 0, draggedWasteCol);
                                                                            setWasteColOrder(newOrder);
                                                                            setDraggedWasteCol(null);
                                                                        }}
                                                                        style={{ 
                                                                            width: `${wasteColWidths[colId] * tableColumnScale}px`,
                                                                            minWidth: `${wasteColWidths[colId] * tableColumnScale}px`
                                                                        }}
                                                                        className={`relative py-4 text-[9px] font-black uppercase tracking-widest border-b border-white/5 whitespace-nowrap px-4 transition-colors ${!isWasteTableLocked ? 'cursor-grab active:cursor-grabbing hover:bg-white/5' : ''} ${draggedWasteCol === colId ? 'opacity-30 bg-primary/10' : ''} ${colInfo.align === 'right' ? 'text-right' : 'text-zinc-600'}`}
                                                                    >
                                                                        {colInfo.label}
                                                                        {!isWasteTableLocked && (
                                                                            <div 
                                                                                onMouseDown={(e) => {
                                                                                    e.stopPropagation();
                                                                                    startWasteResize(colId, e);
                                                                                }}
                                                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-10"
                                                                            />
                                                                        )}
                                                                    </th>
                                                                );
                                                            })}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {wasteComposition.map((item, index) => {
                                                            const tonsDay = (totalDailyTons * item.percent) / 100;
                                                            const tonsHr = tonsDay / workingHours;
                                                            const compactTotal = tonsDay * item.priceDirty;
                                                            const recycledTotal = tonsDay * item.priceRecycled;
                                                            const rowUtility = recycledTotal - compactTotal;
                                                            const dispUtility = currencyMode === 'MXN' ? rowUtility : rowUtility / tipoCambio;

                                                            return (
                                                                <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group/row">
                                                                    {wasteColOrder.map((colId) => {
                                                                        if (colId === 'num') return (
                                                                            <td key={colId} className="py-3 px-4 font-black text-zinc-700 tracking-tighter border-b border-white/[0.02]">
                                                                                <span style={{ fontSize: `${tableFontSize * 0.9}px` }}>{index + 1}</span>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'label') return (
                                                                            <td key={colId} className="py-3 px-4 border-b border-white/[0.02]">
                                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                                    <div className="shrink-0 w-1.5 h-5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                                                                                    <span className="font-black text-white uppercase tracking-tight truncate" style={{ fontSize: `${tableFontSize}px` }}>{item.label}</span>
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'percent') return (
                                                                            <td key={colId} className="py-3 px-4 border-b border-white/[0.02]">
                                                                                <input 
                                                                                    type="number"
                                                                                    value={item.percent}
                                                                                    onChange={(e) => {
                                                                                        const val = Math.max(0, Math.min(100, Number(e.target.value)));
                                                                                        setWasteComposition(prev => prev.map(p => p.id === item.id ? { ...p, percent: val } : p));
                                                                                    }}
                                                                                    style={{ fontSize: `${tableFontSize}px`, width: '100%' }}
                                                                                    className="bg-zinc-900 border border-white/5 rounded px-2 py-1 font-black text-[#A3E635] outline-none focus:border-[#A3E635]/30 shadow-inner"
                                                                                />
                                                                            </td>
                                                                        );
                                                                        if (colId === 'tonsDay') return (
                                                                            <td key={colId} className="py-3 px-4 font-black text-zinc-400 tabular-nums border-b border-white/[0.02]">
                                                                                <span style={{ fontSize: `${tableFontSize}px` }}>{tonsDay.toLocaleString()}</span>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'tonsHr') return (
                                                                            <td key={colId} className="py-3 px-4 font-black text-zinc-400 tabular-nums border-b border-white/[0.02]">
                                                                                <span style={{ fontSize: `${tableFontSize}px` }}>{tonsHr.toFixed(1)}</span>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'dirty') return (
                                                                            <td key={colId} className="py-3 px-4 border-b border-white/[0.02]">
                                                                                <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5 transition-all focus-within:border-white/20 w-full">
                                                                                    <span className="font-black text-zinc-700" style={{ fontSize: `${tableFontSize * 0.7}px` }}>$</span>
                                                                                    <input 
                                                                                        type="number"
                                                                                        value={currencyMode === 'MXN' ? item.priceDirty : (item.priceDirty / tipoCambio).toFixed(0)}
                                                                                        onChange={(e) => {
                                                                                            const val = Number(e.target.value);
                                                                                            const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                            updateItemData(item.id, 'priceDirty', finalVal);
                                                                                        }}
                                                                                        style={{ fontSize: `${tableFontSize}px` }}
                                                                                        className="bg-transparent font-black text-white w-full outline-none"
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'recycled') return (
                                                                            <td key={colId} className="py-3 px-4 border-b border-white/[0.02]">
                                                                                <div className="flex items-center gap-1 bg-[#A3E635]/5 px-2 py-1 rounded border border-[#A3E635]/15 transition-all focus-within:border-[#A3E635]/30 w-full">
                                                                                    <span className="font-black text-[#A3E635]/40" style={{ fontSize: `${tableFontSize * 0.7}px` }}>$</span>
                                                                                    <input 
                                                                                        type="number"
                                                                                        value={currencyMode === 'MXN' ? item.priceRecycled : (item.priceRecycled / tipoCambio).toFixed(0)}
                                                                                        onChange={(e) => {
                                                                                            const val = Number(e.target.value);
                                                                                            const finalVal = currencyMode === 'MXN' ? val : val * tipoCambio;
                                                                                            updateItemData(item.id, 'priceRecycled', finalVal);
                                                                                        }}
                                                                                        style={{ fontSize: `${tableFontSize}px` }}
                                                                                        className="bg-transparent font-black text-[#A3E635] w-full outline-none"
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                        if (colId === 'util') return (
                                                                            <td key={colId} className="py-3 px-4 text-right border-b border-white/[0.02]">
                                                                                <span className="font-black text-white tabular-nums" style={{ fontSize: `${tableFontSize * 1.1}px` }}>$ {dispUtility.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                            </td>
                                                                        );
                                                                        return null;
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot className="bg-black/60 backdrop-blur-xl">
                                                        <tr>
                                                            {wasteColOrder.map((colId) => {
                                                                if (colId === 'num' || colId === 'label' || colId === 'percent') {
                                                                    if (colId === 'num') return (
                                                                        <td key={colId} className="py-6 px-4 border-t border-white/5">
                                                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest whitespace-nowrap">BALANCE</span>
                                                                        </td>
                                                                    );
                                                                    return <td key={colId} className="py-6 px-4 border-t border-white/5" />;
                                                                }
                                                                
                                                                if (colId === 'tonsDay') return (
                                                                    <td key={colId} className="py-6 px-4 border-t border-white/5 font-black text-white tabular-nums">
                                                                        <span style={{ fontSize: `${tableFontSize * 1.3}px` }}>{totalDailyTons.toLocaleString()}</span>
                                                                        <span className="text-[9px] text-zinc-600 ml-1.5 uppercase">T/D</span>
                                                                    </td>
                                                                );
                                                                
                                                                if (colId === 'tonsHr') return (
                                                                    <td key={colId} className="py-6 px-4 border-t border-white/5 font-black text-[#A3E635] tabular-nums">
                                                                        <span style={{ fontSize: `${tableFontSize * 1.3}px` }}>{(totalDailyTons / workingHours).toFixed(1)}</span>
                                                                        <span className="text-[9px] text-[#A3E635]/40 ml-1.5 uppercase">T/H</span>
                                                                    </td>
                                                                );

                                                                if (colId === 'dirty') {
                                                                    const totalCompact = wasteComposition.reduce((sum, item) => sum + ((totalDailyTons * item.percent / 100) * item.priceDirty), 0);
                                                                    const disp = currencyMode === 'MXN' ? totalCompact : totalCompact / tipoCambio;
                                                                    return (
                                                                        <td key={colId} className="py-6 px-4 border-t border-white/5 font-black text-white tabular-nums">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-zinc-600 uppercase mb-1">Total Compactado</span>
                                                                                <span style={{ fontSize: `${tableFontSize * 1.1}px` }}>$ {disp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                }

                                                                if (colId === 'recycled') {
                                                                    const totalRecycled = wasteComposition.reduce((sum, item) => sum + ((totalDailyTons * item.percent / 100) * item.priceRecycled), 0);
                                                                    const disp = currencyMode === 'MXN' ? totalRecycled : totalRecycled / tipoCambio;
                                                                    return (
                                                                        <td key={colId} className="py-6 px-4 border-t border-white/5 font-black text-[#A3E635] tabular-nums">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[8px] text-[#A3E635]/40 uppercase mb-1">Total Reciclado</span>
                                                                                <span style={{ fontSize: `${tableFontSize * 1.1}px` }}>$ {disp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                }

                                                                if (colId === 'util') {
                                                                    const totalUtility = wasteComposition.reduce((sum, item) => {
                                                                        const tonsDay = (totalDailyTons * item.percent) / 100;
                                                                        return sum + (tonsDay * (item.priceRecycled - item.priceDirty));
                                                                    }, 0);
                                                                    const displayVal = currencyMode === 'MXN' ? totalUtility : (totalUtility / tipoCambio);
                                                                    return (
                                                                        <td key={colId} className="py-6 px-4 border-t border-white/10 text-right bg-[#A3E635]/5 shadow-inner">
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[8px] font-black text-[#A3E635] uppercase tracking-widest mb-1">Utilidad Neta Diario</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-xl font-black text-[#A3E635]">$</span>
                                                                                    <span className="font-black text-[#A3E635] tabular-nums tracking-tighter" style={{ fontSize: `${tableFontSize * 1.8}px` }}>
                                                                                        {displayVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                                    </span>
                                                                                    <span className="text-[9px] font-black text-zinc-700 uppercase">{currencyMode}</span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
    );
}
