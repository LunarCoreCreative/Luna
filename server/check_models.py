import httpx
import json

API_KEY = "tgp_v1_wUvnv5kQ3saKoiXsZfc0nauh_ocsWNmke4NQRVo6iZ8"
URL = "https://api.together.xyz/v1/models"

def list_models():
    with httpx.Client() as client:
        response = client.get(
            URL,
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        models = response.json()
        model_ids = [m['id'] for m in models if 'qwen' in m['id'].lower() or 'vl' in m['id'].lower()]
        print(json.dumps(model_ids, indent=2))

if __name__ == "__main__":
    list_models()
