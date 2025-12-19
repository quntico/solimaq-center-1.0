import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardSignature, FileDown, Link, Copy, Eraser, Save, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/components/ui/use-toast';
import LZString from 'lz-string';
import html2pdf from 'html2pdf.js';
import { QRCodeCanvas } from 'qrcode.react';

const formatCurrency = (value, currency) => {
  const numericValue = Number(value) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
};

const CotizadorSMQ = () => {
  const [formData, setFormData] = useState({
    client: '',
    project: '',
    capacity: '',
    videoUrl: '',
    notes: '',
    currency: 'USD',
    price: '',
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const pdfPreviewRef = useRef(null);
  const qrCodeRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q');
    if (query) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(query);
        const parsedData = JSON.parse(decompressed);
        if (parsedData) {
          setFormData(parsedData);
          const link = `${window.location.origin}${window.location.pathname}?q=${query}`;
          setGeneratedLink(link);
        }
      } catch (error) {
        console.error("Error decoding URL data:", error);
        toast({
          title: "Error en URL",
          description: "No se pudieron cargar los datos de la cotización desde el enlace.",
          variant: "destructive",
        });
      }
    }
  }, [location.search, toast]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (value) => {
    setFormData(prev => ({ ...prev, currency: value }));
  };

  const handleGenerateLink = () => {
    const jsonString = JSON.stringify(formData);
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    const link = `${window.location.origin}${window.location.pathname}?q=${compressed}`;
    setGeneratedLink(link);
    navigate(`?q=${compressed}`, { replace: true });
    toast({
      title: "¡Enlace generado!",
      description: "El enlace y el código QR han sido creados y actualizados.",
    });
  };

  const handleCopyLink = () => {
    if (!generatedLink) {
      toast({
        title: "Primero genera el enlace",
        description: "Haz clic en 'Guardar & Obtener Link' antes de copiar.",
        variant: "destructive",
      });
      return;
    }
    navigator.clipboard.writeText(generatedLink);
    toast({
      title: "¡Enlace copiado!",
      description: "El enlace compartible está en tu portapapeles.",
    });
  };

  const handleNewQuote = () => {
    setFormData({
      client: '',
      project: '',
      capacity: '',
      videoUrl: '',
      notes: '',
      currency: 'USD',
      price: '',
    });
    setGeneratedLink('');
    navigate(location.pathname, { replace: true });
    toast({
      title: "Nueva cotización",
      description: "Se han limpiado todos los campos.",
    });
  };

  const handleGeneratePDF = () => {
    const element = pdfPreviewRef.current;
    const opt = {
      margin: 0.5,
      filename: `Cotizacion_${formData.project || 'proyecto'}_${formData.client || 'cliente'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().from(element).set(opt).save();
  };
  
  const handleDownloadQR = () => {
    if (!generatedLink) {
      toast({
        title: "QR no disponible",
        description: "Primero debes generar un enlace para ver y descargar el QR.",
        variant: "destructive",
      });
      return;
    }
    const canvas = qrCodeRef.current.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      let downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Cotizacion_${formData.project || 'proyecto'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast({
        title: "¡QR Descargado!",
        description: "El código QR se ha guardado como una imagen PNG.",
      });
    }
  };

  const isFormFilled = formData.client || formData.project || formData.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-6 md:p-8 lg:p-8 xl:p-12 text-white"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <ClipboardSignature className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Cotizador Dinámico SMQ</h1>
            <p className="text-gray-400">Crea, guarda y comparte cotizaciones rápidamente.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna de Formulario */}
          <div className="space-y-6 bg-gray-900/50 p-6 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold text-primary">Datos de la Cotización</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="client">Cliente</Label><Input id="client" name="client" value={formData.client} onChange={handleInputChange} /></div>
              <div className="space-y-2"><Label htmlFor="project">Proyecto / Modelo</Label><Input id="project" name="project" value={formData.project} onChange={handleInputChange} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="capacity">Capacidad</Label><Input id="capacity" name="capacity" value={formData.capacity} onChange={handleInputChange} /></div>
            <div className="space-y-2"><Label htmlFor="videoUrl">URL de Video (Opcional)</Label><Input id="videoUrl" name="videoUrl" type="url" value={formData.videoUrl} onChange={handleInputChange} /></div>
            <div className="space-y-2">
                <Label htmlFor="notes">Notas / Opcionales</Label>
                <textarea 
                    id="notes" 
                    name="notes" 
                    value={formData.notes} 
                    onChange={handleInputChange} 
                    rows={4} 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                ></textarea>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <RadioGroup value={formData.currency} onValueChange={handleCurrencyChange} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="USD" id="usd" /><Label htmlFor="usd">USD</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="MXN" id="mxn" /><Label htmlFor="mxn">MXN</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-2"><Label htmlFor="price">Precio Total</Label><Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} /></div>
            </div>
          </div>

          {/* Columna de Vista Previa y Acciones */}
          <div className="space-y-8">
            <div ref={pdfPreviewRef} className="bg-white text-gray-800 p-8 rounded-lg shadow-lg">
              <div className="flex justify-between items-start mb-8 gap-4">
                <div className="flex-1">
                  <img src="https://horizons-cdn.hostinger.com/0f98fff3-e5cd-4ceb-b0fd-55d6f1d7dd5c/414dc90736a6c6fc12c9f954f198e38b.png" alt="SMQ Logo" className="h-16 mb-4" />
                   <div className="text-left">
                    <h2 className="text-2xl font-bold text-blue-700">Radiografía de Cotización</h2>
                    <p className="text-gray-500">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
                 {generatedLink && isFormFilled && (
                    <div ref={qrCodeRef} className="text-center">
                        <QRCodeCanvas
                          value={generatedLink}
                          size={120}
                          bgColor={"#ffffff"}
                          fgColor={"#000000"}
                          level={"L"}
                          includeMargin={true}
                        />
                        <p className="text-xs text-gray-500 mt-1">Escanear para ver</p>
                    </div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6 border-y py-4">
                <div><p className="text-sm text-gray-500">CLIENTE</p><p className="font-semibold">{formData.client || '-'}</p></div>
                <div><p className="text-sm text-gray-500">PROYECTO / MODELO</p><p className="font-semibold">{formData.project || '-'}</p></div>
                <div><p className="text-sm text-gray-500">CAPACIDAD</p><p className="font-semibold">{formData.capacity || '-'}</p></div>
                <div><p className="text-sm text-gray-500">PRECIO</p><p className="font-bold text-blue-700 text-lg">{formatCurrency(formData.price, formData.currency)}</p></div>
              </div>
              {formData.notes && (<div className="mb-6"><h3 className="font-bold mb-2 border-b pb-1">Notas / Opcionales</h3><p className="text-sm whitespace-pre-wrap">{formData.notes}</p></div>)}
              {formData.videoUrl && (<div><h3 className="font-bold mb-2 border-b pb-1">Video de Referencia</h3><a href={formData.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{formData.videoUrl}</a></div>)}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input type="text" readOnly value={generatedLink} placeholder="Aquí aparecerá tu enlace para compartir..." />
                <Button variant="outline" size="icon" onClick={handleCopyLink}><Copy className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button onClick={handleNewQuote} variant="outline"><Eraser className="w-4 h-4 mr-2" />Nueva</Button>
                <Button onClick={handleGenerateLink}><Save className="w-4 h-4 mr-2" />Guardar</Button>
                <Button onClick={handleGeneratePDF}><FileDown className="w-4 h-4 mr-2" />PDF</Button>
                <Button onClick={handleDownloadQR} variant="secondary"><Download className="w-4 h-4 mr-2" />QR</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CotizadorSMQ;