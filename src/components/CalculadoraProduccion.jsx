import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import ResultadosClave from '@/components/ResultadosClave';
import AnalisisRentabilidad from '@/components/AnalisisRentabilidad';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sectionData = {
  id: 'calculadora_prod',
  label: 'Calculadora de Producción',
  icon: 'Calculator',
  description: 'Estima la producción, costos y rentabilidad de tu línea.'
};

// --- Shared Components ---

const ParametroItem = ({ label, value, onValueChange, unit, step, min, max, isSlider = false, className = "" }) => {
  const [inputValue, setInputValue] = useState(value?.toString() || "0");

  useEffect(() => {
    if (parseFloat(inputValue) !== value) {
      setInputValue(value?.toString() || "0");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    let numValue = parseFloat(inputValue);
    if (isNaN(numValue) || inputValue.trim() === '') {
      setInputValue(value?.toString() || "0");
    } else {
      onValueChange(numValue);
    }
  };

  return (
    <div className={`bg-gray-900/50 p-4 rounded-lg border border-gray-800 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className="w-24 h-8 text-right bg-black border-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            step={step}
            min={min}
            max={max}
          />
          <span className="text-sm text-gray-500 w-8">{unit}</span>
        </div>
      </div>
      {isSlider && (
        <Slider
          value={[value || 0]}
          onValueChange={(val) => onValueChange(val[0])}
          max={max}
          min={min}
          step={step}
        />
      )}
    </div>
  );
};

// --- Tejas Calculator (Original) ---

const defaultTejasValues = {
  ancho_teja: 900,
  largo_teja: 1000,
  peso_teja: 4500,
  capacidad_produccion: 300,
  eficiencia_linea: 90,
  horas_operacion: 8,
  dias_operacion: 22,
  costo_mp: 15,
  costo_empaque: 0,
  costo_operativo: 120,
  precio_venta: 300,
};

const TejasCalculator = ({ config, onUpdate, isEditorMode, onSave, quotationData }) => {
  const [values, setValues] = useState({ ...defaultTejasValues, ...config });
  const [results, setResults] = useState({});
  const [rentabilidad, setRentabilidad] = useState({});

  useEffect(() => {
    setValues({ ...defaultTejasValues, ...config });
  }, [config]);

  useEffect(() => {
    onUpdate(values);

    // Cálculos
    const peso_teja_kg = values.peso_teja / 1000;
    const capacidad_kg_h_real = values.capacidad_produccion * (values.eficiencia_linea / 100);
    const tejas_por_hora = peso_teja_kg > 0 ? capacidad_kg_h_real / peso_teja_kg : 0;
    const tejas_por_min_real = tejas_por_hora / 60;
    const produccion_diaria_tejas = tejas_por_hora * values.horas_operacion;
    const produccion_mensual_tejas = produccion_diaria_tejas * values.dias_operacion;
    const produccion_mensual_kg = (produccion_mensual_tejas * peso_teja_kg);

    setResults({
      tejas_por_hora: Math.round(tejas_por_hora),
      tejas_por_min_real: Math.round(tejas_por_min_real),
      produccion_diaria_tejas: Math.round(produccion_diaria_tejas),
      produccion_mensual_tejas: Math.round(produccion_mensual_tejas),
      produccion_mensual_kg: Math.round(produccion_mensual_kg),
    });

    const costo_mp_total = produccion_mensual_tejas * values.costo_mp;
    const costo_empaque_total = produccion_mensual_tejas * values.costo_empaque;
    const costo_operativo_total = values.costo_operativo * values.horas_operacion * values.dias_operacion;
    const costo_total_produccion = costo_mp_total + costo_empaque_total + costo_operativo_total;
    const ingresos_totales = produccion_mensual_tejas * values.precio_venta;
    const utilidad_bruta = ingresos_totales - costo_total_produccion;
    const margen_bruto = ingresos_totales > 0 ? (utilidad_bruta / ingresos_totales) * 100 : 0;

    setRentabilidad({
      costo_total_produccion,
      ingresos_totales,
      utilidad_bruta,
      margen_bruto,
    });
  }, [values]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateValue = (id, newValue) => {
    setValues(prev => ({ ...prev, [id]: newValue }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Parámetros de Producción</h3>
          <div className="space-y-3">
            <ParametroItem label="Ancho de Teja" unit="mm" min={100} max={1200} step={10} value={values.ancho_teja} onValueChange={v => updateValue('ancho_teja', v)} />
            <ParametroItem label="Largo de Teja" unit="mm" min={200} max={2000} step={10} value={values.largo_teja} onValueChange={v => updateValue('largo_teja', v)} />
            <ParametroItem label="Peso por Teja" unit="gr" min={1000} max={10000} step={100} value={values.peso_teja} onValueChange={v => updateValue('peso_teja', v)} />
            <ParametroItem label="Capacidad de Producción" unit="kg/h" min={300} max={600} step={10} isSlider value={values.capacidad_produccion} onValueChange={v => updateValue('capacidad_produccion', v)} />
            <ParametroItem label="Eficiencia de Línea" unit="%" min={50} max={100} step={1} isSlider value={values.eficiencia_linea} onValueChange={v => updateValue('eficiencia_linea', v)} />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Parámetros de Operación</h3>
          <div className="space-y-3">
            <ParametroItem label="Horas por Turno" unit="hrs" min={1} max={24} step={1} value={values.horas_operacion} onValueChange={v => updateValue('horas_operacion', v)} />
            <ParametroItem label="Días por Mes" unit="días" min={1} max={31} step={1} value={values.dias_operacion} onValueChange={v => updateValue('dias_operacion', v)} />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-primary mb-3">Parámetros de Costos</h3>
          <div className="space-y-3">
            <ParametroItem label="Costo Materia Prima / teja" unit="MXN" min={1} max={100} step={1} value={values.costo_mp} onValueChange={v => updateValue('costo_mp', v)} />
            <ParametroItem label="Costo Empaque / teja" unit="MXN" min={0} max={50} step={0.5} value={values.costo_empaque} onValueChange={v => updateValue('costo_empaque', v)} />
            <ParametroItem label="Costo Operativo / hora" unit="MXN" min={50} max={1000} step={10} value={values.costo_operativo} onValueChange={v => updateValue('costo_operativo', v)} />
            <ParametroItem label="Precio de Venta / teja" unit="MXN" min={10} max={500} step={1} value={values.precio_venta} onValueChange={v => updateValue('precio_venta', v)} />
          </div>
        </div>
        {isEditorMode && (
          <Button onClick={onSave} className="w-full mt-4">Guardar Parámetros Tejas</Button>
        )}
      </div>

      <div className="lg:col-span-2 space-y-8">
        <ResultadosClave results={results} rentabilidad={rentabilidad} />
        <div className="bg-black border border-gray-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Análisis de Rentabilidad</h3>
          </div>
          <AnalisisRentabilidad rentabilidad={rentabilidad} quotationData={quotationData} />
        </div>
      </div>
    </div>
  );
};

// --- Coextrusion Calculator (New) ---

// --- Coextrusion Calculator (New) ---

const defaultCoexValues = {
  mixture: [
    { id: 'm1', type: 'LDPE', name: 'LDPE - LDPE - I', percent: 50, density: 0.92, cost: 22 },
    { id: 'm2', type: 'LLDPE', name: 'LLDPE - LLDPE', percent: 30, density: 0.92, cost: 22 },
    { id: 'm3', type: 'HDPE', name: 'HDPE - HDPE -', percent: 20, density: 0.95, cost: 22 },
    { id: 'm4', type: 'Personalizado', name: 'Personalizado /', percent: 0, density: 0, cost: 0 },
  ],
  process: {
    capacity_kgh: 180, // Primary Variable
    width_mm: 1300,
    thickness_um: 20,
    speed_m_min: 90,
    density_gcm3: 0.926, // Calculated or override
  },
  costs: {
    sales_price: 37.00,
    power_kw: 100,
    electricity_cost: 2.5,
    fixed_costs_hr: 200,
    work_hours_day: 24,
  }
};

const MATERIAL_TYPES = ['LDPE', 'LLDPE', 'HDPE', 'PP', 'Personalizado'];

const CoextrusionCalculator = ({ config, onUpdate, isEditorMode, onSave }) => {
  const [values, setValues] = useState({ ...defaultCoexValues, ...config });

  // Ensure structure exists
  useEffect(() => {
    let needsUpdate = false;
    const newValues = { ...values };

    if (!newValues.mixture) {
      newValues.mixture = defaultCoexValues.mixture;
      needsUpdate = true;
    }
    if (!newValues.process) {
      newValues.process = defaultCoexValues.process;
      needsUpdate = true;
    }
    if (!newValues.costs) {
      newValues.costs = defaultCoexValues.costs;
      needsUpdate = true;
    }

    if (needsUpdate) setValues(newValues);
  }, [config]);

  const [metrics, setMetrics] = useState({
    avgMixtureCost: 0,
    totalFormulaPercent: 0,
    hourlyProduction: 0,
    monthlyProductionTon: 0,
    totalCostPerKg: 0,
    grossMargin: 0,
    monthlyNetProfit: 0,
    theoreticalCapacity: 0
  });

  useEffect(() => {
    onUpdate(values);

    // 1. Mixture Calculations
    let totalPercent = 0;
    let weightedCost = 0;
    let weightedDensity = 0;

    values.mixture?.forEach(m => {
      totalPercent += m.percent;
      weightedCost += (m.percent / 100) * m.cost;
      weightedDensity += (m.percent / 100) * m.density;
    });

    // 2. Process Calculations
    // Theoretical Capacity = Width * Thickness * Speed * Density * 0.06
    // Width (m) = mm / 1000
    // Thickness (mm) = um / 1000
    // Speed (m/min)
    // Density (g/cm3) = kg/L approx? 
    // Formula: Q (kg/h) = Width(m) * Thickness(um) * Speed(m/min) * Density(g/cm3) * 0.06
    // Let's derive: 
    // 1 m * 1 um * 1 m/min * 1 g/cm3
    // = 100 cm * 0.0001 cm * 100 cm/min * 1 g/cm3
    // = 1 cm3 * 1 g/cm3 = 1 g/min
    // * 60 = 60 g/h = 0.06 kg/h. Correct.

    const width_m = (values.process?.width_mm || 0) / 1000;
    const thick_um = (values.process?.thickness_um || 0);
    const speed = (values.process?.speed_m_min || 0);
    // Use calculated density if not manually set? For now use weighted density from mixture
    const density = weightedDensity > 0 ? weightedDensity : (values.process?.density_gcm3 || 0.92);

    const theoreticalCapacity = values.process?.width_mm * values.process?.thickness_um * values.process?.speed_m_min * density * 0.00006;

    // PRIMARY VARIABLE: User Input Capacity
    const actualCapacity = values.process?.capacity_kgh || 0;

    // 3. Costs & Profitability
    const monthlyHours = (values.costs?.work_hours_day || 24) * 30;
    const monthlyProductionKg = actualCapacity * monthlyHours;
    const monthlyProductionTon = monthlyProductionKg / 1000;

    // Costs per Kg
    // Energy
    const powerKw = values.costs?.power_kw || 0;
    const costKwh = values.costs?.electricity_cost || 0;
    const energyCostPerHour = powerKw * costKwh;
    const energyCostPerKg = actualCapacity > 0 ? energyCostPerHour / actualCapacity : 0;

    // Fixed Costs
    const fixedCostsHr = values.costs?.fixed_costs_hr || 0;
    const fixedCostPerKg = actualCapacity > 0 ? fixedCostsHr / actualCapacity : 0;

    const totalCostPerKg = weightedCost + energyCostPerKg + fixedCostPerKg;

    // Profit
    const salesPrice = values.costs?.sales_price || 0;
    const marginPerKg = salesPrice - totalCostPerKg;
    const monthlyNetProfit = marginPerKg * monthlyProductionKg;
    const grossMargin = salesPrice > 0 ? (marginPerKg / salesPrice) * 100 : 0;

    setMetrics({
      avgMixtureCost: weightedCost,
      totalFormulaPercent: totalPercent,
      hourlyProduction: actualCapacity,
      monthlyProductionTon,
      totalCostPerKg,
      grossMargin,
      monthlyNetProfit,
      theoreticalCapacity
    });

  }, [values]);

  const updateMixture = (index, field, val) => {
    const newMix = [...(values.mixture || [])];
    newMix[index] = { ...newMix[index], [field]: val };
    setValues(prev => ({ ...prev, mixture: newMix }));
  };

  const removeComponent = (index) => {
    const newMix = values.mixture.filter((_, i) => i !== index);
    setValues(prev => ({ ...prev, mixture: newMix }));
  };

  const addComponent = () => {
    if (values.mixture.length >= 4) return;
    setValues(prev => ({
      ...prev,
      mixture: [...prev.mixture, { id: Date.now(), type: 'LDPE', name: 'Nuevo', percent: 0, density: 0.92, cost: 0 }]
    }));
  };

  const updateProcess = (field, val) => {
    setValues(prev => ({ ...prev, process: { ...prev.process, [field]: val } }));
  };

  const updateCosts = (field, val) => {
    setValues(prev => ({ ...prev, costs: { ...prev.costs, [field]: val } }));
  };

  return (
    <div className="space-y-6 mt-8">
      {/* Top Grid: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 01 - Estructura de Mezcla */}
        <div className="bg-gray-900/40 border border-blue-500/30 rounded-xl p-5 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-400"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">01 · ESTRUCTURA DE MEZCLA</h3>
            <Button variant="outline" size="sm" onClick={addComponent} disabled={values.mixture?.length >= 4} className="h-7 text-xs border-blue-500/50 text-blue-400 hover:bg-blue-900/20">
              + Componente
            </Button>
          </div>

          <p className="text-xs text-gray-400 mb-4">Componentes (máx. 4 materiales - deben sumar 100%)</p>

          <div className="space-y-3 flex-1">
            {values.mixture?.map((item, i) => (
              <div key={i} className="bg-black/40 p-2 rounded-lg border border-gray-800">
                <div className="flex gap-2 mb-2">
                  <select
                    className="bg-black border border-gray-700 text-white text-xs rounded px-2 h-8 w-1/3"
                    value={item.type}
                    onChange={(e) => updateMixture(i, 'type', e.target.value)}
                  >
                    {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <Input
                    className="h-8 text-xs bg-black border-gray-700 w-full"
                    value={item.name}
                    onChange={(e) => updateMixture(i, 'name', e.target.value)}
                    placeholder="Nombre"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-900/20" onClick={() => removeComponent(i)}>
                    <span className="text-xs">X</span>
                  </Button>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      className="h-8 text-right pr-6 bg-black border-gray-700"
                      value={item.percent}
                      onChange={(e) => updateMixture(i, 'percent', parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-2 text-xs text-gray-500">%</span>
                  </div>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      className="h-8 text-right pr-8 bg-black border-gray-700"
                      value={item.cost}
                      onChange={(e) => updateMixture(i, 'cost', parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-2 text-xs text-gray-500">$/kg</span>
                  </div>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      className="h-8 text-right pr-10 bg-black border-gray-700"
                      value={item.density}
                      onChange={(e) => updateMixture(i, 'density', parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-2 text-xs text-gray-500">g/cm³</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-cyan-400 font-bold mb-1">COSTO PROMEDIO MEZCLA ($/KG)</p>
                <p className="text-xs text-gray-500">Total fórmula: <span className={metrics.totalFormulaPercent === 100 ? "text-green-400" : "text-yellow-400"}>{metrics.totalFormulaPercent}%</span></p>
              </div>
              <p className="text-2xl font-bold text-white">${metrics.avgMixtureCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* 02 - Parámetros de Proceso */}
        <div className="bg-gray-900/40 border border-blue-500/30 rounded-xl p-5 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
          <h3 className="text-lg font-bold text-white mb-4">02 · PARÁMETROS DE PROCESO</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-cyan-400 uppercase mb-1 block">CAPACIDAD DE EXTRUSIÓN (KG/H) · VARIABLE PRINCIPAL</label>
              <Input
                type="number"
                className="bg-black/50 border-blue-500/50 text-white text-lg h-10 font-bold"
                value={values.process?.capacity_kgh}
                onChange={(e) => updateProcess('capacity_kgh', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-blue-400 uppercase mb-1 block">ANCHO BOBINA (MM)</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-700 text-white h-9"
                value={values.process?.width_mm}
                onChange={(e) => updateProcess('width_mm', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-blue-400 uppercase mb-1 block">ESPESOR (MICRAS / MM)</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-700 text-white h-9"
                value={values.process?.thickness_um}
                onChange={(e) => updateProcess('thickness_um', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-blue-400 uppercase mb-1 block">VELOCIDAD (M/MIN)</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-700 text-white h-9"
                value={values.process?.speed_m_min}
                onChange={(e) => updateProcess('speed_m_min', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">DENSIDAD GLOBAL PELÍCULA (G/CM³) · CALCULADA</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-800 text-gray-400 h-9"
                value={values.process?.density_gcm3}
                readOnly
                disabled
              />
            </div>

            <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-500/20 mt-2">
              <p className="text-xs text-blue-300 uppercase font-bold">PRODUCCIÓN HORARIA (Q)</p>
              <p className="text-3xl font-black text-cyan-400">{metrics.hourlyProduction.toFixed(1)} <span className="text-sm text-gray-400 font-normal">kg/h</span></p>
              <p className="text-[10px] text-gray-500 mt-1">
                Capacidad Teórica (ref): {metrics.theoreticalCapacity.toFixed(1)} kg/h
              </p>
            </div>
          </div>
        </div>

        {/* 03 - Energía y Costos */}
        <div className="bg-gray-900/40 border border-blue-500/30 rounded-xl p-5 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-500"></div>
          <h3 className="text-lg font-bold text-white mb-4">03 · ENERGÍA Y COSTOS</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-green-400 uppercase mb-1 block">PRECIO VENTA OBJETIVO ($/KG)</label>
              <Input
                type="number"
                className="bg-black/50 border-green-500/50 text-green-400 text-lg h-10 font-bold"
                value={values.costs?.sales_price}
                onChange={(e) => updateCosts('sales_price', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">CONSUMO (KW)</label>
                <Input
                  type="number"
                  className="bg-black/50 border-gray-700 text-white h-9"
                  value={values.costs?.power_kw}
                  onChange={(e) => updateCosts('power_kw', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">COSTO LUZ ($/KWH)</label>
                <Input
                  type="number"
                  className="bg-black/50 border-gray-700 text-white h-9"
                  value={values.costs?.electricity_cost}
                  onChange={(e) => updateCosts('electricity_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">GASTOS FIJOS (MO, AGUA) $/HR</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-700 text-white h-9"
                value={values.costs?.fixed_costs_hr}
                onChange={(e) => updateCosts('fixed_costs_hr', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">HORAS TRABAJO / DÍA</label>
              <Input
                type="number"
                className="bg-black/50 border-gray-700 text-white h-9"
                value={values.costs?.work_hours_day}
                onChange={(e) => updateCosts('work_hours_day', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: 04 - Proyección */}
      <div className="bg-gray-900/40 border border-blue-500/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-600"></div>
        <h3 className="text-lg font-bold text-green-400 mb-6">04 · PROYECCIÓN DE RENTABILIDAD</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-black/30 p-4 rounded-lg border-l-4 border-red-500">
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">COSTO TOTAL POR KG</p>
            <p className="text-3xl font-black text-red-400">${metrics.totalCostPerKg.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Materia + energía + fijos</p>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border-l-4 border-green-500">
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">MARGEN DE UTILIDAD</p>
            <p className="text-3xl font-black text-green-400">{metrics.grossMargin.toFixed(1)}%</p>
          </div>

          <div className="bg-black/30 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-xs text-gray-400 uppercase font-bold mb-1">PRODUCCIÓN MENSUAL</p>
            <p className="text-3xl font-black text-white">{metrics.monthlyProductionTon.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500 mt-1">Toneladas (30 días)</p>
          </div>

          <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
            <p className="text-xs text-green-400 uppercase font-bold mb-1">UTILIDAD MENSUAL NETA</p>
            <p className="text-3xl font-black text-green-400">${metrics.monthlyNetProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-green-500/70 mt-1">Estimado en bolsillo</p>
          </div>
        </div>

        {isEditorMode && (
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800" onClick={onSave}>
              <Save className="w-4 h-4 mr-2" /> Guardar datos
            </Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
              ↓ Exportar proyección
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Wrapper ---

const CalculadoraProduccion = ({ quotationData, isEditorMode, activeTheme }) => {
  const { toast } = useToast();

  // Load initial config
  const initialConfig = quotationData.calculator_config || {};

  const [activeMode, setActiveMode] = useState(initialConfig.activeMode || 'tejas');
  const [tejasConfig, setTejasConfig] = useState(initialConfig.tejas || {});
  const [coexConfig, setCoexConfig] = useState(initialConfig.coextrusion || {});

  // Sync with DB updates
  useEffect(() => {
    if (quotationData.calculator_config) {
      const conf = quotationData.calculator_config;
      if (conf.activeMode) setActiveMode(conf.activeMode);
      if (conf.tejas) setTejasConfig(conf.tejas);
      if (conf.coextrusion) setCoexConfig(conf.coextrusion);
      // Fallback for legacy data that was just the tejas object
      if (!conf.activeMode && !conf.tejas && !conf.coextrusion && Object.keys(conf).length > 0) {
        setTejasConfig(conf);
      }
    }
  }, [quotationData.calculator_config]);

  const handleSave = async () => {
    const fullConfig = {
      activeMode,
      tejas: tejasConfig,
      coextrusion: coexConfig
    };

    const { error } = await supabase
      .from('quotations')
      .update({ calculator_config: fullConfig })
      .eq('theme_key', activeTheme);

    if (error) {
      toast({ title: "Error", description: "No se pudieron guardar los parámetros.", variant: "destructive" });
    } else {
      toast({ title: "Guardado", description: "Configuración guardada correctamente." });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto py-8"
    >
      <SectionHeader sectionData={sectionData} />

      <Tabs value={activeMode} onValueChange={setActiveMode} className="w-full mt-8">
        <div className="flex justify-center mb-8">
          <TabsList className="bg-gray-900 border border-gray-800">
            <TabsTrigger value="tejas" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white px-8">
              Línea de Tejas
            </TabsTrigger>
            <TabsTrigger value="coextrusion" className="data-[state=active]:bg-green-600 data-[state=active]:text-white px-8">
              Coextrusión
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tejas">
          <TejasCalculator
            config={tejasConfig}
            onUpdate={setTejasConfig}
            isEditorMode={isEditorMode}
            onSave={handleSave}
            quotationData={quotationData}
          />
        </TabsContent>

        <TabsContent value="coextrusion">
          <CoextrusionCalculator
            config={coexConfig}
            onUpdate={setCoexConfig}
            isEditorMode={isEditorMode}
            onSave={handleSave}
          />
        </TabsContent>
      </Tabs>

    </motion.div>
  );
};

export default CalculadoraProduccion;