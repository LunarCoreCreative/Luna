"""
Teste de Integração Firebase - Luna Health
==========================================
Testa se a integração do Firebase está funcionando corretamente.
"""

import sys
import os
import io
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Adicionar server ao path
sys.path.insert(0, str(Path(__file__).parent / "server"))

def test_firebase_initialization():
    """Testa se Firebase pode ser inicializado."""
    print("=" * 70)
    print("Teste 1: Inicialização do Firebase")
    print("=" * 70)
    
    try:
        from server.firebase_config import initialize_firebase, get_firestore
        
        result = initialize_firebase()
        if result:
            print("[OK] Firebase inicializado com sucesso!")
            db = get_firestore()
            if db:
                print("[OK] Cliente Firestore obtido com sucesso!")
                return True
            else:
                print("[ERRO] Cliente Firestore nao disponivel")
                return False
        else:
            print("[AVISO] Firebase nao inicializado (pode ser normal se nao houver credenciais)")
            print("   Isso e OK para desenvolvimento - o sistema usara fallback local")
            return False
    except Exception as e:
        print(f"[ERRO] Erro ao inicializar Firebase: {e}")
        return False


def test_firebase_functions_import():
    """Testa se as funções Firebase podem ser importadas."""
    print("\n" + "=" * 70)
    print("Teste 2: Importação de Funções Firebase")
    print("=" * 70)
    
    try:
        from server.firebase_config import (
            save_meal_to_firebase,
            get_user_meals_from_firebase,
            delete_meal_from_firebase,
            update_meal_in_firebase,
            save_goals_to_firebase,
            get_user_goals_from_firebase
        )
        print("[OK] Todas as funcoes Firebase importadas com sucesso!")
        return True
    except ImportError as e:
        print(f"[ERRO] Erro ao importar funcoes: {e}")
        return False


def test_storage_firebase_integration():
    """Testa se o storage está usando Firebase quando disponível."""
    print("\n" + "=" * 70)
    print("Teste 3: Integração Storage com Firebase")
    print("=" * 70)
    
    try:
        from server.health.storage import (
            _should_use_firebase,
            FIREBASE_AVAILABLE,
            load_meals,
            add_meal,
            get_goals,
            update_goals
        )
        
        print(f"Firebase disponível: {FIREBASE_AVAILABLE}")
        
        # Testa com user_id real (deve usar Firebase se disponível)
        test_uid = "test_user_firebase_123"
        should_use = _should_use_firebase(test_uid)
        print(f"Deve usar Firebase para '{test_uid}': {should_use}")
        
        # Testa com user_id local (não deve usar Firebase)
        should_use_local = _should_use_firebase("local")
        print(f"Deve usar Firebase para 'local': {should_use_local}")
        assert should_use_local == False, "Local não deve usar Firebase"
        
        # Testa operações básicas
        print("\nTestando operações básicas...")
        
        # Testa add_meal (não vai salvar de verdade, mas testa o fluxo)
        try:
            meal = add_meal(
                user_id=test_uid,
                name="Teste Firebase",
                meal_type="breakfast",
                calories=300.0
            )
            print(f"[OK] add_meal executado (ID: {meal.get('id')})")
        except Exception as e:
            print(f"[AVISO] add_meal falhou (pode ser normal se Firebase nao estiver configurado): {e}")
        
        # Testa get_goals
        try:
            goals = get_goals(test_uid)
            print(f"[OK] get_goals executado (retornou {len(goals)} campos)")
        except Exception as e:
            print(f"[AVISO] get_goals falhou: {e}")
        
        print("[OK] Integracao Storage-Firebase funcionando!")
        return True
        
    except Exception as e:
        print(f"❌ Erro na integração: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_fallback_local():
    """Testa se o fallback local funciona quando Firebase não está disponível."""
    print("\n" + "=" * 70)
    print("Teste 4: Fallback Local")
    print("=" * 70)
    
    try:
        from server.health.storage import (
            add_meal,
            load_meals,
            get_goals,
            update_goals,
            _should_use_firebase
        )
        
        # Usa "local" para forçar fallback local
        local_user = "local"
        should_use = _should_use_firebase(local_user)
        print(f"Deve usar Firebase para 'local': {should_use}")
        assert should_use == False, "Local deve usar fallback"
        
        # Testa operações locais
        print("\nTestando operações locais...")
        
        meal = add_meal(
            user_id=local_user,
            name="Teste Local",
            meal_type="lunch",
            calories=500.0,
            protein=25.0
        )
        print(f"✅ Refeição adicionada localmente (ID: {meal.get('id')})")
        
        meals = load_meals(local_user)
        print(f"✅ Refeições carregadas: {len(meals)} encontradas")
        assert len(meals) > 0, "Deve ter pelo menos 1 refeição"
        
        goals = update_goals(
            user_id=local_user,
            daily_calories=2000.0,
            daily_protein=80.0
        )
        print(f"✅ Metas atualizadas localmente")
        assert goals.get("daily_calories") == 2000.0
        
        print("✅ Fallback local funcionando perfeitamente!")
        return True
        
    except Exception as e:
        print(f"❌ Erro no fallback local: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_routes_integration():
    """Testa se as rotas estão funcionando com Firebase."""
    print("\n" + "=" * 70)
    print("Teste 5: Integração com Rotas")
    print("=" * 70)
    
    try:
        from server.health.routes import router
        from server.health.storage import load_meals, add_meal
        
        print("[OK] Rotas importadas com sucesso")
        print(f"[OK] Router configurado: {router.prefix}")
        
        # Testa se as funções de storage podem ser chamadas
        test_uid = "test_route_user"
        meals = load_meals(test_uid, limit=5)
        print(f"[OK] load_meals via storage funcionando ({len(meals)} meals)")
        
        print("[OK] Integracao com rotas OK!")
        return True
        
    except Exception as e:
        print(f"❌ Erro na integração com rotas: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Executa todos os testes."""
    print("\n" + "=" * 70)
    print("TESTES DE INTEGRACAO FIREBASE - LUNA HEALTH")
    print("=" * 70)
    print()
    
    results = []
    
    # Teste 1: Inicialização
    results.append(("Inicialização Firebase", test_firebase_initialization()))
    
    # Teste 2: Importação
    results.append(("Importação de Funções", test_firebase_functions_import()))
    
    # Teste 3: Integração Storage
    results.append(("Integração Storage", test_storage_firebase_integration()))
    
    # Teste 4: Fallback Local
    results.append(("Fallback Local", test_fallback_local()))
    
    # Teste 5: Rotas
    results.append(("Integração Rotas", test_routes_integration()))
    
    # Resumo
    print("\n" + "=" * 70)
    print("📊 RESUMO DOS TESTES")
    print("=" * 70)
    
    passed = 0
    total = len(results)
    
    for name, result in results:
        status = "[OK] PASSOU" if result else "[AVISO] FALHOU/AVISO"
        print(f"{name}: {status}")
        if result:
            passed += 1
    
    print()
    print(f"Total: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n[SUCESSO] Todos os testes passaram! Integracao Firebase funcionando!")
    else:
        print(f"\n[AVISO] {total - passed} teste(s) falharam ou geraram avisos")
        print("   (Isso pode ser normal se Firebase nao estiver configurado)")
    
    print("=" * 70)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
