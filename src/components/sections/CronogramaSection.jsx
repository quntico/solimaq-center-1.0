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

  const phase1_duration = Number(quotationData.phase1_duration) || 5;
  const phase2_duration = Number(quotationData.phase2_duration) || 75;
  const phase3_duration = Number(quotationData.phase3_duration) || 10;
  const phase1_name = quotationData.phase1_name || 'Confirmación y Orden';
  const phase2_name = quotationData.phase2_name || 'Tiempo de Fabricación';
  const phase3_name = quotationData.phase3_name || 'Transporte';
  const phase4_name = quotationData.phase4_name || 'Instalación y Puesta en Marcha';

  const totalDeliveryDays = phase1_duration + phase2_duration + phase3_duration;

  const calculateDates = (start) => {
    if (!start || isNaN(new Date(start).getTime())) return [];

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

  // Safe handler for calendar that prevents undefined (unselect) from crashing if logic depended on it, though we check !start
  const handleDateSelect = (date) => {
    if (date) setStartDate(date);
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
        <div className="flex flex-col items-center mb-12 space-y-6">
          <p className="text-gray-400 text-center text-lg max-w-2xl">
            {t('cronograma.selectDate')}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal bg-[#0f0f0f] border-gray-800 text-white hover:bg-gray-800 hover:text-white h-14 px-4 text-lg",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-6 w-6 text-primary" />
                  {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : <span>{t('cronograma.chooseDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-black border-gray-700 text-white">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={dateLocale}
                  className="bg-black text-white border border-gray-800"
                />
              </PopoverContent>
            </Popover>

            <div className="bg-[#111] border border-gray-800 rounded-xl px-6 py-3 flex items-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tiempo Total Estimado</span>
                <span className="text-xl font-bold text-white">{totalDeliveryDays} Días Naturales</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden sm:flex sm:flex-row justify-between items-start relative mt-16 px-10">
          {/* Timeline Line */}
          <div className="absolute top-12 left-20 right-20 h-[2px] bg-gray-800 z-0"></div>

          {phases.map((phase, index) => (
            <div
              key={phase.id}
              className="flex flex-col items-center relative z-10 w-1/4"
            >
              {/* Icon Container */}
              <motion.div
                className="w-24 h-24 rounded-full bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)] mb-8 border-4 border-black z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                whileHover={{ scale: 1.1, boxShadow: "0 0 40px rgba(34,197,94,0.6)" }}
              >
                <phase.icon className="w-10 h-10 text-white" strokeWidth={1.5} />
              </motion.div>

              <motion.div
                className="text-center w-full px-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="bg-[#111] rounded-lg p-3 border border-gray-800/50 hover:border-primary/30 transition-colors">
                  <h3 className="text-lg font-bold text-white mb-1">{phase.title}</h3>
                  <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">{phase.subtitle}</p>
                  <p className="text-primary font-bold text-sm bg-primary/10 py-1 px-3 rounded-md inline-block">{phase.dateRange}</p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="sm:hidden relative px-4 space-y-8 pl-6">
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
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.4)] shrink-0 relative z-10 border-4 border-black">
                    <phase.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{phase.title}</h3>
                </div>

                <div className="pl-[72px] relative -top-2">
                  <div className="bg-[#111] p-3 rounded-lg border border-gray-800">
                    <p className="text-gray-400 text-xs font-semibold uppercase mb-1">{phase.subtitle}</p>
                    <p className="text-primary font-bold text-sm">{phase.dateRange}</p>
                  </div>
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