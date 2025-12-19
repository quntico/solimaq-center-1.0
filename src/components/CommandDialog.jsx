import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Settings,
  Calculator,
  BrainCircuit,
  FileDown,
  LayoutGrid,
  Package,
  TrendingUp,
  Video,
  ClipboardList,
  CornerDownLeft,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useToast } from '@/components/ui/use-toast';

export function CommandDialogDemo({ open, onOpenChange, setActiveSection, setAiQuery, setIsEditorMode }) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) {
      setInputValue("");
    }
  }, [open]);
  
  const handleSelect = (sectionId) => {
    setActiveSection(sectionId);
    onOpenChange(false);
  };
  
  const handleAdminClick = () => {
    onOpenChange(false);
    toast({
        title: "🚧 Acción no disponible aquí",
        description: "Usa el botón de engranaje en el menú lateral para abrir el panel de administrador.",
    });
  }

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    
    if (inputValue.trim() === '271') {
      setIsEditorMode(true);
      onOpenChange(false);
      toast({
        title: "Modo Editor Activado",
        description: "Ahora puedes editar el contenido directamente en la página.",
      });
      return;
    }

    if (inputValue.trim()) {
      setAiQuery(inputValue);
      setActiveSection('ia');
      onOpenChange(false);
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSearchSubmit}>
        <CommandInput 
          placeholder="Busca una sección o pregunta a la IA..."
          value={inputValue}
          onValueChange={setInputValue}
        />
      </form>
      <CommandList>
        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => handleSelect('descripcion')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Descripción</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('ficha')}>
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Ficha Técnica</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('cronograma')}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Cronograma</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('servicios')}>
            <Package className="mr-2 h-4 w-4" />
            <span>Servicios</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('layout')}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            <span>Lay Out</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('video')}>
            <Video className="mr-2 h-4 w-4" />
            <span>Video</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('proceso')}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Proceso</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect('calculadora')}>
            <Calculator className="mr-2 h-4 w-4" />
            <span>Calculadora</span>
          </CommandItem>
           <CommandItem onSelect={() => handleSelect('pdf')}>
            <FileDown className="mr-2 h-4 w-4" />
            <span>PDFs</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Acciones">
          <CommandItem onSelect={handleSearchSubmit}>
            <BrainCircuit className="mr-2 h-4 w-4 text-primary" />
            <span className="text-primary">Preguntar a la IA</span>
            <span className="ml-auto text-xs text-gray-500 flex items-center gap-1">
              <CornerDownLeft size={12}/>
              Enter
            </span>
          </CommandItem>
          <CommandItem onSelect={handleAdminClick}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Administrador</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}