const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

// Fix the remnant conditional brand sync
const OLD = `                setExportBrandColor(prev => prev === 'solimaq' ? quotationData.brand_color : prev);
                setExportWebsite(prev => {
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'smq') return 'www.smq.mx';
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'solifood') return 'www.solifood.com';
                    return prev;
                });`;

const NEW = `                // Always sync so AdminModal changes are reflected immediately
                setExportBrandColor(quotationData.brand_color);
                if (quotationData.brand_color === 'smq') setExportWebsite('www.smq.mx');
                else if (quotationData.brand_color === 'solifood') setExportWebsite('www.solifood.com');
                else setExportWebsite('www.solimaq.site');`;

if (file.includes(OLD)) {
    file = file.replace(OLD, NEW);
    console.log('Replaced!');
} else {
    console.log('Not found - may already be patched. Current brand lines:');
    const lines = file.split('\n');
    lines.forEach((line, i) => {
        if (line.includes('setExportBrandColor') || line.includes('setExportWebsite')) {
            console.log(`Line ${i + 1}: ${line.trim()}`);
        }
    });
}

fs.writeFileSync('src/pages/MasterPlan.jsx', file);
