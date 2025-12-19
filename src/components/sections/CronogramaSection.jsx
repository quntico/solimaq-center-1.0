import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Wrench, Ship, Truck, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import SectionHeader from '@/components/SectionHeader';
import { useLanguage } from '@/contexts/LanguageContext';

const CronogramaSection = ({ quotationData, sectionData }) => {
  const [startDate, setStartDate] = useState(new Date());
  const { t, dateLocale } = useLanguage();

  const {
    phase1_duration = 5,
    phase2_duration = 75,
    phase3_duration = 10,
    phase1_name = 'Confirmación y Orden',
    phase2_name = 'Tiempo de Fabricación',
    phase3_name = 'Transporte',
    phase4_name = 'Instalación y Puesta en Marcha'
  } = quotationData;
  
  const calculateDates = (start) => {
    if (!start) return [];
    
    const date = new Date(start);
    const p1_start = new Date(date);
    const p1_end = new Date(p1_start.getTime() + (phase1_duration - 1) * 24 * 60 * 60 * 1000);

    const p2_start = new Date(p1_end.getTime() + 1 * 24 * 60 * 60 * 1000);
    const p2_end = new Date(p2_start.getTime() + (phase2_duration - 1) * 24 * 60 * 60 * 1000);
    
    const p3_start = new Date(p2_end.getTime() + 1 * 24 * 60 * 60 * 1000);
    const p3_end = new Date(p3_start.getTime() + (phase3_duration - 1) * 24 * 60 * 60 * 1000);
    
    const p4_start = new Date(p3_end.getTime() + 1 * 24 * 60 * 60 * 1000);

    const phases = [
      {
        id: 1,
        title: `${t('cronograma.days')} 1-${phase1_duration}`,
        subtitle: phase1_name,
        icon: CheckCircle2,
        start: p1_start,
        end: p1_end,
      },
      {
        id: 2,
        title: `${t('cronograma.days')} ${phase1_duration + 1}-${phase1_duration + phase2_duration}`,
        subtitle: phase2_name,
        icon: Wrench,
        start: p2_start,
        end: p2_end,
      },
      {
        id: 3,
        title: `${t('cronograma.days')} ${phase1_duration + phase2_duration + 1}-${phase1_duration + phase2_duration + phase3_duration}`,
        subtitle: phase3_name,
        icon: Ship,
        start: p3_start,
        end: p3_end,
      },
      {
        id: 4,
        title: `${t('cronograma.day')} ${phase1_duration + phase2_duration + phase3_duration}+`,
        subtitle: phase4_name,
        icon: Truck,
        start: p4_start,
        end: null
      }
    ];

    return phases.map(phase => ({
      ...phase,
      dateRange: phase.end
        ? `${format(phase.start, 'dd MMM yyyy', { locale: dateLocale })} - ${format(phase.end, 'dd MMM yyyy', { locale: dateLocale })}`
        : `${t('cronograma.from')} ${format(phase.start, 'dd MMM yyyy', { locale: dateLocale })}`
    }));
  };

  const phases = calculateDates(startDate);

  return (
    <div className="py-12 px-4 bg-black text-white">
      <SectionHeader sectionData={sectionData} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <p className="text-gray-400 mb-8 text-center text-lg">
          {t('cronograma.selectDate')}
        </p>

        <div className="mb-16 flex justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal bg-[#0f0f0f] border-gray-800 text-white hover:bg-gray-800 hover:text-white h-14 px-4 text-lg",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-3 h-6 w-6 text-yellow-500" />
                {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : <span>{t('cronograma.chooseDate')}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-black border-gray-700 text-white">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                locale={dateLocale}
                className="bg-black text-white border border-gray-800"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden sm:flex sm:flex-row justify-between items-start relative mt-10 px-10">
            {/* Timeline Line */}
            <div className="absolute top-12 left-20 right-20 h-[2px] bg-gray-800 z-0"></div>
            
            {phases.map((phase, index) => (
              <div 
                key={phase.id}
                className="flex flex-col items-center relative z-10 w-1/4"
              >
                {/* Icon Container */}
                <motion.div
                   className="w-24 h-24 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.4)] mb-8 border-4 border-black"
                   initial={{ scale: 0 }}
                   animate={{ scale: 1 }}
                   transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                   whileHover={{ scale: 1.1, boxShadow: "0 0 40px rgba(250,204,21,0.6)" }}
                 >
                   <phase.icon className="w-10 h-10 text-black" strokeWidth={1.5} />
                 </motion.div>

                <motion.div
                  className="text-center w-full px-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <h3 className="text-xl font-bold text-white mb-2">{phase.title}</h3>
                  <p className="text-gray-400 text-sm font-medium mb-3 h-10 flex items-start justify-center">{phase.subtitle}</p>
                  <p className="text-yellow-400 font-bold text-sm">{phase.dateRange}</p>
                </motion.div>
              </div>
            ))}
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="sm:hidden relative px-4 space-y-10 pl-6">
          <div className="absolute left-[34px] top-4 bottom-4 w-0.5 bg-gray-800"></div>
          {phases.map((phase, index) => (
            <motion.div
              key={phase.id}
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-yellow-400 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.4)] shrink-0 relative z-10 border-4 border-black">
                        <phase.icon className="w-6 h-6 text-black" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-bold text-white">{phase.title}</h3>
                 </div>
                 
                 <div className="pl-[72px]">
                    <p className="text-gray-400 text-sm font-medium mb-1">{phase.subtitle}</p>
                    <p className="text-yellow-400 font-bold text-sm">{phase.dateRange}</p>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>

      </motion.div>
    </div>
  );
};

export default CronogramaSection;