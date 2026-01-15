const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const INPUT_DIR = '.';      // raiz do projeto
const OUTPUT_DIR = 'dist';  // pasta de saída
const EXTENSIONS = ['.js', '.css', '.html'];

// remove dist se existir
if (fs.existsSync(OUTPUT_DIR)) fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// percorre arquivos e subpastas
function traverse(inputDir, outputDir) {
    const entries = fs.readdirSync(inputDir, { withFileTypes: true });

    for (const entry of entries) {
        const inputPath = path.join(inputDir, entry.name);
        const outputPath = path.join(outputDir, entry.name);

        // ignora pasta dist
        if (inputPath.includes(OUTPUT_DIR)) continue;

        if (entry.isDirectory()) {
            fs.mkdirSync(outputPath, { recursive: true });
            traverse(inputPath, outputPath);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            if (EXTENSIONS.includes(ext)) {
                minifyFile(inputPath, outputPath, ext);
            } else {
                fs.copyFileSync(inputPath, outputPath);
            }
        }
    }
}

// minifica arquivos
function minifyFile(inputPath, outputPath, ext) {
    const code = fs.readFileSync(inputPath, 'utf8');

    try {
        if (ext === '.js') {
            const result = esbuild.transformSync(code, { minify: true, loader: 'js' });
            fs.writeFileSync(outputPath, result.code, 'utf8');
        } else if (ext === '.css') {
            const result = esbuild.transformSync(code, { minify: true, loader: 'css' });
            fs.writeFileSync(outputPath, result.code, 'utf8');
        } else if (ext === '.html') {
            const minified = code
                .replace(/\n/g, '')
                .replace(/\s+/g, ' ')
                .replace(/>\s+</g, '><')
                .replace(/<!--.*?-->/g, '');
            fs.writeFileSync(outputPath, minified, 'utf8');
        }
        console.log(`Minificado: ${inputPath}`);
    } catch (err) {
        console.error(`Erro ao minificar ${inputPath}:`, err);
    }
}

traverse(INPUT_DIR, OUTPUT_DIR);
console.log('Minificação completa! Todos os arquivos estão em ./dist');
