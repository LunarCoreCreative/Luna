"""
Script para Fine-Tuning da Luna no Together AI
-----------------------------------------------
Executa: python training/finetune.py
"""

import requests
import json
import time
import os

API_KEY = "tgp_v1_wUvnv5kQ3saKoiXsZfc0nauh_ocsWNmke4NQRVo6iZ8"
BASE_URL = "https://api.together.xyz/v1"
DATASET_PATH = os.path.join(os.path.dirname(__file__), "luna_dataset.jsonl")

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def upload_dataset():
    """Upload do dataset para o Together AI."""
    print("📤 Fazendo upload do dataset...")
    
    with open(DATASET_PATH, "rb") as f:
        response = requests.post(
            f"{BASE_URL}/files",
            headers={"Authorization": f"Bearer {API_KEY}"},
            files={"file": ("luna_dataset.jsonl", f, "application/jsonl")},
            data={"purpose": "fine-tune"}
        )
    
    if response.status_code == 200:
        file_id = response.json()["id"]
        print(f"✅ Upload completo! File ID: {file_id}")
        return file_id
    else:
        print(f"❌ Erro no upload: {response.text}")
        return None

def start_finetuning(file_id):
    """Inicia o processo de fine-tuning."""
    print("🚀 Iniciando fine-tuning...")
    
    response = requests.post(
        f"{BASE_URL}/fine-tunes",
        headers=headers,
        json={
            "training_file": file_id,
            "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",  # Base model
            "n_epochs": 3,
            "learning_rate": 1e-5,
            "suffix": "luna-her"  # Nome do modelo final
        }
    )
    
    if response.status_code == 200:
        job = response.json()
        print(f"✅ Fine-tuning iniciado!")
        print(f"   Job ID: {job['id']}")
        print(f"   Status: {job['status']}")
        return job["id"]
    else:
        print(f"❌ Erro ao iniciar: {response.text}")
        return None

def check_status(job_id):
    """Verifica status do fine-tuning."""
    response = requests.get(
        f"{BASE_URL}/fine-tunes/{job_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        job = response.json()
        print(f"📊 Status: {job['status']}")
        if job.get("fine_tuned_model"):
            print(f"🎉 Modelo pronto: {job['fine_tuned_model']}")
        return job
    else:
        print(f"❌ Erro: {response.text}")
        return None

def list_finetunes():
    """Lista todos os fine-tunes."""
    response = requests.get(f"{BASE_URL}/fine-tunes", headers=headers)
    if response.status_code == 200:
        jobs = response.json().get("data", [])
        for job in jobs:
            print(f"- {job['id']}: {job['status']} - {job.get('fine_tuned_model', 'pendente')}")
    else:
        print(f"❌ Erro: {response.text}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python finetune.py upload    - Faz upload do dataset")
        print("  python finetune.py start     - Inicia fine-tuning (precisa do file_id)")
        print("  python finetune.py status    - Verifica status")
        print("  python finetune.py list      - Lista fine-tunes")
        print("  python finetune.py full      - Executa tudo automaticamente")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "upload":
        upload_dataset()
    
    elif cmd == "start":
        if len(sys.argv) < 3:
            print("Uso: python finetune.py start <file_id>")
        else:
            start_finetuning(sys.argv[2])
    
    elif cmd == "status":
        if len(sys.argv) < 3:
            print("Uso: python finetune.py status <job_id>")
        else:
            check_status(sys.argv[2])
    
    elif cmd == "list":
        list_finetunes()
    
    elif cmd == "full":
        # Executa tudo automaticamente
        file_id = upload_dataset()
        if file_id:
            time.sleep(2)
            job_id = start_finetuning(file_id)
            if job_id:
                print("\n⏳ Fine-tuning em andamento...")
                print(f"Verifique o status com: python finetune.py status {job_id}")
