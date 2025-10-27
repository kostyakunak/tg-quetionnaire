import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = './src/assets/fonts';

// Создаем папку если не существует
if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
    { 
        name: 'Inter-Regular', 
        url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
        weight: '400'
    },
    { 
        name: 'Inter-Medium', 
        url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
        weight: '500'
    },
    { 
        name: 'Inter-SemiBold', 
        url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
        weight: '600'
    },
    { 
        name: 'Inter-Bold', 
        url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2',
        weight: '700'
    }
];

console.log('🚀 Скачиваем Inter шрифты...');

fonts.forEach(font => {
    const filePath = path.join(fontsDir, `${font.name}.woff2`);
    const file = fs.createWriteStream(filePath);
    
    https.get(font.url, response => {
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log(`✅ Скачан: ${font.name}.woff2 (${font.weight})`);
        });
    }).on('error', err => {
        fs.unlink(filePath, () => {});
        console.error(`❌ Ошибка скачивания ${font.name}.woff2:`, err.message);
    });
});

console.log('🎉 Inter шрифты скачаны!');
