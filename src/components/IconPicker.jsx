import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { iconMap, iconList, extrusionIcons } from '@/lib/iconMap';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const IconPicker = ({ value, onChange, trigger, children, isEditorMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('extrusion');

  const filteredIcons = useMemo(() => {
    // Safety check: ensure lists exist
    const baseList = (category === 'extrusion' && extrusionIcons) ? extrusionIcons : iconList;

    if (!search) return baseList.slice(0, 2000);
    return baseList.filter(name =>
      name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 2000);
  }, [search, category]);

  if (!isEditorMode) {
    return trigger || children;
  }

  const CurrentIcon = iconMap[value] || iconMap['FileText'];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger || children || (
          <Button variant="outline" size="icon" className="h-8 w-8 border-dashed border-blue-500/50 hover:border-blue-500">
            {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col bg-gray-950 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-blue-500">Seleccionar Icono</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="extrusion" value={category} onValueChange={setCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-gray-800">
            <TabsTrigger value="extrusion" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Extrusión</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={category === 'extrusion' ? "Buscar en Extrusión..." : "Buscar todos los iconos..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-900 border-gray-700 focus:border-blue-500 text-white"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-[300px] p-2">
          {filteredIcons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron iconos.
            </div>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {filteredIcons.map((iconName) => {
                const IconComponent = iconMap[iconName];
                const isSelected = value === iconName;

                if (!IconComponent) return null;

                return (
                  <Button
                    key={iconName}
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 p-2 hover:bg-gray-800 hover:text-blue-500 transition-all",
                      isSelected && "bg-blue-500/20 text-blue-500 border border-blue-500/50"
                    )}
                    onClick={() => {
                      onChange(iconName);
                      setIsOpen(false);
                    }}
                    title={iconName}
                  >
                    <IconComponent className="h-6 w-6" />
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IconPicker;