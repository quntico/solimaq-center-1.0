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
  textAlign = 'inherit',
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
    return <Tag className={cn('block w-full', className)} style={{ textAlign, ...props.style }} {...props}>{value}</Tag>;
  }

  const isMultiline = Tag === 'p' || Tag === 'textarea' || props.multiline;

  return (
    <div className="relative w-full">
      {isMultiline ? (
        <textarea
          ref={inputRef}
          value={internalValue || ''}
          onChange={(e) => setInternalValue(e.target.value)}
          onBlur={handleSave}
          className={cn(
            'w-full bg-gray-900/50 border border-blue-500/30 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500/80 transition-all resize-none min-h-[100px]',
            'placeholder:text-gray-500',
            className,
            inputClassName
          )}
          style={{ textAlign, ...props.style }}
          placeholder={placeholder}
          {...props}
        />
      ) : (
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
          style={{ textAlign, ...props.style }}
          placeholder={placeholder}
          {...props}
        />
      )}
    </div>
  );
};

export default EditableField;