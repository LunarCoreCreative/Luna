from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

from server.business import storage
from server.business import tools as biz_tools
from server.business import integrity


def calc_manual_summary(transactions) -> Dict[str, Any]:
    income = Decimal("0.00")
    expenses = Decimal("0.00")
    invested = Decimal("0.00")
    invalid = 0

    for tx in transactions:
        try:
            value = Decimal(str(tx.get("value", 0))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            ttype = str(tx.get("type", "")).lower().strip()
            if value < 0:
                invalid += 1
                continue

            if ttype == "income":
                income += value
            elif ttype == "expense":
                expenses += value
            elif ttype == "investment":
                invested += value
            else:
                invalid += 1
        except Exception as e:  # noqa: BLE001
            print(f"[MANUAL] Erro ao processar tx {tx.get('id')}: {e}")
            invalid += 1

    balance = income - expenses - invested
    net_worth = balance + invested

    q = lambda d: float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    return {
        "balance": q(balance),
        "income": q(income),
        "expenses": q(expenses),
        "invested": q(invested),
        "net_worth": q(net_worth),
        "invalid": invalid,
    }


def main(user_id: str) -> None:
    print("[READONLY TEST] user_id:", user_id)

    # 1) Carrega transações (não altera nada, só leitura/sync normal)
    transactions = storage.load_transactions(user_id)
    print(f"[READONLY TEST] Transações carregadas: {len(transactions)}")

    # 2) Cálculo manual
    manual = calc_manual_summary(transactions)
    print("\n[READONLY TEST] SUMMARY MANUAL:", manual)

    # 3) get_summary (backend)
    summary = storage.get_summary(user_id)
    print("\n[READONLY TEST] storage.get_summary:", summary)

    # 4) Ferramenta da Luna (get_balance)
    tool_res = biz_tools.execute_business_tool("get_balance", user_id=user_id, args={})
    print("\n[READONLY TEST] business.get_balance tool:", tool_res)

    # 5) Integridade
    issues = integrity.verify_data_integrity(user_id)
    print("\n[READONLY TEST] integrity.verify_data_integrity:", issues)

    # 6) Comparações rápidas
    print("\n[READONLY TEST] Comparações:")
    def diff(label: str, a, b):
        delta = round(float(a) - float(b), 2)
        print(f"  - {label}: manual={a}  summary={b}  delta={delta}")

    diff("balance", manual["balance"], summary.get("balance"))
    diff("income", manual["income"], summary.get("income"))
    diff("expenses", manual["expenses"], summary.get("expenses"))
    diff("invested", manual["invested"], summary.get("invested"))
    diff("net_worth", manual["net_worth"], summary.get("net_worth"))


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Uso: python debug_business_balance_readonly.py <user_id>")
        raise SystemExit(1)

    main(sys.argv[1])

