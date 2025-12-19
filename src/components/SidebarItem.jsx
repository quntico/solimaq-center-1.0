import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  GripVertical,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  MoreVertical,
  Edit2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { iconMap } from '@/lib/iconMap';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from '@/contexts/LanguageContext';
import IconPicker from './IconPicker';

const SidebarItem = ({
  section,
  isActive,
  onClick,
  isCollapsed,
  isEditorMode,
  onVisibilityToggle,

  onMoveUp,
  onMoveDown,
  onLabelChange,
  onIconChange,
  onDuplicate,
  onDelete,
  isFirst,
  isLast,

  dragHandleProps,
  isDragging,
  subItems,
  onSubItemSelect,
  activeSubItemIndex
}) => {
  const { t } = useLanguage();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [tempLabel, setTempLabel] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);

  // Logic to determine display label:
  // Prioritize translation for standard sections, fallback to DB label
  const translationKey = `sections.${section.id}`;
  const translatedLabel = t(translationKey);
  // Check if translation exists (assumes t() returns key if not found, or matches exactly if strictly defined)
  // Simple check: If translatedLabel is different from key, use it. 
  // ALSO check if it's a "standard" section ID to avoid translating custom user IDs that might coincidentally match.
  // Actually, t() returns content from translations.js. If returns key, then no translation.

  const displayLabel = translatedLabel !== translationKey ? translatedLabel : (section.label || section.id);

  useEffect(() => {
    setTempLabel(displayLabel);
  }, [displayLabel]);

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select all text for easy replacement
    }
  }, [isEditingLabel]);

  // Auto-expand if active or if a sub-item is active
  // Auto-expand if active, collapse if not active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isActive]);

  if (!section || !section.id) {
    return null;
  }

  const Icon = section.icon && iconMap[section.icon] ? iconMap[section.icon] : iconMap['FileText'];
  const isVisible = section.isVisible !== false;

  // FORCE UNLOCK: Always allow editing these sections regardless of DB config
  const forceUnlockedIds = ['ia', 'layout', 'video', 'calculadora_prod'];
  const isLocked = section.isLocked && !forceUnlockedIds.includes(section.id);

  const handleSaveLabel = () => {
    if (tempLabel.trim() !== "" && tempLabel !== displayLabel) {
      onLabelChange(tempLabel);
    }
    setIsEditingLabel(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      setTempLabel(displayLabel);
      setIsEditingLabel(false);
    }
    e.stopPropagation();
  };

  const handleMainClick = (e) => {
    if (!isEditingLabel) {
      if (subItems && subItems.length > 0) {
        setIsExpanded(!isExpanded);
        onClick(e); // Still trigger main selection
      } else {
        onClick(e);
      }
    }
  };

  const hasSubItems = subItems && subItems.length > 0;

  const itemContent = (
    <div className="w-full">
      <div
        className={cn(
          "group relative flex items-center w-full cursor-pointer min-h-[40px]",
          isDragging && "opacity-50"
        )}
        onClick={handleMainClick}
      >
        {/* Drag Handle - Only in Editor Mode */}
        {isEditorMode && !isCollapsed && (
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 mr-1 opacity-30 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
        )}

        <IconPicker
          value={section.icon}
          onChange={onIconChange}
          isEditorMode={isEditorMode && !isLocked}
          trigger={
            <div
              className={cn(
                "flex-shrink-0 transition-transform duration-200 p-1 rounded-md",
                isEditorMode && !isLocked ? "hover:bg-white/10 cursor-pointer" : ""
              )}
              onClick={(e) => isEditorMode && !isLocked && e.stopPropagation()}
            >
              <Icon className={cn(
                "w-5 h-5 led-blue-hover",
                isActive && (hasSubItems ? "text-blue-600" : "scale-110 led-blue-text"),
                isCollapsed && "mx-auto"
              )} />
            </div>
          }
        />

        {!isCollapsed && (
          <div className="ml-3 flex-1 overflow-hidden relative flex items-center justify-between">
            {isEditorMode && isEditingLabel ? (
              <input
                ref={inputRef}
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                onBlur={handleSaveLabel}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-gray-900 text-white text-sm px-2 py-1 rounded border border-blue-500 outline-none shadow-lg z-50 relative"
              />
            ) : (
              <span
                className={cn(
                  "block truncate text-sm transition-all duration-200 select-none led-blue-hover",
                  isActive
                    ? (hasSubItems ? "font-bold text-blue-600" : "font-semibold led-blue-text")
                    : "text-gray-300",
                  isEditorMode && !isLocked && "hover:text-blue-400 cursor-text"
                )}
                onDoubleClick={(e) => {
                  if (isEditorMode && !isLocked) {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditingLabel(true);
                  }
                }}
                title={isEditorMode ? "Doble clic para renombrar" : ""}
              >
                {displayLabel}
              </span>
            )}
            {/* Chevron for sub-items */}
            {hasSubItems && (
              <div className="mr-2 text-gray-500">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
          </div>
        )}

        {isActive && !isCollapsed && !isEditorMode && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-l-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        {/* Editor Controls - Only Visible in Editor Mode & Not Collapsed */}
        {isEditorMode && !isCollapsed && (
          <div className="ml-auto flex items-center gap-1 opacity-100 transition-opacity bg-black/90 backdrop-blur-sm rounded-l-md pl-1 shadow-xl border-l border-gray-800/50 absolute right-0 h-full pr-1">

            {/* Rename Button (Direct Access) */}
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditingLabel(true); }}
                className="p-1.5 hover:text-blue-400 text-gray-400 transition-colors rounded-md hover:bg-white/5"
                title="Renombrar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Button (Direct Access) */}
            {!isLocked && (
              <button
                onClick={onDelete}
                className="p-1.5 hover:text-red-400 text-gray-400 transition-colors rounded-md hover:bg-white/5"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Visibility Toggle */}
            {!isLocked && (
              <button
                onClick={(e) => { e.stopPropagation(); onVisibilityToggle(); }}
                className={cn(
                  "p-1.5 transition-colors rounded-md hover:bg-white/5",
                  isVisible ? "hover:text-blue-400 text-gray-400" : "text-gray-600"
                )}
                title={isVisible ? "Ocultar" : "Mostrar"}
              >
                {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:text-white text-gray-400 transition-colors rounded-md hover:bg-white/5" onClick={(e) => e.stopPropagation()}>
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-800 text-gray-200 z-[60]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst} className="cursor-pointer focus:bg-gray-800">
                  <ArrowUp className="w-4 h-4 mr-2" /> Mover Arriba
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast} className="cursor-pointer focus:bg-gray-800">
                  <ArrowDown className="w-4 h-4 mr-2" /> Mover Abajo
                </DropdownMenuItem>

                {!isLocked && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(e); }} className="cursor-pointer focus:bg-gray-800">
                      <Copy className="w-4 h-4 mr-2" /> Duplicar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Sub-items Render */}
      {!isCollapsed && isExpanded && hasSubItems && (
        <div className="pl-9 space-y-1 mt-1">
          {subItems.map((subItem, idx) => {
            const SubIcon = subItem.icon && iconMap[subItem.icon] ? iconMap[subItem.icon] : iconMap['FileText'];
            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubItemSelect(subItem.id);
                }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-sm",
                  activeSubItemIndex === subItem.id
                    ? "text-blue-600 underline decoration-blue-600 underline-offset-4 font-bold"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
              >
                <SubIcon size={14} />
                <span className="truncate">{subItem.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Debugging log to verify code update and logic
  // console.log(`SidebarItem: ${section.id}, isActive: ${isActive}, hasSubItems: ${hasSubItems}`);

  let containerClasses = "flex flex-col px-3 py-2 my-1 rounded-lg transition-all duration-200 border border-transparent";

  // Only apply hover effect if it has NO sub-items (leaf nodes)
  if (!hasSubItems) {
    containerClasses += " led-blue-box-hover";
  }

  // Only apply solid blue background (led-blue-box) if it's active AND has NO sub-items
  if (isActive && !isEditorMode && !hasSubItems) {
    containerClasses += " led-blue-box";
  }

  // Editor mode active style
  if (isEditorMode && isActive) {
    containerClasses += " bg-blue-500/10 border-blue-500/30";
  }

  // Hidden item style
  if (!isVisible && isEditorMode) {
    containerClasses += " opacity-50 grayscale";
  }

  return (
    <motion.div
      layout
      className={containerClasses}
    >
      {isCollapsed ? (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
            <TooltipContent side="right" className="bg-black text-white border-gray-700 z-50">
              <p>{displayLabel}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        itemContent
      )}
    </motion.div>
  );
};

export default SidebarItem;