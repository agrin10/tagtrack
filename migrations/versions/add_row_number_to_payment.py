"""add row_number to payment table

Revision ID: add_row_number_to_payment
Revises: 1456a7900b5b
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_row_number_to_payment'
down_revision = '1456a7900b5b'
branch_labels = None
depends_on = None


def upgrade():
    # Add row_number column to payments table
    op.add_column('payments', sa.Column('row_number', sa.Integer(), nullable=True))


def downgrade():
    # Remove row_number column from payments table
    op.drop_column('payments', 'row_number') 