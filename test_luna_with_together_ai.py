"""
Teste Real - Luna com Together AI
----------------------------------
Testa se a Luna realmente usa as tools e não inventa números.
"""

import sys
import json
import asyncio
from pathlib import Path

# Adiciona o diretório raiz ao path para imports relativos funcionarem
root_dir = Path(__file__).parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(root_dir / "server"))

# Importa usando o caminho do servidor
from server.business.tools import execute_business_tool, BUSINESS_TOOLS_SCHEMA
from server.business.storage import add_transaction, get_summary, load_transactions
from server.business_agent import business_generator
from server.chat import ChatRequest, Message
from server.config import API_KEY

# Ativa modo de teste
import os
os.environ["LUNA_TEST_MODE"] = "1"

TEST_USER_ID = "testlocal12345678901234567890"

async def test_luna_real():
    """Testa a Luna com chamadas reais ao Together AI."""
    print("\n" + "="*60)
    print("TESTE REAL - LUNA COM TOGETHER AI")
    print("="*60)
    
    if not API_KEY:
        print("\n❌ API_KEY não encontrada!")
        print("   Configure TOGETHER_API_KEY no arquivo .env")
        return
    
    print(f"\n✅ API_KEY encontrada: {API_KEY[:10]}...")
    
    # Limpa e prepara dados de teste
    print("\n[PREPARAÇÃO] Limpando e criando dados de teste...")
    try:
        from server.business.storage import get_user_data_dir
        user_dir = get_user_data_dir(TEST_USER_ID)
        if (user_dir / "transactions.json").exists():
            (user_dir / "transactions.json").write_text("[]", encoding="utf-8")
    except:
        pass
    
    # Adiciona transações conhecidas
    test_data = [
        ("income", 1000.00, "Salário Janeiro"),
        ("expense", 350.00, "Aluguel"),
        ("expense", 120.50, "Supermercado"),
    ]
    
    for tx_type, value, desc in test_data:
        try:
            add_transaction(TEST_USER_ID, tx_type, value, desc, category="teste")
            print(f"  ✅ {tx_type} R$ {value:.2f} - {desc}")
        except Exception as e:
            print(f"  ❌ Erro: {e}")
    
    # Obtém valores reais para comparação
    summary = get_summary(TEST_USER_ID)
    real_balance = summary["balance"]
    real_income = summary["income"]
    real_expenses = summary["expenses"]
    
    print(f"\n[VALORES REAIS ESPERADOS]")
    print(f"  Balance: R$ {real_balance:.2f}")
    print(f"  Income: R$ {real_income:.2f}")
    print(f"  Expenses: R$ {real_expenses:.2f}")
    
    # Testa perguntas para a Luna
    test_questions = [
        {
            "question": "Qual é o meu saldo atual?",
            "expected_fields": ["balance"],
            "description": "Pergunta direta sobre saldo"
        },
        {
            "question": "Quanto eu tenho de entrada e saída?",
            "expected_fields": ["income", "expenses"],
            "description": "Pergunta sobre totais"
        },
        {
            "question": "Me mostre um resumo financeiro completo",
            "expected_fields": ["balance", "income", "expenses"],
            "description": "Pergunta genérica de resumo"
        }
    ]
    
    print("\n" + "="*60)
    print("TESTANDO PERGUNTAS PARA A LUNA")
    print("="*60)
    
    for i, test in enumerate(test_questions, 1):
        print(f"\n[TESTE {i}] {test['description']}")
        print(f"  Pergunta: \"{test['question']}\"")
        
        # Cria request
        request = ChatRequest(
            user_id=TEST_USER_ID,
            user_name="Teste",
            business_mode=True,
            messages=[Message(role="user", content=test["question"])]
        )
        
        # Coleta resposta da Luna
        response_parts = []
        tool_calls = []
        tool_results = []
        has_json_only = False
        
        try:
            async for chunk in business_generator(request):
                # Parse chunk
                if chunk.startswith("data: "):
                    data_str = chunk[6:].strip()
                    try:
                        data = json.loads(data_str)
                        
                        # Coleta conteúdo
                        if "content" in data:
                            content = data["content"]
                            response_parts.append(content)
                            # Verifica se é só JSON
                            if content.strip().startswith("{") and content.strip().endswith("}"):
                                has_json_only = True
                        
                        # Coleta tool calls
                        if "tool_call" in data:
                            tool_calls.append(data["tool_call"])
                            print(f"    🔧 Tool chamada: {data['tool_call'].get('name', 'unknown')}")
                        
                        # Coleta tool results
                        if "tool_result" in data:
                            tool_results.append(data["tool_result"])
                            result = data["tool_result"]
                            if result.get("success"):
                                print(f"    ✅ Tool executada com sucesso")
                                if "balance" in result:
                                    print(f"       Balance retornado: R$ {result.get('balance', 0):.2f}")
                            else:
                                print(f"    ❌ Tool falhou: {result.get('error', 'unknown')}")
                        
                    except json.JSONDecodeError:
                        pass
        
        except Exception as e:
            print(f"    ❌ Erro ao processar resposta: {e}")
            import traceback
            traceback.print_exc()
            continue
        
        # Analisa resposta
        full_response = "".join(response_parts)
        print(f"\n  [RESPOSTA COMPLETA]")
        print(f"  {full_response[:200]}..." if len(full_response) > 200 else f"  {full_response}")
        
        # Verifica se usou tools
        if tool_calls:
            print(f"  ✅ Luna usou {len(tool_calls)} tool(s)")
            
            # Verifica se os valores na resposta batem com os reais
            found_values = {}
            for field in test["expected_fields"]:
                # Procura o valor no texto da resposta
                import re
                pattern = rf"{field}.*?(\d+[.,]\d+|\d+)"
                match = re.search(pattern, full_response, re.IGNORECASE)
                if match:
                    try:
                        val_str = match.group(1).replace(",", ".")
                        found_values[field] = float(val_str)
                    except:
                        pass
            
            if found_values:
                print(f"  [VALORES ENCONTRADOS NA RESPOSTA]")
                all_match = True
                for field, found_val in found_values.items():
                    real_val = {
                        "balance": real_balance,
                        "income": real_income,
                        "expenses": real_expenses
                    }.get(field, 0)
                    
                    diff = abs(found_val - real_val)
                    if diff < 1.0:  # Tolerância de R$ 1,00
                        print(f"    ✅ {field}: R$ {found_val:.2f} (esperado: R$ {real_val:.2f}, diff: R$ {diff:.2f})")
                    else:
                        print(f"    ❌ {field}: R$ {found_val:.2f} (esperado: R$ {real_val:.2f}, diff: R$ {diff:.2f})")
                        all_match = False
                
                if all_match:
                    print(f"  ✅✅✅ TODOS OS VALORES BATEM COM OS DADOS REAIS!")
                else:
                    print(f"  ⚠️⚠️⚠️ ALGUNS VALORES NÃO BATEM!")
            else:
                print(f"  ⚠️ Não foi possível extrair valores numéricos da resposta")
        else:
            print(f"  ❌ Luna NÃO usou tools - pode estar inventando números!")
            if has_json_only:
                print(f"  ⚠️ Resposta contém apenas JSON (não formatado em texto natural)")
        
        # Pausa entre testes
        await asyncio.sleep(1)
    
    print("\n" + "="*60)
    print("✅ TESTE CONCLUÍDO")
    print("="*60)
    print("\nResumo:")
    print("- Verificou se Luna usa tools corretamente")
    print("- Comparou valores na resposta com dados reais")
    print("- Detectou se há invenção de números")


if __name__ == "__main__":
    asyncio.run(test_luna_real())
