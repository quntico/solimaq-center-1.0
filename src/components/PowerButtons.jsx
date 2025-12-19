import React from 'react';
import { cn } from '@/lib/utils';

const PowerButton = ({ isActive, onClick, type }) => {
  const isGreen = type === 'on';
  const colorClass = isGreen ? 'bg-green-500' : 'bg-red-500';
  const activeClass = isGreen
    ? 'border-yellow-400 shadow-[0_0_8px_theme(colors.yellow.400)]'
    : 'border-white shadow-[0_0_8px_theme(colors.white)]';
  const inactiveClass = 'border-gray-600 opacity-50';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center',
        isActive ? activeClass : inactiveClass
      )}
    >
      <span className={cn('h-4 w-4 rounded-full', colorClass)} />
    </button>
  );
};

const PowerButtons = ({ isChecked, onCheckedChange }) => {
  return (
    <div className="flex items-center gap-2">
      <PowerButton
        type="on"
        isActive={isChecked}
        onClick={() => onCheckedChange(true)}
      />
      <PowerButton
        type="off"
        isActive={!isChecked}
        onClick={() => onCheckedChange(false)}
      />
    </div>
  );
};

export default PowerButtons;