import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Download } from 'lucide-react';
import SectionHeader from '@/components/SectionHeader';
import { Button } from '@/components/ui/button';

const SCR700Page = () => {
    const pdfUrl = "https://cdn.gamma.app/04ntlz425sl4pfd/43f062d6c82344dfb923ecd679873881/original/SRC-700-PRESS-2.0.pdf";

    const sectionData = {
        id: 'scr700_page',
        label: 'Catálogo SCR700',
        icon: 'BrainCircuit',
        description: 'Explora el catálogo técnico del robot SCR700 y sus capacidades.'
    };

    return (
        <div className="py-4 sm:py-8 w-full">
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="max-w-7xl mx-auto"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4 sm:gap-0">
                    <SectionHeader sectionData={sectionData} />
                    <a href={pdfUrl} download="Catalogo-SCR700.pdf" target="_blank" rel="noopener noreferrer" className="mt-4 sm:mt-12">
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Descargar Catálogo
                        </Button>
                    </a>
                </div>

                <div className="mt-8">
                    <div className="w-full aspect-[4/3] sm:aspect-video bg-black rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden border-2 border-gray-800">
                         <div className="w-full h-full overflow-auto [-webkit-overflow-scrolling:touch]">
                            <iframe
                                src={pdfUrl}
                                title="Catálogo SCR700"
                                className="w-full h-full"
                                frameBorder="0"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SCR700Page;