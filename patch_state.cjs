const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf16le'); // Oh, grep_search didn't work because it's utf16le? Wait, PowerShell Get-Content worked but grep_search didn't. This implies it might be utf-8 with BOM or UTF-16. Let's just read and replace using node default 'utf8'. Wait, let's try reading as utf8 first.

file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');
const regex = /const \[exportWebsite, setExportWebsite\] = useState\(\(\) => quotationData\?\.brand_color === 'smq' \? 'www\.smq\.mx' :\s*\r?\n*\(quotationData\?\.brand_color === 'solifood' \? 'www\.solifood\.com' : 'www\.solimaq\.site'\)\);/;

const replacement = `const [exportWebsite, setExportWebsite] = useState(() => quotationData?.brand_color === 'smq' ? 'www.smq.mx' :\n(quotationData?.brand_color === 'solifood' ? 'www.solifood.com' : (quotationData?.brand_color === 'msw' ? 'www.msw.mx' : 'www.solimaq.site')));`;

file = file.replace(regex, replacement);
fs.writeFileSync('src/pages/MasterPlan.jsx', file);
console.log('Done');
