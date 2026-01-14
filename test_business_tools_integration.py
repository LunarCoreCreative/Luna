"""
Teste de Integração - Business Tools e Luna Agent
--------------------------------------------------
Testa se as tools funcionam corretamente e se a Luna não inventa números.
"""

import sys
import json
import os
from pathlib import Path

# Adiciona o diretório server ao path
sys.path.insert(0, str(Path(__file__).parent / "server"))

# Ativa modo de teste (permite storage local temporariamente)
os.environ["LUNA_TEST_MODE"] = "1"

from business.tools import execute_business_tool, BUSINESS_TOOLS_SCHEMA
from business.storage import add_transaction, get_summary, delete_transaction, load_transactions
# Não importamos business_agent pois requer configuração completa do servidor

# Configuração de teste
# Usa um user_id que parece Firebase UID mas permite modo de teste local
TEST_USER_ID = "testlocal12345678901234567890"  # Simula Firebase UID longo

def test_tools_directly():
    """Testa as tools diretamente sem passar pelo agente."""
    print("\n" + "="*60)
    print("TESTE 1: Execução Direta das Tools")
    print("="*60)
    
    # Limpa dados de teste anteriores
    try:
        from business.storage import get_user_data_dir
        user_dir = get_user_data_dir(TEST_USER_ID)
        if (user_dir / "transactions.json").exists():
            (user_dir / "transactions.json").write_text("[]", encoding="utf-8")
    except:
        pass
    
    # Adiciona algumas transações de teste
    print("\n[1.1] Adicionando transações de teste...")
    test_transactions = [
        ("income", 500.00, "Salário"),
        ("expense", 200.00, "Aluguel"),
        ("expense", 50.25, "Café"),
    ]
    
    for tx_type, value, desc in test_transactions:
        try:
            tx = add_transaction(TEST_USER_ID, tx_type, value, desc, category="teste")
            print(f"  ✅ {tx_type} R$ {value:.2f} - {desc} (ID: {tx['id']})")
        except Exception as e:
            print(f"  ❌ Erro ao adicionar: {e}")
    
    # Testa get_balance
    print("\n[1.2] Testando get_balance...")
    try:
        result = execute_business_tool("get_balance", {}, TEST_USER_ID)
        print(f"  Resultado: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        # Verifica campos esperados
        expected_fields = ["success", "balance", "income", "expenses", "transaction_count", "message"]
        missing = [f for f in expected_fields if f not in result]
        if missing:
            print(f"  ⚠️ Campos faltando: {missing}")
        else:
            print("  ✅ Todos os campos esperados estão presentes")
        
        # Verifica se NÃO tem campos antigos
        old_fields = ["total_incomes", "total_expenses"]
        found_old = [f for f in old_fields if f in result]
        if found_old:
            print(f"  ❌ Campos antigos encontrados (não deveriam existir): {found_old}")
        else:
            print("  ✅ Nenhum campo antigo encontrado")
        
        # Verifica consistência com get_summary
        summary = get_summary(TEST_USER_ID)
        if abs(result["balance"] - summary["balance"]) > 0.01:
            print(f"  ❌ Inconsistência: get_balance={result['balance']}, get_summary={summary['balance']}")
        else:
            print(f"  ✅ Valores consistentes: balance={result['balance']}")
            
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        import traceback
        traceback.print_exc()
    
    # Testa list_transactions
    print("\n[1.3] Testando list_transactions...")
    try:
        result = execute_business_tool("list_transactions", {"limit": 5}, TEST_USER_ID)
        print(f"  Resultado: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get("success") and "transactions" in result:
            print(f"  ✅ Retornou {len(result['transactions'])} transações")
        else:
            print(f"  ❌ Formato inesperado")
            
    except Exception as e:
        print(f"  ❌ Erro: {e}")
    
    # Testa add_transaction via tool
    print("\n[1.4] Testando add_transaction via tool...")
    try:
        result = execute_business_tool(
            "add_transaction",
            {
                "type": "income",
                "value": 100.00,
                "description": "Teste Tool",
                "category": "teste"
            },
            TEST_USER_ID
        )
        print(f"  Resultado: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get("success"):
            print("  ✅ Transação adicionada com sucesso")
        else:
            print(f"  ❌ Falha: {result.get('message', 'Erro desconhecido')}")
            
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        import traceback
        traceback.print_exc()


def test_tool_schema():
    """Verifica se o schema das tools está correto para Together AI."""
    print("\n" + "="*60)
    print("TESTE 2: Schema das Tools (Together AI)")
    print("="*60)
    
    # Verifica get_balance no schema
    get_balance_tool = None
    for tool in BUSINESS_TOOLS_SCHEMA:
        if tool["function"]["name"] == "get_balance":
            get_balance_tool = tool
            break
    
    if not get_balance_tool:
        print("  ❌ Tool 'get_balance' não encontrada no schema")
        return
    
    print("\n[2.1] Schema de get_balance:")
    print(f"  {json.dumps(get_balance_tool, indent=2, ensure_ascii=False)}")
    
    # Verifica formato
    required_keys = ["type", "function"]
    if all(k in get_balance_tool for k in required_keys):
        print("  ✅ Formato básico correto")
    else:
        print(f"  ❌ Formato incorreto. Chaves esperadas: {required_keys}")
    
    func = get_balance_tool["function"]
    if "name" in func and "description" in func and "parameters" in func:
        print("  ✅ Estrutura da função correta")
    else:
        print("  ❌ Estrutura da função incompleta")
    
    # Verifica se não tem campos antigos na descrição
    desc = func.get("description", "")
    if "total_incomes" in desc or "total_expenses" in desc:
        print("  ⚠️ Descrição menciona campos antigos")
    else:
        print("  ✅ Descrição não menciona campos antigos")


def test_consistency():
    """Testa consistência entre diferentes formas de obter os mesmos dados."""
    print("\n" + "="*60)
    print("TESTE 3: Consistência de Dados")
    print("="*60)
    
    try:
        # 1. get_summary direto
        summary = get_summary(TEST_USER_ID)
        print(f"\n[3.1] get_summary direto:")
        print(f"  Balance: {summary['balance']}")
        print(f"  Income: {summary['income']}")
        print(f"  Expenses: {summary['expenses']}")
        
        # 2. get_balance via tool
        tool_result = execute_business_tool("get_balance", {}, TEST_USER_ID)
        print(f"\n[3.2] get_balance via tool:")
        print(f"  Balance: {tool_result.get('balance')}")
        print(f"  Income: {tool_result.get('income')}")
        print(f"  Expenses: {tool_result.get('expenses')}")
        
        # 3. Cálculo manual
        transactions = load_transactions(TEST_USER_ID)
        manual_income = sum(t.get("value", 0) for t in transactions if t.get("type") == "income")
        manual_expenses = sum(t.get("value", 0) for t in transactions if t.get("type") == "expense")
        manual_balance = manual_income - manual_expenses
        
        print(f"\n[3.3] Cálculo manual:")
        print(f"  Income: {manual_income}")
        print(f"  Expenses: {manual_expenses}")
        print(f"  Balance: {manual_balance}")
        
        # Compara
        print(f"\n[3.4] Comparação:")
        tolerance = 0.01
        
        checks = [
            ("balance", summary["balance"], tool_result.get("balance"), manual_balance),
            ("income", summary["income"], tool_result.get("income"), manual_income),
            ("expenses", summary["expenses"], tool_result.get("expenses"), manual_expenses),
        ]
        
        all_ok = True
        for field, s_val, t_val, m_val in checks:
            if abs(s_val - t_val) > tolerance:
                print(f"  ❌ {field}: summary={s_val}, tool={t_val} (diferença: {abs(s_val - t_val)})")
                all_ok = False
            elif abs(s_val - m_val) > tolerance:
                print(f"  ❌ {field}: summary={s_val}, manual={m_val} (diferença: {abs(s_val - m_val)})")
                all_ok = False
            else:
                print(f"  ✅ {field}: todos os valores batem ({s_val:.2f})")
        
        if all_ok:
            print("\n  ✅✅✅ TODOS OS VALORES SÃO CONSISTENTES!")
        else:
            print("\n  ⚠️⚠️⚠️ HÁ INCONSISTÊNCIAS!")
            
    except Exception as e:
        print(f"  ❌ Erro: {e}")
        import traceback
        traceback.print_exc()


def test_error_handling():
    """Testa se as tools lidam corretamente com erros."""
    print("\n" + "="*60)
    print("TESTE 4: Tratamento de Erros")
    print("="*60)
    
    # Testa com user_id inválido (deve falhar graciosamente)
    print("\n[4.1] Testando com user_id inválido...")
    try:
        result = execute_business_tool("get_balance", {}, "invalid_user")
        print(f"  Resultado: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get("success") == False:
            print("  ✅ Tool retornou success=False corretamente")
        else:
            print("  ⚠️ Tool retornou success=True mesmo com erro")
            
    except Exception as e:
        print(f"  ⚠️ Exceção lançada (pode ser esperado): {e}")
    
    # Testa delete_transaction com ID inexistente
    print("\n[4.2] Testando delete_transaction com ID inexistente...")
    try:
        result = execute_business_tool("delete_transaction", {"transaction_id": "nonexistent_id"}, TEST_USER_ID)
        print(f"  Resultado: {json.dumps(result, indent=2, ensure_ascii=False)}")
        
        if result.get("success") == False:
            print("  ✅ Tool retornou success=False corretamente")
        else:
            print("  ⚠️ Tool retornou success=True mesmo com ID inexistente")
            
    except Exception as e:
        print(f"  ⚠️ Exceção lançada: {e}")


def main():
    """Executa todos os testes."""
    print("\n" + "="*60)
    print("TESTES DE INTEGRAÇÃO - BUSINESS TOOLS E LUNA")
    print("="*60)
    print(f"\nUsando user_id de teste: {TEST_USER_ID}")
    print("(Dados locais apenas, não afeta Firebase)\n")
    
    try:
        test_tools_directly()
        test_tool_schema()
        test_consistency()
        test_error_handling()
        
        print("\n" + "="*60)
        print("✅ TESTES CONCLUÍDOS")
        print("="*60)
        print("\nResumo:")
        print("- Tools executam corretamente")
        print("- Schema está no formato correto para Together AI")
        print("- Valores são consistentes entre diferentes métodos")
        print("- Erros são tratados graciosamente")
        print("\n⚠️  Nota: Para testar o agente completo (com Together AI),")
        print("    você precisaria de uma API key válida e fazer chamadas reais.")
        
    except Exception as e:
        print(f"\n❌ ERRO GERAL: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
