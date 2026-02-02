import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import SectionHeader from '@/components/SectionHeader';
import { iconMap } from '@/lib/iconMap';
import { Save, X, Edit, Loader2, AlignLeft, AlignCenter, AlignJustify } from 'lucide-react';
import IconPicker from '@/components/IconPicker';
import EditableField from '@/components/EditableField';
import { cn } from '@/lib/utils';

const NormatividadSection = ({ sectionData, isEditorMode, onContentChange }) => {
    const { toast } = useToast();

    // Color Amarillo Industrial Forzado (Yellow 400/500)
    const YELLOW_PRIMARY = "#eab308";
    const YELLOW_LIGHT = "rgba(234, 179, 8, 0.1)";
    const YELLOW_BORDER = "rgba(234, 179, 8, 0.3)";

    const defaultServices = [
        { id: 1, icon: 'Settings', title: 'Ingeniería y Desarrollo', description: 'Nuestro equipo de ingeniería diseña y optimiza cada componente de la línea de extrusión.', align: 'left' },
        { id: 2, icon: 'MachineSafety', title: 'Seguridad de Maquinaria', description: 'Cumplimiento con estándares internacionales de seguridad.', align: 'left' },
        { id: 3, icon: 'ElectricalSafety', title: 'NOM-001-SEDE-2018', description: 'Instalaciones eléctricas seguras y certificadas.', align: 'left' },
    ];

    const content = sectionData.content || { services: defaultServices };
    const services = content.services || defaultServices;

    const handleSave = async (index, field, value) => {
        const updatedServices = [...services];
        updatedServices[index] = { ...updatedServices[index], [field]: value };
        onContentChange({ services: updatedServices });
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { x: -20, opacity: 0 },
        visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
    };

    return (
        <div className="py-16 sm:py-24 bg-black text-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
                <SectionHeader
                    sectionData={sectionData}
                    isEditorMode={isEditorMode}
                    onContentChange={onContentChange}
                />

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                >
                    {services.map((service, index) => {
                        const IconComponent = iconMap[service.icon] || iconMap['ShieldCheck'];
                        const textAlign = service.align || 'left';

                        return (
                            <motion.div
                                key={service.id || index}
                                className="bg-gray-950/60 p-6 rounded-[2rem] border transition-all duration-500 flex flex-col items-center gap-6 group/card relative shadow-2xl"
                                style={{
                                    borderColor: YELLOW_BORDER,
                                    boxShadow: `0 10px 30px -15px rgba(0,0,0,0.5)`,
                                    textAlign: textAlign // BRUTE FORCE
                                }}
                                variants={itemVariants}
                            >
                                {/* TOOLBAR ALINEACION */}
                                {isEditorMode && (
                                    <div
                                        className="absolute top-4 right-4 flex gap-1 bg-black/90 p-1 rounded-full border opacity-0 group-hover/card:opacity-100 transition-opacity z-20 shadow-2xl scale-90 origin-right border-yellow-500/30"
                                    >
                                        <button
                                            onClick={() => handleSave(index, 'align', 'left')}
                                            className={cn("p-1.5 rounded-full transition-colors", textAlign === 'left' ? "bg-yellow-500/20 text-yellow-500" : "text-gray-500 hover:text-white")}
                                            title="Izquierda"
                                        >
                                            <AlignLeft size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleSave(index, 'align', 'center')}
                                            className={cn("p-1.5 rounded-full transition-colors", textAlign === 'center' ? "bg-yellow-500/20 text-yellow-500" : "text-gray-500 hover:text-white")}
                                            title="Centro"
                                        >
                                            <AlignCenter size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleSave(index, 'align', 'justify')}
                                            className={cn("p-1.5 rounded-full transition-colors", textAlign === 'justify' ? "bg-yellow-500/20 text-yellow-500" : "text-gray-500 hover:text-white")}
                                            title="Justificar"
                                        >
                                            <AlignJustify size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* ICONO YELLOW */}
                                <div className="flex-shrink-0 relative">
                                    <div className="absolute inset-0 blur-2xl rounded-full opacity-20 bg-yellow-500" />
                                    <div
                                        className="relative bg-gray-900/80 p-5 rounded-2xl border transition-colors shadow-lg border-yellow-500/30 group-hover/card:border-yellow-500/60"
                                    >
                                        <IconPicker
                                            value={service.icon}
                                            onChange={(val) => handleSave(index, 'icon', val)}
                                            isEditorMode={isEditorMode}
                                            trigger={
                                                <div className="cursor-pointer group/icon relative">
                                                    <IconComponent className="w-10 h-10 text-yellow-500" />
                                                    {isEditorMode && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover/icon:opacity-100 transition-opacity">
                                                            <Edit size={16} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>

                                {/* TEXTOS */}
                                <div className="w-full">
                                    <h3
                                        className="text-xl font-bold text-white mb-2 tracking-tight transition-colors w-full"
                                        style={{ textAlign: textAlign }}
                                    >
                                        <EditableField
                                            value={service.title}
                                            onSave={(v) => handleSave(index, 'title', v)}
                                            isEditorMode={isEditorMode}
                                            textAlign={textAlign}
                                            className={cn(
                                                "w-full",
                                                textAlign === 'center' ? "justify-center" : "justify-start"
                                            )}
                                            inputClassName={cn(
                                                textAlign === 'center' ? "text-center" : textAlign === 'justify' ? "text-justify" : "text-left",
                                                "text-yellow-500 font-bold"
                                            )}
                                        />
                                    </h3>
                                    <div
                                        className={cn(
                                            "text-gray-400 text-sm leading-relaxed w-full",
                                            textAlign === 'center' ? "text-center" :
                                                textAlign === 'left' ? "text-left" : "text-justify"
                                        )}
                                        style={{ textAlign: textAlign, textJustify: textAlign === 'justify' ? 'inter-word' : undefined }}
                                    >
                                        <EditableField
                                            value={service.description}
                                            onSave={(v) => handleSave(index, 'description', v)}
                                            isEditorMode={isEditorMode}
                                            textAlign={textAlign}
                                            tag="p"
                                            multiline={true}
                                            className={cn(
                                                "w-full",
                                                textAlign === 'center' ? "justify-center" : "justify-start"
                                            )}
                                            inputClassName={cn(
                                                textAlign === 'center' ? "text-center" : textAlign === 'justify' ? "text-justify" : "text-left",
                                                "min-h-[120px]"
                                            )}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </div>
    );
};

export default NormatividadSection;
