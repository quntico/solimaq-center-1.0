import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Download, Code, Info, Webhook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const defaultMassFlow = [
  { etapa: "Entrada", equipo: "**INPUT**", flujoBase: 45.00, obs: "Alimentación total a la línea" },
  { etapa: "Pretriaje", equipo: "AL-1010 / CT-1020", flujoBase: 45.00, obs: "Alimentador principal y plataforma de triaje de voluminosos" },
  { etapa: "Salida manual", equipo: "Cartón (pretriaje)", flujoBase: 0.115, obs: "Recuperación manual" },
  { etapa: "Salida manual", equipo: "Voluminosos (pretriaje)", flujoBase: 0.342, obs: "Recuperación manual" },
  { etapa: "Salida manual", equipo: "Férricos (pretriaje)", flujoBase: 0.113, obs: "Recuperación manual" },
  { etapa: "Hacia tromel", equipo: "CT-1030 / TR-1040", flujoBase: 44.43, obs: "Flujo remanente tras pretriaje" },
  { etapa: "Finos tromel", equipo: "**FINOS <80 mm / orgánico**", flujoBase: 20.17, obs: "Fracción orgánica a relleno" },
  { etapa: "Rebase tromel", equipo: "**REBOSE >80 mm**", flujoBase: 24.98, obs: "Pasa a selección secundaria" },
  { etapa: "Selección secundaria", equipo: "CT-1050", flujoBase: 24.98, obs: "Plataforma secundaria antes del abre bolsas" },
  { etapa: "Salida manual", equipo: "Cartón (secundaria)", flujoBase: 0.085, obs: "Recuperación manual" },
  { etapa: "Salida manual", equipo: "Voluminosos (secundaria)", flujoBase: 0.110, obs: "Recuperación manual" },
  { etapa: "Salida manual", equipo: "Otro", flujoBase: 0.050, obs: "Retiro manual" },
  { etapa: "Salida manual", equipo: "Férricos (secundaria)", flujoBase: 0.125, obs: "Recuperación manual" },
  { etapa: "Hacia abre bolsas", equipo: "CT-1060 / AB-1070", flujoBase: 24.63, obs: "24.98 - 0.35 aprox. por retiros manuales" },
  { etapa: "Hacia balístico", equipo: "CT-1080 / SB-1090", flujoBase: 24.98, obs: "El diagrama vuelve a marcar 24.98; zona con inconsistencia leve" },
  { etapa: "Salida balístico", equipo: "Fracción 2D / planar", flujoBase: 6.81, obs: "Hacia línea de 2D" },
  { etapa: "Salida balístico", equipo: "Fracción 3D / rodante", flujoBase: 16.94, obs: "Hacia línea 3D / ópticos" },
  { etapa: "Salida balístico", equipo: "Finos / rechazo fino", flujoBase: 1.05, obs: "Hacia línea de finos" },
  { etapa: "Línea 2D", equipo: "CT-3010 recolección 2D", flujoBase: 6.81, obs: "Inicio de fracción 2D" },
  { etapa: "Línea 2D", equipo: "CT-3020 transporte 2D", flujoBase: 6.99, obs: "Incremento por redondeo / ajuste gráfico" },
  { etapa: "Línea 2D", equipo: "CT-3030 selección 2D", flujoBase: 5.62, obs: "Queda reciclable 2D recuperado" },
  { etapa: "CDR sin triturar", equipo: "CT-3040", flujoBase: 20.17, obs: "Alimentación principal al tren CDR" },
  { etapa: "Magnético CDR", equipo: "SF-3045", flujoBase: 0.178, obs: "Recuperación férrica en esta zona" },
  { etapa: "Hacia triturador CDR", equipo: "CT-3050", flujoBase: 15.75, obs: "Flujo final de CDR" },
  { etapa: "Triturador CDR", equipo: "TT-3060", flujoBase: 15.75, obs: "Flujo de proceso CDR" },
  { etapa: "CDR triturado", equipo: "CT-3070", flujoBase: 15.75, obs: "Salida de triturador" },
  { etapa: "Salida CDR", equipo: "CT-3080", flujoBase: 15.75, obs: "Descarga / expedición" },
  { etapa: "A prensa CDR", equipo: "CT-3090", flujoBase: 15.75, obs: "Alimentación a prensa CDR" },
  { etapa: "Línea 3D", equipo: "CT-4010 recolección 3D", flujoBase: 16.94, obs: "Inicio de fracción 3D" },
  { etapa: "Magnético 3D", equipo: "SF-4020", flujoBase: 0.295, obs: "Recuperación férrica de 3D" },
  { etapa: "Alimentación a aceleración", equipo: "CT-4030", flujoBase: 16.94, obs: "Entrada a ópticos" },
  { etapa: "Aceleración óptico I", equipo: "AC-4040", flujoBase: 16.94, obs: "Flujo principal 3D" },
  { etapa: "Sensor óptico I", equipo: "SO-4041", flujoBase: 16.94, obs: "Clasificación óptica" },
  { etapa: "Caja de vuelo I", equipo: "EH-4042", flujoBase: 16.94, obs: "Eyección" },
  { etapa: "Aceleración óptico II", equipo: "AC-4050", flujoBase: 16.94, obs: "Segunda clasificación" },
  { etapa: "Sensor óptico II", equipo: "SO-4051", flujoBase: 16.94, obs: "Clasificación óptica" },
  { etapa: "Caja de vuelo II", equipo: "EH-4052", flujoBase: 16.94, obs: "Eyección" },
  { etapa: "Recirculación I", equipo: "CT-4060", flujoBase: 1.05, obs: "Corriente recirculada" },
  { etapa: "Recirculación II", equipo: "CT-4070", flujoBase: 1.05, obs: "Corriente recirculada" },
  { etapa: "Negativo óptico I", equipo: "CT-4080", flujoBase: 5.42, obs: "Rechazo / no seleccionado" },
  { etapa: "Negativo óptico II", equipo: "CT-4090", flujoBase: 5.42, obs: "Rechazo / no seleccionado" },
  { etapa: "A inductivo", equipo: "CT-4100", flujoBase: 3.62, obs: "Alimentación a recuperación final de reciclables" },
  { etapa: "Inductivo", equipo: "SI-4110", flujoBase: 3.62, obs: "Recuperación no ferrosos" },
  { etapa: "Negativo inductivo", equipo: "CT-4120", flujoBase: 3.62, obs: "Salida negativa de inductivo" },
  { etapa: "Selección final 3D", equipo: "CT-4130", flujoBase: 3.62, obs: "Pulido final de reciclables" },
  { etapa: "Salida I material 3D", equipo: "CT-4140", flujoBase: 3.62, obs: "Producto 3D recuperado" },
  { etapa: "Salida reversible material 3D", equipo: "CT-4150", flujoBase: 3.62, obs: "Producto 3D recuperado" },
  { etapa: "Finos tromel", equipo: "CT-5020", flujoBase: 20.17, obs: "Recolección finos del tromel" },
  { etapa: "Finos balístico", equipo: "CT-5010", flujoBase: 1.05, obs: "Finos del balístico" },
  { etapa: "Transportadora finos", equipo: "CT-5030", flujoBase: 1.05, obs: "Hacia disposición / separación" },
  { etapa: "Magnético finos", equipo: "SF-5035", flujoBase: 0.125, obs: "Recuperación férrica de finos" },
  { etapa: "Salida finos", equipo: "CT-5040 / CT-5041", flujoBase: 5.42, obs: "Mezcla finos y rechazo" },
  { etapa: "Selección 3D I", equipo: "CT-6200", flujoBase: 6.81, obs: "Subcorriente de selección manual 3D" },
  { etapa: "Selección 3D II", equipo: "CT-6210", flujoBase: 6.99, obs: "Subcorriente de selección manual 3D" },
  { etapa: "Carga camión CDR", equipo: "CT-6220", flujoBase: 15.75, obs: "Expedición CDR" },
  { etapa: "Alimentación a prensa reciclables", equipo: "CT-8110", flujoBase: 3.62, obs: "Corriente reciclables" },
  { etapa: "Prensa reciclables", equipo: "PR-8120", flujoBase: 3.62, obs: "Compactación reciclables" },
  { etapa: "Prensa CDR", equipo: "PR-8130", flujoBase: 15.75, obs: "Compactación CDR" },
  { etapa: "Embaladora", equipo: "CW-9140", flujoBase: 15.75, obs: "Embalado CDR / pacas" },
  { etapa: "Compresor aire", equipo: "9300", flujoBase: 0, obs: "No transporta masa; es servicio auxiliar" }
];

const fractionDataList = [
  { label: "Orgánicos", prc: 44, color: "text-lime-400" },
  { label: "Otros / Rechazo", prc: 25, color: "text-gray-400" },
  { label: "Plásticos", prc: 16, color: "text-emerald-400" },
  { label: "Papel/Cartón", prc: 11, color: "text-blue-400" },
  { label: "Vidrio", prc: 2, color: "text-orange-400" },
  { label: "Metales", prc: 2, color: "text-red-400" }
];

const SimuladorSection = ({ sectionData, isEditorMode, onAtomicContentUpdate, quotationData, allSectionsData }) => {
  const { toast } = useToast();
  const content = sectionData?.content;
  const [infoModal, setInfoModal] = useState(null); // 'base' | 'teorico' | 'lineas'
  
  const [targetCapacityDay, setTargetCapacityDay] = useState(() => {
    let cap = 2250;
    try {
      if (content?.targetCapacityDay) {
        cap = content.targetCapacityDay;
      } else if (quotationData && quotationData.project && String(quotationData.project).includes('2250')) {
        cap = 2250;
      }
    } catch (e) {}
    return cap;
  });
  
  const baseCapacityDay = 600;
  
  const [rows, setRows] = useState(() => {
    return Array.isArray(content?.rows) && content.rows.length > 0 
      ? content.rows 
      : defaultMassFlow;
  });

  const scaleRatio = (Number(targetCapacityDay) || 0) / baseCapacityDay;

  // Use stringified dependency to avoid infinite render loops from unstable object references
  const rowsStr = JSON.stringify(content?.rows || []);

  useEffect(() => {
    try {
      const parsedRows = JSON.parse(rowsStr);
      if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
        setRows(defaultMassFlow);
      } else {
        setRows(parsedRows);
      }
    } catch(e) {}
  }, [rowsStr]);

  const handleCapacityChange = (e) => {
    setTargetCapacityDay(Number(e.target.value) || 0);
  };

  const handleRowChange = (index, field, val) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: val };
    setRows(newRows);
  };

  const calculateRequiredMachines = (scaledFlow) => {
    if (scaledFlow <= 0) return "-";
    const typicalMaxPerMachine = 50; 
    return Math.ceil(scaledFlow / typicalMaxPerMachine);
  };

  const handleSaveSimulador = () => {
    if (onAtomicContentUpdate) {
      onAtomicContentUpdate(sectionData.id, {
        targetCapacityDay,
        rows
      });
      toast({ title: "Guardado", description: "Configuración del simulador actualizada." });
    }
  };

  const handleSyncToMasterPlan = () => {
    if (!allSectionsData || !onAtomicContentUpdate) {
      toast({ title: "Error de contexto", description: "No se encuentra la configuración global.", variant: "destructive" });
      return;
    }
    
    const masterPlanConfig = allSectionsData.find(s => s.id === 'master_plan');
    if (!masterPlanConfig || !masterPlanConfig.content || !masterPlanConfig.content.subItems) {
      toast({ title: "Master Plan Inaccesible", description: "El Master Plan debe estar activo e inicializado primero.", variant: "destructive" });
      return;
    }

    // 1. Map Machine Codes (AL-1010) -> Required Lines (integer)
    const lineRequirements = {};
    rows.forEach(r => {
      const fBase = Number(r.flujoBase) || 0;
      const reqLines = calculateRequiredMachines(fBase * scaleRatio);
      
      if (reqLines === "-" || reqLines <= 0) return;
      
      // Match typical codes e.g., AL-1010, CT-1020, TR-1040, etc.
      const codes = String(r.equipo).match(/[A-Z]{2}-\d{4}/g) || [];
      codes.forEach(code => {
        if (!lineRequirements[code] || lineRequirements[code] < reqLines) {
           lineRequirements[code] = reqLines;
        }
      });
    });

    // 2. Iterate Master Plan Items and Update Quantities Based on Code matching
    let updatedCount = 0;
    const updatedSubItems = masterPlanConfig.content.subItems.map(subItem => ({
      ...subItem,
      items: (subItem.items || []).map(item => {
        const itemCodeString = String(item.partida || '') + " " + String(item.description || '');
        let newQty = item.quantity;
        let matched = false;

        Object.keys(lineRequirements).forEach(code => {
          if (itemCodeString.includes(code)) {
            newQty = lineRequirements[code];
            matched = true;
          }
        });

        if (matched && Number(item.quantity) !== newQty) {
          updatedCount++;
          return { ...item, quantity: newQty };
        }
        return item;
      })
    }));

    if (updatedCount === 0) {
      toast({ title: "Sin Cambios", description: "No se identificaron variaciones entre el simulador y el master plan actual." });
      return;
    }

    // 3. Dispatch the atomic update to override 'master_plan' subItems
    onAtomicContentUpdate('master_plan', { ...masterPlanConfig.content, subItems: updatedSubItems });
    toast({ 
      title: "Sincronizado con Master Plan", 
      description: `Se actualizaron las cantidades de ${updatedCount} equipos en el presupuesto.`,
      variant: "default" 
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    
    // Background White
    doc.setFillColor(255, 255, 255); 
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
    
    // Header Line Accent (Primary Green)
    doc.setFillColor(180, 230, 20); 
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 8, 'F');
    
    // Title
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(24);
    doc.text("SIMULADOR MASAS", 40, 50);
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Capacidad Objetivo: ${targetCapacityDay} ton/día`, 40, 75);
    doc.text(`Factor Escalador: ${scaleRatio.toFixed(2)}x`, 40, 90);

    const bodyData = (Array.isArray(rows) ? rows : []).map(r => [
      r.etapa || '', 
      String(r.equipo || '').replace(/\*\*/g, ''), 
      (Number(r.flujoBase) || 0).toFixed(2), 
      ((Number(r.flujoBase) || 0) * scaleRatio).toFixed(2),
      calculateRequiredMachines((Number(r.flujoBase) || 0) * scaleRatio),
      r.obs || ''
    ]);

    doc.autoTable({
      startY: 110,
      headStyles: { fillColor: [180, 230, 20], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [247, 250, 240] },
      head: [['Etapa', 'Equipo / Tramo', 'Flujo Base (t/h)', `Flujo Teórico (t/h)`, 'Líneas Req.', 'Observación']],
      body: bodyData,
      theme: 'grid',
      styles: { cellPadding: 6, fontSize: 9, lineColor: [220, 220, 220], lineWidth: 0.5 }
    });

    const finalY = doc.lastAutoTable.finalY || 110;
    
    if (finalY > doc.internal.pageSize.getHeight() - 150) {
      doc.addPage();
    }
    
    const newY = doc.internal.getCurrentPageInfo().pageNumber > 1 ? 50 : finalY + 40;
    
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text("Balance de Fracciones", 40, newY);

    const fractionBody = [
      ...fractionDataList.map(f => {
        const baseFlow = (45.00 * f.prc) / 100;
        return [
          f.label, 
          `${f.prc}%`, 
          baseFlow.toFixed(2), 
          (baseFlow * scaleRatio).toFixed(2)
        ];
      }),
      ['TOTAL', '100%', '45.00', (45.00 * scaleRatio).toFixed(2)]
    ];

    doc.autoTable({
      startY: newY + 20,
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fillColor: [255, 255, 255], textColor: [40, 40, 40] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { fontStyle: 'bold' } },
      head: [['Fracción', '% Relativo', 'Flujo Base (t/h)', `Flujo Requerido (t/h) @${targetCapacityDay}t/d`]],
      body: fractionBody,
      theme: 'grid',
      styles: { cellPadding: 8, fontSize: 10, lineColor: [220, 220, 220], lineWidth: 0.5 }
    });

    doc.save(`Simulador_Masas_${targetCapacityDay}t.pdf`);
  };

  const handleExportCode = () => {
    const data = {
      proyecto: quotationData?.project || "Proyecto Generico",
      capacidadObjetivoTonDia: targetCapacityDay,
      factorEscalador: Number(scaleRatio.toFixed(4)),
      simuladorMasas: (Array.isArray(rows) ? rows : []).map(r => ({
        etapa: r.etapa,
        equipo: String(r.equipo).replace(/\*\*/g, ''),
        flujoBaseTonHora: Number(r.flujoBase),
        flujoTeoricoTonHora: Number(((Number(r.flujoBase) || 0) * scaleRatio).toFixed(3)),
        lineasEstimadas: calculateRequiredMachines((Number(r.flujoBase) || 0) * scaleRatio),
        observacion: r.obs
      })),
      balanceFracciones: fractionDataList.map(f => {
        const baseFlow = (45.00 * f.prc) / 100;
        return {
          fraccion: f.label,
          porcentaje: f.prc,
          flujoBaseTonHora: Number(baseFlow.toFixed(3)),
          flujoRequeridoTonHora: Number((baseFlow * scaleRatio).toFixed(3))
        };
      })
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Simulador_${targetCapacityDay}t.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 text-white relative">
      <div className="mb-10 px-4 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-[3.2rem] sm:text-[4rem] md:text-[5.5rem] lg:text-[6.4rem] font-black uppercase tracking-tighter leading-none">
            <span className="text-white">SIMULADOR </span>
            <span className="text-primary">MASAS</span>
          </h1>
          <p className="text-gray-400 mt-4 text-lg md:text-xl font-medium tracking-wide">
            Calculadora de flujo y escalamiento de capacidades ligada al Master Plan.
          </p>
        </div>
        
        <div className="flex items-center gap-3 self-start md:mt-4">
          <Button onClick={handleExportPDF} variant="outline" className="border-gray-700 bg-gray-900/50 hover:bg-gray-800 text-gray-200">
            <Download className="w-4 h-4 mr-2 text-primary" />
            Exportar PDF
          </Button>
          <Button onClick={handleExportCode} variant="outline" className="border-gray-700 bg-gray-900/50 hover:bg-gray-800 text-gray-200">
            <Code className="w-4 h-4 mr-2 text-primary" />
            Dumping API (JSON)
          </Button>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8 shadow-xl mx-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="bg-black/50 p-6 rounded-xl border border-gray-800 flex-1 w-full flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 font-bold mb-1 uppercase">Capacidad Planta Objetivo</p>
              <div className="flex items-end gap-3">
                <Input
                  type="number"
                  value={targetCapacityDay}
                  onChange={handleCapacityChange}
                  readOnly={!isEditorMode}
                  className="w-32 bg-gray-950 border-primary/50 text-white font-black text-2xl h-12"
                />
                <span className="text-gray-500 font-bold pb-2">ton/día</span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Factor Escalador Base 600t</p>
              <p className="text-3xl text-primary font-black mt-1">{scaleRatio.toFixed(2)}x</p>
            </div>
          </div>

          {isEditorMode && (
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => setRows(defaultMassFlow)} variant="outline" className="border-gray-800 hover:bg-gray-800 text-gray-300">
                <RefreshCw className="w-4 h-4 mr-2 text-gray-400" /> Restaurar Tabla
              </Button>
              <Button onClick={handleSyncToMasterPlan} className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20">
                <Webhook className="w-4 h-4 mr-2" /> Sincronizar a Master Plan
              </Button>
              <Button onClick={handleSaveSimulador} className="bg-primary hover:bg-primary/80 text-black font-bold">
                <Save className="w-4 h-4 mr-2" /> Guardar Cambios
              </Button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40">
          <Table>
            <TableHeader className="bg-gray-900/80 hover:bg-gray-900/80">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-primary font-bold">Etapa</TableHead>
                <TableHead className="text-gray-300 font-bold min-w-[200px]">ID / Equipo o tramo</TableHead>
                <TableHead 
                  className="text-right text-yellow-500 font-bold cursor-pointer hover:bg-yellow-950/20 group"
                  onClick={() => setInfoModal('base')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Flujo Base <Info className="w-3.5 h-3.5 text-yellow-500/50 group-hover:text-yellow-400" />
                  </div>
                  <span className="text-[10px] text-gray-500">(ton/h @ 600t/d)</span>
                </TableHead>
                <TableHead 
                  className="text-right text-green-400 font-bold bg-green-950/20 cursor-pointer hover:bg-green-950/40 group"
                  onClick={() => setInfoModal('teorico')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Flujo Teórico <Info className="w-3.5 h-3.5 text-green-500/50 group-hover:text-green-400" />
                  </div>
                  <span className="text-[10px] text-green-500/50">(ton/h @ {targetCapacityDay}t/d)</span>
                </TableHead>
                <TableHead 
                  className="text-center text-cyan-400 font-bold bg-cyan-950/20 max-w-[100px] cursor-pointer hover:bg-cyan-950/40 group"
                  onClick={() => setInfoModal('lineas')}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Líneas Req. <Info className="w-3.5 h-3.5 text-cyan-500/50 group-hover:text-cyan-400" />
                  </div>
                  <span className="text-[10px] text-cyan-500/50">(Est. @ 50t/h)</span>
                </TableHead>
                <TableHead className="text-gray-400 font-bold min-w-[200px]">Observación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Array.isArray(rows) ? rows : []).map((row, index) => {
                const fBase = Number(row.flujoBase) || 0;
                const scaledFlow = fBase * scaleRatio;
                const equipoStr = String(row.equipo || '');
                const isBold = equipoStr.includes('**');
                const cleanEquipo = equipoStr.replace(/\*\*/g, '');

                return (
                  <TableRow key={index} className="border-gray-800/50 hover:bg-white/5 transition-colors group">
                    <TableCell className="align-top py-4 text-sm text-gray-400">
                      {isEditorMode ? (
                        <Input 
                          value={row.etapa || ''} 
                          onChange={(e) => handleRowChange(index, "etapa", e.target.value)} 
                          className="bg-transparent border-none text-sm p-0 h-auto focus-visible:ring-1" 
                        />
                      ) : (
                        row.etapa || ''
                      )}
                    </TableCell>
                    
                    <TableCell className={`align-top py-4 text-sm ${isBold ? 'font-black text-white' : 'text-gray-300'}`}>
                      {isEditorMode ? (
                        <Input 
                          value={cleanEquipo} 
                          onChange={(e) => handleRowChange(index, "equipo", isBold ? `**${e.target.value}**` : e.target.value)} 
                          className={`bg-transparent border-none p-0 h-auto focus-visible:ring-1 ${isBold ? 'font-black text-white' : 'text-gray-300'}`} 
                        />
                      ) : (
                        cleanEquipo
                      )}
                    </TableCell>
                    
                    <TableCell className="align-top py-4 text-right">
                      {isEditorMode ? (
                        <Input 
                          value={fBase} 
                          onChange={(e) => handleRowChange(index, "flujoBase", Number(e.target.value) || 0)} 
                          className="bg-transparent border-none text-right text-yellow-500 font-mono p-0 h-auto focus-visible:ring-1 w-20 ml-auto" 
                          type="number" step="0.01" 
                        />
                      ) : (
                        <span className="text-yellow-500/80 font-mono">{fBase > 0 ? fBase.toFixed(2) : '—'}</span>
                      )}
                    </TableCell>

                    <TableCell className="align-top py-4 text-right bg-green-950/10">
                      <span className="text-green-400 font-black font-mono">
                        {scaledFlow > 0 ? scaledFlow.toFixed(2) : '—'}
                      </span>
                    </TableCell>

                    <TableCell className="align-top py-4 text-center bg-cyan-950/10">
                      <span className="text-cyan-400 font-bold">
                        {calculateRequiredMachines(scaledFlow)}
                      </span>
                    </TableCell>
                    
                    <TableCell className="align-top py-4 text-xs text-gray-500 italic max-w-xs break-words">
                      {isEditorMode ? (
                         <Input 
                          value={row.obs || ''} 
                          onChange={(e) => handleRowChange(index, "obs", e.target.value)} 
                          className="bg-transparent border-none text-xs text-gray-400 italic p-0 h-auto focus-visible:ring-1 w-full" 
                        />
                      ) : (
                        row.obs || ''
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 text-xs text-gray-600 flex justify-between items-center px-2">
          <span>* El requisito de líneas es una estimación asumiendo una capacidad nominal de ~50 ton/h por línea principal.</span>
          <span>Escalamiento Automático Dinámico Habilitado</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-8 shadow-xl mx-4">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wider">
          Balance de Fracciones <span className="text-primary text-lg ml-2 font-medium">(Radiografía Estimada)</span>
        </h2>
        
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-black/40">
          <Table>
            <TableHeader className="bg-gray-900/80">
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-white font-bold w-1/4">Fracción</TableHead>
                <TableHead className="text-center text-gray-400 font-bold">% Relativo</TableHead>
                <TableHead className="text-right text-yellow-500 font-bold">Flujo Base 1L <br/><span className="text-[10px] text-gray-500">(ton/h) @45t/h IN</span></TableHead>
                <TableHead className="text-right text-green-400 font-bold bg-green-950/20">Flujo Requerido <br/><span className="text-[10px] text-green-500/50">(ton/h) @{targetCapacityDay}t/d</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { label: "Orgánicos", prc: 44, color: "text-lime-400" },
                { label: "Otros / Rechazo", prc: 25, color: "text-gray-400" },
                { label: "Plásticos", prc: 16, color: "text-emerald-400" },
                { label: "Papel/Cartón", prc: 11, color: "text-blue-400" },
                { label: "Vidrio", prc: 2, color: "text-orange-400" },
                { label: "Metales", prc: 2, color: "text-red-400" }
              ].map((frac, idx) => {
                const baseFlow = (45.00 * frac.prc) / 100;
                const reqFlow = baseFlow * scaleRatio;
                return (
                  <TableRow key={idx} className="border-gray-800/50 hover:bg-white/5 transition-colors group">
                    <TableCell className={`py-4 text-sm font-bold ${frac.color}`}>
                      {frac.label}
                    </TableCell>
                    <TableCell className="py-4 text-center text-gray-300 font-mono">
                      {frac.prc}%
                    </TableCell>
                    <TableCell className="py-4 text-right text-yellow-500/80 font-mono">
                      {baseFlow.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-4 text-right bg-green-950/10">
                      <span className="text-green-400 font-black font-mono">
                        {reqFlow.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-gray-800/50 hover:bg-transparent bg-gray-900/50">
                <TableCell className="py-4 text-sm font-black text-white">TOTAL</TableCell>
                <TableCell className="py-4 text-center font-black text-white font-mono">100%</TableCell>
                <TableCell className="py-4 text-right font-black text-yellow-500 font-mono">45.00</TableCell>
                <TableCell className="py-4 text-right font-black text-green-400 font-mono bg-green-950/20">{(45.00 * scaleRatio).toFixed(2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={infoModal !== null} onOpenChange={(open) => !open && setInfoModal(null)}>
        <AlertDialogContent className="bg-gray-900 border border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary text-xl flex items-center gap-2">
              <Info className="w-5 h-5" /> 
              {infoModal === 'base' && "Flujo Base (Diseño Original)"}
              {infoModal === 'teorico' && "Cálculo de Flujo Teórico"}
              {infoModal === 'lineas' && "Estimación de Líneas / Equipos"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 text-sm md:text-base leading-relaxed mt-4">
              {infoModal === 'base' && (
                <>
                  <p>Es la masa estática en toneladas métricas por hora (ton/h) dictada por los planos originales de un proyecto tipo de <strong>600 ton/día</strong>.</p>
                  <br />
                  <p>Sirve como unidad de medida universal para establecer proporciones y caídas de presión en cualquier otro tipo de terreno.</p>
                </  >
              )}
              {infoModal === 'teorico' && (
                <>
                  <p>Es la masa en tiempo real escalada a tu capacidad objetivo actual ({targetCapacityDay} t/d).</p>
                  <br />
                  <p className="font-mono bg-black p-2 rounded text-green-400 border border-green-900/50">
                    Flujo Base × Factor Escalador ({scaleRatio.toFixed(2)}x)
                  </p>
                  <br />
                  <p>El factor se obtiene dividiendo {targetCapacityDay} (tu meta) entre 600 (planta base). La matemática ajusta cada tramo proporcionalmente.</p>
                </>
              )}
              {infoModal === 'lineas' && (
                <>
                  <p>Determina la cantidad de infraestructura paralela (líneas o tramos duplicados) necesarios para procesar la nueva capacidad sin generar cuellos de botella.</p>
                  <br />
                  <p className="font-mono bg-black p-2 rounded text-cyan-400 border border-cyan-900/50">
                    Líneas Requeridas = Flujo Teórico ÷ 50 ton/h *
                  </p>
                  <br />
                  <p className="text-xs text-gray-400">* Se considera una capacidad límite térmica de ~50 toneladas/hora por criba/banda pesada. Cualquier sobrante obliga a abrir una línea extra completa (Math.ceil).</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="bg-primary hover:bg-primary/80 text-black font-bold border-none">
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default SimuladorSection;
