const fs = require('fs');

let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

// 1. Replace template strings containing www.solimaq.site
file = file.replace(/\|\s*www\.solimaq\.site/g, '| ${exportWebsite}');

// 2. Add the state hook for exportWebsite
// Find: const [exportBrandColor, setExportBrandColor] = useState(() => quotationData?.brand_color || 'solimaq');
file = file.replace(
    /const \[exportBrandColor, setExportBrandColor\] = useState[^;]+;/,
    `$&
    const [exportWebsite, setExportWebsite] = useState(() => quotationData?.brand_color === 'smq' ? 'www.smq.mx' : (quotationData?.brand_color === 'solifood' ? 'www.solifood.com' : 'www.solimaq.site'));`
);

// 3. Update the useEffect logic
// Find: setExportBrandColor(prev => prev === 'solimaq' ? quotationData.brand_color : prev);
file = file.replace(
    /setExportBrandColor\(prev => prev === 'solimaq' \? quotationData\.brand_color \: prev\);/,
    `$&
                setExportWebsite(prev => {
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'smq') return 'www.smq.mx';
                    if (prev === 'www.solimaq.site' && quotationData.brand_color === 'solifood') return 'www.solifood.com';
                    return prev;
                });`
);

// 4. Update the Select dropdown for Marca Activa to also set exportWebsite
const oldSelect = `<select
                                                value={exportBrandColor}
                                                onChange={e => setExportBrandColor(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                            >`;

const newSelect = `<select
                                                value={exportBrandColor}
                                                onChange={e => {
                                                    const newVal = e.target.value;
                                                    setExportBrandColor(newVal);
                                                    if (newVal === 'smq') setExportWebsite('www.smq.mx');
                                                    else if (newVal === 'solifood') setExportWebsite('www.solifood.com');
                                                    else setExportWebsite('www.solimaq.site');
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all appearance-none cursor-pointer"
                                            >`;

file = file.replace(oldSelect, newSelect);

// 5. Add the text input for Sitio Web to the UI
const brandDiv = `<div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marca Activa</label>
                                        <div className="relative">`;

const replaceBrandDiv = `<div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Marca Activa</label>
                                            <div className="relative">`;

file = file.replace(brandDiv, replaceBrandDiv);

const endOfSelect = `</select>
                                        </div>
                                    </div>`;

const appendWebsiteInput = `</select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sitio Web (Footer)</label>
                                        <input
                                            type="text"
                                            value={exportWebsite}
                                            onChange={e => setExportWebsite(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                </div>`;

file = file.replace(endOfSelect, appendWebsiteInput);

// 6. Fix Logo de Exportacion height to expand properly
file = file.replace(/<div className="flex items-center gap-2 h-\[46px\]">/, '<div className="flex flex-col gap-2 h-full">');
file = file.replace(/<div className="h-full aspetto-square rounded shrink-0 bg-white\/5 border border-white\/10 flex items-center justify-center p-1 w-\[46px\]">/,
    '<div className="flex-1 rounded shrink-0 bg-white/5 border border-white/10 flex items-center justify-center p-4">');
file = file.replace(/className="h-full flex-1 text-xs bg-white\/5 hover:bg-white\/10 text-white font-bold tracking-wider rounded-xl transition-all border border-white\/10 flex items-center justify-center focus:outline-none"/, 'className="w-full py-3 h-[46px] text-xs bg-white/5 hover:bg-white/10 text-white font-bold tracking-wider rounded-xl transition-all border border-white/10 flex items-center justify-center focus:outline-none"');

fs.writeFileSync('src/pages/MasterPlan.jsx', file);
console.log('Successfully injected website footer inputs!');
