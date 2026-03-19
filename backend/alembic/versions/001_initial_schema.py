"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-03-19

This migration is INFORMATIONAL only.
The current tables already exist in the Supabase database (created via create_all).
Running `alembic upgrade head` will stamp this as the baseline so future
schema changes can be tracked via `alembic revision --autogenerate`.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    No-op: Tables already exist in production via SQLAlchemy create_all.
    This migration exists to establish Alembic tracking baseline.
    
    To use Alembic for real migrations from this point:
    1. Run: alembic stamp 001
    2. Make your model change
    3. Run: alembic revision --autogenerate -m "describe change"
    4. Run: alembic upgrade head
    """
    pass


def downgrade() -> None:
    """
    Dropping all tables would be destructive — not implemented here.
    Run `alembic stamp base` to reset tracking if needed.
    """
    pass
