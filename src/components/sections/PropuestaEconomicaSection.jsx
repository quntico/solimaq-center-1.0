import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  Save,
  FileText,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronRight,
  Settings,
  Box,
  FolderOpen,
  LayoutGrid,
  Lock,
  Unlock,
  Zap,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// --- Helper Functions ---
const formatCurrency = (value, currency = 'USD') => {
  const num = parseFloat(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(num);
};

const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

const DEFAULT_CONTENT = {
  pageTitle: 'PROPUESTA',
  pageTitleHighlight: 'ECONÓMICA',
  pageDescription: 'Aquí puedes ver el desglose de la inversión. Marca o desmarca los componentes para ajustar el costo total.',
  groups: [
    {
      id: 'group-general',
      title: 'General',
      items: [
        {
          id: 'item-1',
          title: 'LÍNEA DE BARRAS DE CEREAL',
          subtitle: 'LCB 300',
          price: 120760,
          kw: 45,
          icon: 'Box',
          isActive: true
        },
        {
          id: 'item-2',
          title: 'EMPAQUETADO PCT80',
          subtitle: 'EMPAQUE PRIMARIO',
          price: 64900,
          kw: 12,
          icon: 'Package',
          isActive: true
        }
      ]
    }
  ],
  currency: 'USD',
  taxRate: 16,
  exchangeRate: 18.50
};

// --- Item Editor Component (Local State) ---
const ItemEditorPanel = ({ item, group, onUpdate, onDelete, currency }) => {
  const { toast } = useToast();

  // Local state to allow free typing without parent re-render interference
  const [localPrice, setLocalPrice] = useState(item.price);
  const [localKw, setLocalKw] = useState(item.kw);
  const [localTitle, setLocalTitle] = useState(item.title);
  const [localSubtitle, setLocalSubtitle] = useState(item.subtitle);
  const [localIsActive, setLocalIsActive] = useState(item.isActive);

  // Sync local state when the selected item changes
  useEffect(() => {
    setLocalPrice(item.price);
    setLocalKw(item.kw);
    setLocalTitle(item.title);
    setLocalSubtitle(item.subtitle);
    setLocalIsActive(item.isActive);
  }, [item.id]);

  // Handlers that update local state AND parent
  const handlePriceChange = (val) => {
    setLocalPrice(val);
    onUpdate(group.id, item.id, 'price', val);
  };

  const handleKwChange = (val) => {
    setLocalKw(val);
    onUpdate(group.id, item.id, 'kw', val);
  };

  const handleTitleChange = (val) => {
    setLocalTitle(val);
    onUpdate(group.id, item.id, 'title', val);
  };

  const handleSubtitleChange = (val) => {
    setLocalSubtitle(val);
    onUpdate(group.id, item.id, 'subtitle', val);
  };

  const handleIsActiveChange = (val) => {
    setLocalIsActive(val);
    onUpdate(group.id, item.id, 'isActive', val);
  };

  const handleSave = () => {
    toast({
      title: "Cambios guardados",
      description: "La información del ítem ha sido actualizada.",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
        <div className="flex items-center gap-2">
          <Box className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-white">Editar Item</h2>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(group.id, item.id)}
        >
          <Trash2 className="w-4 h-4 mr-2" /> Eliminar Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 space-y-2">
            <Label className="text-gray-400">Icono</Label>
            <IconPicker
              value={item.icon}
              onChange={(val) => onUpdate(group.id, item.id, 'icon', val)}
              isEditorMode={true}
            >
              <div className="w-full aspect-square rounded-lg border border-gray-800 bg-gray-950 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-900 transition-all">
                {React.createElement(iconMap[item.icon] || iconMap.Box, { size: 32, className: "text-blue-500" })}
              </div>
            </IconPicker>
          </div>
          <div className="col-span-3 space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Título</Label>
              <Input
                value={localTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Subtítulo</Label>
              <Input
                value={localSubtitle}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-gray-400">Precio ({currency})</Label>
            <Input
              type="text" // Keep as text to allow decimals
              value={localPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors font-mono text-blue-400 text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Potencia (KW)</Label>
            <Input
              type="text" // Keep as text to allow decimals
              value={localKw}
              onChange={(e) => handleKwChange(e.target.value)}
              className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-900/30 p-4 rounded-lg border border-gray-800">
          <div className="space-y-1">
            <Label className="text-gray-200">Estado Activo</Label>
            <p className="text-xs text-gray-500">Determina si este item se incluye en el cálculo total.</p>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={localIsActive}
              onCheckedChange={handleIsActiveChange}
              className="data-[state=checked]:bg-blue-500 scale-75"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" /> Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

const PropuestaEconomicaSection = ({
  sectionData = {},
  isEditorMode = false,
  onContentChange,
  quotationData
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [activeSelection, setActiveSelection] = useState({ type: 'general', id: 'general' });
  const [localAdminMode, setLocalAdminMode] = useState(false);

  const isModeAdmin = isEditorMode || localAdminMode;

  // Initialize state with defaults + props
  const [content, setContent] = useState(() => ({
    ...DEFAULT_CONTENT,
    ...(sectionData.content || {}),
    exchangeRate: sectionData.content?.exchangeRate ?? DEFAULT_CONTENT.exchangeRate
  }));

  // Sync state when props change (external updates)
  // Sync state when props change (external updates)
  useEffect(() => {
    if (sectionData.content && sectionData.content.groups && sectionData.content.groups.length > 0) {
      // If we have saved groups, use them directly and DO NOT merge with defaults for groups
      // This prevents deleted items from reappearing if they exist in defaults
      setContent(prev => ({
        ...prev,
        ...sectionData.content
      }));
    } else {
      // Only fall back to defaults if no saved content exists
      setContent(prev => ({
        ...prev,
        ...DEFAULT_CONTENT,
        ...(sectionData.content || {}),
        exchangeRate: sectionData.content?.exchangeRate ?? DEFAULT_CONTENT.exchangeRate
      }));
    }
  }, [sectionData.content]);

  const activeItems = content.groups.flatMap(g => g.items).filter(i => i.isActive);
  const subtotal = activeItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  const totalKW = activeItems.reduce((sum, item) => sum + (parseFloat(item.kw) || 0), 0);
  const totalTax = subtotal * (content.taxRate / 100);
  const totalUSD = subtotal + totalTax;
  const totalMXN = totalUSD * (parseFloat(content.exchangeRate) || 1);

  const updateContent = (newContent) => {
    // Optimistic update
    setContent(newContent);

    // Propagate to parent ONLY if in editor mode (prevents DB writes for public users)
    // Use isModeAdmin to allow saving even if only local admin mode is active
    if (onContentChange && isModeAdmin) {
      onContentChange(newContent);
    }
  };

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    const newGroups = [...content.groups];

    const sourceGroupIndex = newGroups.findIndex(g => g.id === source.droppableId);
    const destGroupIndex = newGroups.findIndex(g => g.id === destination.droppableId);
    if (sourceGroupIndex === -1 || destGroupIndex === -1) return;

    const sourceGroup = { ...newGroups[sourceGroupIndex] };
    const destGroup = { ...newGroups[destGroupIndex] };

    // Create new items arrays to avoid mutating state/defaults
    sourceGroup.items = [...sourceGroup.items];
    destGroup.items = [...destGroup.items];

    const [movedItem] = sourceGroup.items.splice(source.index, 1);
    destGroup.items.splice(destination.index, 0, movedItem);

    newGroups[sourceGroupIndex] = sourceGroup;
    newGroups[destGroupIndex] = destGroup;

    updateContent({ ...content, groups: newGroups });
  };

  const handleItemChange = (groupId, itemId, field, value) => {
    const newGroups = content.groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map(item => {
          if (item.id !== itemId) return item;
          return { ...item, [field]: value };
        })
      };
    });
    updateContent({ ...content, groups: newGroups });
  };

  const handleGroupTitleChange = (groupId, newTitle) => {
    const newGroups = content.groups.map(g => g.id === groupId ? { ...g, title: newTitle } : g);
    updateContent({ ...content, groups: newGroups });
  };

  const handleAddGroup = () => {
    const newGroupId = `group-${Date.now()}`;
    const newGroups = [...content.groups, {
      id: newGroupId,
      title: 'NUEVO GRUPO',
      items: []
    }];
    updateContent({ ...content, groups: newGroups });
    setExpandedGroups(prev => ({ ...prev, [newGroupId]: true }));
    setActiveSelection({ type: 'group', id: newGroupId });
  };

  const handleDeleteGroup = (groupId) => {
    const newGroups = content.groups.filter(g => g.id !== groupId);
    updateContent({ ...content, groups: newGroups });
    if (activeSelection.id === groupId) {
      setActiveSelection({ type: 'general', id: 'general' });
    }
  };

  const handleAddItem = (groupId) => {
    const newItemId = `item-${Date.now()}`;
    const newGroups = content.groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: [
          ...group.items,
          {
            id: newItemId,
            title: 'NUEVO ITEM',
            subtitle: 'Descripción técnica',
            price: 0,
            kw: 0,
            icon: 'Box',
            isActive: true
          }
        ]
      };
    });
    updateContent({ ...content, groups: newGroups });
    setExpandedGroups(prev => ({ ...prev, [groupId]: true }));
    setActiveSelection({ type: 'item', id: newItemId, groupId });
  };

  const handleDeleteItem = (groupId, itemId) => {
    const newGroups = content.groups.map(group => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.filter(item => item.id !== itemId)
      };
    });
    updateContent({ ...content, groups: newGroups });
    if (activeSelection.id === itemId) {
      setActiveSelection({ type: 'group', id: groupId });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(content, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `propuesta_economica_${Date.now()}.json`;
    link.click();
    toast({ title: "Exportado", description: "Archivo JSON descargado." });
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        updateContent({ ...content, ...parsed });
        toast({ title: "Importado", description: "Datos cargados correctamente." });
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Archivo inválido" });
      }
    };
    reader.readAsText(file);
  };

  const generatePDF = async () => {
    const doc = new jsPDF();

    // Helper to add footer to all pages
    const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('www.smq.mx', 105, 290, { align: 'center' });
      }
    };

    // Header Background
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 32, 'F');

    // Logo
    try {
      const logoUrl = '/smq-logo.png';
      const logoImg = await new Promise((resolve, reject) => {
        const img = new Image();
        img.src = logoUrl;
        img.onload = () => resolve(img);
        img.onerror = reject;
      });

      const logoWidth = 40;
      const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
      doc.addImage(logoImg, 'PNG', 14, (32 - logoHeight) / 2, logoWidth, logoHeight);
    } catch (error) {
      console.error("Error loading logo for PDF", error);
    }

    // Title (Right Aligned)
    doc.setTextColor(59, 130, 246); // Blue color
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const titleFull = `${content.pageTitle || 'PROPUESTA'} ${content.pageTitleHighlight || 'ECONÓMICA'}`;
    doc.text(titleFull, 196, 22, { align: 'right' });

    let y = 50;
    const margin = 14;

    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('sections.propuestaDetails.cliente')}: ${quotationData?.client || 'N/A'}`, margin, y);
    y += 6;
    doc.text(`${t('sections.propuestaDetails.proyecto')}: ${quotationData?.project || 'N/A'}`, margin, y);
    y += 6;
    const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`${t('sections.propuestaDetails.fecha')}: ${dateStr}`, margin, y);
    y += 15;

    const tableBody = activeItems.map((item, index) => [
      `${index + 1}. ${item.title}\n${item.subtitle}`,
      `${item.kw} KW`,
      formatCurrency(item.price, content.currency)
    ]);

    doc.autoTable({
      startY: y,
      head: [[t('sections.propuestaDetails.desc'), t('sections.propuestaDetails.potencia'), t('sections.propuestaDetails.importe')]],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { cellPadding: 4, fontSize: 10 },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { top: 50 }
    });

    // Totals Section
    y = doc.lastAutoTable.finalY + 10;

    // Check if we need a new page for totals
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Totals Box Container
    const boxWidth = 90;
    const boxX = 210 - 14 - boxWidth; // Right aligned with margin
    const boxPadding = 6;
    const lineHeight = 7;

    // Calculate box height
    const boxHeight = 65;

    // Draw Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(boxX, y, boxWidth, boxHeight, 3, 3, 'FD');

    let currentY = y + 10;
    const labelX = boxX + 5;
    const valueX = boxX + boxWidth - 5;

    // Potencia
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('sections.propuestaDetails.potenciaTotal')}:`, labelX, currentY);
    doc.text(`${totalKW.toFixed(2)} KW`, valueX, currentY, { align: 'right' });
    currentY += lineHeight;

    // Subtotal
    doc.text(`${t('sections.propuestaDetails.subtotal')}:`, labelX, currentY);
    doc.text(formatCurrency(subtotal, content.currency), valueX, currentY, { align: 'right' });
    currentY += lineHeight;

    // IVA
    doc.text(`${t('sections.propuestaDetails.iva')} (${content.taxRate}%):`, labelX, currentY);
    doc.text(formatCurrency(totalTax, content.currency), valueX, currentY, { align: 'right' });
    currentY += lineHeight + 2;

    // Total USD
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('sections.propuestaDetails.total')} (${content.currency}):`, labelX, currentY);
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(formatCurrency(totalUSD, content.currency), valueX, currentY, { align: 'right' });
    currentY += lineHeight + 4;

    // Exchange Rate
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('sections.propuestaDetails.tipoCambio')}:`, labelX, currentY);
    doc.text(`$${content.exchangeRate} MXN`, valueX, currentY, { align: 'right' });
    currentY += lineHeight;

    // Total MXN
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('sections.propuestaDetails.total')} (MXN):`, labelX, currentY);
    doc.text(formatCurrency(totalMXN, 'MXN'), valueX, currentY, { align: 'right' });

    // Add Footer to all pages
    addFooter();

    doc.save('propuesta_economica_completa.pdf');
    toast({ title: "PDF Generado", description: "Incluye desglose, KW y conversión a pesos." });
  };

  const toggleAdminMode = () => {
    setLocalAdminMode(prev => !prev);
    toast({
      title: !localAdminMode ? "Modo Admin Activado" : "Modo Admin Desactivado",
      description: !localAdminMode ? "Ahora puedes editar el contenido y la estructura." : "Estás en modo visualización.",
      variant: !localAdminMode ? "default" : "secondary"
    });
  };

  const renderRightPanelContent = () => {
    if (activeSelection.type === 'general') {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-4 mb-6">
            <Settings className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white">Configuración General</h2>
          </div>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-gray-400">Título Principal</Label>
              <Input
                value={content.pageTitle || ''}
                onChange={(e) => updateContent({ ...content, pageTitle: e.target.value })}
                className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Título Destacado (Azul)</Label>
              <Input
                value={content.pageTitleHighlight || ''}
                onChange={(e) => updateContent({ ...content, pageTitleHighlight: e.target.value })}
                className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400">Descripción de la Página</Label>
              <Input
                value={content.pageDescription || ''}
                onChange={(e) => updateContent({ ...content, pageDescription: e.target.value })}
                className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400">Moneda</Label>
                <Input
                  value={content.currency || 'USD'}
                  onChange={(e) => updateContent({ ...content, currency: e.target.value })}
                  className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Impuesto (%)</Label>
                <Input
                  type="number"
                  value={content.taxRate || 0}
                  onChange={(e) => updateContent({ ...content, taxRate: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="space-y-2">
                <Label className="text-blue-400 font-bold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Tipo de Cambio (USD a MXN)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={content.exchangeRate}
                  onChange={(e) => updateContent({ ...content, exchangeRate: parseFloat(e.target.value) || 0 })}
                  className="bg-black border-blue-500/50 focus:border-blue-400 text-white font-mono text-lg"
                />
                <p className="text-xs text-gray-500">
                  Se utilizará para calcular el estimado en moneda nacional en la propuesta.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSelection.type === 'group') {
      const group = content.groups.find(g => g.id === activeSelection.id);
      if (!group) return <div className="text-gray-500 p-4">Grupo no encontrado</div>;

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-white">Editar Grupo</h2>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteGroup(group.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Eliminar Grupo
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-400">Nombre del Grupo</Label>
            <Input
              value={group.title}
              onChange={(e) => handleGroupTitleChange(group.id, e.target.value)}
              className="bg-gray-950 border-gray-800 focus:border-blue-500 transition-colors text-lg font-semibold"
            />
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-800 mt-6">
            <h4 className="text-sm font-medium text-gray-400 mb-2">Resumen del Grupo</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Items: <span className="text-white">{group.items.length}</span></div>
              <div>Total: <span className="text-blue-400">{formatCurrency(group.items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0), content.currency)}</span></div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSelection.type === 'item') {
      const group = content.groups.find(g => g.id === activeSelection.groupId);
      const item = group?.items.find(i => i.id === activeSelection.id);

      if (!item || !group) return <div className="text-gray-500 p-4">Item no encontrado</div>;

      return (
        <ItemEditorPanel
          item={item}
          group={group}
          onUpdate={handleItemChange}
          onDelete={handleDeleteItem}
          currency={content.currency}
        />
      );
    }

    return <div className="flex items-center justify-center h-full text-gray-500">Selecciona un elemento para editar</div>;
  };

  return (
    <div className="w-full bg-black text-white min-h-screen p-6 sm:p-12 font-sans relative">
      <div className="absolute top-6 right-6 z-50 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAdminMode}
          className={cn(
            "border-gray-800 transition-all gap-2",
            localAdminMode ? "bg-blue-900/20 text-blue-400 border-blue-500/50 hover:bg-blue-900/40" : "bg-black text-gray-500 hover:text-white"
          )}
        >
          {localAdminMode ? <Unlock size={14} /> : <Lock size={14} />}
          {localAdminMode ? "Admin Activo" : "Admin"}
        </Button>
      </div>

      <div className="text-center mb-12 pt-8">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 uppercase">
          {(() => {
            const rawTitle = content.pageTitle || 'PROPUESTA';
            return rawTitle === 'PROPUESTA' ? t('sections.propuestaDetails.titulo') : rawTitle;
          })()} <span className="text-blue-500">{(() => {
            const rawTitleH = content.pageTitleHighlight || 'ECONÓMICA';
            return rawTitleH === 'ECONÓMICA' ? t('sections.propuestaDetails.tituloDestacado') : rawTitleH;
          })()}</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          {(() => {
            const rawDesc = content.pageDescription || 'Aquí puedes ver el desglose de la inversión. Marca o desmarca los componentes para ajustar el costo total.';
            const defaultDesc = 'Aquí puedes ver el desglose de la inversión. Marca o desmarca los componentes para ajustar el costo total.';
            return rawDesc === defaultDesc ? t('sections.propuestaDetails.descripcion') : rawDesc;
          })()}
        </p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">
            {content.groups.map((group) => {
              const groupTotal = group.items.filter(i => i.isActive).reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

              return (
                <div key={group.id} className="bg-[#111] rounded-xl border border-gray-800 overflow-hidden">
                  <div className="bg-[#1a1a1a] px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">{group.title}</h3>
                      <div className="text-sm text-blue-500 font-medium mt-1">
                        {t('sections.propuestaDetails.totalGrupo')}: {formatCurrency(groupTotal, content.currency)}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <StrictModeDroppable droppableId={group.id}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {group.items.map((item, index) => {
                            const Icon = iconMap[item.icon] || iconMap.Box;
                            return (
                              <Draggable
                                key={item.id}
                                draggableId={item.id}
                                index={index}
                                isDragDisabled={!isModeAdmin}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "relative flex flex-col justify-between bg-[#0a0a0a] p-5 rounded-lg border transition-all duration-200 h-full select-none",
                                      item.isActive ? "border-gray-700 hover:border-blue-500/50" : "border-gray-800 opacity-60",
                                      snapshot.isDragging && "border-blue-500 shadow-lg z-50",
                                      !isModeAdmin && "cursor-default"
                                    )}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-10 h-10 rounded-md flex items-center justify-center border",
                                          item.isActive ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-gray-800 border-gray-700 text-gray-500"
                                        )}>
                                          <Icon size={20} />
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-blue-500 font-bold text-sm">{index + 1}.</span>
                                            <span className={cn("font-bold text-sm uppercase transition-all border-b-2", item.isActive ? "border-yellow-500" : "border-transparent")}>{item.title}</span>
                                          </div>
                                          <p className="text-gray-400 text-xs">{item.subtitle}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between">
                                      <div className="font-mono font-bold text-white">
                                        {formatCurrency(item.price, content.currency)}
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center text-yellow-500 gap-1 bg-yellow-900/20 px-2 py-1 rounded border border-yellow-500/20">
                                          <Zap size={10} />
                                          <span className="text-[10px] font-mono">{item.kw} KW</span>
                                        </div>

                                        <div onClick={(e) => e.stopPropagation()}>
                                          <Switch
                                            checked={item.isActive}
                                            onCheckedChange={(val) => handleItemChange(group.id, item.id, 'isActive', val)}
                                            className="data-[state=checked]:bg-blue-500 scale-75"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </StrictModeDroppable>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-[#111] rounded-2xl border border-gray-800 p-6 shadow-2xl shadow-black/50">
                <h3 className="text-xl font-bold text-white mb-6">Resumen de Inversión</h3>

                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">{formatCurrency(subtotal, content.currency)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <div className="flex items-center gap-1">
                      <span>I.V.A ({content.taxRate}%):</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(totalTax, content.currency)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-6 mb-6 space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-blue-500 font-bold text-xl uppercase">TOTAL {content.currency}:</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-blue-500">
                        {formatCurrency(totalUSD, content.currency)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase text-right">
                    PRECIOS MÁS {content.taxRate}% DE I.V.A
                  </p>
                </div>

                <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-lg p-3 mb-4 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-yellow-500">
                    <Zap size={16} />
                    <span className="text-xs font-bold uppercase tracking-wide">Potencia Instalada Total</span>
                  </div>
                  <span className="font-mono text-white font-bold text-lg">{totalKW.toFixed(2)} KW</span>
                </div>

                <div className="bg-gray-900 rounded-lg p-3 mb-6 border border-gray-800">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>T.C. Estimado</span>
                    <span>${content.exchangeRate} MXN</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-gray-300 font-bold text-sm uppercase">Total (MXN):</span>
                    <span className="font-mono text-white font-bold text-xl">{formatCurrency(totalMXN, 'MXN')}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                    onClick={() => {
                      updateContent(content);
                      toast({ title: "Guardado", description: "Selección almacenada correctamente." });
                    }}
                  >
                    <Save size={18} className="mr-2" /> Guardar Selección
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-700 text-white hover:bg-gray-800"
                    onClick={generatePDF}
                  >
                    <FileText size={18} className="mr-2" /> Generar Cotización PDF
                  </Button>

                  {isModeAdmin && (
                    <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full border-blue-900/50 bg-blue-900/10 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-all"
                        >
                          <Edit size={18} className="mr-2" /> Editar Estructura y Precios
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[1200px] w-full h-[85vh] flex flex-col bg-black border-gray-800 text-white p-0 gap-0 overflow-hidden">
                        <DialogHeader className="shrink-0 p-4 border-b border-gray-800 bg-[#0a0a0a] flex flex-row items-center justify-between">
                          <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5 text-blue-500" />
                            Editor de Propuesta
                          </DialogTitle>
                          <div className="flex gap-2 mr-8">
                            <input id="import-json" type="file" className="hidden" accept=".json" onChange={handleImport} />
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-white h-7" onClick={() => document.getElementById('import-json').click()}>
                              <Upload size={12} className="mr-1" /> Importar
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-gray-500 hover:text-white h-7" onClick={handleExport}>
                              <Download size={12} className="mr-1" /> Exportar
                            </Button>
                          </div>
                        </DialogHeader>

                        <div className="flex-1 flex flex-row overflow-hidden">

                          <div className="w-80 md:w-96 shrink-0 border-r border-gray-800 flex flex-col bg-[#0f0f0f]">
                            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estructura</span>
                              <Button size="sm" variant="ghost" onClick={handleAddGroup} className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs">
                                <Plus size={12} className="mr-1" /> Grupo
                              </Button>
                            </div>

                            <ScrollArea className="flex-1">
                              <div className="p-2 space-y-1">
                                <div
                                  onClick={() => setActiveSelection({ type: 'general', id: 'general' })}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all text-sm",
                                    activeSelection.type === 'general' ? "bg-blue-900/30 text-white border border-blue-500/30" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                  )}
                                >
                                  <Settings size={16} />
                                  <span className="font-medium">Configuración General</span>
                                </div>

                                {content.groups.map((group) => (
                                  <div key={group.id} className="space-y-1 pt-2">
                                    <div
                                      className={cn(
                                        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-all group",
                                        activeSelection.type === 'group' && activeSelection.id === group.id ? "bg-blue-900/30 text-white border border-blue-500/30" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                                      )}
                                      onClick={() => setActiveSelection({ type: 'group', id: group.id })}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleGroupExpand(group.id); }}
                                          className="p-0.5 hover:bg-gray-700 rounded"
                                        >
                                          {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <FolderOpen size={16} className={cn(activeSelection.id === group.id ? "text-blue-400" : "text-gray-500")} />
                                        <span className="font-medium truncate text-sm">{group.title}</span>
                                      </div>
                                    </div>

                                    {expandedGroups[group.id] && (
                                      <div className="pl-6 space-y-0.5 border-l border-gray-800 ml-4">
                                        {group.items.map((item) => (
                                          <div
                                            key={item.id}
                                            onClick={() => setActiveSelection({ type: 'item', id: item.id, groupId: group.id })}
                                            className={cn(
                                              "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-xs",
                                              activeSelection.type === 'item' && activeSelection.id === item.id ? "bg-blue-900/20 text-blue-200 border border-blue-500/20" : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                                            )}
                                          >
                                            <Box size={14} />
                                            <span className="truncate">{item.title}</span>
                                          </div>
                                        ))}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-start text-xs text-gray-600 hover:text-blue-400 h-7 pl-2"
                                          onClick={() => handleAddItem(group.id)}
                                        >
                                          <Plus size={12} className="mr-2" /> Item
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>

                          <div className="flex-1 bg-black flex flex-col h-full overflow-hidden">
                            <ScrollArea className="flex-1">
                              <div className="p-8 max-w-3xl mx-auto">
                                {renderRightPanelContent()}
                              </div>
                            </ScrollArea>
                          </div>

                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default PropuestaEconomicaSection;