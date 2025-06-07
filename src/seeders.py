
import click
from flask.cli import with_appcontext
from src import db
from src.auth.models import Role

@click.command('seed-roles')
@with_appcontext
def seed_roles():
    """Seed the roles table with the five fixed roles."""
    role_names = [
        'Admin',
        'OrderManager',
        'Designer',
        'FactorySupervisor',
        'InvoiceClerk'
    ]

    # Insert each role if it doesn't already exist
    for idx, name in enumerate(role_names, start=1):
        existing = Role.query.filter_by(name=name).first()
        if existing:
            click.echo(f'→ Role "{name}" already exists (id={existing.id}).')
        else:
            role = Role(id=idx, name=name)
            db.session.add(role)
            click.echo(f'+ Seeding role "{name}" (id={idx}).')

    db.session.commit()
    click.echo('✅ Roles seeding complete.')
