import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import EditableField from '@/components/EditableField';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';
import {
  Plus, Trash2, Copy, ArrowUp, ArrowDown, Edit, Upload, Loader2,
  FileDown as DownloadIcon, Settings, LayoutGrid, Save,
  ChevronRight, ChevronDown, FolderOpen, Box, Image as ImageIcon,
  FileText, Database, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/lib/customSupabaseClient';
import { getActiveBucket } from '@/lib/bucketResolver.js';
import { generateFichasTecnicasPDF } from '@/lib/pdfGenerator';

const defaultContentSingle = {
  tabTitle: 'Ficha Principal',
  icon: 'FileText',
  image: '',
  technicalDataTitle: 'Datos Técnicos',
  componentsTitle: 'Componentes',
  technical_data: [
    { id: 'produccion', icon: 'TrendingUp', label: 'Producción', unit: 'unidades', value: '200 - 300' },
    { id: 'ancho', icon: 'Scale', label: 'Ancho', unit: 'mm', value: '900' },
    { id: 'espesor', icon: 'Layers', label: 'Espesor', unit: 'mm', value: '6' },
    { id: 'potencia', icon: 'Power', label: 'Potencia', unit: 'KW', value: '30' },
    { id: 'dimensiones', icon: 'Maximize', label: 'Dimensiones', unit: 'M', value: '3.5 x 2.2 x 2' },
  ],
  components: [
    { id: 'motor', icon: 'Wrench', label: 'Motor Principal', value: 'SIEMENS' },
    { id: 'plc', icon: 'Server', label: 'PLC', value: 'SIEMENS' },
    { id: 'pantalla', icon: 'Zap', label: 'Pantalla Táctil', value: 'SIEMENS' },
    { id: 'bomba', icon: 'Wind', label: 'Bomba de Vacío', value: 'SIEMENS' },
    { id: 'neumaticos', icon: 'Zap', label: 'Componentes Neumáticos', value: 'FESTO' },
  ],
};

const FichaTecnicaSection = ({ sectionData, quotationData, isEditorMode, onContentChange, activeTab: externalActiveTab }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const fileInputRef = useRef(null);

  // Sync external active tab
  useEffect(() => {
    if (externalActiveTab !== undefined && externalActiveTab !== null) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Editor State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeSelection, setActiveSelection] = useState({ type: 'general', id: 'general' }); // type: 'general' | 'ficha' | 'category' | 'item'
  const [expandedFichas, setExpandedFichas] = useState({});
  const [localAdminMode, setLocalAdminMode] = useState(false);

  const isModeAdmin = isEditorMode || localAdminMode;

  const migratedContent = (() => {
    const originalContent = sectionData?.content;
    if (!originalContent) return [defaultContentSingle];
    if (Array.isArray(originalContent)) {
      return originalContent.length > 0 ? originalContent.map(tab => ({ ...defaultContentSingle, ...tab })) : [defaultContentSingle];
    }
    if (originalContent.technical_data || originalContent.components) {
      return [{ ...defaultContentSingle, ...originalContent }];
    }
    return [defaultContentSingle];
  })();

  const [content, setContent] = useState(migratedContent);
  const currentTabData = content[activeTab] || defaultContentSingle;

  useEffect(() => {
    if (sectionData?.content) {
      // Re-run migration logic if props change significantly, but usually we trust local state for editing
      // For now, we sync only if we are not editing to avoid overwriting work in progress?
      // Actually, we should sync if the DB updates.
      // But for now, let's keep the initial load logic.
    }
  }, [sectionData]);

  useEffect(() => {
    if (activeTab >= content.length) {
      setActiveTab(content.length > 0 ? content.length - 1 : 0);
    }
  }, [content, activeTab]);

  const updateAllContent = (newContent) => {
    setContent(newContent);
    if (onContentChange && isModeAdmin) {
      onContentChange(newContent);
    }
  };

  const updateCurrentTab = (newData) => {
    const newContent = [...content];
    newContent[activeTab] = newData;
    updateAllContent(newContent);
  };

  // --- Editor Handlers ---

  const handleAddFicha = () => {
    const mainTabTemplate = content[0] || defaultContentSingle;
    const newTechnicalData = mainTabTemplate.technical_data.map(item => ({ ...item, id: `tech_${Date.now()}_${Math.random()}` }));
    const newComponents = mainTabTemplate.components.map(item => ({ ...item, id: `comp_${Date.now()}_${Math.random()}` }));
    const newTab = { ...defaultContentSingle, tabTitle: `Nueva Ficha`, technical_data: newTechnicalData, components: newComponents, image: '' };
    const newContent = [...content, newTab];
    updateAllContent(newContent);
    setExpandedFichas(prev => ({ ...prev, [newContent.length - 1]: true }));
    setActiveSelection({ type: 'ficha', index: newContent.length - 1 });
    toast({ title: 'Nueva ficha creada' });
  };

  const handleDuplicateFicha = (index, e) => {
    e.stopPropagation();
    const tabToDuplicate = content[index];
    const newTab = JSON.parse(JSON.stringify(tabToDuplicate));
    newTab.tabTitle = `${newTab.tabTitle} (Copia)`;
    newTab.technical_data.forEach(item => item.id = `tech_dup_${Date.now()}_${Math.random()}`);
    newTab.components.forEach(item => item.id = `comp_dup_${Date.now()}_${Math.random()}`);
    const newContent = [...content];
    newContent.splice(index + 1, 0, newTab);
    updateAllContent(newContent);
    toast({ title: 'Ficha duplicada' });
  };

  const handleMoveFicha = (index, direction, e) => {
    e.stopPropagation();
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= content.length) return;
    const newContent = [...content];
    const [movedFicha] = newContent.splice(index, 1);
    newContent.splice(newIndex, 0, movedFicha);
    updateAllContent(newContent);
    // Update selection index if needed
    if (activeSelection.type === 'ficha' && activeSelection.index === index) {
      setActiveSelection({ ...activeSelection, index: newIndex });
    } else if (activeSelection.type === 'ficha' && activeSelection.index === newIndex) {
      setActiveSelection({ ...activeSelection, index: index });
    }
    // Update expanded state
    const newExpanded = { ...expandedFichas };
    newExpanded[newIndex] = expandedFichas[index];
    newExpanded[index] = expandedFichas[newIndex];
    setExpandedFichas(newExpanded);
  };



  const handleRemoveFicha = (index, e) => {
    e.stopPropagation();
    if (content.length <= 1) {
      toast({ title: 'Error', description: 'Debe haber al menos una ficha.', variant: 'destructive' });
      return;
    }
    const newContent = content.filter((_, i) => i !== index);
    updateAllContent(newContent);
    if (activeSelection.index === index) setActiveSelection({ type: 'general', id: 'general' });
    toast({ title: 'Ficha eliminada' });
  };

  const toggleFichaExpand = (index) => {
    setExpandedFichas(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddItem = (fichaIndex, category) => {
    const newItem = {
      id: `new_${Date.now()}`,
      icon: 'FileText',
      label: 'Nueva Característica',
      value: 'Valor',
      ...(category === 'technical_data' && { unit: 'unidad' }),
    };
    const newContent = [...content];
    newContent[fichaIndex][category] = [...(newContent[fichaIndex][category] || []), newItem];
    updateAllContent(newContent);
  };

  const handleUpdateItem = (fichaIndex, category, itemIndex, field, value) => {
    const newContent = [...content];
    newContent[fichaIndex][category][itemIndex] = {
      ...newContent[fichaIndex][category][itemIndex],
      [field]: value
    };
    updateAllContent(newContent);
  };

  const handleRemoveItem = (fichaIndex, category, itemIndex) => {
    const newContent = [...content];
    newContent[fichaIndex][category] = newContent[fichaIndex][category].filter((_, i) => i !== itemIndex);
    updateAllContent(newContent);
  };

  const handleMoveItem = (fichaIndex, category, itemIndex, direction) => {
    const newContent = [...content];
    const list = newContent[fichaIndex][category];
    const newIndex = itemIndex + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    const [movedItem] = list.splice(itemIndex, 1);
    list.splice(newIndex, 0, movedItem);
    updateAllContent(newContent);
  };

  const handleImageUpload = async (event, fichaIndex) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const fileName = `${Date.now()}_${sanitizedFileName}`;

    setIsUploading(true);
    toast({ title: 'Subiendo imagen...', description: 'Por favor espera.' }); // Immediate feedback

    try {
      const BUCKET = await getActiveBucket();
      const { error } = await supabase.storage.from(BUCKET).upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

      const newContent = [...content];
      newContent[fichaIndex].image = publicUrl;
      updateAllContent(newContent);
      toast({ title: 'Imagen subida con éxito!' });
    } catch (error) {
      console.error("Upload error:", error);
      if (error.message && error.message.includes("Bucket not found")) {
        toast({
          title: 'Error de Configuración',
          description: "No se encontró el bucket de almacenamiento 'quotation-files'. Por favor créalo en tu panel de Supabase como 'Public'.",
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } finally {
      setIsUploading(false);
      // Reset input value to allow uploading same file again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    toast({ title: 'Generando PDF...', description: 'Esto puede tardar unos segundos.' });
    try {
      await generateFichasTecnicasPDF(content, quotationData);
      toast({ title: '¡PDF generado!', description: 'La descarga comenzará en breve.' });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // --- Render Helpers for Editor ---

  const renderEditorSidebar = () => (
    <div className="w-80 md:w-96 shrink-0 border-r border-gray-800 flex flex-col bg-[#0f0f0f]">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fichas Técnicas</span>
        <Button size="sm" variant="ghost" onClick={handleAddFicha} className="h-7 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs">
          <Plus size={12} className="mr-1" /> Ficha
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {content.map((ficha, index) => {
            const TabIcon = iconMap[ficha.icon] || FileText;
            return (
              <div key={index} className="space-y-1 pt-2">
                <div
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer transition-all group",
                    activeSelection.type === 'ficha' && activeSelection.index === index ? "bg-blue-900/30 text-white border border-blue-500/30" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  )}
                  onClick={() => setActiveSelection({ type: 'ficha', index })}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFichaExpand(index); }}
                      className="p-0.5 hover:bg-gray-700 rounded"
                    >
                      {expandedFichas[index] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    <div onClick={(e) => e.stopPropagation()}>
                      <IconPicker
                        value={ficha.icon || 'FileText'}
                        onChange={(newIcon) => {
                          const newContent = [...content];
                          newContent[index].icon = newIcon;
                          updateAllContent(newContent);
                        }}
                        isEditorMode={true}
                      >
                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 hover:bg-gray-700 rounded-md">
                          <TabIcon size={16} className={cn(activeSelection.index === index ? "text-blue-400" : "text-gray-500")} />
                        </Button>
                      </IconPicker>
                    </div>

                    <span className="font-medium truncate text-sm">{ficha.tabTitle}</span>
                  </div>

                  <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white" onClick={(e) => handleMoveFicha(index, -1, e)} disabled={index === 0}>
                      <ArrowUp size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-500 hover:text-white" onClick={(e) => handleMoveFicha(index, 1, e)} disabled={index === content.length - 1}>
                      <ArrowDown size={12} />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><Settings size={12} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
                      <DropdownMenuItem onClick={(e) => handleDuplicateFicha(index, e)} className="text-white hover:bg-gray-800 cursor-pointer"><Copy className="w-4 h-4 mr-2" />Duplicar</DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleRemoveFicha(index, e)} className="text-red-400 hover:bg-red-900/30 cursor-pointer"><Trash2 className="w-4 h-4 mr-2" />Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {expandedFichas[index] && (
                  <div className="pl-6 space-y-0.5 border-l border-gray-800 ml-4">
                    <div
                      onClick={() => setActiveSelection({ type: 'category', index, category: 'technical_data' })}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-xs",
                        activeSelection.type === 'category' && activeSelection.index === index && activeSelection.category === 'technical_data' ? "bg-blue-900/20 text-blue-200 border border-blue-500/20" : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                      )}
                    >
                      <Database size={14} />
                      <span>Datos Técnicos</span>
                    </div>
                    <div
                      onClick={() => setActiveSelection({ type: 'category', index, category: 'components' })}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-xs",
                        activeSelection.type === 'category' && activeSelection.index === index && activeSelection.category === 'components' ? "bg-blue-900/20 text-blue-200 border border-blue-500/20" : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                      )}
                    >
                      <Cpu size={14} />
                      <span>Componentes</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  const renderEditorPanel = () => {
    if (activeSelection.type === 'general') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <LayoutGrid className="w-16 h-16 mb-4 opacity-20" />
          <p>Selecciona una ficha o categoría para editar</p>
        </div>
      );
    }

    const fichaIndex = activeSelection.index;
    const ficha = content[fichaIndex];
    if (!ficha) return null;

    if (activeSelection.type === 'ficha') {
      const CurrentIcon = iconMap[ficha.icon] || FileText;
      return (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="text-blue-500" /> Configuración de Ficha
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre de la Pestaña</Label>
                <div className="flex gap-2">
                  <IconPicker
                    value={ficha.icon || 'FileText'}
                    onChange={(newIcon) => {
                      const newContent = [...content];
                      newContent[fichaIndex].icon = newIcon;
                      updateAllContent(newContent);
                    }}
                    isEditorMode={true}
                  >
                    <Button variant="outline" size="icon" className="shrink-0 bg-gray-900 border-gray-700 hover:bg-gray-800">
                      <CurrentIcon className="w-4 h-4" />
                    </Button>
                  </IconPicker>
                  <Input
                    value={ficha.tabTitle}
                    onChange={(e) => {
                      const newContent = [...content];
                      newContent[fichaIndex].tabTitle = e.target.value;
                      updateAllContent(newContent);
                    }}
                    className="bg-gray-900 border-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="text-purple-500" /> Imagen del Equipo
            </h3>
            {ficha.image ? (
              <div className="relative group border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
                <img src={ficha.image} alt="Preview" className="max-h-64 mx-auto object-contain p-4" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const newContent = [...content];
                    newContent[fichaIndex].image = '';
                    updateAllContent(newContent);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:bg-gray-900/50 transition-colors">
                <Upload className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">Arrastra una imagen o haz clic para subir</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => handleImageUpload(e, fichaIndex)}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-4 h-4" />}
                  Subir Imagen
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeSelection.type === 'category') {
      const category = activeSelection.category;
      const items = ficha[category] || [];
      const titleKey = category === 'technical_data' ? 'technicalDataTitle' : 'componentsTitle';

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {category === 'technical_data' ? <Database className="text-green-500" /> : <Cpu className="text-orange-500" />}
              Editando: {category === 'technical_data' ? 'Datos Técnicos' : 'Componentes'}
            </h3>
            <Button size="sm" onClick={() => handleAddItem(fichaIndex, category)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Agregar Item
            </Button>
          </div>

          <div className="space-y-2 mb-6">
            <Label>Título de la Sección</Label>
            <Input
              value={ficha[titleKey]}
              onChange={(e) => {
                const newContent = [...content];
                newContent[fichaIndex][titleKey] = e.target.value;
                updateAllContent(newContent);
              }}
              className="bg-gray-900 border-gray-700"
            />
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const Icon = iconMap[item.icon] || FileText;
              return (
                <div key={item.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 flex gap-4 items-start group hover:border-gray-700 transition-colors">
                  <div className="shrink-0 pt-1">
                    <IconPicker value={item.icon} onChange={(newIcon) => handleUpdateItem(fichaIndex, category, idx, 'icon', newIcon)} isEditorMode={true}>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-gray-800 hover:bg-gray-700 text-blue-400">
                        <Icon className="w-5 h-5" />
                      </Button>
                    </IconPicker>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Etiqueta</Label>
                      <Input
                        value={item.label}
                        onChange={(e) => handleUpdateItem(fichaIndex, category, idx, 'label', e.target.value)}
                        className="h-8 bg-black/20 border-gray-700"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Valor</Label>
                      <Input
                        value={item.value}
                        onChange={(e) => handleUpdateItem(fichaIndex, category, idx, 'value', e.target.value)}
                        className="h-8 bg-black/20 border-gray-700 font-mono text-blue-300"
                      />
                    </div>
                    {category === 'technical_data' && (
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs text-gray-500">Unidad</Label>
                        <Input
                          value={item.unit || ''}
                          onChange={(e) => handleUpdateItem(fichaIndex, category, idx, 'unit', e.target.value)}
                          className="h-8 bg-black/20 border-gray-700 w-full"
                          placeholder="Ej: mm, KW, kg/h"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white" onClick={() => handleMoveItem(fichaIndex, category, idx, -1)} disabled={idx === 0}><ArrowUp className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white" onClick={() => handleMoveItem(fichaIndex, category, idx, 1)} disabled={idx === items.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-900/20 hover:text-red-400" onClick={() => handleRemoveItem(fichaIndex, category, idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-600 border border-dashed border-gray-800 rounded-lg">
                No hay items en esta sección.
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  // --- Public Render ---

  const renderList = (category, titleKey, defaultTitle) => (
    <motion.div
      initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}
      className="rounded-2xl border backdrop-blur-sm transition-colors duration-300 bg-gray-900/50 border-gray-800 p-6 sm:p-8"
    >
      <h2 className="font-bold text-primary mb-6 text-2xl sm:text-3xl">
        {(() => {
          const rawTitle = currentTabData[titleKey] || defaultTitle;
          // Check against Spanish defaults to enable dynamic translation
          if (rawTitle === 'Datos Técnicos') return t('sections.fichaDetails.datosTecnicos');
          if (rawTitle === 'Componentes') return t('sections.fichaDetails.componentes');
          return rawTitle;
        })()}
      </h2>

      <div className="space-y-4">
        <AnimatePresence>
          {currentTabData[category] && currentTabData[category].map((item) => {
            const Icon = iconMap[item.icon] || FileText;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-lg gap-4 transition-all p-3 bg-black/30 border border-transparent"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#2563eb]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base sm:text-lg text-[#2563eb]">
                      {item.label}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col gap-1 min-w-[8rem] max-w-[14rem]">
                    <div className="text-center break-words font-bold text-lg sm:text-xl text-white">
                      {item.value}
                    </div>
                    {item.unit && (
                      <div className="text-center text-xs sm:text-sm text-gray-400">
                        {item.unit}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <div className="py-16 sm:py-24 bg-gradient-to-b from-black to-gray-900/50 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 sm:mb-12">
          <div className="flex-1">
            <SectionHeader sectionData={sectionData} />
          </div>
          <div className="flex gap-2 ml-4">
            {isModeAdmin && (
              <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-blue-900/50 bg-blue-900/10 text-blue-400 hover:bg-blue-900/30 hover:text-blue-300">
                    <Edit className="w-4 h-4 mr-2" /> Editar Fichas
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[1200px] w-full h-[85vh] flex flex-col bg-black border-gray-800 text-white p-0 gap-0 overflow-hidden">
                  <DialogHeader className="shrink-0 p-4 border-b border-gray-800 bg-[#0a0a0a] flex flex-row items-center justify-between">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <LayoutGrid className="w-5 h-5 text-blue-500" />
                      Editor de Fichas Técnicas
                      {isModeAdmin && (
                        <span className="text-xs font-normal text-gray-500 ml-2 border border-gray-700 rounded px-2 py-0.5">
                          Editando: {quotationData.project}
                        </span>
                      )}
                    </DialogTitle>
                    <div className="flex gap-2 mr-8">
                      <Button
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-8 text-xs"
                        onClick={() => {
                          updateAllContent(content);
                          toast({ title: "Guardado", description: "Cambios guardados correctamente." });
                        }}
                      >
                        <Save size={14} className="mr-2" /> Guardar Todo
                      </Button>
                    </div>
                  </DialogHeader>
                  <div className="flex-1 flex flex-row overflow-hidden">
                    {renderEditorSidebar()}
                    <div className="flex-1 bg-black flex flex-col h-full overflow-hidden">
                      <ScrollArea className="flex-1">
                        <div className="p-8 max-w-3xl mx-auto w-full">
                          {renderEditorPanel()}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DownloadIcon className="w-4 h-4 mr-2" />}
              {isGeneratingPDF ? 'Generando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        <div className="mt-12">
          {/* Tabs Navigation */}
          <div className="flex items-center border-b border-gray-700 mb-8 overflow-x-auto scrollbar-hide">
            {content.map((tab, index) => {
              const TabIcon = iconMap[tab.icon] || FileText;
              return (
                <div
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={cn(
                    "relative group cursor-pointer px-1 transition-all",
                    activeTab === index ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  )}
                >
                  <div className={cn(
                    "px-6 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all flex items-center justify-center min-w-[120px] gap-2",
                    activeTab === index
                      ? 'bg-primary/10 text-[#2563eb] border-b-2 border-[#2563eb] shadow-[0_4px_10px_-4px_rgba(37,99,235,0.5)]'
                      : 'bg-transparent text-gray-400 hover:bg-white/5 hover:text-[#2563eb] hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]'
                  )}>
                    <TabIcon size={16} />
                    {tab.tabTitle}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {renderList('technical_data', 'technicalDataTitle', t('sections.fichaDetails.datosTecnicos'))}
                {renderList('components', 'componentsTitle', t('sections.fichaDetails.componentes'))}
              </div>

              <div className="mt-12">
                {currentTabData.image && (
                  <div className="relative group w-full max-w-3xl mx-auto">
                    <img src={currentTabData.image} alt={`Imagen de ${currentTabData.tabTitle}`} className="rounded-lg shadow-2xl object-contain mx-auto max-h-[500px]" />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default FichaTecnicaSection;