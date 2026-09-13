"""Creates the two hackathon demo accounts through the real signup path
(hashed password, transactional user+profile) — never as an auth bypass.

Usage (from backend/, with your venv active and .env configured):
    python -m scripts.seed_demo_users
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal
from app.services.auth_service import create_user_with_profile, get_user_by_email

DEMO_USERS = [
    {"full_name": "Ms. Sarah", "email": "sarah.teacher@classbridge.ai", "password": "demo1234", "role": "teacher"},
    {"full_name": "Ali's Parent", "email": "parent.ali@classbridge.ai", "password": "demo1234", "role": "parent"},
]


def main() -> None:
    db = SessionLocal()
    try:
        for demo in DEMO_USERS:
            if get_user_by_email(db, demo["email"]):
                print(f"Skipping {demo['email']} — already exists.")
                continue
            create_user_with_profile(
                db,
                full_name=demo["full_name"],
                email=demo["email"],
                password=demo["password"],
                role=demo["role"],
            )
            print(f"Created {demo['role']} demo account: {demo['email']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
