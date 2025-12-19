import React, { useState, useEffect, useMemo } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const initialIngredientsData = {
  recicladoLDPE: { name: 'Plástico reciclado LDPE', density: 920, cost: 15, color: 'bg-green-500' },
  virgenLDPE: { name: 'Plástico virgen LDPE', density: 925, cost: 35, color: 'bg-blue-500' },
  caco3: { name: 'CaCO3 (Carbonato de Calcio)', density: 2710, cost: 5, color: 'bg-gray-400' },
};

const IngredientRow = ({ id, data, percentage, cost, onPercentageChange, onCostChange, isEditorMode, isInvalid }) => (
  <div className="grid grid-cols-12 gap-4 items-center">
    <div className="col-span-12 md:col-span-5">
      <Label htmlFor={`${id}-percentage`} className="text-sm font-medium text-gray-300">
        {data.name} <span className="text-xs text-gray-500">({data.density} kg/m³)</span>
      </Label>
    </div>
    <div className="col-span-6 md:col-span-3 flex items-center gap-2">
       <div className={`w-3 h-3 rounded-full ${data.color}`}></div>
       <Slider
        id={`${id}-percentage`}
        min={0}
        max={100}
        step={1}
        value={[percentage]}
        onValueChange={(newValue) => onPercentageChange(id, newValue[0], 'slider')}
        className="flex-grow"
      />
    </div>
    <div className="col-span-6 md:col-span-2 flex items-center">
        <Input
            type="number"
            value={percentage}
            onChange={(e) => onPercentageChange(id, parseInt(e.target.value, 10), 'input')}
            onFocus={(e) => e.target.select()}
            className={`bg-transparent border-0 text-white w-16 text-right font-bold focus:ring-0 focus:border-primary ${isInvalid ? 'text-red-500' : ''}`}
        />
        <span className={`font-bold ${isInvalid ? 'text-red-500' : 'text-white'}`}>%</span>
    </div>
    <div className="col-span-12 md:col-span-2 flex items-center gap-1">
      <Input
        type="number"
        id={`${id}-cost`}
        value={cost}
        onChange={(e) => onCostChange(id, parseFloat(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
        className={`bg-gray-800/80 border-gray-600 text-white h-8 text-sm w-full ${isEditorMode ? 'border-primary' : ''}`}
        placeholder="Costo"
        style={{ minWidth: '60px' }} 
      />
      <span className="text-xs text-gray-400">MXN/kg</span>
    </div>
  </div>
);

export const DensidadReceta = ({ onValuesChange, initialPercentages, initialCosts, isEditorMode }) => {
  const [percentages, setPercentages] = useState(initialPercentages);
  const [costs, setCosts] = useState(initialCosts);

  useEffect(() => {
    if (!isEditorMode) {
      setPercentages(initialPercentages);
      setCosts(initialCosts);
    }
  }, [initialPercentages, initialCosts, isEditorMode]);

  const { calculatedDensity, calculatedCost, totalPercentage } = useMemo(() => {
    const currentPercentages = percentages || {};
    const currentCosts = costs || {};
    const totalP = Object.values(currentPercentages).reduce((sum, p) => sum + p, 0);
    
    if (totalP === 0) return { calculatedDensity: 0, calculatedCost: 0, totalPercentage: 0 };
    
    let weightedDensity = 0;
    let weightedCost = 0;

    for (const key in currentPercentages) {
        const percentage = (currentPercentages[key] || 0) / 100;
        weightedDensity += (initialIngredientsData[key]?.density || 0) * percentage;
        weightedCost += (currentCosts[key] || 0) * percentage;
    }
    
    return {
      calculatedDensity: Math.round(weightedDensity),
      calculatedCost: weightedCost,
      totalPercentage: totalP
    };
  }, [percentages, costs]);

  const isFormulaInvalid = totalPercentage !== 100;

  useEffect(() => {
    onValuesChange(calculatedDensity, calculatedCost, percentages, costs);
  }, [calculatedDensity, calculatedCost, percentages, costs, onValuesChange]);

  const handlePercentageChange = (id, newValue, source) => {
    let parsedValue = isNaN(newValue) ? 0 : newValue;

    setPercentages(prev => {
        const otherValuesSum = Object.keys(prev)
            .filter(key => key !== id)
            .reduce((sum, key) => sum + prev[key], 0);

        if (parsedValue + otherValuesSum > 100) {
            parsedValue = 100 - otherValuesSum;
        }
        
        return { ...prev, [id]: Math.max(0, parsedValue) };
    });
  };

  const handleCostChange = (id, newCost) => {
    setCosts(prev => ({...prev, [id]: newCost}));
  };

  return (
    <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/30">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-4">
              {Object.keys(initialIngredientsData).map(key => (
                <IngredientRow 
                  key={key}
                  id={key}
                  data={initialIngredientsData[key]}
                  percentage={percentages?.[key] || 0}
                  cost={costs?.[key] || 0}
                  onPercentageChange={handlePercentageChange}
                  onCostChange={handleCostChange}
                  isEditorMode={isEditorMode}
                  isInvalid={isFormulaInvalid}
                />
              ))}
            </div>
            <div className="flex flex-col md:flex-row lg:flex-col items-center justify-around gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-gray-900/50 rounded-lg w-full">
                    <p className="text-sm text-gray-400">Densidad Calculada</p>
                    <p className="text-4xl font-bold text-primary my-1">{calculatedDensity}</p>
                    <p className="text-sm text-gray-400">kg/m³</p>
                </div>
                 <div className="flex flex-col items-center justify-center p-4 bg-gray-900/50 rounded-lg w-full">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-400">Costo de Mezcla</p>
                        {isFormulaInvalid && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>La suma de porcentajes debe ser 100%.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <p className={`text-4xl font-bold my-1 ${isFormulaInvalid ? 'text-yellow-400' : 'text-primary'}`}>{calculatedCost.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">MXN/kg</p>
                </div>
            </div>
        </div>
    </div>
  );
};