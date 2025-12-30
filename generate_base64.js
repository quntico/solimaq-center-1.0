
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'favicon-solimaq.png');

try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');
    console.log(`data:image/png;base64,${base64}`);
} catch (err) {
    console.error('Error reading file:', err);
}
