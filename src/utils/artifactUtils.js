/**
 * Artifact Utilities - Funções para processamento e sumarização de artefatos
 */

export const filterSummaryText = (text) => {
    if (!text) return "";
    let t = String(text);

    // Remove code blocks
    t = t.replace(/```[\s\S]*?```/g, "");

    // Remove JSON tool call patterns (the main leak)
    t = t.replace(/\{"name":\s*"create_artifact"[\s\S]*?"content":\s*"/g, "");
    t = t.replace(/\{"name":\s*"edit_artifact"[\s\S]*?"changes":\s*\[/g, "");
    t = t.replace(/\{"name":\s*"\w+"[\s\S]*?\}/g, "");

    // Remove partial JSON artifacts
    t = t.replace(/"artifact_type":\s*"\w+"/g, "");
    t = t.replace(/"title":\s*"[^"]*"/g, "");
    t = t.replace(/"language":\s*"\w+"/g, "");
    t = t.replace(/"content":\s*"/g, "");

    // Remove tool call markers
    t = t.replace(/\(\s*create_artifact[\s\S]*?\)/gi, "");
    t = t.replace(/<\|[^|]*\|>/g, "");
    t = t.replace(/<\/?tool_call[^>]*>/gi, "");
    t = t.replace(/<\/?[\w-]+\/?>/g, "");

    // Remove orphaned JSON fragments
    t = t.replace(/\{[^}]{0,20}$/g, ""); // Incomplete JSON at end
    t = t.replace(/^[^{]*\}/g, ""); // Incomplete JSON at start
    t = t.replace(/\\n/g, "\n"); // Fix escaped newlines

    // Remove lines with only special characters
    t = t.replace(/^[\s\[\]\{\}\(\)<>\-_=|`~]+$/gm, "");

    const lines = t.split("\n").filter(l => {
        const s = l.trim();
        if (!s) return false;
        if (s.length > 0 && s.length < 4) return false;
        if (/^(def |class |import |from |print\(|#|\/\/|function |const |let |var |public |private |return |if\s*\(|for\s*\(|while\s*\()/.test(s)) return false;
        if (/^\s*<\w+/.test(s)) return false;
        if (/Processo de Pensamento/i.test(s)) return false;
        // Filter out JSON-like lines
        if (/^[\s]*[\{\}\[\]":,]+[\s]*$/.test(s)) return false;
        if (/^"?\w+"?\s*:\s*"/.test(s)) return false;
        return true;
    });
    t = lines.join("\n").trim();
    if (t.length > 600) t = t.slice(0, 600) + "…";
    return t;
};

export const isBadSummaryText = (text) => {
    if (!text) return true;
    const s = text.trim();
    if (!s) return true;
    if (/^\S{30,}$/.test(s)) return true;
    const spaceCount = (s.match(/\s/g) || []).length;
    if (spaceCount < 3 && s.length > 40) return true;
    return false;
};

export const makeAutoSummary = (artifact) => {
    const title = artifact?.title || "Artefato";
    const lang = artifact?.language || artifact?.type || "plaintext";
    const lines = (artifact?.content || "").split("\n").length;
    const chars = (artifact?.content || "").length;
    return `✨ ${title} criado (${lang}). ${lines} linhas, ${chars} caracteres.`;
};

export const isCodeArtifact = (artifact) => {
    const lang = (artifact?.language || "").toLowerCase();
    const type = (artifact?.type || "").toLowerCase();
    const codeKinds = ["code", "react", "html"];
    const codeLangs = ["python", "javascript", "typescript", "tsx", "jsx", "c#", "cs", "java", "go", "rust"];
    return codeKinds.includes(type) || codeLangs.includes(lang);
};

export const summarizeArtifactContent = (artifact) => {
    const content = String(artifact?.content || "").trim();
    if (!content) return makeAutoSummary(artifact);
    const isTextual = (artifact?.type === "markdown") || (artifact?.language === "markdown") || (/^#\s/m.test(content)) || (content.split("\n").length > 5);
    if (!isTextual) return makeAutoSummary(artifact);
    const paras = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const pCount = paras.length;
    const first = paras[0]?.replace(/\s+/g, " ").trim().slice(0, 180);
    const lastPara = paras[Math.max(0, pCount - 1)] || "";
    const sentences = lastPara.split(/(?<=[\.\!\?…])\s+/).filter(s => s.trim().length > 0);
    const closing = sentences[sentences.length - 1]?.trim().slice(0, 160) || "";
    const titleLine = (content.match(/^#\s+(.*)$/m) || [, ""])[1].trim();
    const proper = Array.from(new Set((content.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÄËÏÖÜÇ][a-záéíóúâêôãõäëïöüç]+\b/g) || []).filter(w => w.length > 2))).slice(0, 4);
    const tokens = content.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-zà-ú]{4,}/g) || [];
    const stop = new Set(["assim", "entre", "sobre", "como", "para", "com", "mais", "tudo", "nada", "onde", "quando", "porque", "entao", "pois", "tambem", "ainda", "cada", "seu", "sua", "meu", "minha", "nosso", "nossa", "eles", "elas", "este", "esta", "aquele", "aquela", "que", "por", "uma", "umas", "uns", "dos", "das", "numa", "num", "tem", "era", "foi", "ser", "estar"]);
    const freq = {};
    for (const t of tokens) { if (!stop.has(t)) freq[t] = (freq[t] || 0) + 1; }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
    const themes = top.length ? top.join(", ") : "";
    const who = proper.length ? `Personagens/elementos: ${proper.join(", ")}.` : "";
    const intro = first ? `Abertura: "${first}".` : "";
    const end = closing ? `Fecho: "${closing}".` : "";
    const info = [who, intro, end].filter(Boolean).join("\n");
    const body = [
        `Escrevi ${titleLine ? `"${titleLine}"` : "o texto"} em tom narrativo.`,
        `Estrutura com ${pCount} parágrafos.`,
        themes ? `Temas em foco: ${themes}.` : "",
        info
    ].filter(Boolean).join("\n");
    return body;
};

export const summarizeCodeArtifact = (artifact) => {
    const content = String(artifact?.content || "");
    const lang = (artifact?.language || artifact?.type || "code").toLowerCase();
    const lines = content.split("\n");
    const nameFromHeader = (content.match(/^\s*#\s+(.*)$/m) || [, ""])[1] || (content.match(/^\s*\/\/\s+(.*)$/m) || [, ""])[1] || "";
    const fnPy = Array.from(content.matchAll(/\bdef\s+([A-Za-z_]\w*)\s*\(/g)).map(m => m[1]);
    const clsPy = Array.from(content.matchAll(/\bclass\s+([A-Za-z_]\w*)\s*/g)).map(m => m[1]);
    const importsPy = Array.from(content.matchAll(/\bimport\s+([A-Za-z_][\w\.]*)|\bfrom\s+([A-Za-z_][\w\.]*)\s+import/g)).map(m => m[1] || m[2]).filter(Boolean);
    const fnJs = Array.from(content.matchAll(/\bfunction\s+([A-Za-z_]\w*)\s*\(|\bconst\s+([A-Za-z_]\w*)\s*=\s*\([^)]*\)\s*=>/g)).map(m => m[1] || m[2]).filter(Boolean);
    const clsJs = Array.from(content.matchAll(/\bclass\s+([A-Za-z_]\w*)\s*/g)).map(m => m[1]);
    const importsJs = Array.from(content.matchAll(/\bimport\s+.*\bfrom\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g)).map(m => m[1] || m[2]).filter(Boolean);
    const fnCs = Array.from(content.matchAll(/\b(?:public|private|protected|internal|static|async)\s+[A-Za-z<>\[\]]+\s+([A-Za-z_]\w*)\s*\(/g)).map(m => m[1]);
    const clsCs = Array.from(content.matchAll(/\bclass\s+([A-Za-z_]\w*)\b/g)).map(m => m[1]);
    const hasMainPy = /if\s+__name__\s*==\s*['"]__main__['"]/.test(content);
    const hasExportsJs = /\bexport\s+(?:default|function|const|class)\b/.test(content);
    const hasDoc = /("""[\s\S]*?""")|(\/\*[\s\S]*?\*\/)/.test(content);
    const fn = fnPy.length ? fnPy : (fnJs.length ? fnJs : fnCs);
    const cls = clsPy.length ? clsPy : (clsJs.length ? clsJs : clsCs);
    const imps = importsPy.length ? importsPy : (importsJs.length ? importsJs : []);
    const topFns = fn.slice(0, 5).join(", ");
    const topCls = cls.slice(0, 3).join(", ");
    const topImps = Array.from(new Set(imps)).slice(0, 6).join(", ");
    const bullets = [];
    if (topFns) bullets.push(`Funções: ${topFns}${fn.length > 5 ? ` (+${fn.length - 5})` : ""}.`);
    if (topCls) bullets.push(`Classes: ${topCls}${cls.length > 3 ? ` (+${cls.length - 3})` : ""}.`);
    if (topImps) bullets.push(`Dependências: ${topImps}.`);
    if (nameFromHeader) bullets.push(`Cabeçalho: "${nameFromHeader.trim().slice(0, 80)}".`);
    if (hasDoc) bullets.push(`Documentação embutida.`);
    if (hasMainPy) bullets.push(`Executável via bloco __main__.`);
    if (hasExportsJs) bullets.push(`Exporta módulos para reuso.`);
    const suggest = [];
    if (!/test|pytest|xunit|jest|vitest/i.test(content)) suggest.push("Adicionar testes automatizados.");
    if (!/README|doc/i.test(content)) suggest.push("Escrever README rápido e exemplos de uso.");
    suggest.push("Melhorias progressivas: logs estruturados e tratamento de erros.");
    const summary = [
        bullets.length ? bullets.join("\n") : "Estrutura de código criada.",
        "",
        "Próximos passos:",
        `- ${suggest.join("\n- ")}`
    ].join("\n");
    return summary;
};

export const generateArtifactSummary = (artifact, rawSummary) => {
    const cleaned = filterSummaryText(rawSummary || "");
    const title = artifact?.title || "Artefato";
    const lang = artifact?.language || artifact?.type || "plaintext";
    const lines = (artifact?.content || "").split("\n").length;
    const chars = (artifact?.content || "").length;
    const overview = `- Título: ${title}\n- Tipo/Linguagem: ${lang}\n- Linhas: ${lines}\n- Caracteres: ${chars}`;
    const body = isBadSummaryText(cleaned) ? (isCodeArtifact(artifact) ? summarizeCodeArtifact(artifact) : summarizeArtifactContent(artifact)) : cleaned;
    return [
        "> [!RESUMO] ✨ Artefato no Canvas",
        "",
        "### Visão Geral",
        overview,
        "",
        "### O que foi feito",
        body,
        "",
        "### Ações",
        "- Clique no badge para abrir o Canvas",
        "- Peça para editar ou continuar que eu atualizo direto no arquivo"
    ].join("\n");
};
