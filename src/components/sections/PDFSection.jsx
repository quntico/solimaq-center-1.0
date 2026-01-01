
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Trash2, Eye, Download, Plus, Save, Edit, X, Lock, Unlock, Loader2, FilePlus, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SectionHeader from '@/components/SectionHeader';
import { getActiveBucket } from '@/lib/bucketResolver';

const AdminLoginDialog = ({ isOpen, onClose, onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (password === '2026') {
      onLogin();
      onClose();
      setPassword('');
      setError('');
    } else {
      setError('Contraseña incorrecta.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acceso de Administrador</DialogTitle>
          <DialogDescription>Ingresa la contraseña para activar el modo administrador.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>Ingresar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddQuotationDialog = ({ isOpen, onClose, onAdd, activeTheme }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setName('');
    setFile(null);
    setIsUploading(false);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast({ title: "Archivo no válido", description: "Por favor, selecciona un archivo PDF.", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !file) {
      toast({ title: "Faltan datos", description: "Por favor, ingresa un nombre y selecciona un archivo PDF.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // 1. Insert DB record to get an ID
      const { data: dbData, error: dbError } = await supabase
        .from('pdf_quotations')
        .insert({ name: name.trim(), theme_key: activeTheme, file_path: 'uploading' })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Try uploading to potential buckets
      const potentialBuckets = ['quotation-pdfs', 'quotation-files', 'public', 'storage', 'logos-bucket'];
      let uploadSuccess = false;
      let usedBucket = '';
      let filePath = '';
      let lastError = null;

      for (const bucket of potentialBuckets) {
        try {
          filePath = `${activeTheme}/${dbData.id}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file);

          if (uploadError) {
            // If bucket not found, continue to next
            if (uploadError.message && (uploadError.message.includes("Bucket not found") || uploadError.message.includes("does not exist"))) {
              console.warn(`Upload attempt to bucket '${bucket}' failed(Bucket not found / does not exist).Trying next...`);
              lastError = uploadError;
              continue;
            }
            throw uploadError; // Other errors (size, type, etc) should fail immediately
          }

          usedBucket = bucket;
          uploadSuccess = true;
          break; // Success!
        } catch (err) {
          console.warn(`Upload attempt to bucket '${bucket}' failed with unexpected error: `, err);
          lastError = err;
        }
      }

      if (!uploadSuccess) {
        await supabase.from('pdf_quotations').delete().eq('id', dbData.id);
        throw new Error(lastError?.message || "No se pudo subir el archivo a ningún almacenamiento disponible.");
      }

      // 3. Update DB record with the final file path including the bucket name
      const finalStoredPath = `${usedBucket}/${filePath}`;

      const { data: updatedData, error: updateError } = await supabase
        .from('pdf_quotations')
        .update({ file_path: finalStoredPath })
        .eq('id', dbData.id)
        .select()
        .single();

      if (updateError) throw updateError;

      onAdd(updatedData);
      toast({ title: "Éxito", description: "Nueva cotización añadida correctamente." });
      resetState();
      onClose();

    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: `No se pudo añadir la cotización: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetState(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Nueva Cotización</DialogTitle>
          <DialogDescription>Ingresa el nombre y sube el archivo PDF correspondiente.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input
            placeholder="Nombre de la cotización"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isUploading}
          />
          <Input
            type="file"
            accept=".pdf"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button variant="outline" className="w-full bg-gray-900 text-white border-gray-700 hover:bg-gray-800 hover:border-primary hover:text-primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            <Upload className="w-4 h-4 mr-2" />
            {file ? `Archivo: ${file.name}` : 'Seleccionar PDF'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="hover:text-primary" onClick={() => { resetState(); onClose(); }} disabled={isUploading}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/80 text-white" disabled={!name.trim() || !file || isUploading}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Añadir Cotización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const PDFSection = ({ isEditorMode, setIsEditorMode, activeTheme, sectionData }) => {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [activeBucket, setActiveBucket] = useState('quotation-pdfs'); // Default
  const [pdfUrl, setPdfUrl] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  useEffect(() => {
    const initBucket = async () => {
      const bucket = await getActiveBucket();
      setActiveBucket(bucket);
    };
    initBucket();
  }, []);

  const fetchQuotations = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('pdf_quotations')
      .select('*')
      .eq('theme_key', activeTheme)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las cotizaciones.", variant: "destructive" });
    } else {
      setQuotations(data);
      if (data.length > 0 && !selectedQuotation) {
        setSelectedQuotation(data[0]);
      } else if (data.length === 0) {
        setSelectedQuotation(null);
      }
    }
    setIsLoading(false);
  }, [activeTheme, toast, selectedQuotation]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  /* PDF Cache Ref to store blob URLs and prevent re-fetching: { [id]: { pdfUrl, downloadUrl } } */
  const pdfCache = useRef({});

  const loadPdfToCache = useCallback(async (quotation) => {
    if (!quotation || !quotation.file_path || quotation.file_path === 'uploading') return null;

    if (pdfCache.current[quotation.id]) {
      return pdfCache.current[quotation.id];
    }

    const filePath = quotation.file_path;
    const parts = filePath.split('/');
    const potentialBucket = parts[0];
    const knownBuckets = ['quotation-pdfs', 'quotation-files', 'public', 'storage', 'logos-bucket'];

    let bucketToUse = activeBucket || 'quotation-pdfs';
    let pathToUse = filePath;

    if (knownBuckets.includes(potentialBucket)) {
      bucketToUse = potentialBucket;
      pathToUse = parts.slice(1).join('/');
    }

    try {
      let urlToFetch = null;
      let originalSignedUrl = null;

      const { data, error } = await supabase.storage
        .from(bucketToUse)
        .createSignedUrl(pathToUse, 3600);

      if (data?.signedUrl) {
        urlToFetch = data.signedUrl;
        originalSignedUrl = data.signedUrl;
      } else {
        const { data: publicData } = supabase.storage.from(bucketToUse).getPublicUrl(pathToUse);
        urlToFetch = publicData.publicUrl;
        originalSignedUrl = publicData.publicUrl;
      }

      const response = await fetch(urlToFetch);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const cacheItem = {
        pdfUrl: objectUrl,
        downloadUrl: originalSignedUrl
      };

      pdfCache.current[quotation.id] = cacheItem;
      return cacheItem;

    } catch (err) {
      console.error(`Error loading PDF for ${quotation.name}:`, err);
      return null;
    }
  }, [activeBucket]);

  useEffect(() => {
    return () => {
      Object.values(pdfCache.current).forEach(cacheItem => {
        if (cacheItem.pdfUrl) URL.revokeObjectURL(cacheItem.pdfUrl);
      });
    };
  }, []);

  // Main Effect: Load Selected Quotation
  useEffect(() => {
    let isMounted = true;

    const loadSelected = async () => {
      if (!selectedQuotation) {
        setPdfUrl(null);
        setDownloadUrl(null);
        return;
      }

      // Check cache first for instant switch
      if (pdfCache.current[selectedQuotation.id]) {
        console.log(`[PDF Cache] Hit for ${selectedQuotation.name}`);
        setPdfUrl(pdfCache.current[selectedQuotation.id].pdfUrl);
        setDownloadUrl(pdfCache.current[selectedQuotation.id].downloadUrl);
        return;
      }

      console.log(`[PDF Cache] Miss for ${selectedQuotation.name}, fetching...`);
      setPdfUrl(null);

      const cached = await loadPdfToCache(selectedQuotation);

      if (isMounted && cached) {
        setPdfUrl(cached.pdfUrl);
        setDownloadUrl(cached.downloadUrl);
      }
    };

    loadSelected();

    return () => { isMounted = false; };
  }, [selectedQuotation, loadPdfToCache]);

  // Preloader Effect: Load others in background
  useEffect(() => {
    const preloadOthers = async () => {
      if (quotations.length <= 1) return;

      for (const q of quotations) {
        if (selectedQuotation && q.id === selectedQuotation.id) continue;
        if (pdfCache.current[q.id]) continue;

        console.log(`[PDF Preloader] Fetching ${q.name}...`);
        await loadPdfToCache(q);
        await new Promise(r => setTimeout(r, 100)); // Small delay to yield
      }
    };

    const timer = setTimeout(() => {
      preloadOthers();
    }, 1000);

    return () => clearTimeout(timer);
  }, [quotations, selectedQuotation, loadPdfToCache]);


  const handleAdminToggle = () => {
    if (isEditorMode) {
      setIsEditorMode(false);
      setEditingQuotation(null);
      toast({ title: "Modo Editor Desactivado" });
    } else {
      setIsLoginDialogOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsEditorMode(true);
    toast({ title: "Modo Editor Activado", description: "Ahora puedes editar las cotizaciones." });
  };

  const handleAddSuccess = (newQuotation) => {
    setQuotations(prev => [...prev, newQuotation]);
    setSelectedQuotation(newQuotation);
  };

  const handleDeleteQuotation = async (id, filePath) => {
    if (filePath) {
      const parts = filePath.split('/');
      const potentialBucket = parts[0];
      const knownBuckets = ['quotation-pdfs', 'quotation-files', 'public', 'storage', 'logos-bucket'];

      let bucketToUse = activeBucket || 'quotation-pdfs';
      let pathToUse = filePath;

      if (knownBuckets.includes(potentialBucket)) {
        bucketToUse = potentialBucket;
        pathToUse = parts.slice(1).join('/');
      }

      const { error: fileError } = await supabase.storage.from(bucketToUse).remove([pathToUse]);
      if (fileError) {
        toast({ title: "Error de Almacenamiento", description: `No se pudo eliminar el archivo: ${fileError.message}`, variant: "destructive" });
      }
    }

    const { error } = await supabase.from('pdf_quotations').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar la cotización.", variant: "destructive" });
    } else {
      const updatedQuotations = quotations.filter(q => q.id !== id);
      setQuotations(updatedQuotations);
      if (selectedQuotation?.id === id) {
        setSelectedQuotation(updatedQuotations.length > 0 ? updatedQuotations[0] : null);
      }
      toast({ title: "Éxito", description: "Cotización eliminada." });
    }
  };

  const handleNameChange = (id, newName) => {
    setQuotations(quotations.map(q => q.id === id ? { ...q, name: newName } : q));
  };

  const handleSaveName = async (id, name) => {
    const { error } = await supabase.from('pdf_quotations').update({ name }).eq('id', id);
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar el nombre.", variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Nombre guardado." });
      setEditingQuotation(null);
    }
  };

  return (
    <div className="py-4 sm:py-8 w-full h-full min-h-screen flex flex-col">
      <AdminLoginDialog isOpen={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} onLogin={handleLoginSuccess} />
      <AddQuotationDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onAdd={handleAddSuccess} activeTheme={activeTheme} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[95%] mx-auto w-full flex-grow flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 sm:gap-0">
          <SectionHeader sectionData={sectionData} />
          <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-12 w-full sm:w-auto">
            {selectedQuotation && (
              <a href={downloadUrl || pdfUrl} download target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 w-full sm:w-auto shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                  <FileDown className="w-4 h-4 text-white" />
                  Exportar PDF
                </Button>
              </a>
            )}
            <Button onClick={handleAdminToggle} className="bg-primary hover:bg-primary/80 text-white flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
              {isEditorMode ? <Unlock className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-white" />}
              Modo Editor {isEditorMode ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
        <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8 text-center -mt-8">
          {isEditorMode ? 'Gestiona las cotizaciones.' : 'Selecciona una cotización para visualizarla.'}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[80vh]">
          {/* List Section - 3 Columns */}
          <div className="lg:col-span-3 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Documentos</h2>
              {isEditorMode && (
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/80 text-white text-sm shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
                  <FilePlus className="w-4 h-4 mr-2" /> Añadir
                </Button>
              )}
            </div>
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 space-y-2 flex-grow overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : quotations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <FileText className="w-10 h-10 mb-4" />
                  <p className="text-sm">No hay cotizaciones.</p>
                  {isEditorMode && <p className="text-xs">Haz clic en "Añadir" para empezar.</p>}
                </div>
              ) : (
                quotations.map((q, index) => (
                  <div key={q.id} className={`p-3 rounded-lg transition-all cursor-pointer group ${selectedQuotation?.id === q.id ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-white/5'}`}>
                    <div className="flex justify-between items-center" onClick={() => !editingQuotation && setSelectedQuotation(q)}>
                      {editingQuotation === q.id ? (
                        <Input
                          value={q.name}
                          onChange={(e) => handleNameChange(q.id, e.target.value)}
                          className="flex-grow mr-2 h-8 text-sm"
                          autoFocus
                          onBlur={() => handleSaveName(q.id, q.name)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveName(q.id, q.name)}
                        />
                      ) : (
                        <span className="font-semibold text-white flex-grow truncate pr-2 text-sm">{index + 1}. {q.name}</span>
                      )}

                      {isEditorMode && (
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingQuotation === q.id ? (
                            <Button size="icon" variant="ghost" onClick={() => setEditingQuotation(null)}><X className="w-4 h-4 text-gray-500" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" onClick={() => setEditingQuotation(q.id)}><Edit className="w-4 h-4 text-primary hover:text-green-300" /></Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => handleDeleteQuotation(q.id, q.file_path)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Viewer Section - 9 Columns */}
          <div className="lg:col-span-9 h-full flex flex-col">
            {selectedQuotation && pdfUrl ? (
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden h-full flex flex-col">
                <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 shrink-0">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-white font-semibold truncate">{selectedQuotation.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 hidden sm:inline">¿No carga?</span>
                    <a href={downloadUrl || pdfUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" title="Descargar PDF"><Download className="w-5 h-5" /></Button>
                    </a>
                  </div>
                </div>
                <div className="flex-grow overflow-hidden relative bg-white">
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full absolute inset-0"
                    title={selectedQuotation.name}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-[#0a0a0a] border-2 border-dashed border-gray-800 rounded-lg text-center p-8">
                <Eye className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-2xl font-bold text-white">
                  {quotations.length > 0 ? 'Selecciona una cotización' : 'No hay cotizaciones para mostrar'}
                </h3>
                <p className="text-gray-500 mt-2">
                  {isEditorMode ? 'Añade una cotización para empezar.' : 'Elige un documento de la lista para visualizarlo.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PDFSection;