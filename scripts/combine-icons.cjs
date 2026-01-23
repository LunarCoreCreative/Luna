const toIco = require('to-ico');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const resourceDir = path.join(__dirname, '../resource');
const outputPath = path.join(resourceDir, 'logo.ico');

// Tamanhos padrão do Windows (do maior para o menor)
const standardSizes = [256, 128, 64, 48, 32, 24, 16];

async function combineIcons() {
  try {
    console.log('🔄 Combinando ícones em um único arquivo ICO...');
    
    // Encontrar todos os arquivos ICO na pasta resource
    const files = fs.readdirSync(resourceDir)
      .filter(f => f.toLowerCase().endsWith('.ico') && f.startsWith('logo'))
      .sort((a, b) => {
        // Ordenar: logo.ico primeiro, depois logo 2.ico, logo 3.ico, etc.
        if (a === 'logo.ico') return -1;
        if (b === 'logo.ico') return 1;
        const numA = parseInt(a.replace('logo ', '').replace('.ico', '')) || 0;
        const numB = parseInt(b.replace('logo ', '').replace('.ico', '')) || 0;
        return numA - numB;
      });
    
    console.log(`📁 Arquivos encontrados: ${files.join(', ')}\n`);
    
    if (files.length === 0) {
      throw new Error('Nenhum arquivo ICO encontrado na pasta resource');
    }
    
    const buffers = [];
    const sizes = [];
    
    // Processar cada arquivo ICO (assumindo que logo.ico = 256, logo 2.ico = 128, etc.)
    for (let i = 0; i < files.length && i < standardSizes.length; i++) {
      const fileName = files[i];
      const iconPath = path.join(resourceDir, fileName);
      const targetSize = standardSizes[i];
      
      try {
        // Ler o arquivo ICO usando Jimp (que suporta ICO)
        const image = await Jimp.read(iconPath);
        
        // Redimensionar para o tamanho desejado
        image.resize(targetSize, targetSize, Jimp.RESIZE_BEZIER);
        
        // Converter para buffer PNG
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        
        buffers.push(buffer);
        sizes.push(targetSize);
        console.log(`✅ Processado: ${fileName} → ${targetSize}x${targetSize}`);
      } catch (error) {
        console.error(`❌ Erro ao processar ${fileName}:`, error.message);
        // Tentar com sharp como fallback (caso o arquivo seja PNG)
        try {
          const sharp = require('sharp');
          const buffer = await sharp(iconPath)
            .resize(targetSize, targetSize, { 
              fit: 'contain', 
              background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .png()
            .toBuffer();
          buffers.push(buffer);
          sizes.push(targetSize);
          console.log(`✅ Processado (fallback): ${fileName} → ${targetSize}x${targetSize}`);
        } catch (fallbackError) {
          console.error(`❌ Erro no fallback também: ${fallbackError.message}`);
        }
      }
    }
    
    if (buffers.length === 0) {
      throw new Error('Nenhum ícone válido encontrado para combinar');
    }
    
    // Combinar todos os buffers em um único ICO
    console.log(`\n📦 Combinando ${buffers.length} tamanhos em um único ICO...`);
    const icoBuffer = await toIco(buffers);
    
    // Salvar o arquivo combinado
    fs.writeFileSync(outputPath, icoBuffer);
    
    console.log(`\n✅ Ícone combinado criado com sucesso!`);
    console.log(`📁 Arquivo: ${outputPath}`);
    console.log(`📏 Tamanhos incluídos: ${sizes.join(', ')}`);
    console.log(`💾 Tamanho do arquivo: ${(icoBuffer.length / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error('❌ Erro ao combinar ícones:', error);
    process.exit(1);
  }
}

combineIcons();
