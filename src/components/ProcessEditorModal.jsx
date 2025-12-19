import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import { iconMap } from '@/lib/iconMap';

const ProcessEditorModal = ({ isOpen, onClose, initialSteps, onSave }) => {
    const [steps, setSteps] = useState(initialSteps || []);
    const [editingStepId, setEditingStepId] = useState(null);

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

    const handleSave = () => {
        onSave(steps);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-gray-950 border-gray-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-blue-500">Editar Flujo del Proceso</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex gap-6 mt-4">
                    {/* List of Steps (Left Side) */}
                    <div className="w-1/3 flex flex-col border-r border-gray-800 pr-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-300">Pasos</h3>
                            <Button onClick={handleAddStep} size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-1" /> Agregar
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-2 ${editingStepId === step.id
                                        ? 'bg-blue-900/20 border-blue-500'
                                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
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
                                                        <Button variant="outline" className="h-12 w-12 p-2 border-gray-700 bg-gray-900">
                                                            <Icon className="w-full h-full text-blue-500" />
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
                                                <Button onClick={() => handleAddDetail(step.id)} size="sm" variant="outline" className="h-7 text-xs border-gray-700">
                                                    <Plus className="w-3 h-3 mr-1" /> Agregar Detalle
                                                </Button>
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
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProcessEditorModal;
