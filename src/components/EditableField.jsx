import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const EditableField = ({
  value,
  onSave,
  isEditorMode,
  className = '',
  inputClassName = '',
  placeholder = 'Editar...',
  tag: Tag = 'span',
  type = 'text',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const inputRef = useRef(null);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleSave = async () => {
    if (internalValue != value) {
      await onSave(internalValue);
    }
  };

  if (!isEditorMode) {
    return <Tag className={cn('block w-full', className)} {...props}>{value}</Tag>;
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={internalValue || ''}
        onChange={(e) => setInternalValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
            inputRef.current?.blur();
          }
          if (e.key === 'Escape') {
            setInternalValue(value);
            inputRef.current?.blur();
          }
        }}
        className={cn(
          'w-full bg-gray-900/50 border border-blue-500/30 rounded-md p-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500/80 transition-all',
          'placeholder:text-gray-500',
          className,
          inputClassName
        )}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
};

export default EditableField;