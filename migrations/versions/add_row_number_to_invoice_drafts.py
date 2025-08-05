"""add row_number to invoice_drafts

Revision ID: add_row_number_to_invoice_drafts
Revises: fcf2cd9be63e
Create Date: 2025-01-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_row_number_to_invoice_drafts'
down_revision = 'fcf2cd9be63e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('invoice_drafts', sa.Column('row_number', sa.Integer(), nullable=True))


def downgrade():
    op.drop_column('invoice_drafts', 'row_number') 