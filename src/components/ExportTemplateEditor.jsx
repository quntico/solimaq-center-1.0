import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';
import { X, Download, Save, Image as ImageIcon, Type, Palette, Layout, Settings2, Columns, Minimize2, Maximize2, Move, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';

const ExportTemplateEditor = ({ isOpen, onClose, sections, grandTotals, clientName: initialClientName, projectName: initialProjectName, money, calcItem, initialSettings, onSave, logoUrl: initialLogoUrl }) => {
    const [scale, setScale] = useState(3.78);
    const previewRef = useRef(null);
    const [editableClient, setEditableClient] = useState(initialClientName);
    const [editableProject, setEditableProject] = useState(initialProjectName);
    const [logoAspectRatio, setLogoAspectRatio] = useState(1);

    const [settings, setSettings] = useState(initialSettings || {
        primaryColor: '#9BD428', // Solimaq Green
        secondaryColor: '#000000',
        headerBg: '#9BD428',
        headerText: '#000000',
        titleText: 'CONCENTRADO',
        logoPos: { x: 235, y: 0, width: 45, height: 25 },
        headerBox: { x: 15, y: 0, width: 95, height: 15 },
        metaPos: { x: 120, y: 3 },
        colWidths: { item: 10, equipo: 40, desc: 105, foto: 35, qty: 10, unit: 30, total: 30 },
        fontSize: 9,
        rowHeight: 25,
        showImages: true,
        imgSize: 18,
    });

    useEffect(() => {
        if (initialSettings) setSettings(initialSettings);
    }, [initialSettings]);

    const [logoUrl, setLogoUrl] = useState(initialLogoUrl || initialSettings?.logoUrl || "/solimaq_logo_horizontal.png");

    useEffect(() => {
        if (initialLogoUrl) setLogoUrl(initialLogoUrl);
        else if (initialSettings?.logoUrl) setLogoUrl(initialSettings.logoUrl);
    }, [initialSettings?.logoUrl, initialLogoUrl]);

    const [isUploading, setIsUploading] = useState(false);
    const fileRef = useRef(null);

    useEffect(() => {
        if (previewRef.current && isOpen) {
            const widthPx = previewRef.current.offsetWidth;
            setScale(widthPx / 297);
        }
    }, [isOpen]);

    useEffect(() => {
        const img = new Image();
        img.src = logoUrl;
        img.onload = () => setLogoAspectRatio(img.width / img.height);
    }, [logoUrl]);

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const ratio = img.width / img.height;
                setLogoAspectRatio(ratio);
                setLogoUrl(event.target.result);
                setSettings(p => ({
                    ...p,
                    logoPos: { ...p.logoPos, height: p.logoPos.width / ratio }
                }));
                setIsUploading(false);
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = () => {
        if (onSave) {
            const { logoUrl: sLogoUrl, ...cleanSettings } = settings;
            onSave(cleanSettings, editableClient, editableProject, logoUrl);
        }
    };

    const generatePDF = async () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText, titleText, logoPos, colWidths, fontSize, rowHeight, imgSize, metaPos, headerBox } = settings;

        // Explicitly force the dark logo for all exports
        const finalUrl = "/solimaq_logo.png";

        const robustLogo = new Image();
        robustLogo.crossOrigin = "Anonymous";
        robustLogo.src = finalUrl + "?v=" + Date.now();

        await new Promise((resolve) => {
            robustLogo.onload = resolve;
            robustLogo.onerror = resolve;
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
                doc.text(String(editableClient || "").toUpperCase(), metaPos.x + 23, metaPos.y + topMargin);
                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", metaPos.x, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "normal");
                doc.text(String(editableProject || "").toUpperCase(), metaPos.x + 23, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", metaPos.x, metaPos.y + topMargin + 10);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), metaPos.x + 23, metaPos.y + topMargin + 10);

                if (robustLogo.complete && robustLogo.naturalWidth > 0) {
                    try {
                        const ratio = robustLogo.naturalWidth / robustLogo.naturalHeight;
                        const targetHeight = settings.logoPos.height || 16;
                        const targetWidth = targetHeight * ratio;
                        const xPos = settings.logoPos.x + settings.logoPos.width - targetWidth;
                        doc.addImage(robustLogo, 'PNG', xPos, settings.logoPos.y + topMargin, targetWidth, targetHeight, undefined, 'FAST');
                    } catch (e) {
                        console.error("Editor Logo Draw Error", e);
                    }
                }
            };

            let tableData = [];
            let globalIdx = 1;

            sections.forEach((s, sIdx) => {
                const activeItems = (s.items || []).filter(it => it.activo);
                if (activeItems.length === 0) return;

                tableData.push([
                    { content: `MÓDULO ${sIdx + 1}: ${s.titulo}`, colSpan: 7, styles: { fillColor: [120, 120, 120], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', minCellHeight: 10 } }
                ]);

                let modSum = 0;
                activeItems.forEach(it => {
                    const r = calcItem(it);
                    modSum += r.totalVenta;
                    tableData.push([
                        { content: globalIdx++, styles: { textColor: settings.primaryColor, fontStyle: 'bold' } },
                        String(it.equipo || "").toUpperCase(),
                        String(it.descripcion || "").substring(0, 350),
                        { content: "", image: it.media_url && it.media_type !== 'video' ? it.media_url : null },
                        it.qty,
                        money(r.ventaUnitFinal),
                        money(r.totalVenta)
                    ]);
                });

                tableData.push([
                    { content: `SUBTOTAL MÓDULO ${sIdx + 1}`, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fontSize: fontSize + 2, textColor: [60, 60, 60] } },
                    { content: money(modSum), styles: { halign: 'right', fontStyle: 'bold', fontSize: fontSize + 2, textColor: [60, 60, 60] } }
                ]);
            });

            doc.autoTable({
                startY: 40,
                head: [['ITEM', 'EQUIPO', 'DESCRIPCIÓN', 'FOTO', 'QTY', 'UNITARIO', 'TOTAL']],
                body: tableData,
                theme: 'plain',
                headStyles: { fillColor: settings.primaryColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', minCellHeight: 12 },
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
                    doc.text(`Página ${data.pageNumber} | www.solimaq.site`, 282, 202, { align: 'right' });
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
                const totalBoxWidth = settings.colWidths.total + settings.colWidths.unit + 45;
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

            const safeProjectName = String(editableProject || "Proyecto").replace(/\s+/g, '_');
            doc.save(`PREVIEW_MASTERPLAN_${safeProjectName}.pdf`);
        };

        start();
    };

    if (!isOpen) return null;

    const toPx = (mm) => mm * scale;
    const toMm = (px) => px / scale;

    return createPortal(
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                        <div className="flex items-center gap-3">
                            <Layout className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-bold text-white">Editor de Plantilla de Exportación</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={generatePDF} className="bg-zinc-800 hover:bg-zinc-700 text-white gap-2 h-9 px-4 rounded-lg">
                                <Download className="w-4 h-4" /> Exportar PDF
                            </Button>
                            <Button onClick={handleSaveSettings} className="bg-primary hover:bg-primary/90 text-black font-bold gap-2 h-9 px-4 rounded-lg">
                                <Save className="w-4 h-4" /> Guardar Plantilla
                            </Button>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-r border-zinc-800 p-6 overflow-y-auto custom-scrollbar space-y-8 bg-zinc-950/50">
                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary/70 mb-4 flex items-center gap-2">
                                    <Type className="w-3 h-3" /> Contenido Principal
                                </h3>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Proyecto</label>
                                    <input value={editableProject} onChange={e => setEditableProject(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Cliente</label>
                                    <input value={editableClient} onChange={e => setEditableClient(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Título de Exportación</label>
                                    <input value={settings.titleText} onChange={e => setSettings(p => ({ ...p, titleText: e.target.value.toUpperCase() }))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none font-bold" />
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary/70 mb-4 flex items-center gap-2">
                                    <Palette className="w-3 h-3" /> Estilo del Encabezado
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Fondo Caja</label>
                                        <input type="color" value={settings.headerBg} onChange={e => setSettings(p => ({ ...p, headerBg: e.target.value }))} className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg p-1 cursor-pointer" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 ml-1">Texto Caja</label>
                                        <input type="color" value={settings.headerText} onChange={e => setSettings(p => ({ ...p, headerText: e.target.value }))} className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded-lg p-1 cursor-pointer" />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary/70 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-3 h-3" /> Logotipo
                                </h3>
                                <div className="flex gap-2">
                                    <Button onClick={() => fileRef.current?.click()} disabled={isUploading} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs gap-2 py-5">
                                        {isUploading ? <Settings2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Subir Logo
                                    </Button>
                                    <input type="file" ref={fileRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                                </div>
                                <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                                    <span className="text-[10px] text-zinc-400 truncate">{logoUrl.substring(0, 30)}...</span>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-primary/70 mb-4 flex items-center gap-2">
                                    <Columns className="w-3 h-3" /> Dimensiones de Tabla
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                                        <span>Alto de Fila</span>
                                        <span className="text-white">{settings.rowHeight}mm</span>
                                    </div>
                                    <input type="range" min="15" max="60" value={settings.rowHeight} onChange={e => setSettings(p => ({ ...p, rowHeight: parseInt(e.target.value) }))} className="w-full accent-primary" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                                        <span>Tamaño Imagen</span>
                                        <span className="text-white">{settings.imgSize}mm</span>
                                    </div>
                                    <input type="range" min="10" max="50" value={settings.imgSize} onChange={e => setSettings(p => ({ ...p, imgSize: parseInt(e.target.value) }))} className="w-full accent-primary" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-500">
                                        <span>Tamaño Fuente</span>
                                        <span className="text-white">{settings.fontSize}pt</span>
                                    </div>
                                    <input type="range" min="6" max="14" value={settings.fontSize} onChange={e => setSettings(p => ({ ...p, fontSize: parseInt(e.target.value) }))} className="w-full accent-primary" />
                                </div>
                            </section>
                        </div>

                        <div className="flex-1 bg-[#121212] p-8 overflow-y-auto custom-scrollbar flex items-start justify-center relative group">
                            <div className="absolute top-4 left-4 flex gap-4 text-[10px] uppercase tracking-widest font-black text-zinc-600 bg-black/20 py-2 px-4 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="flex items-center gap-1.5"><Move className="w-3 h-3" /> Arrastra elementos</span>
                                <span className="flex items-center gap-1.5"><Maximize2 className="w-3 h-3" /> Ajusta tamaños</span>
                            </div>

                            <div
                                ref={previewRef}
                                className="bg-white shadow-2xl relative shrink-0 overflow-hidden text-black"
                                style={{
                                    width: '297mm',
                                    height: '210mm',
                                    transformOrigin: 'top center',
                                    transform: `scale(${scale})`
                                }}
                            >
                                <div className="relative w-full h-full">
                                    <div className="absolute top-0 left-0 right-0 h-[8mm] border-b border-dotted border-zinc-200 pointer-events-none opacity-50" />

                                    <Rnd
                                        size={{ width: toPx(settings.headerBox.width), height: toPx(settings.headerBox.height) }}
                                        position={{ x: toPx(settings.headerBox.x), y: toPx(settings.headerBox.y) }}
                                        onDragStop={(e, d) => setSettings(p => ({ ...p, headerBox: { ...p.headerBox, x: toMm(d.x), y: toMm(d.y) } }))}
                                        onResizeStop={(e, dir, ref, delta, pos) => setSettings(p => ({ ...p, headerBox: { x: toMm(pos.x), y: toMm(pos.y), width: toMm(ref.offsetWidth), height: toMm(ref.offsetHeight) } }))}
                                        className="z-20 group"
                                    >
                                        <div className="w-full h-full flex items-center justify-center font-bold text-2xl uppercase border border-dashed border-transparent group-hover:border-black/20" style={{ backgroundColor: settings.headerBg, color: settings.headerText }}>
                                            {settings.titleText}
                                        </div>
                                    </Rnd>

                                    <Rnd
                                        position={{ x: toPx(settings.metaPos.x), y: toPx(settings.metaPos.y) }}
                                        onDragStop={(e, d) => setSettings(p => ({ ...p, metaPos: { x: toMm(d.x), y: toMm(d.y) } }))}
                                        className="z-10 group"
                                    >
                                        <div className="text-[10px] py-1 px-2 border border-dashed border-transparent group-hover:border-black/20 bg-white/10">
                                            <p><strong>CLIENTE:</strong> {editableClient.toUpperCase()}</p>
                                            <p><strong>PROYECTO:</strong> {editableProject.toUpperCase()}</p>
                                        </div>
                                    </Rnd>

                                    <Rnd
                                        size={{ width: toPx(settings.logoPos.width), height: toPx(settings.logoPos.height) }}
                                        position={{ x: toPx(settings.logoPos.x), y: toPx(settings.logoPos.y) }}
                                        lockAspectRatio={logoAspectRatio}
                                        onDragStop={(e, d) => setSettings(p => ({ ...p, logoPos: { ...p.logoPos, x: toMm(d.x), y: toMm(d.y) } }))}
                                        onResizeStop={(e, dir, ref, delta, pos) => setSettings(p => ({ ...p, logoPos: { x: toMm(pos.x), y: toMm(pos.y), width: toMm(ref.offsetWidth), height: toMm(ref.offsetHeight) } }))}
                                        className="z-30 group"
                                    >
                                        <div className="w-full h-full border border-dashed border-transparent group-hover:border-black/20">
                                            <img src={logoUrl} className="w-full h-full object-contain pointer-events-none" />
                                        </div>
                                    </Rnd>

                                    <div className="mx-[15mm]" style={{ marginTop: '32mm' }}>
                                        <div className="flex font-extrabold text-[10px] uppercase text-center border border-black/10" style={{ backgroundColor: settings.primaryColor }}>
                                            <div style={{ width: `${settings.colWidths.item}mm` }} className="py-2.5 border-r border-black/10">Item</div>
                                            <div style={{ width: `${settings.colWidths.equipo}mm` }} className="py-2.5 border-r border-black/10">Equipo</div>
                                            <div style={{ flex: 1 }} className="py-2.5 border-r border-black/10 text-left px-3">Descripción</div>
                                            <div style={{ width: `${settings.colWidths.foto}mm` }} className="py-2.5 border-r border-black/10">Foto</div>
                                            <div style={{ width: `${settings.colWidths.qty}mm` }} className="py-2.5 border-r border-black/10">Qty</div>
                                            <div style={{ width: `${settings.colWidths.unit}mm` }} className="py-2.5 border-r border-black/10">Unitario</div>
                                            <div style={{ width: `${settings.colWidths.total}mm` }} className="py-2.5 text-right px-3">Total</div>
                                        </div>

                                        <div className="flex border border-t-0 border-black/10 bg-[#787878] text-white font-bold text-[9px] h-7 items-center justify-center uppercase tracking-widest">
                                            Módulo de Prueba: Refinamiento de Estilos
                                        </div>

                                        <div className="flex border border-t-0 border-black/10 font-medium" style={{ fontSize: `${settings.fontSize}px`, minHeight: `${settings.rowHeight}mm` }}>
                                            <div style={{ width: `${settings.colWidths.item}mm`, color: settings.primaryColor }} className="p-2 border-r border-black/10 flex items-center justify-center font-black">1</div>
                                            <div style={{ width: `${settings.colWidths.equipo}mm` }} className="p-3 border-r border-black/10 flex items-center font-bold px-3 uppercase">Items Normales</div>
                                            <div style={{ flex: 1, textAlign: 'justify' }} className="p-3 border-r border-black/10 flex items-center leading-tight">Visualización de subtotales y total general.</div>
                                            <div style={{ width: `${settings.colWidths.foto}mm` }} className="p-2 border-r border-black/10 flex items-center justify-center">
                                                <div className="bg-zinc-100" style={{ width: `${settings.imgSize}mm`, height: `${settings.imgSize}mm` }} />
                                            </div>
                                            <div style={{ width: `${settings.colWidths.qty}mm` }} className="p-2 border-r border-black/10 flex items-center justify-center">1</div>
                                            <div style={{ width: `${settings.colWidths.unit}mm` }} className="p-2 border-r border-black/10 flex items-center justify-end px-3">$0.00</div>
                                            <div style={{ width: `${settings.colWidths.total}mm` }} className="p-2 flex items-center justify-end px-3 font-mono text-primary">$0,000.00</div>
                                        </div>

                                        <div className="flex border-b border-black/10 font-black h-12 items-center justify-end px-6 gap-4" style={{ fontSize: `${settings.fontSize + 2}px` }}>
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Subtotal Módulo</span>
                                            <span className="text-zinc-700">$0,000.00</span>
                                        </div>

                                        <div className="flex justify-end mt-4">
                                            <div className="bg-black text-white h-12 flex items-center px-6 gap-8" style={{ width: '80mm' }}>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Total General</span>
                                                <span className="text-xl font-black ml-auto">$0,000.00</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};

// Internal Button component as common in our codebase or we use a primitive?
// Explicitly define it if needed, or assume it exists. 
// Actually, using a standard <button> to avoid import issues.
const Button = ({ children, className, onClick, disabled, ...props }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 ${className}`}
        {...props}
    >
        {children}
    </button>
);

export default ExportTemplateEditor;
