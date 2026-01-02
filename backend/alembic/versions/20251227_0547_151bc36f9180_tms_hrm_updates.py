"""tms_hrm_updates

Revision ID: 151bc36f9180
Revises: 349bc3d897f5
Create Date: 2025-12-27 05:47:41.167831+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '151bc36f9180'
down_revision: Union[str, None] = '349bc3d897f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ========================================
    # TMS UPDATES - Add foreign key constraints
    # ========================================

    # --- TRIPS table ---
    op.create_foreign_key('fk_trips_vehicle', 'trips', 'vehicles', ['vehicle_id'], ['id'])
    op.create_foreign_key('fk_trips_driver', 'trips', 'drivers', ['driver_id'], ['id'])
    op.create_foreign_key('fk_trips_trailer', 'trips', 'trailers', ['trailer_id'], ['id'])
    op.create_foreign_key('fk_trips_shipment', 'trips', 'shipments', ['shipment_id'], ['id'])

    # --- ORDERS table ---
    op.create_foreign_key('fk_orders_customer', 'orders', 'customers', ['customer_id'], ['id'])

    # ========================================
    # HRM - Add missing foreign keys to existing tables
    # ========================================
    op.create_foreign_key('fk_hrm_employees_manager', 'hrm_employees', 'hrm_employees', ['manager_id'], ['id'])
    op.create_foreign_key('fk_drivers_employee', 'drivers', 'hrm_employees', ['employee_id'], ['id'])
    op.create_foreign_key('fk_hrm_branches_manager', 'hrm_branches', 'hrm_employees', ['manager_id'], ['id'])
    op.create_foreign_key('fk_hrm_departments_manager', 'hrm_departments', 'hrm_employees', ['manager_id'], ['id'])
    op.create_foreign_key('fk_hrm_teams_leader', 'hrm_teams', 'hrm_employees', ['leader_id'], ['id'])
    op.create_foreign_key('fk_hrm_positions_department', 'hrm_positions', 'hrm_departments', ['department_id'], ['id'])


def downgrade() -> None:
    # Drop HRM foreign keys
    op.drop_constraint('fk_hrm_positions_department', 'hrm_positions', type_='foreignkey')
    op.drop_constraint('fk_hrm_teams_leader', 'hrm_teams', type_='foreignkey')
    op.drop_constraint('fk_hrm_departments_manager', 'hrm_departments', type_='foreignkey')
    op.drop_constraint('fk_hrm_branches_manager', 'hrm_branches', type_='foreignkey')
    op.drop_constraint('fk_drivers_employee', 'drivers', type_='foreignkey')
    op.drop_constraint('fk_hrm_employees_manager', 'hrm_employees', type_='foreignkey')

    # Drop TMS foreign keys
    op.drop_constraint('fk_orders_customer', 'orders', type_='foreignkey')
    op.drop_constraint('fk_trips_shipment', 'trips', type_='foreignkey')
    op.drop_constraint('fk_trips_trailer', 'trips', type_='foreignkey')
    op.drop_constraint('fk_trips_driver', 'trips', type_='foreignkey')
    op.drop_constraint('fk_trips_vehicle', 'trips', type_='foreignkey')
