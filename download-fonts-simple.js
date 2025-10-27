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

// Правильные URL для Inter с кириллицей (получены через Google Fonts API)
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
    },
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

console.log('🚀 Скачиваем шрифты с правильными URL...');

// Функция для скачивания
function downloadFont(url, filePath, name) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'font/woff2,font/woff,application/font-woff2,application/font-woff,application/octet-stream,*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://fonts.googleapis.com/',
                'Origin': 'https://fonts.googleapis.com'
            }
        };
        
        https.get(url, options, response => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Скачан: ${name}.woff2`);
                    resolve();
                });
            } else {
                console.error(`❌ Ошибка ${response.statusCode} для ${name}: ${response.statusMessage}`);
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', err => {
            fs.unlink(filePath, () => {});
            console.error(`❌ Ошибка скачивания ${name}:`, err.message);
            reject(err);
        });
    });
}

// Скачиваем все шрифты
async function downloadAllFonts() {
    for (const font of fonts) {
        const filePath = path.join(fontsDir, `${font.name}.woff2`);
        try {
            await downloadFont(font.url, filePath, font.name);
        } catch (error) {
            console.error(`Не удалось скачать ${font.name}:`, error.message);
        }
    }
    console.log('🎉 Загрузка завершена!');
}

downloadAllFonts();
