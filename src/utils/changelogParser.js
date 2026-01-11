/**
 * Parser para CHANGELOG.md
 * Extrai informações de versões e mudanças
 */

/**
 * Parseia o CHANGELOG.md e retorna informações da versão especificada
 * @param {string} changelogContent - Conteúdo do CHANGELOG.md
 * @param {string} version - Versão a ser extraída (ex: "1.0.4")
 * @returns {Object|null} - Objeto com informações da versão ou null se não encontrada
 */
export function parseChangelogVersion(changelogContent, version) {
    if (!changelogContent || !version) return null;

    // Remove o prefixo "v" se existir
    const cleanVersion = version.replace(/^v/, '');
    
    // Regex para encontrar a seção da versão
    // Formato: ## [1.0.4] - 2025-01-27
    const versionRegex = new RegExp(
        `##\\s*\\[${cleanVersion.replace(/\./g, '\\.')}\\]\\s*-\\s*(\\d{4}-\\d{2}-\\d{2})?`,
        'i'
    );

    const match = changelogContent.match(versionRegex);
    if (!match) return null;

    const startIndex = match.index + match[0].length;
    
    // Encontra o próximo separador de versão ou fim do arquivo
    const nextVersionMatch = changelogContent.substring(startIndex).match(/^---\s*$|^##\s*\[/m);
    const endIndex = nextVersionMatch 
        ? startIndex + nextVersionMatch.index 
        : changelogContent.length;

    const versionContent = changelogContent.substring(startIndex, endIndex).trim();

    // Parseia o conteúdo em seções
    const sections = {
        date: match[1] || null,
        features: [],
        improvements: [],
        bugfixes: [],
        raw: versionContent
    };

    // Divide por seções (###)
    const sectionRegex = /###\s+(.+?)\n([\s\S]*?)(?=###|$)/g;
    let sectionMatch;

    while ((sectionMatch = sectionRegex.exec(versionContent)) !== null) {
        const sectionTitle = sectionMatch[1].trim();
        const sectionContent = sectionMatch[2].trim();

        // Processa itens da seção (linhas que começam com -)
        const items = sectionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim());

        if (sectionTitle.includes('✨') || sectionTitle.includes('Novas Funcionalidades') || sectionTitle.includes('Funcionalidades')) {
            sections.features = items;
        } else if (sectionTitle.includes('🔧') || sectionTitle.includes('Melhorias')) {
            sections.improvements = items;
        } else if (sectionTitle.includes('🐛') || sectionTitle.includes('Correções') || sectionTitle.includes('Bugs')) {
            sections.bugfixes = items;
        }
    }

    // Se não encontrou seções estruturadas, tenta extrair itens genéricos
    if (sections.features.length === 0 && sections.improvements.length === 0 && sections.bugfixes.length === 0) {
        const allItems = versionContent
            .split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.trim().substring(1).trim());
        
        sections.improvements = allItems;
    }

    return {
        version: cleanVersion,
        ...sections
    };
}

/**
 * Obtém a versão mais recente do CHANGELOG
 * @param {string} changelogContent - Conteúdo do CHANGELOG.md
 * @returns {string|null} - Versão mais recente ou null
 */
export function getLatestVersion(changelogContent) {
    if (!changelogContent) return null;

    // Procura pela primeira versão no formato ## [1.0.4] - 2025-01-27
    const match = changelogContent.match(/##\s*\[([\d.]+)\]/);
    return match ? match[1] : null;
}

/**
 * Obtém a versão atual do package.json
 * @returns {Promise<string>} - Versão atual
 */
/**
 * Obtém a versão atual do package.json
 * @returns {Promise<string>} - Versão atual
 */
export async function getCurrentVersion() {
    try {
        // Primeiro tenta obter via IPC do Electron (mais confiável)
        if (window.electron?.getAppVersion) {
            try {
                const version = await window.electron.getAppVersion();
                if (version) {
                    // Salva no localStorage para referência futura
                    localStorage.setItem('luna-current-version', version);
                    return version;
                }
            } catch (error) {
                console.warn('[CHANGELOG] Erro ao obter versão via IPC:', error);
            }
        }
        
        // Tenta obter via fetch (desenvolvimento)
        if (import.meta.env.DEV) {
            try {
                const response = await fetch('/package.json');
                if (response.ok) {
                    const data = await response.json();
                    const version = data.version || '1.0.0';
                    localStorage.setItem('luna-current-version', version);
                    return version;
                }
            } catch (error) {
                console.warn('[CHANGELOG] Erro ao obter versão via fetch:', error);
            }
        }
        
        // Fallback: tenta buscar do localStorage (salvo anteriormente)
        const savedVersion = localStorage.getItem('luna-current-version');
        if (savedVersion) {
            return savedVersion;
        }
        
        return '1.0.0';
    } catch (error) {
        console.error('[CHANGELOG] Erro ao obter versão atual:', error);
        // Fallback para localStorage
        const savedVersion = localStorage.getItem('luna-current-version');
        return savedVersion || '1.0.0';
    }
}
