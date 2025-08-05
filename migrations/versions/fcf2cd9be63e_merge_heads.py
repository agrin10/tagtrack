"""merge heads

Revision ID: fcf2cd9be63e
Revises: 9dd44b73227b, add_row_number_to_payment
Create Date: 2025-08-05 12:29:44.563942

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fcf2cd9be63e'
down_revision = ('9dd44b73227b', 'add_row_number_to_payment')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
