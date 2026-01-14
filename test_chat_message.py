"""
Teste do endpoint /agent/message
Verifica se as mensagens estão vindo com espaços corretos
"""

import requests
import json

# URL do servidor (ajuste conforme necessário)
BASE_URL = "http://localhost:8082"  # Ou use a URL de produção
# BASE_URL = "https://luna-production-94f2.up.railway.app"

def test_chat_message():
    """Testa o endpoint /agent/message"""
    
    url = f"{BASE_URL}/agent/message"
    
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Oi luna, como você está?"
            }
        ],
        "agent_mode": True,
        "user_id": "test_user",
        "user_name": "Teste"
    }
    
    print("=" * 60)
    print("TESTE: Enviando mensagem para /agent/message")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
    print("\nAguardando resposta...\n")
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            print("\n" + "=" * 60)
            print("RESPOSTA RECEBIDA:")
            print("=" * 60)
            print(f"Success: {data.get('success')}")
            print(f"\nMensagem completa:")
            print("-" * 60)
            message = data.get('message', '')
            print(message)
            print("-" * 60)
            
            # Verifica problemas de espaçamento
            print("\n" + "=" * 60)
            print("ANÁLISE DE ESPAÇAMENTO:")
            print("=" * 60)
            
            # Verifica palavras conectadas (minúscula seguida de maiúscula sem espaço)
            import re
            problems = re.findall(r'[a-záàâãéèêíìîóòôõúùûç][A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]', message)
            if problems:
                print(f"⚠️  PROBLEMA: Encontradas {len(problems)} palavras conectadas:")
                for p in problems[:10]:  # Mostra até 10
                    print(f"   - '{p}'")
            else:
                print("✓ Sem palavras conectadas (minúscula+maiúscula)")
            
            # Verifica palavras comuns conectadas
            common_words = ['meubem', 'bemcom', 'comvocê', 'aquipara', 'eajudar', 'teajudar', 'comoposso']
            found_problems = []
            for word in common_words:
                if word in message.lower():
                    found_problems.append(word)
            
            if found_problems:
                print(f"⚠️  PROBLEMA: Encontradas palavras comuns conectadas:")
                for p in found_problems:
                    print(f"   - '{p}'")
            else:
                print("✓ Sem palavras comuns conectadas detectadas")
            
            # Conta espaços vs caracteres
            total_chars = len(message)
            spaces = message.count(' ')
            words = len(message.split())
            
            print(f"\nEstatísticas:")
            print(f"  - Total de caracteres: {total_chars}")
            print(f"  - Total de espaços: {spaces}")
            print(f"  - Total de palavras: {words}")
            print(f"  - Razão espaços/palavras: {spaces/words if words > 0 else 0:.2f}")
            
            if spaces/words < 0.5 and words > 5:
                print("  ⚠️  AVISO: Poucos espaços em relação ao número de palavras!")
            
        else:
            print(f"ERRO: {response.status_code}")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("ERRO: Não foi possível conectar ao servidor")
        print("Certifique-se de que o servidor está rodando em", BASE_URL)
    except requests.exceptions.Timeout:
        print("ERRO: Timeout - a requisição demorou mais de 60 segundos")
    except Exception as e:
        print(f"ERRO: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_chat_message()
