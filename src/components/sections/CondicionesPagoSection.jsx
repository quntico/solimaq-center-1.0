import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Factory, Ship, Edit, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const EditableText = ({ value, onSave, isEditorMode, className = '', tag: Tag = 'p' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(text);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!isEditorMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-gray-900 border border-primary rounded-md p-2 text-white focus:outline-none"
          />
          <button onClick={handleSave} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-500" disabled={isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          </button>
          <button onClick={() => setIsEditing(false)} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700">
            <X size={14} />
          </button>
        </div>
      ) : (
        <Tag onClick={() => setIsEditing(true)} className={`${className} cursor-pointer p-1 border border-transparent group-hover:border-primary/30 rounded-md transition-all relative`}>
          <Edit className="absolute -top-1 -right-1 w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          {value}
        </Tag>
      )}
    </div>
  );
};

const PaymentCard = ({ term, isEditorMode, onUpdate, onSave }) => {
  const [localPercentage, setLocalPercentage] = useState(term.percentage);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  useEffect(() => {
    setLocalPercentage(term.percentage);
  }, [term.percentage]);

  const handleSliderChange = (newPercentage) => {
    setLocalPercentage(newPercentage[0]);
    onUpdate(term.id, newPercentage[0]);
  };
  
  const handleSaveAll = () => {
    onSave();
    setPopoverOpen(false);
  };

  const Icon = {
    anticipo: DollarSign,
    terminacion: Factory,
    llegada: Ship,
  }[term.id];

  return (
    <motion.div
      variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
      className="bg-gray-900/50 p-8 rounded-2xl border border-gray-800/80 flex flex-col items-center text-center"
    >
      <div className="p-4 bg-primary/10 rounded-full mb-6">
        <Icon className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">
        <EditableText value={term.title} onSave={(v) => onSave({ ...term, title: v })} isEditorMode={isEditorMode} tag="span" />
      </h3>

      {isEditorMode ? (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <div className="relative group cursor-pointer">
              <p className="text-3xl font-black text-primary p-2 border border-transparent group-hover:border-primary/30 rounded-md">
                {localPercentage}%
              </p>
              <Edit className="absolute -top-1 -right-1 w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-gray-900 border-primary/50 text-white">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Ajustar Porcentaje</h4>
                <p className="text-sm text-gray-400">
                  Modifica el porcentaje para <span className="text-primary font-semibold">{term.title}</span>.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{localPercentage}%</span>
                </div>
                <Slider
                  value={[localPercentage]}
                  max={100}
                  step={1}
                  onValueChange={handleSliderChange}
                />
              </div>
              <Button onClick={handleSaveAll} size="sm">Guardar Cambios</Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <p className="text-3xl font-black text-primary mb-3">{term.percentage}%</p>
      )}

      <p className="text-gray-400 leading-relaxed">
        <EditableText value={term.description} onSave={(v) => onSave({ ...term, description: v })} isEditorMode={isEditorMode} />
      </p>
    </motion.div>
  );
};


const CondicionesPagoSection = ({ sectionData, isEditorMode, onContentChange }) => {
  const { toast } = useToast();

  const defaultContent = {
    subtitle: "Términos claros para una colaboración transparente.",
    terms: [
      { id: 'anticipo', title: 'Anticipo', percentage: 40, description: 'al formalizar el pedido.' },
      { id: 'terminacion', title: 'Contra Terminación en China', percentage: 55, description: 'al finalizar la producción en fábrica.' },
      { id: 'llegada', title: 'Contra Llegada a Puerto Mexicano', percentage: 5, description: 'a la llegada de la maquinaria al puerto.' },
    ],
  };

  const content = { ...defaultContent, ...sectionData.content };
  const stringifiedTerms = JSON.stringify(content.terms);

  const [currentTerms, setCurrentTerms] = useState(() => content.terms);

  useEffect(() => {
    setCurrentTerms(JSON.parse(stringifiedTerms));
  }, [stringifiedTerms]);

  const handleTermUpdate = (updatedId, newPercentage) => {
    setCurrentTerms(prevTerms => {
      const updatedTermIndex = prevTerms.findIndex(t => t.id === updatedId);
      let newTerms = JSON.parse(JSON.stringify(prevTerms));
      const oldPercentage = newTerms[updatedTermIndex].percentage;
      const diff = newPercentage - oldPercentage;
  
      newTerms[updatedTermIndex].percentage = newPercentage;
      let remainingDiff = -diff;
      
      let otherTerms = newTerms.filter(t => t.id !== updatedId);
      
      while (Math.abs(remainingDiff) > 0.01) {
          let totalAdjustable = otherTerms.reduce((sum, term) => {
              if (remainingDiff > 0 && term.percentage < 100) return sum + (100 - term.percentage);
              if (remainingDiff < 0 && term.percentage > 0) return sum + term.percentage;
              return sum;
          }, 0);
          
          if(totalAdjustable === 0) break;
  
          for (let i = 0; i < otherTerms.length; i++) {
              let term = otherTerms[i];
              let adjustment = 0;
              if (remainingDiff > 0 && term.percentage < 100) {
                  adjustment = Math.min(remainingDiff, remainingDiff * ((100 - term.percentage) / totalAdjustable));
              } else if (remainingDiff < 0 && term.percentage > 0) {
                  adjustment = Math.max(remainingDiff, remainingDiff * (term.percentage / totalAdjustable));
              }
              
              const originalTermIndex = newTerms.findIndex(t => t.id === term.id);
              newTerms[originalTermIndex].percentage += adjustment;
              remainingDiff -= adjustment;
          }
      }
  
      newTerms.forEach(term => term.percentage = Math.round(term.percentage));
      let currentSum = newTerms.reduce((sum, t) => sum + t.percentage, 0);
      let sumDiff = 100 - currentSum;
  
      if (sumDiff !== 0) {
          let termToAdjust = newTerms.find(t => t.id !== updatedId && t.percentage + sumDiff >= 0 && t.percentage + sumDiff <= 100) || newTerms[updatedTermIndex];
          termToAdjust.percentage += sumDiff;
      }
  
      return newTerms;
    });
  };
  
  const handleSave = (updatedTerm) => {
    let finalTerms;
    if (updatedTerm) {
      finalTerms = currentTerms.map(t => t.id === updatedTerm.id ? updatedTerm : t);
    } else {
      finalTerms = currentTerms;
    }
    onContentChange({ ...content, terms: finalTerms });
    toast({ title: 'Condiciones de pago guardadas ☁️' });
  };
  
  const handleSubtitleSave = (newValue) => {
    onContentChange({ ...content, subtitle: newValue });
    toast({ title: 'Contenido guardado ☁️' });
  };

  return (
    <div className="py-16 sm:py-24 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeader sectionData={sectionData} />
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-gray-400 max-w-xl mx-auto -mt-6 mb-16"
        >
          <EditableText value={content.subtitle} onSave={handleSubtitleSave} isEditorMode={isEditorMode} />
        </motion.p>
        
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {currentTerms.map((term, index) => (
            <PaymentCard 
              key={term.id} 
              term={term} 
              isEditorMode={isEditorMode} 
              onUpdate={handleTermUpdate}
              onSave={handleSave}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default CondicionesPagoSection;