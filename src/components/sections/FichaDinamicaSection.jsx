import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionHeader from '@/components/SectionHeader';
import EditableField from '@/components/EditableField';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const defaultContent = {
  title: 'Fichas Técnicas Dinámicas',
  subtitle: 'Aquí puedes encontrar las especificaciones detalladas de los equipos.',
  sheets: [
    {
      id: `sheet_${Date.now()}`,
      title: 'Equipo Principal',
      description: 'Descripción detallada del equipo principal y sus componentes.',
      specs: [
        { id: `spec_${Date.now()}_1`, key: 'Modelo', value: 'LCB-300' },
        { id: `spec_${Date.now()}_2`, key: 'Capacidad', value: '300 kg/h' },
        { id: `spec_${Date.now()}_3`, key: 'Potencia', value: '45 kW' },
      ],
    },
  ],
};

const FichaDinamicaSection = ({ sectionData, isEditorMode, onContentChange, allSectionsData }) => {
  const { toast } = useToast();
  const content = { ...defaultContent, ...(sectionData.content || {}) };

  const propuestaEconomicaItems = useMemo(() => {
    if (!allSectionsData) return [];
    
    const propuestaSection = allSectionsData.find(s => s.id === 'propuesta' || s.id === 'propuesta_dinamica');
    if (!propuestaSection || !propuestaSection.content || !Array.isArray(propuestaSection.content.groups)) {
      return [];
    }
    
    return propuestaSection.content.groups.flatMap(group => group.items || []);
  }, [allSectionsData]);

  const updateContent = (newContent) => {
    onContentChange({ ...content, ...newContent });
  };

  const handleAddSheetFromPropuesta = (item) => {
    const newSheet = {
      id: `sheet_${Date.now()}`,
      title: item.title || 'Nueva Ficha Técnica',
      description: item.subtitle || 'Añade una descripción para este equipo.',
      specs: [
        { id: `spec_${Date.now()}_1`, key: 'Precio', value: String(item.price || 0) },
        { id: `spec_${Date.now()}_2`, key: 'Potencia (kW)', value: String(item.kw || 0) },
      ],
    };
    updateContent({ sheets: [...content.sheets, newSheet] });
    toast({
      title: "Ficha creada",
      description: `Se ha creado una ficha técnica para "${item.title}".`,
    });
  };

  const handleAddSheet = () => {
    const newSheet = {
      id: `sheet_${Date.now()}`,
      title: 'Nueva Ficha Técnica',
      description: 'Añade una descripción para este equipo.',
      specs: [{ id: `spec_${Date.now()}`, key: 'Nueva Especificación', value: 'Valor' }],
    };
    updateContent({ sheets: [...content.sheets, newSheet] });
  };

  const handleRemoveSheet = (sheetId) => {
    updateContent({ sheets: content.sheets.filter((sheet) => sheet.id !== sheetId) });
  };

  const handleSheetChange = (sheetId, field, value) => {
    const newSheets = content.sheets.map((sheet) =>
      sheet.id === sheetId ? { ...sheet, [field]: value } : sheet
    );
    updateContent({ sheets: newSheets });
  };

  const handleAddSpec = (sheetId) => {
    const newSheets = content.sheets.map((sheet) => {
      if (sheet.id === sheetId) {
        const newSpec = { id: `spec_${Date.now()}`, key: 'Nueva Especificación', value: 'Valor' };
        return { ...sheet, specs: [...sheet.specs, newSpec] };
      }
      return sheet;
    });
    updateContent({ sheets: newSheets });
  };

  const handleRemoveSpec = (sheetId, specId) => {
    const newSheets = content.sheets.map((sheet) => {
      if (sheet.id === sheetId) {
        return { ...sheet, specs: sheet.specs.filter((spec) => spec.id !== specId) };
      }
      return sheet;
    });
    updateContent({ sheets: newSheets });
  };

  const handleSpecChange = (sheetId, specId, field, value) => {
    const newSheets = content.sheets.map((sheet) => {
      if (sheet.id === sheetId) {
        const newSpecs = sheet.specs.map((spec) =>
          spec.id === specId ? { ...spec, [field]: value } : spec
        );
        return { ...sheet, specs: newSpecs };
      }
      return sheet;
    });
    updateContent({ sheets: newSheets });
  };

  return (
    <div className="py-16 sm:py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader
          sectionData={sectionData}
          isEditorMode={isEditorMode}
          onContentChange={updateContent}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-gray-400 max-w-2xl mx-auto -mt-6 mb-12"
        >
          <EditableField
            value={content.subtitle}
            onSave={(val) => updateContent({ subtitle: val })}
            isEditorMode={isEditorMode}
            className="text-lg"
          />
        </motion.div>

        {isEditorMode && propuestaEconomicaItems.length > 0 && (
          <motion.div 
            className="mb-12 p-6 bg-gray-900/50 border border-dashed border-gray-700 rounded-2xl"
            initial={{opacity: 0, y: -20}}
            animate={{opacity: 1, y: 0}}
            transition={{delay: 0.3}}
          >
            <h3 className="text-xl font-bold text-primary mb-4">Añadir Ficha desde Propuesta Económica</h3>
            <p className="text-gray-400 mb-6">Haz clic en un ítem para crear una nueva ficha técnica con su información.</p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {propuestaEconomicaItems.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-gray-800/60 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-gray-400">{item.subtitle}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAddSheetFromPropuesta(item)}>
                    <FilePlus2 className="h-4 w-4 mr-2" />
                    Añadir Ficha
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="space-y-12">
          <AnimatePresence>
            {content.sheets.map((sheet, sheetIndex) => (
              <motion.div
                key={sheet.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.95 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <EditableField
                      tag="h3"
                      value={sheet.title}
                      onSave={(val) => handleSheetChange(sheet.id, 'title', val)}
                      isEditorMode={isEditorMode}
                      className="text-2xl font-bold text-primary"
                      placeholder="Título de la Ficha"
                    />
                    {isEditorMode && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleRemoveSheet(sheet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <EditableField
                    value={sheet.description}
                    onSave={(val) => handleSheetChange(sheet.id, 'description', val)}
                    isEditorMode={isEditorMode}
                    className="text-gray-400 mb-6"
                    placeholder="Descripción del equipo..."
                  />

                  <div className="border-t border-gray-800 pt-6">
                    <h4 className="text-lg font-semibold mb-4">Especificaciones Técnicas</h4>
                    <div className="space-y-3">
                      {sheet.specs.map((spec, specIndex) => (
                        <motion.div
                          key={spec.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.3, delay: specIndex * 0.05 }}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50"
                        >
                          <EditableField
                            value={spec.key}
                            onSave={(val) => handleSpecChange(sheet.id, spec.id, 'key', val)}
                            isEditorMode={isEditorMode}
                            className="w-1/3 font-semibold text-gray-300"
                            inputClassName="bg-gray-900"
                            placeholder="Especificación"
                          />
                          <EditableField
                            value={spec.value}
                            onSave={(val) => handleSpecChange(sheet.id, spec.id, 'value', val)}
                            isEditorMode={isEditorMode}
                            className="w-2/3 text-white"
                            inputClassName="bg-gray-900"
                            placeholder="Valor"
                          />
                          {isEditorMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500/70 hover:text-red-500"
                              onClick={() => handleRemoveSpec(sheet.id, spec.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    {isEditorMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => handleAddSpec(sheet.id)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir Especificación
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {isEditorMode && (
          <div className="text-center mt-12">
            <Button onClick={handleAddSheet}>
              <Plus className="h-4 w-4 mr-2" />
              Añadir Ficha Manualmente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FichaDinamicaSection;