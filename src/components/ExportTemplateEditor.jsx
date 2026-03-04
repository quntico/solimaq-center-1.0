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
        colWidths: { item: 15, equipo: 45, desc: 85, foto: 35, qty: 15, unit: 32, total: 32 },
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
        // Prioritize the prop, but fallback to settings if prop is missing (legacy support)
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
                // Clean logoUrl from settings if it exists there to avoid conflicts
                setSettings(p => {
                    const { logoUrl, ...rest } = p;
                    return {
                        ...rest,
                        logoPos: { ...p.logoPos, height: p.logoPos.width / ratio }
                    };
                });
                setIsUploading(false);
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSettings = () => {
        if (onSave) {
            // CRITICAL: Remove logoUrl from settings before saving to prevent dual source of truth
            // The logo is saved as a separate column/field in the DB
            const { logoUrl, ...cleanSettings } = settings;
            onSave(cleanSettings, editableClient, editableProject, logoUrl);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const { headerBg, headerText, titleText, logoPos, colWidths, fontSize, rowHeight, imgSize, metaPos, headerBox } = settings;

        const logoImg = new Image();
        logoImg.src = logoUrl;
        logoImg.crossOrigin = "Anonymous";

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
                doc.text(editableClient.toUpperCase(), metaPos.x + 23, metaPos.y + topMargin);
                doc.setFont("helvetica", "bold");
                doc.text("PROYECTO:", metaPos.x, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "normal");
                doc.text(editableProject.toUpperCase(), metaPos.x + 23, metaPos.y + topMargin + 5);
                doc.setFont("helvetica", "bold");
                doc.text("FECHA:", metaPos.x, metaPos.y + topMargin + 10);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('es-MX'), metaPos.x + 23, metaPos.y + topMargin + 10);

                try {
                    doc.addImage(logoImg, 'PNG', logoPos.x, logoPos.y + topMargin, logoPos.width, logoPos.height, undefined, 'FAST');
                } catch (e) { console.error("Logo PDF Draw Error", e); }
            };

            let tableData = [];
            let globalIdx = 1;

            sections.forEach((s, sIdx) => {
                const activeItems = s.items.filter(it => it.activo);
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
                        it.equipo.toUpperCase(),
                        it.descripcion.substring(0, 350),
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
                    2: { cellWidth: colWidths.desc },
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

            // TOTAL GENERAL ALIGNED TO THE LAST COLUMN (WIDTH OF THE TABLE)
            const finalY = doc.lastAutoTable.finalY + 8;
            if (finalY < 185) {
                const totalBoxWidth = settings.colWidths.total + settings.colWidths.unit + 45; // Extend width to prevent overlap
                const tableRightPos = 282; // Matches page margin

                doc.setFillColor(0, 0, 0);
                doc.rect(tableRightPos - totalBoxWidth, finalY, totalBoxWidth, 20, 'F'); // Increased height for legend

                doc.setTextColor(255, 255, 255);

                // Label
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("TOTAL GENERAL", tableRightPos - totalBoxWidth + 5, finalY + 9);

                // Amount
                doc.setFontSize(14); // Slightly smaller to ensure fit
                doc.text(money(grandTotals.totalVenta) + " USD", tableRightPos - 5, finalY + 9, { align: 'right' });

                // VAT Legend
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.text("(Precios más 16% de I.V.A.)", tableRightPos - 5, finalY + 16, { align: 'right' });
            }

            doc.save(`SOLIMAQ_MP_${editableProject.replace(/\s+/g, '_')}.pdf`);
        };

        if (logoImg.complete) start();
        else {
            logoImg.onload = start;
            logoImg.onerror = () => start();
        }
    };

    if (!isOpen) return null;

    const toPx = (mm) => mm * scale;
    const toMm = (px) => px / scale;

    return createPortal(
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-xl flex flex-col">
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-900/50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                        <Settings2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold leading-none">Editor Pro v11.5</h2>
                        <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Plantilla de Exportacion</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleSaveSettings} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all text-xs font-bold border border-white/10">
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                    <button onClick={generatePDF} className="flex items-center gap-2 px-5 py-2 bg-primary text-black rounded-xl hover:scale-105 transition-all text-xs font-black uppercase tracking-tighter">
                        <Download className="w-4 h-4" /> Exportar PDF
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r border-white/10 bg-zinc-900/30 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                    <section>
                        <h3 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Palette className="w-3 h-3" /> Marca
                        </h3>
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-white/70">Color Acento</label>
                                <input type="color" value={settings.primaryColor} onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value, headerBg: e.target.value }))} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                            </div>
                            <button onClick={() => fileRef.current.click()} className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white flex items-center justify-center gap-2 hover:bg-white/10">
                                <Upload size={14} className="text-primary" /> Actualizar Logo
                            </button>
                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Type className="w-3 h-3" /> Editar Textos
                        </h3>
                        <div className="grid gap-4">
                            <div>
                                <label className="text-[10px] text-white/40 uppercase mb-1">Título</label>
                                <input type="text" value={settings.titleText} onChange={e => setSettings(p => ({ ...p, titleText: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-xs text-white" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 uppercase mb-1">Cliente</label>
                                <input type="text" value={editableClient} onChange={e => setEditableClient(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-xs text-white" />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 uppercase mb-1">Proyecto</label>
                                <input type="text" value={editableProject} onChange={e => setEditableProject(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded px-2 py-2 text-xs text-white" />
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex-1 bg-zinc-950 p-12 overflow-auto flex justify-center custom-scrollbar">
                    <div
                        ref={previewRef}
                        className="w-[297mm] h-[210mm] bg-white text-black shadow-2xl relative select-none origin-top overflow-hidden pt-[8mm]"
                        style={{ minWidth: '297mm' }}
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
                                    <div style={{ flex: 1 }} className="p-3 border-r border-black/10 flex items-center leading-tight">Visualización de subtotales y total general.</div>
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
        </div>,
        document.body
    );
};

export default ExportTemplateEditor;
