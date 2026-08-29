import requests
import json

API_URL = "http://127.0.0.1:8000/api"

def print_step(step_num, title):
    print(f"\n[STEP {step_num}] {title}")

def print_pass(msg):
    print(f"  \033[92m[PASS]\033[0m {msg}")

def print_fail(msg):
    print(f"  \033[91m[FAIL]\033[0m {msg}")

def main():
    print("=" * 70)
    print("[TEST SUITE] DYNAMIC MULTI-PATIENT & DURATION REVENUE AT RISK")
    print("=" * 70)

    # 1. Admin & Staff Login
    print_step(1, "Authenticating Admin and Staff...")
    r_admin = requests.post(f"{API_URL}/auth/login", json={"email": "admin@medicover.com", "password": "Password@123"})
    assert r_admin.status_code == 200, f"Admin login failed: {r_admin.text}"
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print_pass("Admin logged in successfully")

    # 2. Fetch all conflicts
    print_step(2, "Fetching all conflict logs via /api/conflicts...")
    r_conflicts = requests.get(f"{API_URL}/conflicts", headers=admin_headers)
    assert r_conflicts.status_code == 200
    conflicts = r_conflicts.json()
    open_conflicts = [c for c in conflicts if c["status"] in ["open", "under_review"]]
    print_pass(f"Total conflict records: {len(conflicts)}, Open/Active conflicts: {len(open_conflicts)}")

    for c in open_conflicts:
        print(f"    --> CF-{c['id']} ({c['conflict_type']}): Bed #{c['bed_id']} ({c['bed_ward']}) | Risk: Rs.{c.get('revenue_at_risk', 0):,.2f} | Desc: {c['description']}")

    # 3. Check Admin Dashboard Stats
    print_step(3, "Fetching Admin Dashboard Stats via /api/dashboard/admin...")
    r_stats = requests.get(f"{API_URL}/dashboard/admin", headers=admin_headers)
    assert r_stats.status_code == 200
    stats = r_stats.json()
    rev_risk = stats["revenue_at_risk_per_day"]
    print_pass(f"Admin Dashboard Revenue at Risk: Rs.{rev_risk:,.2f}")
    print_pass(f"Admin Dashboard Open Conflicts Count: {stats['open_conflicts_count']}")

    # Verify that Bed #8 with 3 active patients has > 35,000 risk
    cf_bed8 = [c for c in open_conflicts if c["bed_id"] == 8]
    if cf_bed8:
        bed8_risk = cf_bed8[0].get("revenue_at_risk", 0)
        print_pass(f"Bed #8 (Cardiac ICU @ Rs.35,000/day) Conflict CF-{cf_bed8[0]['id']} Total Financial Risk: Rs.{bed8_risk:,.2f}")
        assert bed8_risk >= 35000 * 3, f"Expected Bed 8 multi-patient risk >= 105,000, got {bed8_risk}"

    # Verify sum of individual risks equals dashboard total
    total_individual_risk = sum(c.get("revenue_at_risk", 0) for c in open_conflicts)
    print_pass(f"Sum of individual conflict risks: Rs.{total_individual_risk:,.2f} == Dashboard Stat: Rs.{rev_risk:,.2f}")
    assert abs(total_individual_risk - rev_risk) < 0.01

    print("\n" + "=" * 70)
    print("\033[92m[SUCCESS] DYNAMIC REVENUE AT RISK AND CONFLICT AUDIT TESTS PASSED 100%!\033[0m")
    print("=" * 70)

if __name__ == "__main__":
    main()
