const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

// ---- 1. Wire up the select onChange to also update exportWebsite ----
const OLD_ONCHANGE = `onChange={e => setExportBrandColor(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all appearance-none cursor-pointer"`;

const NEW_ONCHANGE = `onChange={e => {
                                                    const v = e.target.value;
                                                    setExportBrandColor(v);
                                                    if (v === 'smq') setExportWebsite('www.smq.mx');
                                                    else if (v === 'solifood') setExportWebsite('www.solifood.com');
                                                    else setExportWebsite('www.solimaq.site');
                                                }}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all appearance-none cursor-pointer"`;

file = file.replace(OLD_ONCHANGE, NEW_ONCHANGE);

// ---- 2. Inject "Sitio Web" input AFTER the closing </div> that closes the select wrapper ----
// We'll insert it right before the Logo de Exportación div
const LOGO_LABEL = `<label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Logo de Exportaci\u00f3n</label>`;

const WEBSITE_INPUT_BEFORE_LOGO = `<label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sitio Web (Footer)</label>
                                        <input
                                            type="text"
                                            value={exportWebsite}
                                            onChange={e => setExportWebsite(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Logo de Exportaci\u00f3n</label>`;

file = file.replace(LOGO_LABEL, WEBSITE_INPUT_BEFORE_LOGO);

// ---- 3. Also add exportWebsite useState if not already there ----
if (!file.includes('const [exportWebsite, setExportWebsite]')) {
    const BRAND_STATE = `const [exportBrandColor, setExportBrandColor] = useState(() => quotationData?.brand_color || 'solimaq');`;
    const BRAND_STATE_WITH_WEBSITE = `const [exportBrandColor, setExportBrandColor] = useState(() => quotationData?.brand_color || 'solimaq');
    const [exportWebsite, setExportWebsite] = useState(() => quotationData?.brand_color === 'smq' ? 'www.smq.mx' : (quotationData?.brand_color === 'solifood' ? 'www.solifood.com' : 'www.solimaq.site'));`;
    file = file.replace(BRAND_STATE, BRAND_STATE_WITH_WEBSITE);
}

// ---- 4. Replace hardcoded www.solimaq.site in footer strings with exportWebsite ----
file = file.replace(/\| www\.solimaq\.site/g, '| ${exportWebsite}');

fs.writeFileSync('src/pages/MasterPlan.jsx', file);
console.log('Done! exportWebsite injected.');
