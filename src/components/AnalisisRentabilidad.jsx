import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GraficaRentabilidad from '@/components/GraficaRentabilidad';

const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0;
    }
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
};

const AnalisisRentabilidad = ({ rentabilidad, quotationData }) => {
    // Desestructuración segura de 'rentabilidad' con valores por defecto
    const { 
        costo_total_produccion = 0, 
        ingresos_totales = 0, 
        utilidad_bruta = 0, 
        margen_bruto = 0 
    } = rentabilidad || {};

    const dataGrafica = [
        { name: 'Costo Total', value: costo_total_produccion, fill: '#ef4444' },
        { name: 'Utilidad Bruta', value: utilidad_bruta > 0 ? utilidad_bruta : 0, fill: '#8b5cf6' },
    ];
    
    // Cálculo seguro de 'inversionEquipos' con validación robusta
    const inversionEquipos = 
        (quotationData?.cost_config?.items && Array.isArray(quotationData.cost_config.items))
        ? quotationData.cost_config.items.reduce((acc, item) => {
            const cost = typeof item.cost === 'number' ? item.cost : 0;
            const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
            return acc + (cost * quantity);
        }, 0)
        : 0;

    const inversionFinal = inversionEquipos > 0 ? inversionEquipos : 1; // Evita división por cero

    const roi = (utilidad_bruta * 12) / inversionFinal * 100;
    const paybackMeses = inversionFinal / (utilidad_bruta || 1);

    const StatCard = ({ title, value, unit, tooltipText }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div 
                        className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-center cursor-help"
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(31, 41, 55, 0.7)' }}
                    >
                        <p className="text-sm text-gray-400">{title}</p>
                        <p className="text-2xl font-bold text-white">
                            {value}
                            {unit && <span className="text-lg font-normal text-gray-300 ml-1">{unit}</span>}
                        </p>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <StatCard 
                    title="Ingresos Totales Mensuales"
                    value={formatCurrency(ingresos_totales)}
                    tooltipText="Total de ingresos generados por la venta de tejas en un mes."
                />
                <StatCard 
                    title="Costo Total Mensual"
                    value={formatCurrency(costo_total_produccion)}
                    tooltipText="Suma de costos de materia prima, empaque y operativos en un mes."
                />
                 <StatCard 
                    title="Utilidad Bruta Mensual"
                    value={formatCurrency(utilidad_bruta)}
                    tooltipText="Ingresos totales menos el costo total de producción."
                />
            </div>

            <div className="relative h-64 md:h-auto">
                <GraficaRentabilidad data={dataGrafica} />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
               <StatCard 
                    title="Margen Bruto"
                    value={margen_bruto ? margen_bruto.toFixed(1) : '0.0'}
                    unit="%"
                    tooltipText="Porcentaje de la utilidad bruta sobre los ingresos totales."
                />
                <StatCard 
                    title="ROI (Anual)"
                    value={inversionEquipos > 0 && isFinite(roi) ? roi.toFixed(1) : 'N/A'}
                    unit="%"
                    tooltipText="Retorno de la Inversión. Utilidad anual sobre la inversión en equipos."
                />
                <StatCard 
                    title="Payback"
                    value={inversionEquipos > 0 && isFinite(paybackMeses) && paybackMeses > 0 ? paybackMeses.toFixed(1) : 'N/A'}
                    unit="meses"
                    tooltipText="Tiempo en meses para recuperar la inversión inicial con la utilidad generada."
                />
            </div>
        </div>
    );
};

export default AnalisisRentabilidad;