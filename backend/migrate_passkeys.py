import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'hospital.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Update users table
user_cols = [r[1] for r in cur.execute('PRAGMA table_info(users)').fetchall()]
if 'registered_passkey' not in user_cols:
    cur.execute('ALTER TABLE users ADD COLUMN registered_passkey VARCHAR(100)')
    print('[OK] Added registered_passkey to users')

# 2. Update role_invite_codes table
invite_cols = [r[1] for r in cur.execute('PRAGMA table_info(role_invite_codes)').fetchall()]
if 'code' not in invite_cols:
    cur.execute("ALTER TABLE role_invite_codes ADD COLUMN code VARCHAR(100) DEFAULT ''")
    print('[OK] Added code to role_invite_codes')

if 'department' not in invite_cols:
    cur.execute('ALTER TABLE role_invite_codes ADD COLUMN department VARCHAR(100)')
    print('[OK] Added department to role_invite_codes')

# 3. Populate existing codes
cur.execute("UPDATE role_invite_codes SET code = 'ADMIN-SECURE-2026' WHERE role = 'admin' AND (code = '' OR code IS NULL)")
cur.execute("UPDATE role_invite_codes SET code = 'HOD-DEPT-2026' WHERE role = 'hod' AND (code = '' OR code IS NULL)")
cur.execute("UPDATE role_invite_codes SET code = 'STAFF-OP-2026' WHERE role = 'staff' AND (code = '' OR code IS NULL)")

cur.execute("UPDATE users SET registered_passkey = 'ADMIN-SECURE-2026' WHERE role = 'admin' AND (registered_passkey IS NULL OR registered_passkey = '')")
cur.execute("UPDATE users SET registered_passkey = 'HOD-DEPT-2026' WHERE role = 'hod' AND (registered_passkey IS NULL OR registered_passkey = '')")
cur.execute("UPDATE users SET registered_passkey = 'STAFF-OP-2026' WHERE role = 'staff' AND (registered_passkey IS NULL OR registered_passkey = '')")

conn.commit()
conn.close()
print('[OK] SQLite passkey migration completed successfully!')
