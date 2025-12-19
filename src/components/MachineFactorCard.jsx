import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Package, Edit3 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const FactorInfo = ({ label, value, icon: Icon, className = "" }) => (
  <div className={`flex flex-col items-center text-center ${className}`}>
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-gray-400" />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
    <p className="text-lg font-bold text-white mt-1">{value}</p>
  </div>
);

const MachineFactorCard = ({ machineName, onMachineNameChange, cost, factor, sellingPrice }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(machineName);

  useEffect(() => {
    setName(machineName);
  }, [machineName]);

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (name.trim() && name !== machineName) {
      onMachineNameChange(name.trim());
    } else {
      setName(machineName); // Revert if empty or unchanged
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setName(machineName);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-black/20 rounded-lg p-5 border border-gray-700/50 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-4 border-b border-gray-700/50 pb-3 group">
        <Package className="w-6 h-6 text-primary" />
        {isEditing ? (
          <Input
            type="text"
            value={name}
            onChange={handleNameChange}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-xl font-bold uppercase tracking-wider bg-transparent border-primary h-auto p-0"
          />
        ) : (
          <h3
            className="text-xl font-bold text-white uppercase tracking-wider cursor-pointer flex-grow"
            onClick={() => setIsEditing(true)}
          >
            {name}
          </h3>
        )}
        <Edit3 className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
      </div>
      <div className="flex justify-between items-start gap-4">
        <FactorInfo label="Costo" value={formatCurrency(cost)} icon={DollarSign} />
        <div className="h-12 border-l border-gray-700"></div>
        <FactorInfo 
          label="Factor" 
          value={factor.toFixed(2)} 
          icon={TrendingUp}
        />
        <div className="h-12 border-l border-gray-700"></div>
        <FactorInfo 
          label="Precio Venta" 
          value={formatCurrency(sellingPrice)} 
          icon={DollarSign}
          className="text-primary"
        />
      </div>
      <div className="relative h-1 bg-gray-700/50 rounded-full mt-5 overflow-hidden">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: sellingPrice > 0 ? `${(cost / sellingPrice) * 100}%` : '0%' }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>
       <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Costo</span>
        <span>Utilidad</span>
      </div>
    </motion.div>
  );
};

export default MachineFactorCard;