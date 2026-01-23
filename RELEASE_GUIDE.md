# Guia de Releases - Luna

Este documento descreve como fazer releases e pre-releases da Luna.

## 📋 Estrutura de Versões

- **Releases Estáveis**: `1.0.0`, `1.1.0`, `2.0.0` (apenas números)
- **Pre-Releases**: `1.0.0-beta.1`, `1.0.0-alpha.1`, `1.0.0-rc.1`

## 🔄 Workflows Automatizados

### 1. Release Estável (Branch `main`)

**Disparado por:**
- Push de tag `v*` (ex: `v1.0.0`)
- Push no branch `main`
- Manualmente via `workflow_dispatch`

**O que faz:**
1. Extrai versão da tag ou input
2. Atualiza `package.json` com a versão
3. Extrai changelog do `CHANGELOG.md`
4. Cria release draft no GitHub
5. Faz build da aplicação
6. Faz upload dos assets (installer + latest.yml)
7. Publica a release (marca como latest)

**Como usar:**
```bash
# Opção 1: Criar tag e fazer push
git tag v1.0.0
git push origin v1.0.0

# Opção 2: Via GitHub Actions UI
# Actions > Release > Run workflow
```

### 2. Pre-Release (Branch `staging`)

**Disparado por:**
- Push no branch `staging`
- Manualmente via `workflow_dispatch`

**O que faz:**
1. Determina versão (auto-incrementa ou usa input)
2. Atualiza `package.json`
3. Extrai changelog (usa seção "Não Publicado" se disponível)
4. Cria tag e release draft
5. Faz build
6. Faz upload dos assets
7. Publica como pre-release (não marca como latest)

**Como usar:**
```bash
# Push no staging dispara automaticamente
git push origin staging

# Ou manualmente via GitHub Actions UI
# Actions > Pre-Release > Run workflow
```

## 📝 CHANGELOG.md

O CHANGELOG deve seguir este formato:

```markdown
## [Não Publicado]

### ✨ Novas Funcionalidades
- Feature 1
- Feature 2

### 🐛 Correções de Bugs
- Bug fix 1

---

## [1.0.0] - 2025-01-29

### 🎉 Release Inicial
- Versão inicial
```

**Regras:**
- Seção "Não Publicado" é usada para pre-releases
- Versões específicas são usadas para releases estáveis
- Data no formato `YYYY-MM-DD`

## ⚙️ Auto-Updater

O autoupdater está configurado para:
- ✅ Detectar releases estáveis (latest)
- ✅ Detectar pre-releases (beta, alpha, rc)
- ✅ Download controlado pelo usuário
- ✅ Instalação automática ao fechar o app

**Configuração:**
- `allowPrerelease: true` - Permite detectar pre-releases
- `channel: 'latest'` - Canal de atualização
- `autoDownload: false` - Usuário decide quando baixar

## 🔧 Configuração do package.json

```json
{
  "version": "1.0.0",
  "build": {
    "publish": {
      "provider": "github",
      "owner": "LunarCoreCreative",
      "repo": "Luna",
      "releaseType": "release"
    }
  }
}
```

## 📦 Assets Gerados

Cada release gera:
- `Luna-{version}-Setup.exe` - Instalador Windows
- `latest.yml` - Metadados para autoupdater

## 🚀 Fluxo Recomendado

1. **Desenvolvimento** → Branch `staging`
2. **Testes** → Pre-release automático no `staging`
3. **Aprovação** → Merge `staging` → `main`
4. **Release** → Criar tag `v1.0.0` no `main`

## ⚠️ Notas Importantes

- Releases estáveis sempre marcam como "latest"
- Pre-releases nunca marcam como "latest"
- O autoupdater busca releases do GitHub (não apenas tags)
- Sempre atualize o CHANGELOG antes de fazer release
