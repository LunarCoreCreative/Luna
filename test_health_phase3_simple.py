"""
Teste Fase 3 - Versão Simplificada
Testa funcionalidades básicas sem depender do servidor
"""

import sys
import io
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

print("="*70)
print("TESTE FASE 3 - PORÇÕES, LEMBRETES E QUALIDADE DE VIDA")
print("="*70)

passed = 0
failed = 0
errors = []

def test(name, condition, error_msg=None):
    global passed, failed
    if condition:
        print(f"  ✅ {name}")
        passed += 1
    else:
        print(f"  ❌ {name}")
        if error_msg:
            print(f"     Erro: {error_msg}")
        failed += 1
        errors.append((name, error_msg))

# T3.1 - Helpers de Porções
print("\n" + "="*70)
print("TESTE T3.1 - HELPERS DE PORÇÕES")
print("="*70)

try:
    sys.path.insert(0, str(Path(__file__).parent / "server"))
    from server.health.foods import convert_portion_to_grams, parse_portion_string, DEFAULT_PORTIONS
    
    # Teste conversão
    fatia_grams = convert_portion_to_grams("pão integral", "fatia", 2.0)
    test("convert_portion_to_grams retorna valor", fatia_grams is not None and fatia_grams > 0)
    if fatia_grams:
        test("2 fatias = 50g", abs(fatia_grams - 50.0) < 0.1)
    
    # Teste parse
    parsed = parse_portion_string("2 fatias de pão integral")
    test("parse_portion_string funciona", parsed is not None)
    if parsed:
        test("Parse extrai quantidade", parsed.get("quantity") == 2.0)
        test("Parse extrai tipo", parsed.get("portion_type") == "fatias")
    
    # Teste DEFAULT_PORTIONS
    test("DEFAULT_PORTIONS existe", DEFAULT_PORTIONS is not None and len(DEFAULT_PORTIONS) > 0)
    test("DEFAULT_PORTIONS tem 'fatia'", "fatia" in DEFAULT_PORTIONS)
    
except Exception as e:
    test("T3.1 - Importação", False, str(e))
    import traceback
    traceback.print_exc()

# T3.2 - Integração
print("\n" + "="*70)
print("TESTE T3.2 - INTEGRAÇÃO DE PORÇÕES")
print("="*70)

try:
    from server.health.tools import HEALTH_TOOLS_SCHEMA
    from server.health.foods import calculate_nutrition
    import asyncio
    
    # Teste schema
    add_meal_tool = None
    for tool in HEALTH_TOOLS_SCHEMA:
        if tool.get("type") == "function" and tool.get("function", {}).get("name") == "add_meal":
            add_meal_tool = tool["function"]
            break
    
    test("Ferramenta add_meal existe", add_meal_tool is not None)
    if add_meal_tool:
        params = add_meal_tool.get("parameters", {}).get("properties", {})
        test("Schema tem 'portion_type'", "portion_type" in params)
        test("Schema tem 'portion_quantity'", "portion_quantity" in params)
    
    # Teste calculate_nutrition
    nutrition = asyncio.run(calculate_nutrition(
        "pão integral",
        portion_type="fatia",
        portion_quantity=2.0,
        search_online=False
    ))
    test("calculate_nutrition funciona com porções", nutrition is not None)
    if nutrition:
        test("Retorna calorias", "calories" in nutrition)
    
except Exception as e:
    test("T3.2 - Integração", False, str(e))
    import traceback
    traceback.print_exc()

# T3.3 - Lembretes
print("\n" + "="*70)
print("TESTE T3.3 - LEMBRETES")
print("="*70)

try:
    reminders_path = Path(__file__).parent / "src" / "components" / "health" / "RemindersTab.jsx"
    test("RemindersTab.jsx existe", reminders_path.exists())
    
    if reminders_path.exists():
        content = reminders_path.read_text(encoding='utf-8')
        test("Usa Notification API", "Notification" in content)
        test("Usa localStorage", "localStorage" in content)
        test("Tem lembretes de refeições", "breakfast" in content or "Café da manhã" in content)
        test("Tem lembretes de água", "water" in content)
    
    # Verificar integração
    health_mode_path = Path(__file__).parent / "src" / "components" / "health" / "HealthMode.jsx"
    if health_mode_path.exists():
        content = health_mode_path.read_text(encoding='utf-8')
        test("HealthMode importa RemindersTab", "RemindersTab" in content)
        test("HealthMode tem aba 'reminders'", "reminders" in content.lower() and "activeTab" in content)
    
except Exception as e:
    test("T3.3 - Lembretes", False, str(e))
    import traceback
    traceback.print_exc()

# T3.4 - Conversas sobre porções
print("\n" + "="*70)
print("TESTE T3.4 - CONVERSAS SOBRE PORÇÕES")
print("="*70)

try:
    config_path = Path(__file__).parent / "server" / "config.py"
    if config_path.exists():
        content = config_path.read_text(encoding='utf-8')
        test("Prompt tem seção sobre porções", "CONVERSAS SOBRE PORÇÕES" in content or "porções" in content.lower())
        test("Prompt tem exemplos", "2 fatias de pão" in content or "1 xícara" in content)
        test("Prompt menciona 'portion_type'", "portion_type" in content)
    
except Exception as e:
    test("T3.4 - Conversas", False, str(e))
    import traceback
    traceback.print_exc()

# Resumo
print("\n" + "="*70)
print("RESUMO FINAL")
print("="*70)
print(f"Total de testes: {passed + failed}")
print(f"✅ Passou: {passed}")
print(f"❌ Falhou: {failed}")
if passed + failed > 0:
    print(f"Taxa de sucesso: {(passed/(passed+failed)*100):.1f}%")

if errors:
    print("\n❌ Testes que falharam:")
    for name, error in errors:
        print(f"  - {name}: {error}")

if failed == 0:
    print("\n🎉 TODOS OS TESTES PASSARAM!")
    sys.exit(0)
else:
    print("\n⚠️  ALGUNS TESTES FALHARAM")
    sys.exit(1)
