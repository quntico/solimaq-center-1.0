import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Settings, Shield, LogOut, Edit, Calculator, Printer } from 'lucide-react';
import SidebarItem from './SidebarItem';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Sidebar = ({
  activeSection,
  onSectionSelect,
  onHomeClick,
  isCollapsed,
  setIsCollapsed,
  onAdminClick,
  isEditorMode,
  setIsEditorMode,
  sections,
  setSections,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
  isAdminView,
  onCotizadorClick,
  onSubItemSelect,
  activeTabMap
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [sectionToDelete, setSectionToDelete] = useState(null);

  const sidebarVariants = {
    collapsed: { width: '80px' },
    expanded: { width: '320px' },
  };

  const onDragEnd = (result) => {
    if (!result.destination || !isEditorMode) return;
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSections(items);
  };

  const toggleSectionVisibility = (id) => {
    const newSections = sections.map(section =>
      section.id === id ? { ...section, isVisible: !section.isVisible } : section
    );
    setSections(newSections);

    const updatedSection = newSections.find(s => s.id === id);
    toast({
      title: updatedSection.isVisible ? "Sección Visible" : "Sección Oculta",
      description: `La sección "${updatedSection.label}" ahora está ${updatedSection.isVisible ? 'visible' : 'oculta'}.`,
    });
  };

  // --- Editor Functions ---

  const moveSection = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Swap
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    setSections(newSections);
  };

  const updateSectionLabel = (id, newLabel) => {
    const newSections = sections.map(s =>
      s.id === id ? { ...s, label: newLabel } : s
    );
    setSections(newSections);
  };

  const updateSectionIcon = (id, newIcon) => {
    const newSections = sections.map(s =>
      s.id === id ? { ...s, icon: newIcon } : s
    );
    setSections(newSections);
  };

  const duplicateSection = (section, index) => {
    const newId = `${section.id}_copy_${Date.now()}`;
    const newSection = {
      ...section,
      id: newId,
      label: `${section.label} (Copia)`,
      isVisible: true
    };

    const newSections = [...sections];
    newSections.splice(index + 1, 0, newSection);
    setSections(newSections);
  };

  const requestDelete = (id) => {
    setSectionToDelete(id);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      const newSections = sections.filter(s => s.id !== sectionToDelete);
      setSections(newSections);
      setSectionToDelete(null);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <motion.div
          initial={false}
          animate={isCollapsed ? 'collapsed' : 'expanded'}
          variants={sidebarVariants}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-black border-r border-gray-800 flex flex-col h-full text-white relative z-20"
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-800">
              {!isCollapsed && <span className="font-bold text-lg">{t('sidebar.menu')}</span>}
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded-full hover:bg-gray-800 transition-colors">
                {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
              </button>
            </div>

            <nav className="mt-4 pb-80">
              <Droppable droppableId="sections">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {sections.map((section, index) => (
                      <Draggable
                        key={section.id}
                        draggableId={section.id}
                        index={index}
                        isDragDisabled={!isEditorMode || isCollapsed}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                          >
                            <SidebarItem
                              section={section}
                              isActive={activeSection === section.id}
                              isCollapsed={isCollapsed}
                              onClick={() => section.id === 'portada' ? onHomeClick() : onSectionSelect(section.id)}
                              isEditorMode={isEditorMode}
                              onVisibilityToggle={() => toggleSectionVisibility(section.id)}

                              subItems={section.subItems}
                              onSubItemSelect={(index) => onSubItemSelect && onSubItemSelect(section.id, index)}
                              activeSubItemIndex={activeTabMap ? activeTabMap[section.id] : undefined}

                              onMoveUp={(e) => { e.stopPropagation(); moveSection(index, 'up'); }}
                              onMoveDown={(e) => { e.stopPropagation(); moveSection(index, 'down'); }}
                              onLabelChange={(val) => updateSectionLabel(section.id, val)}
                              onIconChange={(val) => updateSectionIcon(section.id, val)}
                              onDuplicate={(e) => { e.stopPropagation(); duplicateSection(section, index); }}
                              onDelete={(e) => { e?.stopPropagation?.(); requestDelete(section.id); }}

                              isFirst={index === 0}
                              isLast={index === sections.length - 1}

                              isDragging={snapshot.isDragging}
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </nav>
          </div>

          {isAdminView && (
            <div className="p-4 border-t border-gray-800 space-y-2 bg-black absolute bottom-0 w-full z-30">
              {isAdminAuthenticated && (
                <>
                  <button
                    onClick={onCotizadorClick}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeSection === 'cotizador_page' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800'}`}
                  >
                    <Calculator size={20} />
                    {!isCollapsed && <span className="ml-4 font-semibold">{t('sidebar.cotizadorMode')}</span>}
                  </button>
                  <button
                    onClick={() => setIsEditorMode(!isEditorMode)}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors ${isEditorMode ? 'bg-green-500/10 text-green-400' : 'hover:bg-gray-800'}`}
                  >
                    <Edit size={20} />
                    {!isCollapsed && <span className="ml-4 font-semibold">{t('sidebar.editorMode')}</span>}
                  </button>
                  <button
                    onClick={onAdminClick}
                    className="w-full flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Settings size={20} />
                    {!isCollapsed && <span className="ml-4 font-semibold">{t('sidebar.admin')}</span>}
                  </button>
                </>
              )}
              <button
                onClick={isAdminAuthenticated ? onAdminLogout : onAdminLogin}
                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isAdminAuthenticated ? <LogOut size={20} className="text-red-500" /> : <Shield size={20} />}
                {!isCollapsed && <span className="ml-4 font-semibold">{isAdminAuthenticated ? t('sidebar.logout') : t('sidebar.login')}</span>}
              </button>
            </div>
          )}
        </motion.div>
      </DragDropContext>

      <AlertDialog open={!!sectionToDelete} onOpenChange={(open) => !open && setSectionToDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sidebar.deleteTitle') || 'Eliminar sección'}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {t('sidebar.deleteConfirm') || '¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700">
              {t('common.cancel') || 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete') || 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Sidebar;