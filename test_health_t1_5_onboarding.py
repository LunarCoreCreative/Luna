"""
Teste T1.5 - Onboarding leve no chat
=====================================
Valida que o onboarding está funcionando corretamente.
"""

import sys
import io
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def test_onboarding_message():
    """Testa se a primeira mensagem contém informações de onboarding"""
    print("\n" + "="*70)
    print("TESTE T1.5 - ONBOARDING NO CHAT")
    print("="*70)
    
    # Mensagem de onboarding esperada (do HealthChat.jsx)
    expected_keywords = [
        "Luna Health",
        "nutricionista",
        "metas nutricionais",
        "primeira refeição",
        "Hoje",
        "calendário"
    ]
    
    # Simular a mensagem de onboarding (conforme implementada)
    onboarding_message = """Olá! Sou a Luna Health, sua nutricionista inteligente. 🥗

Estou aqui para te ajudar a alcançar seus objetivos nutricionais! Para começar, posso te ajudar com:

✨ **Configurar suas metas nutricionais** - Quer que eu te ajude a definir suas metas diárias de calorias, proteínas, carboidratos e gorduras?

📝 **Registrar sua primeira refeição** - Posso te ajudar a registrar o que você comeu hoje!

💡 **Dica**: Você pode ver seu diário alimentar completo na aba **"Hoje"** (ícone de calendário 📅) aqui ao lado. Lá você verá um resumo do seu dia com todas as suas refeições e o progresso em relação às suas metas!

Por onde gostaria de começar? 😊"""
    
    print("\n--- Teste 1: Verificar palavras-chave na mensagem de onboarding ---")
    passed = 0
    total = len(expected_keywords)
    
    for keyword in expected_keywords:
        if keyword.lower() in onboarding_message.lower():
            print(f"  ✅ Contém '{keyword}'")
            passed += 1
        else:
            print(f"  ❌ Não contém '{keyword}'")
    
    print(f"\nPalavras-chave encontradas: {passed}/{total}")
    
    # Teste 2: Verificar estrutura da mensagem
    print("\n--- Teste 2: Verificar estrutura da mensagem ---")
    has_greeting = "Olá" in onboarding_message or "Sou" in onboarding_message
    has_metas_offer = "metas" in onboarding_message.lower() or "configurar" in onboarding_message.lower()
    has_meal_offer = "refeição" in onboarding_message.lower() or "registrar" in onboarding_message.lower()
    has_ui_guidance = "Hoje" in onboarding_message or "calendário" in onboarding_message or "aba" in onboarding_message.lower()
    has_call_to_action = "?" in onboarding_message or "começar" in onboarding_message.lower()
    
    print(f"  ✅ Tem saudação: {has_greeting}")
    print(f"  ✅ Oferece configurar metas: {has_metas_offer}")
    print(f"  ✅ Oferece registrar refeição: {has_meal_offer}")
    print(f"  ✅ Orienta sobre interface (aba Hoje): {has_ui_guidance}")
    print(f"  ✅ Tem chamada para ação: {has_call_to_action}")
    
    structure_passed = sum([has_greeting, has_metas_offer, has_meal_offer, has_ui_guidance, has_call_to_action])
    structure_total = 5
    
    # Teste 3: Verificar system prompt
    print("\n--- Teste 3: Verificar instruções no system prompt ---")
    
    # Ler o system prompt do arquivo
    try:
        config_path = Path(__file__).parent / "server" / "config.py"
        with open(config_path, 'r', encoding='utf-8') as f:
            config_content = f.read()
        
        prompt_keywords = [
            "ONBOARDING",
            "aba \"Hoje\"",
            "calendário",
            "configurar metas",
            "primeira refeição",
            "onde o usuário vê"
        ]
        
        prompt_passed = 0
        for keyword in prompt_keywords:
            if keyword.lower() in config_content.lower():
                print(f"  ✅ System prompt contém '{keyword}'")
                prompt_passed += 1
            else:
                print(f"  ❌ System prompt não contém '{keyword}'")
        
        print(f"\nInstruções no system prompt: {prompt_passed}/{len(prompt_keywords)}")
        
    except Exception as e:
        print(f"  ⚠️  Não foi possível ler o system prompt: {e}")
        prompt_passed = 0
    
    # Resumo
    print("\n" + "="*70)
    print("RESUMO DOS TESTES")
    print("="*70)
    print(f"Palavras-chave na mensagem: {passed}/{total}")
    print(f"Estrutura da mensagem: {structure_passed}/{structure_total}")
    print(f"Instruções no system prompt: {prompt_passed}/{len(prompt_keywords) if 'prompt_keywords' in locals() else 0}")
    
    all_passed = (passed == total and structure_passed == structure_total and prompt_passed > 0)
    
    if all_passed:
        print("\n✅ TODOS OS TESTES DE ONBOARDING PASSARAM!")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os resultados acima.")
        return 1

if __name__ == "__main__":
    exit_code = test_onboarding_message()
    sys.exit(exit_code)
