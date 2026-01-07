"""
Luna Payment Service (Asaas)
============================
Integração com o gateway de pagamentos Asaas para assinaturas.
"""

import httpx
from typing import Optional, Dict, Any
from .config import ASAAS_API_KEY, ASAAS_URL
from .firebase_config import update_user_profile, get_user_profile

# Headers para autenticação no Asaas
HEADERS = {
    "access_token": ASAAS_API_KEY,
    "Content-Type": "application/json"
}

async def sync_payment_status(uid: str) -> Optional[str]:
    """
    Pesquisa no Asaas por pagamentos confirmados/recebidos que tenham
    o externalReference contendo o UID do usuário.
    Retorna o tipo de plano se encontrar um pagamento válido.
    """
    async with httpx.AsyncClient() as client:
        try:
            # Pesquisar pagamentos por externalReference (UID)
            # Como salvamos como "uid:plan", pesquisamos por todos e filtramos
            url = f"{ASAAS_URL}/payments?externalReference={uid}:nexus&status=CONFIRMED"
            resp = await client.get(url, headers=HEADERS)
            data = resp.json()
            
            # Tentar Nexus primeiro, depois Eclipse
            if data.get("data"):
                return "nexus"
                
            url_eclipse = f"{ASAAS_URL}/payments?externalReference={uid}:eclipse&status=CONFIRMED"
            resp_eclipse = await client.get(url_eclipse, headers=HEADERS)
            data_eclipse = resp_eclipse.json()
            
            if data_eclipse.get("data"):
                return "eclipse"
                
            # Verificar também status RECEIVED (quando o dinheiro já caiu)
            url_rec = f"{ASAAS_URL}/payments?externalReference={uid}:nexus&status=RECEIVED"
            resp_rec = await client.get(url_rec, headers=HEADERS)
            if resp_rec.json().get("data"): return "nexus"
            
            url_rec_e = f"{ASAAS_URL}/payments?externalReference={uid}:eclipse&status=RECEIVED"
            resp_rec_e = await client.get(url_rec_e, headers=HEADERS)
            if resp_rec_e.json().get("data"): return "eclipse"

            return None
        except Exception as e:
            print(f"[ASAAS] Erro ao sincronizar: {e}")
            return None

async def get_or_create_asaas_customer(uid: str, email: str, name: str) -> Optional[str]:
    """
    Busca ou cria um cliente no Asaas baseado no UID/Email.
    """
    async with httpx.AsyncClient() as client:
        try:
            # 1. Tentar buscar por email
            search_url = f"{ASAAS_URL}/customers?email={email}"
            resp = await client.get(search_url, headers=HEADERS)
            data = resp.json()
            
            if data.get("data") and len(data["data"]) > 0:
                customer_id = data["data"][0]["id"]
                print(f"[ASAAS] Cliente já existe: {customer_id}")
                return customer_id
            
            # 2. Se não existir, criar
            payload = {
                "name": name,
                "email": email,
                "externalReference": uid
            }
            create_resp = await client.post(f"{ASAAS_URL}/customers", headers=HEADERS, json=payload)
            create_data = create_resp.json()
            
            if "id" in create_data:
                print(f"[ASAAS] Novo cliente criado: {create_data['id']}")
                return create_data["id"]
            
            print(f"[ASAAS] ERRO CRÍTICO AO CRIAR CLIENTE: {create_data}")
            return None
            
        except Exception as e:
            print(f"[ASAAS] Exceção em customer: {e}")
            return None

async def create_payment_link(uid: str, plan_type: str, email: str, name: str) -> Optional[Dict[str, Any]]:
    """
    Gera um link de pagamento (Payment Link) para o plano escolhido.
    Utiliza o endpoint /v3/paymentLinks para que o Asaas cuide da coleta de CPF/CNPJ.
    """
    prices = {
        "nexus": 39.90,
        "eclipse": 79.90
    }
    
    if plan_type not in prices:
        return None

    async with httpx.AsyncClient() as client:
        try:
            # Gerar um Link de Pagamento Recorrente (Assinatura)
            payload = {
                "name": f"Luna {plan_type.capitalize()}",
                "description": f"Assinatura do plano {plan_type.capitalize()} - Luna AI",
                "billingType": "UNDEFINED", # Permite que o usuário escolha (Cartão, Pix, Boleto)
                "chargeType": "RECURRENT",  # Assinatura
                "subscriptionCycle": "MONTHLY",
                "value": prices[plan_type],
                "dueDateLimitDays": 3,
                "externalReference": f"{uid}:{plan_type}", # Guardar UID e Plano para o Webhook
                "notificationEnabled": True
            }
            
            print(f"[ASAAS] Criando link de pagamento para {uid} ({plan_type})")
            resp = await client.post(f"{ASAAS_URL}/paymentLinks", headers=HEADERS, json=payload)
            data = resp.json()
            
            print(f"[ASAAS] Resposta PaymentLink: {data}")
            
            if "url" in data:
                return {
                    "success": True,
                    "payment_id": data["id"],
                    "url": data["url"], # URL do checkout formatado pelo Asaas
                    "status": "ACTIVE"
                }
            
            errors = data.get("errors", ["Erro desconhecido ao criar link de pagamento"])
            return {"error": str(errors)}
            
        except Exception as e:
            print(f"[ASAAS] Exceção ao criar link: {e}")
            return {"error": str(e)}

async def process_webhook(payload: Dict[str, Any]) -> bool:
    """
    Processa a notificação de pagamento do Asaas.
    """
    event = payload.get("event")
    payment = payload.get("payment", {})
    external_ref = payment.get("externalReference")
    
    # Exemplo de evento: PAYMENT_CONFIRMED, PAYMENT_RECEIVED
    if event in ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]:
        if external_ref and ":" in external_ref:
            uid, plan_type = external_ref.split(":")
            print(f"[WEBHOOK] Pagamento confirmado! UID={uid}, Plan={plan_type}")
            
            # Atualizar Firestore
            success = update_user_profile(uid, {
                "plan": plan_type,
                "is_premium": True
            })
            return success
            
    return False
