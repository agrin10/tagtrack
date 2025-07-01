import json
from src import db
from src.auth.models import User, Role
from werkzeug.security import generate_password_hash
from sqlalchemyseeder.resolving_seeder import ResolvingSeeder


def run_seeds():
    """
    Run all seeders in the application.
    """
    seed_roles()
    seed_user()


def seed_user():
    with open('src/static/seeders/user-seeder.json') as f:
        seed_data = json.load(f)
        print(f"🔄 Loaded user seed data: {seed_data}")

    filtered_data = []
    for entry in seed_data:
        if entry.get("target_class", "").endswith(":User"):
            user_data = entry.get("data", {})
            username = user_data.get("username")

            # Check if user already exists (by username or email)
            existing_user = User.query.filter(
                (User.username == username)).first()

            if existing_user:
                print(f"⚠️ User '{username}' already exists. Skipping.")
                continue

            # Hash password if present
            if "password" in user_data:
                user_data["password_hash"] = generate_password_hash(user_data["password"])
                del user_data["password"]

            filtered_data.append(entry)

    if not filtered_data:
        print("✅ No new users to seed.")
        return

    seeder = ResolvingSeeder(db.session)
    try:
        seeder.load_entities_from_data_dict(
            filtered_data,
            flush_on_create=True,
            commit=False
        )
        db.session.commit()
        print("✅ Seeded new users with hashed passwords.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error seeding users: {e}")


def seed_roles():
    with open('src/static/seeders/role-seeder.json') as f:
        seed_data = json.load(f)
        print(f"🔄 Loaded role seed data: {seed_data}")

    filtered_data = []
    for entry in seed_data:
        if entry.get("target_class", "").endswith(":Role"):
            role_data = entry.get("data", {})
            name = role_data.get("name")

            # Check if role already exists
            existing_role = Role.query.filter_by(name=name).first()

            if existing_role:
                print(f"⚠️ Role '{name}' already exists. Skipping.")
                continue

            filtered_data.append(entry)

    if not filtered_data:
        print("✅ No new roles to seed.")
        return

    seeder = ResolvingSeeder(db.session)
    try:
        seeder.load_entities_from_data_dict(
            filtered_data,
            flush_on_create=True,
            commit=False
        )
        db.session.commit()
        print("✅ Seeded new roles.")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error seeding roles: {e}")
