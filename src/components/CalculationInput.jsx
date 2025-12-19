import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const CalculationInput = ({
  label,
  id,
  config,
  onConfigChange,
  subtotal,
  tipoCambio,
}) => {
  const handleTypeChange = (newType) => {
    const { type: oldType, value: oldValue } = config;
    if (newType === oldType) return;

    // 1. Calculate the current value in USD as a common base
    let currentValueUSD = 0;
    switch (oldType) {
      case 'percent':
        currentValueUSD = subtotal * (oldValue / 100);
        break;
      case 'usd':
        currentValueUSD = oldValue;
        break;
      case 'mxn':
        currentValueUSD = oldValue / tipoCambio;
        break;
      default:
        break;
    }

    // 2. Calculate the new input value based on the new type
    let newInputValue = 0;
    switch (newType) {
      case 'percent':
        newInputValue = subtotal > 0 ? (currentValueUSD / subtotal) * 100 : 0;
        break;
      case 'usd':
        newInputValue = currentValueUSD;
        break;
      case 'mxn':
        newInputValue = currentValueUSD * tipoCambio;
        break;
      default:
        break;
    }

    // Round to 2 decimal places for cleaner inputs
    const roundedNewValue = Math.round(newInputValue * 100) / 100;

    onConfigChange({ type: newType, value: roundedNewValue });
  };

  const handleValueChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    onConfigChange({ ...config, value: newValue });
  };

  const calculatedValueUSD = React.useMemo(() => {
    switch (config.type) {
      case 'percent':
        return subtotal * (config.value / 100);
      case 'usd':
        return config.value;
      case 'mxn':
        return config.value / tipoCambio;
      default:
        return 0;
    }
  }, [config, subtotal, tipoCambio]);

  const getInputSymbol = () => {
    if (config.type === 'percent') return '%';
    if (config.type === 'usd') return 'USD';
    if (config.type === 'mxn') return 'MXN';
    return '';
  };

  return (
    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg">
      <Label htmlFor={id} className="text-[#2563eb] font-semibold">{label}</Label>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 w-full relative">
          <Input
            type="number"
            id={id}
            value={config.value || ''}
            onChange={handleValueChange}
            onFocus={(e) => e.target.select()}
            className="pr-12"
          />
          <div className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">
            {getInputSymbol()}
          </div>
        </div>
        <RadioGroup
          value={config.type}
          onValueChange={handleTypeChange}
          className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percent" id={`${id}-percent`} />
            <Label htmlFor={`${id}-percent`}>%</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="usd" id={`${id}-usd`} />
            <Label htmlFor={`${id}-usd`}>USD</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="mxn" id={`${id}-mxn`} />
            <Label htmlFor={`${id}-mxn`}>MXN</Label>
          </div>
        </RadioGroup>
      </div>
      <div className="text-right text-xs text-gray-400 font-mono pt-1">
        = {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(calculatedValueUSD)} USD
      </div>
    </div>
  );
};

export default CalculationInput;