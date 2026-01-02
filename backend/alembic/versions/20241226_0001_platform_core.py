"""Platform core - Multi-tenant, Roles, Permissions

Revision ID: 002
Revises: 001
Create Date: 2024-12-26

This migration adds:
- New columns to tenants table (multi-tenant platform support)
- tenant_modules table
- roles table
- permissions table
- user_roles table
- New columns to users table
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==================== TENANTS TABLE ====================
    # Add new columns to existing tenants table

    # Basic Info
    op.add_column('tenants', sa.Column('code', sa.String(length=50), nullable=True))
    op.add_column('tenants', sa.Column('type', sa.String(length=50), server_default='CARRIER', nullable=True))

    # Business Info
    op.add_column('tenants', sa.Column('business_registration', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('legal_name', sa.String(length=255), nullable=True))

    # Contact
    op.add_column('tenants', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('tenants', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('tenants', sa.Column('website', sa.String(length=255), nullable=True))

    # Address
    op.add_column('tenants', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('tenants', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('province', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('country', sa.String(length=100), server_default='VN', nullable=True))
    op.add_column('tenants', sa.Column('postal_code', sa.String(length=20), nullable=True))

    # Branding
    op.add_column('tenants', sa.Column('logo_url', sa.String(length=500), nullable=True))
    op.add_column('tenants', sa.Column('primary_color', sa.String(length=10), nullable=True))

    # Subscription
    op.add_column('tenants', sa.Column('subscription_plan', sa.String(length=50), server_default='FREE', nullable=True))
    op.add_column('tenants', sa.Column('subscription_status', sa.String(length=50), server_default='ACTIVE', nullable=True))
    op.add_column('tenants', sa.Column('trial_ends_at', sa.String(length=50), nullable=True))
    op.add_column('tenants', sa.Column('subscription_ends_at', sa.String(length=50), nullable=True))

    # Modules
    op.add_column('tenants', sa.Column('enabled_modules', sa.Text(), server_default='["tms"]', nullable=True))

    # Settings
    op.add_column('tenants', sa.Column('timezone', sa.String(length=50), server_default='Asia/Ho_Chi_Minh', nullable=True))
    op.add_column('tenants', sa.Column('currency', sa.String(length=10), server_default='VND', nullable=True))
    op.add_column('tenants', sa.Column('locale', sa.String(length=10), server_default='vi-VN', nullable=True))

    # Deployment
    op.add_column('tenants', sa.Column('deployment_type', sa.String(length=50), server_default='CLOUD', nullable=True))
    op.add_column('tenants', sa.Column('custom_domain', sa.String(length=255), nullable=True))

    # Status
    op.add_column('tenants', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True))

    # Create indexes
    op.create_index('ix_tenants_code', 'tenants', ['code'], unique=True)
    op.create_index('ix_tenants_type', 'tenants', ['type'])
    op.create_index('ix_tenants_subscription_plan', 'tenants', ['subscription_plan'])
    op.create_index('ix_tenants_is_active', 'tenants', ['is_active'])

    # ==================== TENANT_MODULES TABLE ====================
    op.create_table(
        'tenant_modules',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('module_code', sa.String(length=50), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('enabled_at', sa.String(length=50), nullable=True),
        sa.Column('disabled_at', sa.String(length=50), nullable=True),
        sa.Column('subscription_type', sa.String(length=50), nullable=True),
        sa.Column('price_per_month', sa.Float(), nullable=True),
        sa.Column('max_users', sa.Integer(), nullable=True),
        sa.Column('max_records', sa.Integer(), nullable=True),
        sa.Column('settings_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
    )
    op.create_index('ix_tenant_modules_tenant_id', 'tenant_modules', ['tenant_id'])
    op.create_index('ix_tenant_modules_module_code', 'tenant_modules', ['module_code'])

    # ==================== ROLES TABLE ====================
    op.create_table(
        'roles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('tenant_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_system', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('module_code', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_roles_tenant_id', 'roles', ['tenant_id'])
    op.create_index('ix_roles_code', 'roles', ['code'])
    op.create_index('ix_roles_module_code', 'roles', ['module_code'])

    # ==================== PERMISSIONS TABLE ====================
    op.create_table(
        'permissions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('module', sa.String(length=50), nullable=False),
        sa.Column('resource', sa.String(length=100), nullable=False),
        sa.Column('action', sa.String(length=50), nullable=False),
        sa.Column('conditions_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_permissions_role_id', 'permissions', ['role_id'])
    op.create_index('ix_permissions_module', 'permissions', ['module'])
    op.create_index('ix_permissions_resource', 'permissions', ['resource'])

    # ==================== USER_ROLES TABLE ====================
    op.create_table(
        'user_roles',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('role_id', sa.String(length=36), nullable=False),
        sa.Column('assigned_at', sa.String(length=50), nullable=False),
        sa.Column('assigned_by', sa.String(length=36), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_user_roles_user_id', 'user_roles', ['user_id'])
    op.create_index('ix_user_roles_role_id', 'user_roles', ['role_id'])

    # ==================== USERS TABLE - Add new columns ====================
    op.add_column('users', sa.Column('system_role', sa.String(length=50), server_default='USER', nullable=True))
    op.add_column('users', sa.Column('employee_id', sa.String(length=36), nullable=True))
    op.add_column('users', sa.Column('password_changed_at', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), server_default='0', nullable=True))
    op.add_column('users', sa.Column('locked_until', sa.String(length=50), nullable=True))
    op.add_column('users', sa.Column('two_factor_enabled', sa.Boolean(), server_default='false', nullable=True))
    op.add_column('users', sa.Column('two_factor_secret', sa.String(length=255), nullable=True))

    op.create_index('ix_users_system_role', 'users', ['system_role'])
    op.create_index('ix_users_employee_id', 'users', ['employee_id'])


def downgrade() -> None:
    # Drop user columns
    op.drop_index('ix_users_employee_id', table_name='users')
    op.drop_index('ix_users_system_role', table_name='users')
    op.drop_column('users', 'two_factor_secret')
    op.drop_column('users', 'two_factor_enabled')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
    op.drop_column('users', 'password_changed_at')
    op.drop_column('users', 'employee_id')
    op.drop_column('users', 'system_role')

    # Drop tables
    op.drop_table('user_roles')
    op.drop_table('permissions')
    op.drop_table('roles')
    op.drop_table('tenant_modules')

    # Drop tenant columns
    op.drop_index('ix_tenants_is_active', table_name='tenants')
    op.drop_index('ix_tenants_subscription_plan', table_name='tenants')
    op.drop_index('ix_tenants_type', table_name='tenants')
    op.drop_index('ix_tenants_code', table_name='tenants')

    op.drop_column('tenants', 'is_active')
    op.drop_column('tenants', 'custom_domain')
    op.drop_column('tenants', 'deployment_type')
    op.drop_column('tenants', 'locale')
    op.drop_column('tenants', 'currency')
    op.drop_column('tenants', 'timezone')
    op.drop_column('tenants', 'enabled_modules')
    op.drop_column('tenants', 'subscription_ends_at')
    op.drop_column('tenants', 'trial_ends_at')
    op.drop_column('tenants', 'subscription_status')
    op.drop_column('tenants', 'subscription_plan')
    op.drop_column('tenants', 'primary_color')
    op.drop_column('tenants', 'logo_url')
    op.drop_column('tenants', 'postal_code')
    op.drop_column('tenants', 'country')
    op.drop_column('tenants', 'province')
    op.drop_column('tenants', 'city')
    op.drop_column('tenants', 'address')
    op.drop_column('tenants', 'website')
    op.drop_column('tenants', 'phone')
    op.drop_column('tenants', 'email')
    op.drop_column('tenants', 'legal_name')
    op.drop_column('tenants', 'business_registration')
    op.drop_column('tenants', 'type')
    op.drop_column('tenants', 'code')
