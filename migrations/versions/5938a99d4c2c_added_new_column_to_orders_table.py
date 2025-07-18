"""added new column to orders table 

Revision ID: 5938a99d4c2c
Revises: 819ba5d9b66b
Create Date: 2025-06-09 10:24:21.202637

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5938a99d4c2c'
down_revision = '819ba5d9b66b'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('exit_from_office_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('exit_from_factory_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('sketch_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('file_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('customer_note_to_office', sa.Text(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('orders', schema=None) as batch_op:
        batch_op.drop_column('customer_note_to_office')
        batch_op.drop_column('file_name')
        batch_op.drop_column('sketch_name')
        batch_op.drop_column('exit_from_factory_date')
        batch_op.drop_column('exit_from_office_date')

    # ### end Alembic commands ###
