const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

// Find the brand sync useEffect and replace it with an unconditional version
const OLD = `            if (quotationData.brand_color) {
                setExportBrandColor(prev => prev === 'solimaq' ? quotationData.brand_color : prev);
                setExportWebsite(prev => {
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'smq') return 'www.smq.mx';
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'solifood') return 'www.solifood.com';
                    return prev;
                });
            }`;

const NEW = `            if (quotationData.brand_color) {
                // Always sync so AdminModal changes are reflected immediately
                setExportBrandColor(quotationData.brand_color);
                if (quotationData.brand_color === 'smq') setExportWebsite('www.smq.mx');
                else if (quotationData.brand_color === 'solifood') setExportWebsite('www.solifood.com');
                else setExportWebsite('www.solimaq.site');
            }`;

const OLD_LOGO = `                setExportLogoUrl(prev => prev === '/solimaq_logo.png' ? quotationData.logo : prev);`;
const NEW_LOGO = `                setExportLogoUrl(quotationData.logo);`;

file = file.replace(OLD, NEW);
file = file.replace(OLD_LOGO, NEW_LOGO);

fs.writeFileSync('src/pages/MasterPlan.jsx', file);
console.log('Brand sync useEffect updated!');
