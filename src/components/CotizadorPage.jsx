import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Save, Eraser, Loader2, Calculator, TrendingUp, PlusCircle, Trash2, PackagePlus, FileDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { generateCotizadorPDF } from '@/lib/pdfGenerator';
import CalculationInput from '@/components/CalculationInput';
import MachineFactorCard from '@/components/MachineFactorCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, EyeOff } from 'lucide-react';

const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number' || isNaN(value)) return currency === 'USD' ? '$0.00' : '$0.00 MXN';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(value);
};

const defaultCostConfig = {
  costo_maquina: 0,
  incoterm: 'FOB',
  costo_terrestre_china: 0,
  maritimo: 0,
  impuestos_percent: 20,
  terrestre_nacional: 0,
  instalacion: 0,
  tipo_cambio: 18.5,
  optionals: [],
  utilidad: { type: 'percent', value: 20 },
  comision: { type: 'percent', value: 0 },
};

const CotizadorPage = ({ quotationData, activeTheme, setThemes }) => {
  const [costConfig, setCostConfig] = useState(defaultCostConfig);
  const [displayConfig, setDisplayConfig] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState('cost');
  const { toast } = useToast();

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'cost' ? 'price' : 'cost');
  };

  useEffect(() => {
    let initialConfig;
    if (quotationData && quotationData.cost_config) {
      const optionalsWithState = (quotationData.cost_config.optionals || []).map(opt => ({
        ...opt,
        isEnabled: opt.isEnabled !== undefined ? opt.isEnabled : true, // Default to true if not set
        factor: opt.factor !== undefined ? opt.factor : 1.6, // Default factor
      }));

      initialConfig = {
        ...defaultCostConfig,
        ...quotationData.cost_config,
        optionals: optionalsWithState,
        utilidad: quotationData.cost_config.utilidad || defaultCostConfig.utilidad,
        comision: quotationData.cost_config.comision || defaultCostConfig.comision,
      };
    } else {
      initialConfig = defaultCostConfig;
    }
    setCostConfig(initialConfig);

    const initialDisplay = {};
    Object.keys(initialConfig).forEach(key => {
      if (typeof initialConfig[key] !== 'object') {
        initialDisplay[key] = String(initialConfig[key] || 0);
      }
    });
    setDisplayConfig(initialDisplay);

  }, [quotationData?.theme_key]);

  const calculatedCosts = useMemo(() => {
    const {
      costo_maquina = 0,
      optionals = [],
      costo_terrestre_china = 0,
      maritimo = 0,
      impuestos_percent = 0,
      terrestre_nacional = 0,
      instalacion = 0,
      utilidad,
      comision,
      tipo_cambio = 1
    } = costConfig;

    const activeOptionals = optionals.filter(opt => opt.isEnabled);
    const total_opcionales = activeOptionals.reduce((sum, opt) => sum + (Number(opt.cost) || 0), 0);
    const costo_final_maquina = costo_maquina + total_opcionales;

    const incrementables = costo_terrestre_china + maritimo;
    const base_impuestos = costo_final_maquina + incrementables;
    const impuestos = base_impuestos * (impuestos_percent / 100);
    const terrestre_e_instalacion = terrestre_nacional + instalacion;
    const costo_final_operacion = costo_final_maquina + incrementables + impuestos + terrestre_e_instalacion;

    let utilidad_usd = 0;
    if (utilidad) {
      switch (utilidad.type) {
        case 'percent': utilidad_usd = costo_final_maquina * (utilidad.value / 100); break;
        case 'usd': utilidad_usd = utilidad.value; break;
        case 'mxn': utilidad_usd = utilidad.value / tipo_cambio; break;
        default: break;
      }
    }

    const precio_venta = costo_final_operacion + utilidad_usd;

    let comision_usd = 0;
    if (comision) {
      switch (comision.type) {
        case 'percent': comision_usd = utilidad_usd * (comision.value / 100); break;
        case 'usd': comision_usd = comision.value; break;
        case 'mxn': comision_usd = comision.value / tipo_cambio; break;
        default: break;
      }
    }

    const precio_venta_final = precio_venta + comision_usd;
    const iva = precio_venta_final * 0.16;
    const neto = precio_venta_final + iva;
    const factor = costo_final_operacion > 0 ? precio_venta_final / costo_final_operacion : 0;

    const total_opcionales_venta = activeOptionals.reduce((sum, opt) => sum + ((Number(opt.cost) || 0) * (Number(opt.factor) || 1.6)), 0);
    const precio_venta_maquina = precio_venta_final - total_opcionales_venta;

    const subtotalsForPdf = {
      costoMaquina: costo_maquina,
      totalOpcionales: total_opcionales,
      subtotalBeforeProfit: costo_final_operacion,
      utilidad_usd,
      comision_usd,
      comision_mxn: comision_usd * tipo_cambio,
    };

    return {
      total_opcionales,
      total_opcionales_venta,
      precio_venta_maquina,
      costo_final_maquina,
      incrementables,
      impuestos,
      costo_final_operacion,
      utilidad_usd,
      precio_venta: precio_venta_final,
      iva,
      neto,
      factor,
      comision_usd,
      precio_venta_mxn: precio_venta_final * tipo_cambio,
      iva_mxn: iva * tipo_cambio,
      neto_mxn: neto * tipo_cambio,
      comision_mxn: comision_usd * tipo_cambio,
      terrestre_e_instalacion,
      subtotalsForPdf,
    };
  }, [costConfig]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDisplayConfig(prev => ({ ...prev, [name]: value }));
    const numValue = (name !== 'incoterm') ? parseFloat(value) || 0 : value;
    setCostConfig(prev => ({ ...prev, [name]: numValue }));
  };

  const handleCalculationInputChange = (id, config) => {
    setCostConfig(prev => ({ ...prev, [id]: config }));
  };

  const addOptional = () => {
    const newOptional = { id: Date.now(), name: '', cost: 0, isEnabled: true, factor: 1.6 };
    setCostConfig(prev => ({ ...prev, optionals: [...(prev.optionals || []), newOptional] }));
  };

  const updateOptional = (id, field, value) => {
    const updatedOptionals = (costConfig.optionals || []).map(opt =>
      opt.id === id ? { ...opt, [field]: value } : opt
    );
    setCostConfig(prev => ({ ...prev, optionals: updatedOptionals }));
  };

  const toggleOptional = (id) => {
    const updatedOptionals = (costConfig.optionals || []).map(opt =>
      opt.id === id ? { ...opt, isEnabled: !opt.isEnabled } : opt
    );
    setCostConfig(prev => ({ ...prev, optionals: updatedOptionals }));
  };

  const removeOptional = (id) => {
    const updatedOptionals = (costConfig.optionals || []).filter(opt => opt.id !== id);
    setCostConfig(prev => ({ ...prev, optionals: updatedOptionals }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const configToSave = { ...costConfig, factor: calculatedCosts.factor };

    try {
      const { error } = await supabase.from('quotations').update({ cost_config: configToSave, updated_at: new Date().toISOString() }).eq('theme_key', activeTheme);
      if (error) throw error;
      setThemes(prev => ({ ...prev, [activeTheme]: { ...prev[activeTheme], cost_config: configToSave } }));
      toast({ title: "¡Guardado exitoso! 🎉", description: `La configuración del cotizador ha sido actualizada.` });
    } catch (error) {
      console.error('Error saving cost config:', error);
      toast({ title: "¡Error al guardar! 😭", description: `No se pudieron guardar los cambios: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProjectNameChange = async (newName) => {
    setThemes(prev => ({
      ...prev,
      [activeTheme]: {
        ...prev[activeTheme],
        project: newName,
      },
    }));
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ project: newName, updated_at: new Date().toISOString() })
        .eq('theme_key', activeTheme);
      if (error) throw error;
      toast({ title: "Nombre actualizado", description: `El nombre del proyecto se cambió a "${newName}".` });
    } catch (error) {
      console.error('Error updating project name:', error);
      toast({ title: "Error al actualizar", description: `No se pudo cambiar el nombre: ${error.message}`, variant: "destructive" });
    }
  };

  const handleReset = () => {
    let initialConfig;
    if (quotationData && quotationData.cost_config) {
      initialConfig = { ...defaultCostConfig, ...quotationData.cost_config, optionals: quotationData.cost_config.optionals || [] };
    } else {
      initialConfig = defaultCostConfig;
    }
    setCostConfig(initialConfig);
    const initialDisplay = {};
    Object.keys(initialConfig).forEach(key => {
      if (typeof initialConfig[key] !== 'object') {
        initialDisplay[key] = String(initialConfig[key] || 0);
      }
    });
    setDisplayConfig(initialDisplay);
    toast({ title: "Valores restaurados 🔄", description: "Los campos se han restablecido a sus valores guardados." });
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const costConfigForPdf = {
      ...costConfig,
      optionals: costConfig.optionals.filter(opt => opt.isEnabled) // Only export enabled optionals
    };
    costConfigForPdf.costo_china = costConfig.costo_maquina;

    const pdfPayload = {
      quotationData,
      costConfig: costConfigForPdf,
      calculatedCosts,
      subtotals: calculatedCosts.subtotalsForPdf,
    };
    try {
      await generateCotizadorPDF(pdfPayload);
      toast({ title: "✅ PDF Generado", description: "La cotización ha sido exportada a PDF." });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({ title: "❌ Error de Exportación", description: `No se pudo generar el PDF. ${error.message}`, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };


  const handleFocus = (e) => e.target.select();

  const SummaryRow = ({ label, valueUsd, valueMxn, isBold = false, isSubtle = false }) => (
    <div className={`flex justify-between items-center py-2 border-b border-gray-800 ${isSubtle ? 'text-gray-400' : 'text-white'}`}>
      <span className={`text-sm ${isBold ? 'font-semibold' : ''}`}>{label}</span>
      <div className="text-right">
        <p className={`font-mono text-sm ${isBold ? 'font-bold' : ''}`}>{formatCurrency(valueUsd, 'USD')}</p>
        {valueMxn !== undefined && <p className="font-mono text-xs text-gray-500">{formatCurrency(valueMxn, 'MXN')}</p>}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 md:p-8 lg:p-8 xl:p-12">
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[#2563eb]/10 rounded-lg flex items-center justify-center border border-[#2563eb]/20 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
            <Calculator className="w-6 h-6 text-[#2563eb]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#2563eb]">Cotizador de Proyectos</h1>
            <p className="text-gray-400">Máquina: <span className="font-semibold text-[#2563eb]">{quotationData.project}</span></p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2"><Label htmlFor="costo_maquina" className="text-[#2563eb] font-semibold">Costo Máquina (USD)</Label><Input type="text" id="costo_maquina" name="costo_maquina" value={displayConfig.costo_maquina || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
              <div className="space-y-2"><Label htmlFor="incoterm" className="text-[#2563eb] font-semibold">Incoterm</Label><Input id="incoterm" name="incoterm" value={costConfig.incoterm || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
              <div className="space-y-2"><Label htmlFor="costo_terrestre_china" className="text-[#2563eb] font-semibold">Costo Terrestre China (USD)</Label><Input type="text" id="costo_terrestre_china" name="costo_terrestre_china" value={displayConfig.costo_terrestre_china || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
              <div className="space-y-2"><Label htmlFor="maritimo" className="text-[#2563eb] font-semibold">Marítimo (USD)</Label><Input type="text" id="maritimo" name="maritimo" value={displayConfig.maritimo || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
              <div className="space-y-2"><Label htmlFor="terrestre_nacional" className="text-[#2563eb] font-semibold">Terrestre Nacional (USD)</Label><Input type="text" id="terrestre_nacional" name="terrestre_nacional" value={displayConfig.terrestre_nacional || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
              <div className="space-y-2"><Label htmlFor="instalacion" className="text-[#2563eb] font-semibold">Instalación (USD)</Label><Input type="text" id="instalacion" name="instalacion" value={displayConfig.instalacion || ''} onChange={handleInputChange} onFocus={handleFocus} /></div>
            </div>

            <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800">



              <div className='flex justify-between items-center'>
                <Label className="text-[#2563eb] font-semibold flex items-center gap-2"><PackagePlus size={16} /> Opcionales</Label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleViewMode}
                    className="text-gray-400 hover:text-white"
                    title={viewMode === 'cost' ? "Ver Precios de Venta" : "Ver Costos"}
                  >
                    {viewMode === 'cost' ? <Eye size={16} className="mr-2" /> : <EyeOff size={16} className="mr-2" />}
                    {viewMode === 'cost' ? 'Ver Precios' : 'Ver Costos'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={addOptional} className="border-gray-700 hover:bg-gray-800"><PlusCircle className="h-4 w-4 mr-2" />Agregar</Button>
                </div>
              </div>
              {/* Header Row */}
              <div className="grid grid-cols-[auto_1fr_150px_100px_auto] gap-3 px-2 mb-2 text-xs text-gray-500 font-medium uppercase tracking-wider">
                <div className="w-10 text-center">Activo</div>
                <div>Descripción</div>
                <div>{viewMode === 'cost' ? 'Costo (USD)' : 'Precio Venta (USD)'}</div>
                <div>Factor</div>
                <div className="w-8"></div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {(costConfig.optionals || []).map(opt => {
                  const cost = Number(opt.cost) || 0;
                  const factor = Number(opt.factor) || 1.6;
                  const sellingPrice = cost * factor;

                  return (
                    <div key={opt.id} className={`grid grid-cols-[auto_1fr_150px_100px_auto] gap-3 items-center p-2 rounded-md transition-colors hover:bg-gray-800/30 ${!opt.isEnabled ? 'opacity-50' : ''}`}>
                      <div className="flex justify-center w-10">
                        <Switch
                          checked={opt.isEnabled}
                          onCheckedChange={() => toggleOptional(opt.id)}
                          className="data-[state=checked]:bg-[#2563eb]"
                        />
                      </div>
                      <Input
                        placeholder="Descripción"
                        value={opt.name}
                        onChange={e => updateOptional(opt.id, 'name', e.target.value)}
                        disabled={!opt.isEnabled}
                        className="w-full"
                      />

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative w-full">
                              <Input
                                type="number"
                                placeholder={viewMode === 'cost' ? "Costo" : "Precio"}
                                value={viewMode === 'cost' ? opt.cost : (sellingPrice.toFixed(2))}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  if (viewMode === 'cost') {
                                    updateOptional(opt.id, 'cost', val);
                                  } else {
                                    // Reverse calculate cost: Cost = Price / Factor
                                    const newCost = factor !== 0 ? val / factor : 0;
                                    updateOptional(opt.id, 'cost', newCost);
                                  }
                                }}
                                onFocus={handleFocus}
                                className={`pr-10 ${viewMode === 'price' ? 'text-green-400 font-bold' : ''}`}
                                disabled={!opt.isEnabled}
                              />
                              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-gray-400">USD</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-gray-800 border-gray-700 text-white">
                            <p className="font-semibold">
                              {viewMode === 'cost'
                                ? `Precio Venta: ${formatCurrency(sellingPrice)}`
                                : `Costo Original: ${formatCurrency(cost)}`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <div className="relative w-full">
                        <Input
                          type="number"
                          placeholder="Factor"
                          value={opt.factor}
                          onChange={e => updateOptional(opt.id, 'factor', parseFloat(e.target.value) || 0)}
                          onFocus={handleFocus}
                          className="pr-1"
                          disabled={!opt.isEnabled}
                          step="0.1"
                        />
                        <span className="absolute inset-y-0 right-8 flex items-center text-xs text-gray-400 pointer-events-none">x</span>
                      </div>
                      <div className="w-8 flex justify-center">
                        <Button variant="ghost" size="icon" onClick={() => removeOptional(opt.id)} className="text-red-500 hover:bg-red-500/10 hover:text-red-400 h-8 w-8"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {(costConfig.optionals || []).length > 0 && (
                <div className="flex justify-end items-center pt-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400 mr-2">Total Opcionales Activos:</span>
                  <span className="text-sm font-bold text-[#2563eb]">{formatCurrency(calculatedCosts.total_opcionales)}</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <CalculationInput
                label="Utilidad"
                id="utilidad"
                config={costConfig.utilidad}
                onConfigChange={(newConfig) => handleCalculationInputChange('utilidad', newConfig)}
                subtotal={calculatedCosts.costo_final_maquina}
                tipoCambio={costConfig.tipo_cambio}
              />
              <div>
                <CalculationInput
                  label="Comisión"
                  id="comision"
                  config={costConfig.comision}
                  onConfigChange={(newConfig) => handleCalculationInputChange('comision', newConfig)}
                  subtotal={calculatedCosts.utilidad_usd}
                  tipoCambio={costConfig.tipo_cambio}
                />
                <p className="text-right text-xs text-gray-400 mt-1 pr-2">
                  = {formatCurrency(calculatedCosts.comision_mxn, 'MXN')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <Label htmlFor="impuestos_percent" className="text-[#2563eb] font-semibold">Impuestos de Importación</Label>
                <div className="relative"><Input type="text" id="impuestos_percent" name="impuestos_percent" value={displayConfig.impuestos_percent || ''} onChange={handleInputChange} onFocus={handleFocus} /><div className="absolute inset-y-0 right-3 flex items-center text-gray-400">%</div></div>
              </div>
              <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <Label htmlFor="tipo_cambio" className="text-[#2563eb] font-semibold">Tipo de Cambio (USD a MXN)</Label>
                <div className="relative"><Input type="text" id="tipo_cambio" name="tipo_cambio" value={costConfig.tipo_cambio || ''} onChange={handleInputChange} onFocus={handleFocus} /><div className="absolute inset-y-0 right-3 flex items-center text-gray-400">MXN</div></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="sticky top-8 bg-gray-900/50 rounded-lg border border-gray-800 p-6 space-y-6 shadow-lg">
              <MachineFactorCard
                machineName={quotationData.project}
                onMachineNameChange={handleProjectNameChange}
                cost={calculatedCosts.costo_final_operacion}
                factor={calculatedCosts.factor}
                sellingPrice={calculatedCosts.precio_venta}
              />
              <div>
                <h2 className="text-xl font-bold text-[#2563eb] mb-4">Resumen Financiero</h2>
                <div className="space-y-1">
                  <SummaryRow label="Costo Máquina" valueUsd={costConfig.costo_maquina} isSubtle />
                  <SummaryRow label="Opcionales Activos" valueUsd={calculatedCosts.total_opcionales} isSubtle />
                  <SummaryRow label="Costo Final Máquina" valueUsd={calculatedCosts.costo_final_maquina} isBold />
                  <SummaryRow label="Incrementables" valueUsd={calculatedCosts.incrementables} isSubtle />
                  <SummaryRow label="Impuestos" valueUsd={calculatedCosts.impuestos} isSubtle />
                  <SummaryRow label="Terrestre e Instalación" valueUsd={calculatedCosts.terrestre_e_instalacion} isSubtle />
                  <SummaryRow label="Costo Final Operación" valueUsd={calculatedCosts.costo_final_operacion} isBold />
                  <SummaryRow label="Utilidad" valueUsd={calculatedCosts.utilidad_usd} isSubtle />
                  <SummaryRow label="Comisión" valueUsd={calculatedCosts.comision_usd} valueMxn={calculatedCosts.comision_mxn} isSubtle />

                  <div className="pt-4 mt-4 border-t border-dashed border-gray-700">
                    <SummaryRow label="Precio Venta" valueUsd={calculatedCosts.precio_venta} valueMxn={calculatedCosts.precio_venta_mxn} isBold />
                    <SummaryRow label="I.V.A. (16%)" valueUsd={calculatedCosts.iva} valueMxn={calculatedCosts.iva_mxn} />
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-700">
                    <span className="text-sm font-bold text-[#2563eb]">TOTAL</span>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-[#2563eb]">{formatCurrency(calculatedCosts.neto, 'USD')}</p>
                      <p className="font-mono text-xs text-[#2563eb]/80">{formatCurrency(calculatedCosts.neto_mxn, 'MXN')}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t border-[#2563eb]/20">
                    <span className="text-lg font-bold text-[#2563eb] flex items-center gap-2"><TrendingUp size={20} />Factor</span>
                    <p className="font-mono text-xl font-bold text-[#2563eb]">{calculatedCosts.factor.toFixed(2)}</p>
                  </div>

                  {/* New Breakdown Section */}
                  <div className="mt-6 pt-4 border-t border-gray-700">
                    <h3 className="text-sm font-bold text-white mb-3">Desglose de Precios de Venta</h3>
                    <div className="space-y-1 pl-2 border-l-2 border-[#2563eb]/30">
                      <SummaryRow label="Máquina (con gastos)" valueUsd={calculatedCosts.precio_venta_maquina} isSubtle />
                      {(costConfig.optionals || []).filter(opt => opt.isEnabled).map(opt => (
                        <SummaryRow
                          key={opt.id}
                          label={opt.name || 'Opcional'}
                          valueUsd={(Number(opt.cost) || 0) * (Number(opt.factor) || 1.6)}
                          isSubtle
                        />
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center sm:justify-end gap-y-3 sm:gap-3 mt-8">
          <Button variant="outline" onClick={handleReset} disabled={isSaving || isExporting} className="w-full sm:w-auto border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10 hover:text-[#2563eb]"><Eraser className="h-4 w-4 mr-2" />Restablecer</Button>
          <Button onClick={handleExportPDF} variant="outline" disabled={isSaving || isExporting} className="w-full sm:w-auto border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10 hover:text-[#2563eb]">
            {isExporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            {isExporting ? 'Exportando...' : 'Exportar PDF'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isExporting} className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] w-full sm:w-auto shadow-[0_0_10px_rgba(37,99,235,0.4)]">{isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}Guardar Cambios</Button>
        </div>
      </div>
    </motion.div>
  );
};

export default CotizadorPage;