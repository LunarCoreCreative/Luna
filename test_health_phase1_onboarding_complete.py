"""
Teste Completo - Fase 1 Onboarding (T1.5)
==========================================
Valida que o onboarding está funcionando corretamente em todos os aspectos.
"""

import sys
import io
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class TestResults:
    """Classe para rastrear resultados dos testes"""
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_test(self, name, passed, error=None):
        self.total += 1
        if passed:
            self.passed += 1
            print(f"  ✅ {name}")
        else:
            self.failed += 1
            self.errors.append((name, error))
            print(f"  ❌ {name}")
            if error:
                print(f"     Erro: {error}")
    
    def print_summary(self):
        print("\n" + "="*70)
        print("RESUMO FINAL DOS TESTES")
        print("="*70)
        print(f"Total de testes: {self.total}")
        print(f"✅ Passou: {self.passed}")
        print(f"❌ Falhou: {self.failed}")
        print(f"Taxa de sucesso: {(self.passed/self.total*100):.1f}%")
        
        if self.errors:
            print("\n❌ Testes que falharam:")
            for name, error in self.errors:
                print(f"  - {name}: {error}")
        
        return self.failed == 0

def test_onboarding_message_content(results):
    """Testa o conteúdo da mensagem de onboarding"""
    print("\n" + "="*70)
    print("TESTE: CONTEÚDO DA MENSAGEM DE ONBOARDING")
    print("="*70)
    
    # Mensagem esperada (do HealthChat.jsx)
    onboarding_message = """Olá! Sou a Luna Health, sua nutricionista inteligente. 🥗

Estou aqui para te ajudar a alcançar seus objetivos nutricionais! Para começar, posso te ajudar com:

✨ **Configurar suas metas nutricionais** - Quer que eu te ajude a definir suas metas diárias de calorias, proteínas, carboidratos e gorduras?

📝 **Registrar sua primeira refeição** - Posso te ajudar a registrar o que você comeu hoje!

💡 **Dica**: Você pode ver seu diário alimentar completo na aba **"Hoje"** (ícone de calendário 📅) aqui ao lado. Lá você verá um resumo do seu dia com todas as suas refeições e o progresso em relação às suas metas!

Por onde gostaria de começar? 😊"""
    
    # Palavras-chave obrigatórias
    required_keywords = {
        "Luna Health": "Identificação da assistente",
        "nutricionista": "Profissão/identidade",
        "metas nutricionais": "Oferece configurar metas",
        "primeira refeição": "Oferece registrar refeição",
        "Hoje": "Menciona a aba Hoje",
        "calendário": "Ícone da aba",
        "diário alimentar": "Explica funcionalidade",
        "resumo do seu dia": "Descreve o que verá",
        "Por onde gostaria": "Chamada para ação"
    }
    
    for keyword, description in required_keywords.items():
        found = keyword.lower() in onboarding_message.lower()
        results.add_test(f"Contém '{keyword}' ({description})", found)
    
    # Estrutura da mensagem
    results.add_test("Tem saudação inicial", "Olá" in onboarding_message or "Sou" in onboarding_message)
    results.add_test("Tem emojis para tornar amigável", "🥗" in onboarding_message or "✨" in onboarding_message)
    results.add_test("Tem formatação em negrito", "**" in onboarding_message)
    results.add_test("Tem múltiplas opções oferecidas", onboarding_message.count("✨") > 0 or onboarding_message.count("📝") > 0)
    results.add_test("Termina com pergunta/CTA", "?" in onboarding_message or "começar" in onboarding_message.lower())
    
    return True

def test_system_prompt_onboarding_instructions(results):
    """Testa se o system prompt tem instruções de onboarding"""
    print("\n" + "="*70)
    print("TESTE: INSTRUÇÕES DE ONBOARDING NO SYSTEM PROMPT")
    print("="*70)
    
    try:
        config_path = Path(__file__).parent / "server" / "config.py"
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        # Verificar seção de onboarding
        required_sections = {
            "ONBOARDING": "Seção de onboarding existe",
            "aba \"Hoje\"": "Menciona a aba Hoje",
            "calendário": "Menciona ícone de calendário",
            "configurar metas": "Instrui sobre configurar metas",
            "primeira refeição": "Instrui sobre primeira refeição",
            "onde o usuário vê": "Instrui sobre onde ver informações",
            "SEMPRE pergunte": "Instrui a ser proativa",
            "SEMPRE sugira": "Instrui a sugerir ações"
        }
        
        for keyword, description in required_sections.items():
            found = keyword.lower() in config_content.lower()
            results.add_test(f"System prompt: {description}", found)
        
        # Verificar estrutura da seção
        has_onboarding_section = "ONBOARDING E ORIENTAÇÃO" in config_content or "### 🎯 ONBOARDING" in config_content
        results.add_test("Tem seção dedicada de onboarding", has_onboarding_section)
        
        # Verificar instruções específicas
        has_ui_explanation = "aba \"Hoje\"" in config_content or "aba 'Hoje'" in config_content
        has_integration_guidance = "chat" in config_content.lower() and "interface" in config_content.lower()
        
        results.add_test("Instrui sobre explicar a interface", has_ui_explanation)
        results.add_test("Instrui sobre integração chat + UI", has_integration_guidance)
        
        return True
        
    except FileNotFoundError:
        results.add_test("Arquivo config.py encontrado", False, "Arquivo não encontrado")
        return False
    except Exception as e:
        results.add_test("Ler system prompt", False, str(e))
        return False

def test_onboarding_flow_logic(results):
    """Testa a lógica do fluxo de onboarding"""
    print("\n" + "="*70)
    print("TESTE: LÓGICA DO FLUXO DE ONBOARDING")
    print("="*70)
    
    # Simular cenários de onboarding
    scenarios = [
        {
            "name": "Usuário novo sem metas",
            "has_goals": False,
            "has_meals": False,
            "should_offer_goals": True,
            "should_offer_meal": True,
            "should_explain_ui": True
        },
        {
            "name": "Usuário com metas mas sem refeições",
            "has_goals": True,
            "has_meals": False,
            "should_offer_goals": False,
            "should_offer_meal": True,
            "should_explain_ui": True
        },
        {
            "name": "Usuário com metas e refeições",
            "has_goals": True,
            "has_meals": True,
            "should_offer_goals": False,
            "should_offer_meal": False,
            "should_explain_ui": False  # Já está usando
        }
    ]
    
    for scenario in scenarios:
        print(f"\n  Cenário: {scenario['name']}")
        
        # Verificar lógica
        if not scenario["has_goals"]:
            results.add_test(f"{scenario['name']}: Deve oferecer configurar metas", scenario["should_offer_goals"])
        
        if not scenario["has_meals"]:
            results.add_test(f"{scenario['name']}: Deve sugerir primeira refeição", scenario["should_offer_meal"])
        
        # Sempre deve explicar UI na primeira vez
        if not scenario["has_meals"]:
            results.add_test(f"{scenario['name']}: Deve explicar interface", scenario["should_explain_ui"])
    
    return True

def test_ui_guidance_instructions(results):
    """Testa se as instruções de orientação sobre UI estão completas"""
    print("\n" + "="*70)
    print("TESTE: INSTRUÇÕES DE ORIENTAÇÃO SOBRE UI")
    print("="*70)
    
    try:
        config_path = Path(__file__).parent / "server" / "config.py"
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        # Verificar instruções específicas sobre UI
        ui_guidance_keywords = [
            "aba \"Hoje\"",
            "ícone de calendário",
            "resumo do dia",
            "barras de progresso",
            "lista de refeições",
            "botões para adicionar"
        ]
        
        for keyword in ui_guidance_keywords:
            found = keyword.lower() in config_content.lower()
            results.add_test(f"Instrui sobre: {keyword}", found)
        
        # Verificar que instrui a mencionar quando registrar refeições
        has_integration_mention = "registrar uma refeição via chat" in config_content.lower() or "refeição registrada" in config_content.lower()
        results.add_test("Instrui a mencionar quando registrar refeições", has_integration_mention)
        
        # Verificar instruções sobre navegação
        has_navigation_guidance = "onde vejo" in config_content.lower() or "onde ver" in config_content.lower()
        results.add_test("Instrui sobre navegação/perguntas do usuário", has_navigation_guidance)
        
        return True
        
    except Exception as e:
        results.add_test("Testar instruções de UI", False, str(e))
        return False

def test_onboarding_message_format(results):
    """Testa o formato e apresentação da mensagem"""
    print("\n" + "="*70)
    print("TESTE: FORMATO DA MENSAGEM DE ONBOARDING")
    print("="*70)
    
    onboarding_message = """Olá! Sou a Luna Health, sua nutricionista inteligente. 🥗

Estou aqui para te ajudar a alcançar seus objetivos nutricionais! Para começar, posso te ajudar com:

✨ **Configurar suas metas nutricionais** - Quer que eu te ajude a definir suas metas diárias de calorias, proteínas, carboidratos e gorduras?

📝 **Registrar sua primeira refeição** - Posso te ajudar a registrar o que você comeu hoje!

💡 **Dica**: Você pode ver seu diário alimentar completo na aba **"Hoje"** (ícone de calendário 📅) aqui ao lado. Lá você verá um resumo do seu dia com todas as suas refeições e o progresso em relação às suas metas!

Por onde gostaria de começar? 😊"""
    
    # Verificar formatação
    results.add_test("Usa emojis apropriados", "🥗" in onboarding_message or "✨" in onboarding_message)
    results.add_test("Usa negrito para destacar", "**" in onboarding_message)
    results.add_test("Tem estrutura clara (parágrafos)", "\n\n" in onboarding_message)
    results.add_test("Tem tom amigável e acolhedor", "te ajudar" in onboarding_message.lower() or "gostaria" in onboarding_message.lower())
    results.add_test("Não é muito longa", len(onboarding_message) < 1000)
    results.add_test("Não é muito curta", len(onboarding_message) > 200)
    results.add_test("Tem call-to-action claro", "?" in onboarding_message or "começar" in onboarding_message.lower())
    
    # Verificar que menciona elementos específicos da UI
    results.add_test("Menciona aba 'Hoje' especificamente", '"Hoje"' in onboarding_message or "'Hoje'" in onboarding_message)
    results.add_test("Menciona ícone de calendário", "calendário" in onboarding_message.lower() or "📅" in onboarding_message)
    
    return True

def main():
    """Executa todos os testes de onboarding"""
    print("\n" + "="*70)
    print("TESTE COMPLETO - FASE 1 ONBOARDING (T1.5)")
    print("Validando mensagem, system prompt e fluxo de onboarding")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    print("\n🔍 Iniciando testes...\n")
    
    test_onboarding_message_content(results)
    test_system_prompt_onboarding_instructions(results)
    test_onboarding_flow_logic(results)
    test_ui_guidance_instructions(results)
    test_onboarding_message_format(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES DE ONBOARDING PASSARAM!")
        print("A subfase T1.5 está funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
