import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Rnd } from 'react-rnd';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Upload, X } from 'lucide-react';

const PDFPreviewModal = ({ isOpen, onClose, quotationData, sections, economicContent, pdfTemplate, setPdfTemplate, activeTheme }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileName = `${activeTheme}-logo-${Date.now()}`;
    const { data, error } = await supabase.storage
      .from('logos-bucket')
      .upload(fileName, file);

    if (error) {
      toast({ title: 'Error al subir el logo', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('logos-bucket')
      .getPublicUrl(data.path);

    handleTemplateChange('logoUrl', publicUrl);
    setIsUploading(false);
  };
  
  const handleTemplateChange = (key, value) => {
    setPdfTemplate(prev => ({...prev, [key]: value}));
  };
  
  const saveTemplate = async () => {
    const { data, error } = await supabase
      .from('quotations')
      .update({ pdf_template: pdfTemplate })
      .eq('theme_key', activeTheme);
      
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: 'destructive' });
    } else {
      toast({ title: "¡Guardado!", description: "La plantilla del PDF se ha actualizado." });
      onClose();
    }
  };

  const total = economicContent.groups.reduce((acc, group) => {
      return acc + group.items.reduce((itemAcc, item) => {
        return item.isActive ? itemAcc + item.price : itemAcc;
      }, 0);
    }, 0);
    
  // A4 aspect ratio
  const pdfWidth = 210;
  const pdfHeight = 297;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Vista Previa del PDF</DialogTitle>
          <DialogDescription>
            Ajusta el logo y otros elementos. Los cambios se guardarán para futuras cotizaciones.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          <div className="md:col-span-2 overflow-auto bg-gray-800 rounded-lg p-4 flex justify-center items-start">
            <div 
              className="bg-white shadow-lg relative"
              style={{ width: `${pdfWidth * 2.5}px`, height: `${pdfHeight * 2.5}px`, transform: 'scale(0.8)', transformOrigin: 'top center' }}
            >
              <div className="p-8 text-black">
                {/* Header */}
                <div className="text-[9px] text-gray-600 font-bold">
                    <p>CLIENTE: <span className="font-normal">{quotationData.client || 'N/A'}</span></p>
                    <p>EMPRESA: <span className="font-normal">{quotationData.company || 'N/A'}</span></p>
                    <p>PROYECTO: <span className="font-normal">{quotationData.project || 'N/A'}</span></p>
                    <p>FECHA: <span className="font-normal">{format(new Date(), 'dd MMMM, yyyy', { locale: es })}</span></p>
                </div>
                {/* Title */}
                <div className="absolute top-[87.5px] left-[35px] w-[455px] h-[30px] bg-[#007BFF] flex items-center">
                    <p className="text-white font-bold text-[22px] ml-2">PROPUESTA ECONÓMICA</p>
                </div>
              </div>
               {pdfTemplate.logoUrl && (
                  <Rnd
                    className="flex items-center justify-center border-2 border-dashed border-primary/50"
                    size={{ width: pdfTemplate.logoSize, height: 'auto' }}
                    position={{ x: pdfTemplate.logoPosition.x, y: pdfTemplate.logoPosition.y }}
                    onDragStop={(e, d) => handleTemplateChange('logoPosition', { x: d.x, y: d.y })}
                    bounds="parent"
                  >
                    <img src={pdfTemplate.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </Rnd>
                )}
            </div>
          </div>
          <div className="flex flex-col gap-4">
             <div className="bg-gray-800/50 p-4 rounded-lg">
                <h4 className="font-bold mb-2">Logo</h4>
                <div className="space-y-3">
                   {pdfTemplate.logoUrl ? (
                     <div className="relative">
                       <img src={pdfTemplate.logoUrl} alt="Logo preview" className="w-full rounded-md max-h-24 object-contain bg-white p-2" />
                       <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => handleTemplateChange('logoUrl', '')}><X size={14}/></Button>
                     </div>
                   ) : (
                     <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                       <Upload size={16} className="mr-2" />
                       {isUploading ? 'Subiendo...' : 'Subir Logo'}
                     </Button>
                   )}
                   <Input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                   
                   <div className="space-y-2">
                       <Label htmlFor="logo-size">Tamaño del Logo</Label>
                       <Slider 
                         id="logo-size"
                         value={[pdfTemplate.logoSize]} 
                         onValueChange={(val) => handleTemplateChange('logoSize', val[0])}
                         min={20} max={150} step={1} 
                       />
                   </div>
                </div>
             </div>
             <div className="flex-1" />
             <div className="flex flex-col gap-2">
               <Button onClick={saveTemplate} className="bg-primary hover:bg-primary/90">Guardar Plantilla</Button>
               <Button variant="outline" onClick={onClose}>Cerrar</Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFPreviewModal;