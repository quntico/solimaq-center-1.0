import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const Banner = ({
    text,
    direction = 'left-to-right',
    scale = 100,
    isVisible = true,
    company,
    client,
    project,
    isEditorMode,
    isAdminView
}) => {
    const { t } = useLanguage();

    if (!isVisible) return null;

    const marqueeClass = direction === 'left-to-right' ? 'animate-marquee-reverse-once' : 'animate-marquee-once';

    const fullBannerText = [company, client, project, text].filter(Boolean).join(' • ');
    const displayText = fullBannerText || (isEditorMode && isAdminView ? t('header.editorMode') : t('header.explore'));

    const bannerStyle = {
        transform: `scale(${scale / 100})`,
        transformOrigin: 'center top',
    };

    return (
        <div
            className="absolute top-full left-0 right-0 bg-black border-2 border-[--color-led-blue] p-3 text-center shadow-lg overflow-hidden whitespace-nowrap z-50"
            style={bannerStyle}
        >
            <div className="inline-block w-full">
                <div className={`flex items-center gap-8 min-w-full ${marqueeClass}`}>
                    <span className="text-sm font-semibold text-[#2563eb] whitespace-nowrap">
                        {displayText}
                    </span>
                    <span className="text-sm font-semibold text-[#2563eb] whitespace-nowrap">
                        {displayText}
                    </span>
                    <span className="text-sm font-semibold text-[#2563eb] whitespace-nowrap">
                        {displayText}
                    </span>
                    <span className="text-sm font-semibold text-[#2563eb] whitespace-nowrap">
                        {displayText}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Banner;
