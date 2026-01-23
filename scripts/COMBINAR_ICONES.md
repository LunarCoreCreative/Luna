# Como Combinar Múltiplos ICOs em Um Único Arquivo

Você tem vários arquivos ICO (logo.ico, logo 2.ico, etc.), cada um com um tamanho diferente. Para que o ícone funcione corretamente no Windows Explorer, você precisa combinar todos em um único arquivo ICO.

## Opção 1: Usar Ferramenta Online (Mais Fácil) ⭐

1. Acesse: https://www.icoconverter.com/ ou https://convertio.co/pt/ico-converter/
2. Faça upload de todos os arquivos ICO (logo.ico, logo 2.ico, logo 3.ico, etc.)
3. Selecione a opção para combinar/mesclar
4. Baixe o arquivo combinado
5. Substitua o `logo.ico` na pasta `resource` pelo arquivo combinado

## Opção 2: Instalar ImageMagick

1. Baixe e instale ImageMagick: https://imagemagick.org/script/download.php
2. Execute: `npm run combine-icons`

## Opção 3: Usar IcoFX ou Similar

1. Baixe IcoFX (ferramenta gratuita): https://icofx.ro/
2. Abra o arquivo `logo.ico` (o maior, 256x256)
3. Importe os outros tamanhos (logo 2.ico, logo 3.ico, etc.)
4. Salve como `logo.ico` na pasta `resource`

## Ordem dos Tamanhos

O Windows precisa dos seguintes tamanhos (do maior para o menor):
- 256x256 (logo.ico)
- 128x128 (logo 2.ico)
- 64x64 (logo 3.ico)
- 48x48 (logo 4.ico)
- 32x32 (logo 5.ico)
- 24x24 (logo 6.ico) - opcional
- 16x16 (logo 7.ico ou logo 8.ico)

## Após Combinar

1. Substitua o `logo.ico` atual pelo arquivo combinado
2. Rebuild o app: `npm run dist:desktop`
3. Limpe o cache do Windows: `powershell -ExecutionPolicy Bypass -File scripts/clear-icon-cache.ps1`
