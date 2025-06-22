"""Update shift type values to lowercase

Revision ID: update_shift_type_to_lowercase
Revises: 15fccf1ff771
Create Date: 2025-06-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_shift_type_to_lowercase'
down_revision = '15fccf1ff771'
branch_labels = None
depends_on = None


def upgrade():
    # Update existing shift_type values from uppercase to lowercase
    op.execute("UPDATE machine SET shift_type = 'day' WHERE shift_type = 'DAY'")
    op.execute("UPDATE machine SET shift_type = 'night' WHERE shift_type = 'NIGHT'")
    
    # Modify the enum type to use lowercase values
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.alter_column('shift_type',
                            existing_type=sa.Enum('DAY', 'NIGHT', name='shift_type_enum'),
                            type_=sa.Enum('day', 'night', name='shift_type_enum'),
                            existing_nullable=False)


def downgrade():
    # Convert back to uppercase if needed
    op.execute("UPDATE machine SET shift_type = 'DAY' WHERE shift_type = 'day'")
    op.execute("UPDATE machine SET shift_type = 'NIGHT' WHERE shift_type = 'night'")
    
    # Modify the enum type back to uppercase values
    with op.batch_alter_table('machine', schema=None) as batch_op:
        batch_op.alter_column('shift_type',
                            existing_type=sa.Enum('day', 'night', name='shift_type_enum'),
                            type_=sa.Enum('DAY', 'NIGHT', name='shift_type_enum'),
                            existing_nullable=False) 