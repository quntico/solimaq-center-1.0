import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Globe } from 'lucide-react';
import { cn } from "@/lib/utils";

const Flag = ({ lang }) => {
  const SvgFlag = {
    es: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 5 3" width="20" height="12">
        <rect width="5" height="3" fill="#c60b1e"/>
        <rect width="5" height="2" y="0.5" fill="#ffc400"/>
        <rect width="5" height="1" y="1" fill="#c60b1e"/>
      </svg>
    ),
    en: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="20" height="10">
        <clipPath id="s-t"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
        <clipPath id="s-u"><path d="M0,0 v15 h30 v-15 z"/></clipPath>
        <g clip-path="url(#s-t)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
            <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#s-u)" stroke="#C8102E" stroke-width="4"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>
        </g>
      </svg>
    ),
    pt: () => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 15" width="22" height="15">
        <rect width="22" height="15" fill="#006233"/>
        <path d="M2,7.5 h18 l-9,5.5 l-9,-5.5 h18" fill="#ffc72c"/>
        <path d="M11,2 L2,7.5 L11,13 L20,7.5 z" fill="#ffc72c"/>
        <circle cx="11" cy="7.5" r="3.5" fill="#002776"/>
        <circle cx="11" cy="7.5" r="3.5" fill="none" stroke="#fff" stroke-width="0.3"/>
      </svg>
    ),
  }[lang];
  return SvgFlag ? <SvgFlag /> : null;
};


const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  const languages = ['es', 'en', 'pt'];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800">
            {language ? <Flag lang={language} /> : <Globe className="h-5 w-5" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1 bg-gray-900 border-gray-800">
        <div className="flex flex-col gap-1">
          {languages.map((lang) => (
            <Button
              key={lang}
              variant="ghost"
              onClick={() => setLanguage(lang)}
              className={cn(
                "w-full justify-start gap-2 text-white hover:bg-gray-800",
                language === lang && "bg-primary/10 text-primary"
              )}
            >
              <Flag lang={lang} />
              <span className="uppercase text-xs font-bold">{lang}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LanguageSelector;