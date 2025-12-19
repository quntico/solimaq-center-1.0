import React from 'react';
import { motion } from 'framer-motion';

const formatCurrencyShort = (value) => {
  // CRITICAL FIX: Add validation for undefined or null values
  if (value === undefined || value === null || isNaN(value)) {
    return '$0';
  }
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const Bar = ({ value, maxValue, label, index, colorClass }) => {
  // Ensure height is always between 0 and 100
  const heightPercentage = maxValue > 0 ? Math.min(100, Math.max(0, (value / maxValue) * 100)) : 0;
  
  return (
    <div className="flex flex-col items-center h-full justify-end w-full" title={`${label}: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value)}`}>
      <motion.div
        className="text-xs font-bold text-white mb-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.1 + 0.5 }}
      >
        {formatCurrencyShort(value)}
      </motion.div>
      <motion.div
        className={`w-full rounded-t-md ${colorClass}`}
        initial={{ height: 0 }}
        animate={{ height: `${heightPercentage}%` }}
        transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      />
      <div className="mt-2 text-xs sm:text-sm text-gray-400 text-center">{label}</div>
    </div>
  );
};

const GraficaRentabilidad = ({ data }) => {
  // CRITICAL FIX: Validate data before rendering.
  if (!data || data.length === 0) {
    return (
        <div className="p-6 bg-gray-900/30 border border-gray-800 rounded-2xl text-center text-gray-500">
            No hay datos de rentabilidad para mostrar.
        </div>
    );
  }

  // CRITICAL FIX: Ensure 'Valor' is used and default to 0 if missing.
  const values = data.map(d => d.Valor || 0);
  const maxValue = Math.max(...values, 0);

  const barColors = [
    'bg-red-500/70',
    'bg-blue-500/70',
    'bg-gradient-to-t from-primary to-primary/50'
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-900/30 border border-gray-800 rounded-2xl">
      <h3 className="text-lg sm:text-xl font-semibold text-white mb-6 text-center">Desglose de Rentabilidad Mensual</h3>
      <div className="h-64 flex justify-around items-end gap-2 sm:gap-4">
        {data.map((item, index) => (
          <Bar
            key={item.name}
            value={item.Valor || 0} // Default to 0 if Valor is missing
            maxValue={maxValue}
            label={item.name}
            index={index}
            colorClass={barColors[index % barColors.length]}
          />
        ))}
      </div>
    </div>
  );
};

export default GraficaRentabilidad;