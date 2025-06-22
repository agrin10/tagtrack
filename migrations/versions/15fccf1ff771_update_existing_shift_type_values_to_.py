"""Update existing shift_type values to uppercase

Revision ID: 15fccf1ff771
Revises: bb3d9938e40f
Create Date: 2025-06-11 11:15:41.211821

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '15fccf1ff771'
down_revision = 'bb3d9938e40f'
branch_labels = None
depends_on = None


def upgrade():
    # Update existing shift_type values from lowercase to uppercase
    op.execute("UPDATE machine SET shift_type = 'DAY' WHERE shift_type = 'day'")
    op.execute("UPDATE machine SET shift_type = 'NIGHT' WHERE shift_type = 'night'")
    
    # Modify the enum type to use uppercase values
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.alter_column('shift_type',
                            existing_type=sa.Enum('day', 'night', name='shift_type_enum'),
                            type_=sa.Enum('DAY', 'NIGHT', name='shift_type_enum'),
                            existing_nullable=False)


def downgrade():
    # Convert back to lowercase if needed
    op.execute("UPDATE machine SET shift_type = 'day' WHERE shift_type = 'DAY'")
    op.execute("UPDATE machine SET shift_type = 'night' WHERE shift_type = 'NIGHT'")
    
    # Modify the enum type back to lowercase values
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.alter_column('shift_type',
                            existing_type=sa.Enum('DAY', 'NIGHT', name='shift_type_enum'),
                            type_=sa.Enum('day', 'night', name='shift_type_enum'),
                            existing_nullable=False)
