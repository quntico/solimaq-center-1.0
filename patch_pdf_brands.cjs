const fs = require('fs');
let file = fs.readFileSync('src/pages/MasterPlan.jsx', 'utf8');

// 1. Convert const { headerBg, headerText } to let { headerBg, headerText } and add the color logic
file = file.replace(/const { headerBg, headerText } = pdfSettings;/g, `let { headerBg, headerText } = pdfSettings;
        let moduleColorArray = [155, 212, 40];
        if (exportBrandColor === 'smq') {
            headerBg = '#007BFF';
            headerText = '#FFFFFF';
            moduleColorArray = [0, 123, 255];
        } else if (exportBrandColor === 'solifood') {
            headerBg = '#FACC15';
            headerText = '#000000';
            moduleColorArray = [250, 204, 21];
        }`);

// 2. Replace the hardcoded logo strings
file = file.replace(/const finalUrl = "\/solimaq_logo\.png";/g, 'const finalUrl = exportLogoUrl || "/solimaq_logo.png";');

// EXTRA: generateInternalRadiographyPDF uses finalUrl but does it have headerBg?
// generateModulePDF has finalUrl as well?
// Let's replace any general occurrences of "/solimaq_logo.png" with exportLogoUrl IF they are used in image setup.
file = file.replace(/let finalUrl = "\/solimaq_logo\.png";/g, 'let finalUrl = exportLogoUrl || "/solimaq_logo.png";');

// 3. Extra instances of [155, 212, 40]
file = file.replace(/fillColor\:\s*\[155\,\s*212\,\s*40\]/g, "fillColor: typeof moduleColorArray !== 'undefined' ? moduleColorArray : [155, 212, 40]");

fs.writeFileSync('src/pages/MasterPlan.jsx', file);
console.log('Script updated successfully!');
