# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não Publicado]

### 🔧 Melhorias

- **Sistema de Releases Automatizado**:
  - Configurado workflow do GitHub Actions para releases estáveis (branch main)
  - Configurado workflow do GitHub Actions para pre-releases (branch staging)
  - Auto-incremento de versão para pre-releases (beta, alpha, rc)
  - Extração automática de changelog do CHANGELOG.md
  - Upload automático de assets (installer + latest.yml) para GitHub Releases
  - Correção de deleção de assets existentes antes de upload
  - Melhor tratamento de erros no autoupdater

- **Auto-Updater**:
  - Corrigida duplicação na configuração de allowPrerelease
  - Melhorada detecção de pre-releases (beta, alpha, rc)
  - Configurado para detectar releases do GitHub corretamente
  - Não mostra erro quando não há versões publicadas (normal se já tem a mais recente)
  - Logs mais detalhados para debug

- **Documentação**:
  - Criado CHANGELOG.md com estrutura para releases e pre-releases
  - Criado RELEASE_GUIDE.md com guia completo de como fazer releases

---

## [1.0.0] - 2025-01-29

### 🎉 Release Inicial

- Versão inicial da Luna AI Assistant
- Sistema completo de autenticação Firebase
- Modos: Health, Business, Study
- Auto-updater configurado
- Suporte a pre-releases
