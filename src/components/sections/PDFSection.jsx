
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Trash2, Eye, Download, Plus, Save, Edit, X, Lock, Unlock, Loader2, FilePlus, FileDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SectionHeader from '@/components/SectionHeader';
import { getActiveBucket } from '@/lib/bucketResolver';
import { cn } from '@/lib/utils';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure Worker locally (Static Asset)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const pdfOptions = {
  cMapUrl: '/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/standard_fonts/'
};

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

const AddQuotationDialog = ({ isOpen, onClose, onAdd, activeTheme, activeBucket }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now()); // Force reset input
  const fileInputRef = useRef(null);

  const resetState = () => {
    setName('');
    setFile(null);
    setIsUploading(false);
    setInputKey(Date.now());
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    console.log("Iniciando subida de cotización:", name);

    let createdRecordId = null;

    try {
      // 1. Insert DB record to get an ID
      console.log("Insertando registro en DB...");
      const insertPromise = supabase
        .from('pdf_quotations')
        .insert({ name: name.trim(), theme_key: activeTheme, file_path: 'uploading' })
        .select()
        .single();

      const insertTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout conectando con la base de datos (Insert)")), 20000));

      const { data: dbData, error: dbError } = await Promise.race([insertPromise, insertTimeout]);

      if (dbError) throw dbError;
      console.log("Registro creado, ID:", dbData.id);
      createdRecordId = dbData.id;

      // 2. Use passed activeBucket (with fallback)
      const targetBucket = activeBucket || 'quotation-pdfs';
      console.log(`[Upload] Target Bucket determined: ${targetBucket}`);

      let uploadSuccess = false;
      let usedBucket = '';
      let filePath = '';
      let lastError = null;

      const tryUpload = async (bucket) => {
        try {
          console.log(`Intentando subir a bucket: ${bucket}`);
          filePath = `${activeTheme}/${dbData.id}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

          const uploadPromise = supabase.storage
            .from(bucket)
            .upload(filePath, file);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Upload timed out after 60s")), 60000)
          );

          const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);

          if (uploadError) throw uploadError;
          return true;
        } catch (err) {
          console.warn(`Fallo subida a ${bucket}:`, err.message);
          lastError = err;
          return false;
        }
      };

      // Attempt 1: The resolved active bucket
      if (await tryUpload(targetBucket)) {
        usedBucket = targetBucket;
        uploadSuccess = true;
      } else {
        // Attempt 2: Fallback list (excluding the one we just tried)
        const potentialBuckets = ['quotation-pdfs', 'quotation-files', 'public', 'storage', 'logos-bucket'];
        for (const bucket of potentialBuckets) {
          if (bucket === targetBucket) continue;
          if (await tryUpload(bucket)) {
            usedBucket = bucket;
            uploadSuccess = true;
            break;
          }
        }
      }

      if (!uploadSuccess) {
        console.error("No se pudo subir a ningún bucket. Eliminando registro DB...");
        await supabase.from('pdf_quotations').delete().eq('id', dbData.id);
        throw new Error(lastError?.message || "No se pudo subir el archivo a ningún almacenamiento disponible.");
      }

      // 3. Update DB record with the final file path including the bucket name
      const finalStoredPath = `${usedBucket}/${filePath}`;
      console.log("Actualizando registro con ruta final:", finalStoredPath);

      const updatePromise = supabase
        .from('pdf_quotations')
        .update({ file_path: finalStoredPath })
        .eq('id', dbData.id)
        .select()
        .single();

      const updateTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout actualizando DB")), 20000));
      const { data: updatedData, error: updateError } = await Promise.race([updatePromise, updateTimeout]);

      if (updateError) throw updateError;

      onAdd(updatedData);
      toast({ title: "Éxito", description: "Nueva cotización añadida correctamente." });
      resetState();
      onClose();

    } catch (error) {
      console.error("Critical Error in handleSubmit:", error);

      // Robust Cleanup
      if (createdRecordId) {
        console.warn(`Cleaning up orphaned record ${createdRecordId} due to error...`);
        // Fire and forget cleanup
        supabase.from('pdf_quotations').delete().eq('id', createdRecordId).then(({ error: delErr }) => {
          if (delErr) console.error("Failed to clean up record:", delErr);
          else console.log("Cleanup successful.");
        });
      }

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
            key={inputKey}
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

  // PDF State
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);



  // Responsive PDF
  const pdfContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);

  useEffect(() => {
    if (!pdfContainerRef.current) return;

    const observeTarget = pdfContainerRef.current;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        // Use contentRect.width to get the width excluding padding/border if box-sizing is content-box,
        // but flex containers usually need careful measurement. 
        // We will subtract some padding (32px for p-4/8) to be safe or use clientWidth.
        // entry.contentRect.width is usually precise for the inner content area.
        setContainerWidth(entry.contentRect.width - 48); // Subtracting extra padding to ensure it fits nicely
      }
    });

    resizeObserver.observe(observeTarget);
    return () => resizeObserver.disconnect();
  }, []);

  // Track current page on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageId = entry.target.id;
            const pageNum = parseInt(pageId.replace('pdf-page-', ''));
            if (!isNaN(pageNum)) {
              setPageNumber(pageNum);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const pages = document.querySelectorAll('.pdf-page-container');
    if (pages.length > 0) {
      pages.forEach((p) => observer.observe(p));
    }

    return () => observer.disconnect();
  }, [numPages, pdfUrl, selectedQuotation]);

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
  const [viewerError, setViewerError] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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

    // console.log(`[PDF Loader] Processing ${quotation.name}...`);

    try {
      // Use Signed URL for direct streaming access (Reliable and Secure)
      // Local worker ensures this is fast enough (~200ms)
      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucketToUse)
        .createSignedUrl(pathToUse, 3600); // 1 hour validity

      if (signedError) {
        throw signedError;
      }

      if (!signedData?.signedUrl) {
        throw new Error("No se pudo generar la URL de acceso.");
      }

      const finalUrl = signedData.signedUrl;
      console.log("[PDF Loader] URL Generated.");

      const cacheItem = {
        pdfUrl: finalUrl,
        downloadUrl: finalUrl
      };

      pdfCache.current[quotation.id] = cacheItem;
      return cacheItem;

    } catch (err) {
      console.error(`Error loading PDF for ${quotation.name}:`, err);
      // Return error object instead of null to propagate reason
      return { error: err.message || "Error al generar acceso al documento." };
    }
  }, [activeBucket]);

  useEffect(() => {
    // Cleanup cache just in case, though URLs are mainly strings now
    return () => {
    };
  }, []);

  // Main Effect: Load Selected Quotation
  useEffect(() => {
    let isMounted = true;

    const loadSelected = async () => {
      if (!selectedQuotation) {
        setPdfUrl(null);
        setDownloadUrl(null);
        setViewerError(null);
        setIsPdfLoading(false);
        setNumPages(null); // Reset pages
        return;
      }

      // Check cache first for instant switch
      if (pdfCache.current[selectedQuotation.id]) {
        console.log(`[PDF Cache] Hit for ${selectedQuotation.name}`);
        setPdfUrl(pdfCache.current[selectedQuotation.id].pdfUrl);
        setDownloadUrl(pdfCache.current[selectedQuotation.id].downloadUrl);
        setViewerError(null);
        setIsPdfLoading(false);
        return;
      }

      console.log(`[PDF Cache] Miss for ${selectedQuotation.name}, fetching...`);
      setIsPdfLoading(true);
      setPdfUrl(null);
      setViewerError(null);
      setNumPages(null);

      const result = await loadPdfToCache(selectedQuotation);

      if (isMounted) {
        setIsPdfLoading(false);
        if (result && result.error) {
          setViewerError(result.error);
          setPdfUrl(null);
        } else if (result) {
          setPdfUrl(result.pdfUrl);
          setDownloadUrl(result.downloadUrl);
          setViewerError(null);
        } else {
          // General fallback
          setViewerError("No se pudo cargar el documento.");
          setPdfUrl(null);
        }
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

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    setIsPdfLoading(false);
  }

  return (
    <div className="py-4 sm:py-8 w-full h-full min-h-screen flex flex-col">
      <AdminLoginDialog isOpen={isLoginDialogOpen} onClose={() => setIsLoginDialogOpen(false)} onLogin={handleLoginSuccess} />
      <AddQuotationDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} onAdd={handleAddSuccess} activeTheme={activeTheme} activeBucket={activeBucket} />

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
        <p className="text-gray-400 text-sm sm:text-base mb-6 text-center mt-2">
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
            <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl p-4 space-y-3 flex-grow overflow-y-auto shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] relative group/list overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
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
                  <div
                    key={q.id}
                    className={cn(
                      "p-4 rounded-xl transition-all duration-500 cursor-pointer group/item relative overflow-hidden border border-white/5 hover:border-white/10 active:scale-[0.98]",
                      selectedQuotation?.id === q.id
                        ? 'bg-primary/30 backdrop-blur-md ring-1 ring-primary/40 shadow-[0_0_30px_rgba(var(--primary-rgb),0.25)] border-white/20'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {selectedQuotation?.id === q.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)]" />
                    )}
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
                        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity z-10">
                          {editingQuotation === q.id ? (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => setEditingQuotation(null)}><X className="w-4 h-4" /></Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary/70 hover:text-primary" onClick={() => setEditingQuotation(q.id)}><Edit className="w-4 h-4" /></Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500/70 hover:text-red-500" onClick={() => handleDeleteQuotation(q.id, q.file_path)}><Trash2 className="w-4 h-4" /></Button>
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
              <div className="bg-white/10 backdrop-blur-[30px] border border-white/20 rounded-2xl overflow-hidden h-full relative shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 z-20" />

                {/* Fixed Header */}
                <div className="absolute top-0 left-0 right-0 h-[80px] border-b border-white/20 flex justify-between items-center bg-white/5 backdrop-blur-md px-6 z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow-md truncate max-w-[150px] sm:max-w-none">
                        {quotations.findIndex(q => q.id === selectedQuotation.id) + 1}. {selectedQuotation.name}
                      </span>
                      <span className="text-[10px] text-primary/80 font-bold uppercase tracking-widest">Documento Activo</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Page Navigation / Search */}
                    <div className="flex items-center bg-black/40 rounded-lg p-1 mr-2 border border-white/10">
                      <Input
                        className="h-7 w-12 text-center bg-transparent border-none text-white text-xs p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const page = parseInt(e.currentTarget.value);
                            if (page >= 1 && page <= (numPages || 1)) {
                              const pageElement = document.getElementById(`pdf-page-${page}`);
                              if (pageElement) pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }
                        }}
                        type="number"
                        min={1}
                        max={numPages || 1}
                      />
                      <span className="text-xs text-gray-400 font-mono px-2 border-l border-white/10">
                        / {numPages || '--'}
                      </span>
                    </div>
                    {/* Scale Controls */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
                    <span className="text-xs text-gray-300 font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}><ZoomIn className="w-4 h-4" /></Button>

                    <div className="h-4 w-px bg-white/20 mx-1" />

                    {/* Fullscreen Toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:bg-white/10"
                      onClick={() => {
                        if (!document.fullscreenElement) {
                          pdfContainerRef.current?.requestFullscreen();
                        } else {
                          document.exitFullscreen();
                        }
                      }}
                      title="Pantalla Completa"
                    >
                      <Maximize className="w-4 h-4" />
                    </Button>

                    <a href={downloadUrl || pdfUrl} download target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/20 transition-all rounded-full ml-1" title="Descargar PDF">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* React PDF Viewer - Absolute Handling */}
                <div
                  ref={pdfContainerRef}
                  className="absolute top-[80px] bottom-0 left-0 right-0 overflow-y-scroll bg-[#2a2a2a] w-full snap-y snap-mandatory scroll-smooth"
                  style={{ scrollPaddingTop: '20px' }}
                >
                  <div className="min-h-full w-full flex flex-col items-center justify-start py-8">
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      options={pdfOptions}
                      loading={
                        <div className="flex flex-col items-center justify-center p-12 text-white">
                          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                          <span className="font-bold">Cargando Documento...</span>
                        </div>
                      }
                      error={
                        <div className="text-red-500 font-bold flex flex-col items-center justify-center p-8 mt-10">
                          <X className="w-10 h-10 mb-2" />
                          Error al cargar el PDF.
                        </div>
                      }
                      className="flex flex-col gap-8 items-center"
                    >
                      {Array.from(new Array(numPages || 0), (el, index) => (
                        <div
                          key={`page_${index + 1}`}
                          id={`pdf-page-${index + 1}`}
                          className="pdf-page-container relative shadow-2xl bg-white transition-transform snap-center"
                          style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <Page
                            pageNumber={index + 1}
                            width={containerWidth ? Math.max(300, Math.min(containerWidth - 64, 1200)) * scale : undefined}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="block"
                            loading={
                              <div
                                className="bg-white flex items-center justify-center"
                                style={{
                                  width: containerWidth ? Math.max(300, Math.min(containerWidth - 64, 1200)) * scale : '100%',
                                  aspectRatio: '0.707',
                                }}
                              >
                                <div className="flex flex-col items-center">
                                  <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-2" />
                                  <span className="text-gray-300 text-xs font-mono uppercase tracking-widest">Cargando...</span>
                                </div>
                              </div>
                            }
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                </div>
              </div>
            ) : viewerError ? (
              <div className="h-full flex flex-col items-center justify-center bg-[#1a0a0a] border-2 border-dashed border-red-900/50 rounded-lg text-center p-8">
                <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Error al cargar documento</h3>
                <p className="text-red-400 font-mono text-sm max-w-md break-words">{viewerError}</p>
                <Button
                  variant="outline"
                  className="mt-6 border-red-800 text-red-500 hover:bg-red-900/20"
                  onClick={() => {
                    setViewerError(null);
                    const current = selectedQuotation;
                    setSelectedQuotation(null);
                    setTimeout(() => setSelectedQuotation(current), 100);
                  }}
                >
                  Reintentar
                </Button>
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
      </motion.div >
    </div >
  );
};

export default PDFSection;