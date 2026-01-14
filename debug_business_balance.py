from pathlib import Path

from server.business import storage
from server.business import tools as biz_tools
from server.business import integrity


def main() -> None:
    user_id = "testlocal"  # curto para evitar uso de Firebase

    print("[TEST] Usando user_id:", user_id)

    # Limpa dados locais do usuário de teste
    from server.business.storage import get_user_data_dir

    user_dir = get_user_data_dir(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    tx_file = user_dir / "transactions.json"
    tx_file.write_text("[]", encoding="utf-8")

    goals_file = user_dir / "goals.json"
    if goals_file.exists():
        goals_file.write_text("[]", encoding="utf-8")

    print("[TEST] Dados locais limpos em", user_dir)

    # 1) Adiciona transações de teste
    print("[TEST] Adicionando transações de teste...")

    cases = [
        ("income", 1000.00, "Salário"),
        ("income", 500.00, "Freelancer"),
        ("expense", 200.00, "Aluguel"),
        ("expense", 50.25, "Café"),
        ("investment", 300.00, "Investimento"),
    ]

    ids = []
    for t, v, desc in cases:
        tx = storage.add_transaction(user_id, t, float(v), desc, category="teste", date="2025-01-13")
        ids.append(tx["id"])
        print(f"  - {t:9s} {v:10.2f} -> {tx['id']}")

    # 2) Calcula summary direto
    print("\n[TEST] Calculando summary via storage.get_summary...")
    summary = storage.get_summary(user_id)
    print("SUMMARY:", summary)

    # 3) Usa ferramenta de saldo da Luna (get_balance)
    print("\n[TEST] Obtendo saldo via ferramenta get_balance (Luna Advisor)...")
    res = biz_tools.execute_business_tool("get_balance", user_id=user_id, args={})
    print("TOOL RESULT:", res)

    # 4) Verifica integridade
    print("\n[TEST] Rodando verificação de integridade...")
    issues = integrity.verify_data_integrity(user_id)
    print("INTEGRITY ISSUES:", issues)

    # 5) Remove uma transação de income e recalcula
    print("\n[TEST] Removendo primeira transação de income e recalculando...")
    storage.delete_transaction(user_id, ids[0])

    summary2 = storage.get_summary(user_id)
    res2 = biz_tools.execute_business_tool("get_balance", user_id=user_id, args={})
    issues2 = integrity.verify_data_integrity(user_id)

    print("SUMMARY2:", summary2)
    print("TOOL2 RESULT:", res2)
    print("INTEGRITY2:", issues2)


if __name__ == "__main__":
    main()

