"""Manually extend payment status enum for Generated and Sent

Revision ID: ddac23400ba9
Revises: 975cdca27a72
Create Date: 2025-06-11 17:02:56.989783

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ddac23400ba9'
down_revision = '975cdca27a72'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE payments MODIFY status ENUM('pending', 'paid', 'failed', 'cancelled', 'Generated', 'Sent') DEFAULT 'pending' NOT NULL;")


def downgrade():
    op.execute("ALTER TABLE payments MODIFY status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending' NOT NULL;")
