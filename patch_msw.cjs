const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

const OLD1 = `const [exportWebsite, setExportWebsite] = useState(() => quotationData?.brand_color === 'smq' ? 'www.smq.mx' : \n(quotationData?.brand_color === 'solifood' ? 'www.solifood.com' : 'www.solimaq.site'));`;
const NEW1 = `const [exportWebsite, setExportWebsite] = useState(() => \n    quotationData?.brand_color === 'smq' ? 'www.smq.mx' :\n    quotationData?.brand_color === 'solifood' ? 'www.solifood.com' :\n    quotationData?.brand_color === 'msw' ? 'www.msw.mx' :\n    'www.solimaq.site'\n);`;

const OLD2 = `                if (quotationData.brand_color === 'smq') setExportWebsite('www.smq.mx');\r\n                else if (quotationData.brand_color === 'solifood') setExportWebsite('www.solifood.com');\r\n                else setExportWebsite('www.solimaq.site');`;
const OLD2_alt = `                if (quotationData.brand_color === 'smq') setExportWebsite('www.smq.mx');\n                else if (quotationData.brand_color === 'solifood') setExportWebsite('www.solifood.com');\n                else setExportWebsite('www.solimaq.site');`;


const NEW2 = `                if (quotationData.brand_color === 'smq') setExportWebsite('www.smq.mx');\n                else if (quotationData.brand_color === 'solifood') setExportWebsite('www.solifood.com');\n                else if (quotationData.brand_color === 'msw') setExportWebsite('www.msw.mx');\n                else setExportWebsite('www.solimaq.site');`;

if (file.includes(OLD1)) {
    console.log("Replacing OLD1");
    file = file.replace(OLD1, NEW1);
} else {
    // try to match without whitespace
    console.log("OLD1 not found exactly");
}

if (file.includes(OLD2)) {
    console.log("Replacing OLD2");
    file = file.replace(OLD2, NEW2);
} else if (file.includes(OLD2_alt)) {
    console.log("Replacing OLD2_alt");
    file = file.replace(OLD2_alt, NEW2);
} else {
    console.log("OLD2 not found exactly. Searching for smq.mx inside");

    // Fall back to a regex to replace
    file = file.replace(
        /if \(quotationData\.brand_color === 'smq'\) setExportWebsite\('www\.smq\.mx'\);[\s\S]*?else setExportWebsite\('www\.solimaq\.site'\);/m,
        NEW2
    )

    file = file.replace(
        /const \[exportWebsite, setExportWebsite\] = useState\(\(\) => quotationData\?\.brand_color === 'smq' \? 'www\.smq\.mx' :[\s\S]*?'www\.solimaq\.site'\)\);/m,
        NEW1
    )
}

fs.writeFileSync('src/pages/MasterPlan.jsx', file);

