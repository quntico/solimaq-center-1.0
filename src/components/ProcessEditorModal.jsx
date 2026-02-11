import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ArrowUp, ArrowDown, Image as ImageIcon, Loader2, AlignJustify } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';
import { supabase } from '@/lib/customSupabaseClient';
import { getActiveBucket } from '@/lib/bucketResolver';
import { sanitizeFileName } from '@/lib/utils';

const ProcessEditorModal = ({ isOpen, onClose, initialSteps, onSave }) => {
    const [steps, setSteps] = useState(initialSteps || []);
    const [editingStepId, setEditingStepId] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSteps(initialSteps || []);
        }
    }, [isOpen]);

    const handleMoveStep = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        setSteps(newSteps);
    };

    const handleAddStep = () => {
        const newStep = {
            id: `step-${Date.now()}`,
            title: 'Nuevo Proceso',
            icon: 'Layers',
            details: ['- Detalle 1', '- Detalle 2']
        };
        setSteps([...steps, newStep]);
        setEditingStepId(newStep.id);
    };

    const handleDeleteStep = (id) => {
        setSteps(steps.filter(s => s.id !== id));
        if (editingStepId === id) setEditingStepId(null);
    };

    const handleUpdateStep = (id, field, value) => {
        setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleDetailChange = (stepId, index, value) => {
        const step = steps.find(s => s.id === stepId);
        const newDetails = [...step.details];
        newDetails[index] = value;
        handleUpdateStep(stepId, 'details', newDetails);
    };

    const handleAddDetail = (stepId) => {
        const step = steps.find(s => s.id === stepId);
        handleUpdateStep(stepId, 'details', [...step.details, '- Nuevo detalle']);
    };

    const handleDeleteDetail = (stepId, index) => {
        const step = steps.find(s => s.id === stepId);
        const newDetails = step.details.filter((_, i) => i !== index);
        handleUpdateStep(stepId, 'details', newDetails);
    };

    const handleImageUpload = async (stepId, e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 100 * 1024 * 1024) {
            alert("La imagen es demasiado grande. Máximo 100MB.");
            return;
        }

        setIsUploading(true);
        try {
            const bucketName = await getActiveBucket();
            const fileName = `proceso/${Date.now()}-${sanitizeFileName(file.name)}`;


            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);

            handleUpdateStep(stepId, 'image', publicUrl);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Error al subir la imagen: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsUploading(true); // Reutilizamos el estado de carga para el botón guardar
        try {
            await onSave(steps);
            onClose();
        } catch (error) {
            console.error("Error al guardar:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-black/60 backdrop-blur-xl border-white/10 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-primary">Editar Flujo del Proceso</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex gap-6 mt-4">
                    {/* List of Steps (Left Side) */}
                    <div className="w-1/3 flex flex-col border-r border-gray-800 pr-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-300">Pasos</h3>
                            <Button onClick={handleAddStep} size="sm" className="bg-primary hover:bg-primary/90 text-white">
                                <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${editingStepId === step.id
                                        ? 'bg-primary/10 border-primary'
                                        : 'bg-gray-900/50 border-white/5 hover:border-white/10'
                                        }`}
                                    onClick={() => setEditingStepId(step.id)}
                                >
                                    <div className="flex flex-col gap-1 mr-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 text-gray-500 hover:text-white"
                                            disabled={index === 0}
                                            onClick={(e) => { e.stopPropagation(); handleMoveStep(index, 'up'); }}
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 text-gray-500 hover:text-white"
                                            disabled={index === steps.length - 1}
                                            onClick={(e) => { e.stopPropagation(); handleMoveStep(index, 'down'); }}
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                        </Button>
                                    </div>

                                    <span className="truncate font-medium text-sm flex-1">{step.title}</span>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-500 hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Edit Form (Right Side) */}
                    <div className="flex-1 overflow-y-auto pl-2">
                        {editingStepId ? (
                            (() => {
                                const step = steps.find(s => s.id === editingStepId);
                                if (!step) return null;
                                const Icon = iconMap[step.icon] || iconMap['Layers'];

                                return (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col gap-2">
                                                <Label>Icono</Label>
                                                <IconPicker
                                                    value={step.icon}
                                                    onChange={(val) => handleUpdateStep(step.id, 'icon', val)}
                                                    isEditorMode={true}
                                                    trigger={
                                                        <Button variant="outline" className="h-12 w-12 p-2 border-gray-700 bg-gray-900/50">
                                                            <Icon className="w-full h-full text-primary" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label>Título del Paso</Label>
                                                <Input
                                                    value={step.title}
                                                    onChange={(e) => handleUpdateStep(step.id, 'title', e.target.value)}
                                                    className="bg-gray-900 border-gray-700"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <Label>Detalles / Lista</Label>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => handleUpdateStep(step.id, 'details_align', step.details_align === 'justify' ? 'left' : 'justify')}
                                                        size="sm"
                                                        variant="outline"
                                                        className={`h-7 text-[10px] border-gray-700 transition-colors ${step.details_align === 'justify' ? 'bg-primary/20 border-primary text-primary' : ''}`}
                                                    >
                                                        <AlignJustify className="w-3 h-3 mr-1" /> Justificar Masivamente
                                                    </Button>
                                                    <Button onClick={() => handleAddDetail(step.id)} size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                                                        <Plus className="w-3 h-3 mr-1" /> Agregar Detalle
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {step.details.map((detail, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <Input
                                                            value={detail}
                                                            onChange={(e) => handleDetailChange(step.id, idx, e.target.value)}
                                                            className="bg-gray-900 border-gray-700 h-9 text-sm"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-500 hover:text-red-500"
                                                            onClick={() => handleDeleteDetail(step.id, idx)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-white/5">
                                            <Label>Imagen del Paso (Opcional)</Label>
                                            {step.image ? (
                                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 group">
                                                    <img src={step.image} alt="Preview" className="w-full h-full object-cover" />
                                                    <div className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-4 transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                        {isUploading ? (
                                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => handleUpdateStep(step.id, 'image', null)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                                                </Button>
                                                                <label className="cursor-pointer">
                                                                    <div className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                                                                        <ImageIcon className="w-4 h-4 mr-2" /> Cambiar
                                                                    </div>
                                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(step.id, e)} disabled={isUploading} />
                                                                </label>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className={`flex flex-col items-center justify-center w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        {isUploading ? (
                                                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                                        ) : (
                                                            <ImageIcon className="w-10 h-10 text-gray-500 group-hover:text-primary transition-colors mb-3" />
                                                        )}
                                                        <p className="text-sm text-gray-400 font-medium tracking-tight">
                                                            {isUploading ? 'Subiendo imagen...' : 'Cargar imagen del proceso'}
                                                        </p>
                                                        <p className="text-xs text-gray-600 mt-1">PNG, JPG o WebP (Max. 100MB)</p>
                                                    </div>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(step.id, e)} disabled={isUploading} />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                Selecciona un paso para editar sus detalles
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6 pt-4 border-t border-gray-800">
                    <Button variant="outline" onClick={onClose} className="border-gray-700 hover:bg-gray-800 text-white">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white" disabled={isUploading}>
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {isUploading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProcessEditorModal;
