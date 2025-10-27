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
        name: 'Kalam-Regular', 
        url: 'https://fonts.gstatic.com/s/kalam/v16/YA9dr0Wd4kDdLC4N_D_6_g.woff2',
        weight: '400'
    },
    { 
        name: 'Kalam-Bold', 
        url: 'https://fonts.gstatic.com/s/kalam/v16/YA9dr0Wd4kDdLC4N_D_6_g.woff2',
        weight: '700'
    }
];

console.log('🚀 Скачиваем Kalam шрифты...');

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

console.log('🎉 Kalam шрифты скачаны!');
