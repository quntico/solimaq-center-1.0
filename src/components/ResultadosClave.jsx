import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, DollarSign, Package, TrendingUp, Clock } from 'lucide-react';

const formatNumber = (num) => new Intl.NumberFormat('es-MX').format(num);

const ResultadoItem = ({ icon, label, value, unit, bgColor }) => (
  <motion.div 
    className={`p-4 rounded-lg flex items-center gap-4 ${bgColor}`}
    whileHover={{ scale: 1.05 }}
    transition={{ type: "spring", stiffness: 300 }}
  >
    {icon}
    <div>
      <p className="text-sm text-white/80">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value} <span className="text-lg font-normal text-white/70">{unit}</span>
      </p>
    </div>
  </motion.div>
);

const ResultadosClave = ({ results, rentabilidad }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Resultados Clave</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultadoItem
          icon={<Clock className="w-8 h-8 text-blue-300" />}
          label="Producción por Hora"
          value={formatNumber(results.tejas_por_hora || 0)}
          unit="tejas"
          bgColor="bg-blue-900/50"
        />
        <ResultadoItem
          icon={<Package className="w-8 h-8 text-cyan-300" />}
          label="Producción Mensual (Tejas)"
          value={formatNumber(results.produccion_mensual_tejas || 0)}
          unit="unidades"
          bgColor="bg-cyan-900/50"
        />
        <ResultadoItem
          icon={<BarChart className="w-8 h-8 text-green-300" />}
          label="Producción Mensual (Kg)"
          value={formatNumber(results.produccion_mensual_kg || 0)}
          unit="kg"
          bgColor="bg-green-900/50"
        />
        <ResultadoItem
          icon={<TrendingUp className="w-8 h-8 text-purple-300" />}
          label="Utilidad Bruta Mensual"
          value={formatCurrency(rentabilidad.utilidad_bruta || 0)}
          unit="MXN"
          bgColor="bg-purple-900/50"
        />
      </div>
    </div>
  );
};

export default ResultadosClave;