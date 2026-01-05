"""Add Actor-Based Schema - Core tables for unified system

Revision ID: add_actor_based_schema
Revises: add_worker_connections
Create Date: 2026-01-05

This migration creates the new Actor-Based architecture:
- actors: Central entity (Person or Organization)
- actor_relationships: Relationships between actors
- unified_orders: Unified orders table
- order_assignments: Order assignments to drivers
- order_sequences: Order code sequences
- order_status_history: Order status change history
- unified_locations: Extended locations
- location_aliases: Location name aliases
- unified_rates: Rate tables
- unified_vehicles: Unified vehicles
- vehicle_assignments: Vehicle-driver assignments
- vehicle_pairings: Tractor-trailer pairings
- vehicle_maintenance_logs: Maintenance history
- vehicle_fuel_logs: Fuel history
- invoices: Invoices
- invoice_items: Invoice line items
- payments: Payments
- payment_terms: Payment terms
- financial_summaries: Financial summaries
- driver_earnings: Driver earnings
- notifications: Notifications
- notification_preferences: Notification settings
- notification_templates: Notification templates
- push_tokens: Push notification tokens
- audit_logs: Audit trail
- actor_sessions: Login sessions
- login_attempts: Login history
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_actor_based_schema'
down_revision: Union[str, None] = 'add_worker_connections'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================
    # 1. ACTORS (Core)
    # ============================================
    op.create_table(
        'actors',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Type & Status
        sa.Column('type', sa.String(20), nullable=False, server_default='PERSON', index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE', index=True),

        # Identification
        sa.Column('code', sa.String(50), nullable=True, index=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('slug', sa.String(100), nullable=True, index=True),

        # Contact
        sa.Column('email', sa.String(255), nullable=True, index=True),
        sa.Column('phone', sa.String(50), nullable=True, index=True),

        # Profile
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),

        # Address
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('district', sa.String(100), nullable=True),
        sa.Column('country', sa.String(10), nullable=True, server_default='VN'),

        # Organization specific
        sa.Column('tax_code', sa.String(50), nullable=True),
        sa.Column('business_type', sa.String(100), nullable=True),

        # Person specific
        sa.Column('id_number', sa.String(50), nullable=True),
        sa.Column('date_of_birth', sa.String(20), nullable=True),
        sa.Column('gender', sa.String(10), nullable=True),

        # Auth
        sa.Column('password_hash', sa.Text(), nullable=True),

        # Flexible metadata
        sa.Column('extra_data', sa.JSON(), nullable=True),

        # Legacy references
        sa.Column('legacy_worker_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_tenant_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_driver_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_user_id', sa.String(36), nullable=True, index=True),
    )

    # ============================================
    # 2. ACTOR RELATIONSHIPS
    # ============================================
    op.create_table(
        'actor_relationships',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Parties
        sa.Column('actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('related_actor_id', sa.String(36), nullable=False, index=True),

        # Relationship
        sa.Column('type', sa.String(30), nullable=False, index=True),
        sa.Column('role', sa.String(30), nullable=True, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING', index=True),

        # Permissions
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('payment_terms', sa.JSON(), nullable=True),

        # Communication
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),

        # Validity
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),

        # Stats
        sa.Column('total_orders_completed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_amount_pending', sa.Float(), nullable=False, server_default='0'),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('total_ratings', sa.Integer(), nullable=False, server_default='0'),

        # Metadata
        sa.Column('extra_data', sa.JSON(), nullable=True),

        # Legacy
        sa.Column('legacy_worker_tenant_access_id', sa.String(36), nullable=True),
        sa.Column('legacy_worker_connection_id', sa.String(36), nullable=True),
    )

    # Composite index for relationship lookup
    op.create_index(
        'ix_actor_relationships_pair_type',
        'actor_relationships',
        ['actor_id', 'related_actor_id', 'type']
    )

    # ============================================
    # 3. UNIFIED ORDERS
    # ============================================
    op.create_table(
        'unified_orders',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Source & Owner
        sa.Column('source_type', sa.String(20), nullable=False, server_default='TENANT', index=True),
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),

        # Order Identification
        sa.Column('order_code', sa.String(50), nullable=False, index=True),
        sa.Column('external_code', sa.String(100), nullable=True, index=True),

        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='DRAFT', index=True),

        # Customer
        sa.Column('customer_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('customer_name', sa.String(255), nullable=True),
        sa.Column('customer_phone', sa.String(50), nullable=True),
        sa.Column('customer_company', sa.String(255), nullable=True),
        sa.Column('customer_email', sa.String(255), nullable=True),

        # Pickup
        sa.Column('pickup_location_id', sa.String(36), nullable=True, index=True),
        sa.Column('pickup_address', sa.Text(), nullable=True),
        sa.Column('pickup_city', sa.String(100), nullable=True),
        sa.Column('pickup_district', sa.String(100), nullable=True),
        sa.Column('pickup_contact', sa.String(100), nullable=True),
        sa.Column('pickup_phone', sa.String(50), nullable=True),
        sa.Column('pickup_time', sa.DateTime(), nullable=True),
        sa.Column('pickup_notes', sa.Text(), nullable=True),

        # Delivery
        sa.Column('delivery_location_id', sa.String(36), nullable=True, index=True),
        sa.Column('delivery_address', sa.Text(), nullable=True),
        sa.Column('delivery_city', sa.String(100), nullable=True),
        sa.Column('delivery_district', sa.String(100), nullable=True),
        sa.Column('delivery_contact', sa.String(100), nullable=True),
        sa.Column('delivery_phone', sa.String(50), nullable=True),
        sa.Column('delivery_time', sa.DateTime(), nullable=True),
        sa.Column('delivery_notes', sa.Text(), nullable=True),

        # Cargo
        sa.Column('equipment_type', sa.String(20), nullable=True),
        sa.Column('container_code', sa.String(50), nullable=True, index=True),
        sa.Column('seal_number', sa.String(50), nullable=True),
        sa.Column('cargo_description', sa.Text(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('cbm', sa.Float(), nullable=True),
        sa.Column('package_count', sa.Integer(), nullable=True),
        sa.Column('commodity_type', sa.String(100), nullable=True),
        sa.Column('is_hazardous', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('temperature_required', sa.String(50), nullable=True),

        # Financials
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('freight_charge', sa.Float(), nullable=True),
        sa.Column('additional_charges', sa.Float(), nullable=True),
        sa.Column('total_charge', sa.Float(), nullable=True),
        sa.Column('cost_estimate', sa.Float(), nullable=True),
        sa.Column('profit_estimate', sa.Float(), nullable=True),

        # Payment tracking
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='PENDING', index=True),
        sa.Column('payment_due_date', sa.DateTime(), nullable=True),
        sa.Column('amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('payment_notes', sa.Text(), nullable=True),

        # Assignment
        sa.Column('primary_driver_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('primary_vehicle_id', sa.String(36), nullable=True),
        sa.Column('driver_payment', sa.Float(), nullable=True),
        sa.Column('driver_payment_status', sa.String(20), nullable=False, server_default='PENDING'),

        # Timeline
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('picked_up_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),

        # Notes
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('driver_notes', sa.Text(), nullable=True),
        sa.Column('customer_notes', sa.Text(), nullable=True),

        # Documents
        sa.Column('attachments', sa.JSON(), nullable=True),

        # Metadata
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),

        # Legacy
        sa.Column('legacy_order_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_dispatcher_order_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_tenant_id', sa.String(36), nullable=True, index=True),
    )

    # Composite indexes for common queries
    op.create_index('ix_unified_orders_owner_status', 'unified_orders', ['owner_actor_id', 'status'])
    op.create_index('ix_unified_orders_owner_code', 'unified_orders', ['owner_actor_id', 'order_code'])

    # ============================================
    # 4. ORDER ASSIGNMENTS
    # ============================================
    op.create_table(
        'order_assignments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # References
        sa.Column('order_id', sa.String(36), nullable=False, index=True),
        sa.Column('driver_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('vehicle_id', sa.String(36), nullable=True),
        sa.Column('assigned_by_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('connection_id', sa.String(36), nullable=True),

        # Segment
        sa.Column('segment_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('segment_type', sa.String(20), nullable=True),
        sa.Column('segment_from', sa.Text(), nullable=True),
        sa.Column('segment_to', sa.Text(), nullable=True),

        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING', index=True),

        # Response
        sa.Column('responded_at', sa.DateTime(), nullable=True),
        sa.Column('decline_reason', sa.Text(), nullable=True),

        # Timeline
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),

        # Payment
        sa.Column('payment_amount', sa.Float(), nullable=True),
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('paid_at', sa.DateTime(), nullable=True),

        # Notes & Proof
        sa.Column('driver_notes', sa.Text(), nullable=True),
        sa.Column('proof_of_delivery', sa.JSON(), nullable=True),

        # Metadata
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 5. UNIFIED ORDER SEQUENCES
    # ============================================
    op.create_table(
        'unified_order_sequences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('prefix', sa.String(10), nullable=False, server_default='ORD'),
        sa.Column('last_seq', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('year', sa.Integer(), nullable=False, server_default='2026'),
    )

    # ============================================
    # 6. ORDER STATUS HISTORY
    # ============================================
    op.create_table(
        'order_status_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('order_id', sa.String(36), nullable=False, index=True),
        sa.Column('from_status', sa.String(20), nullable=True),
        sa.Column('to_status', sa.String(20), nullable=False),
        sa.Column('changed_by_actor_id', sa.String(36), nullable=True),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 7. UNIFIED LOCATIONS
    # ============================================
    op.create_table(
        'unified_locations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Ownership
        sa.Column('owner_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('is_global', sa.Boolean(), nullable=False, server_default='0'),

        # Basic Info
        sa.Column('code', sa.String(50), nullable=True, index=True),
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('type', sa.String(30), nullable=False, server_default='OTHER', index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE', index=True),

        # Address
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('ward', sa.String(100), nullable=True, index=True),
        sa.Column('district', sa.String(100), nullable=True, index=True),
        sa.Column('city', sa.String(100), nullable=True, index=True),
        sa.Column('province', sa.String(100), nullable=True, index=True),
        sa.Column('country', sa.String(10), nullable=False, server_default='VN'),
        sa.Column('postal_code', sa.String(20), nullable=True),

        # Coordinates
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),

        # Contact
        sa.Column('contact_name', sa.String(100), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),

        # Features
        sa.Column('operating_hours', sa.JSON(), nullable=True),
        sa.Column('capacity', sa.JSON(), nullable=True),
        sa.Column('features', sa.JSON(), nullable=True),

        # Notes
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('directions', sa.Text(), nullable=True),

        # Metadata & Legacy
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('legacy_location_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_site_id', sa.String(36), nullable=True, index=True),
    )

    # ============================================
    # 8. LOCATION ALIASES
    # ============================================
    op.create_table(
        'location_aliases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('location_id', sa.String(36), nullable=False, index=True),
        sa.Column('alias', sa.String(255), nullable=False, index=True),
        sa.Column('language', sa.String(10), nullable=False, server_default='vi'),
    )

    # ============================================
    # 9. UNIFIED RATES
    # ============================================
    op.create_table(
        'unified_rates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Ownership
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),

        # Route
        sa.Column('from_location_id', sa.String(36), nullable=True, index=True),
        sa.Column('to_location_id', sa.String(36), nullable=True, index=True),
        sa.Column('from_city', sa.String(100), nullable=True, index=True),
        sa.Column('to_city', sa.String(100), nullable=True, index=True),

        # Equipment
        sa.Column('equipment_type', sa.String(20), nullable=True),

        # Rates
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('base_rate', sa.Float(), nullable=False, server_default='0'),
        sa.Column('rate_per_km', sa.Float(), nullable=True),
        sa.Column('min_charge', sa.Float(), nullable=True),
        sa.Column('max_charge', sa.Float(), nullable=True),

        # Additional
        sa.Column('additional_charges', sa.JSON(), nullable=True),

        # Validity
        sa.Column('valid_from', sa.String(20), nullable=True),
        sa.Column('valid_until', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),

        # Notes & Legacy
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('legacy_rate_id', sa.String(36), nullable=True, index=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 10. UNIFIED VEHICLES
    # ============================================
    op.create_table(
        'unified_vehicles',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),

        # Ownership
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('ownership_type', sa.String(20), nullable=False, server_default='COMPANY'),
        sa.Column('operator_actor_id', sa.String(36), nullable=True, index=True),

        # Basic Info
        sa.Column('vehicle_type', sa.String(20), nullable=False, index=True),
        sa.Column('code', sa.String(50), nullable=True, index=True),
        sa.Column('license_plate', sa.String(20), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE', index=True),

        # Details
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('model', sa.String(100), nullable=True),
        sa.Column('year_manufactured', sa.Integer(), nullable=True),
        sa.Column('color', sa.String(50), nullable=True),
        sa.Column('vin_number', sa.String(50), nullable=True),
        sa.Column('engine_number', sa.String(50), nullable=True),

        # Capacity
        sa.Column('capacity_type', sa.String(20), nullable=True),
        sa.Column('max_weight_kg', sa.Float(), nullable=True),
        sa.Column('max_cbm', sa.Float(), nullable=True),
        sa.Column('axles', sa.Integer(), nullable=True),

        # Registration & Insurance
        sa.Column('registration_number', sa.String(50), nullable=True),
        sa.Column('registration_expiry', sa.Date(), nullable=True),
        sa.Column('insurance_number', sa.String(50), nullable=True),
        sa.Column('insurance_expiry', sa.Date(), nullable=True),
        sa.Column('inspection_expiry', sa.Date(), nullable=True),

        # GPS
        sa.Column('gps_device_id', sa.String(100), nullable=True),
        sa.Column('last_known_lat', sa.Float(), nullable=True),
        sa.Column('last_known_lng', sa.Float(), nullable=True),
        sa.Column('last_location_update', sa.DateTime(), nullable=True),

        # Fuel & Maintenance
        sa.Column('fuel_type', sa.String(20), nullable=True),
        sa.Column('fuel_capacity_liters', sa.Float(), nullable=True),
        sa.Column('average_fuel_consumption', sa.Float(), nullable=True),
        sa.Column('last_maintenance_date', sa.Date(), nullable=True),
        sa.Column('next_maintenance_date', sa.Date(), nullable=True),
        sa.Column('total_mileage_km', sa.Float(), nullable=True),

        # Current Assignment
        sa.Column('current_driver_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('current_paired_vehicle_id', sa.String(36), nullable=True),

        # Costs
        sa.Column('purchase_cost', sa.Float(), nullable=True),
        sa.Column('monthly_lease_cost', sa.Float(), nullable=True),
        sa.Column('depreciation_per_month', sa.Float(), nullable=True),

        # Photos & Documents
        sa.Column('photos', sa.JSON(), nullable=True),
        sa.Column('documents', sa.JSON(), nullable=True),

        # Notes & Metadata
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),

        # Legacy
        sa.Column('legacy_vehicle_id', sa.String(36), nullable=True, index=True),
        sa.Column('legacy_tenant_id', sa.String(36), nullable=True, index=True),
    )

    # ============================================
    # 11. UNIFIED VEHICLE ASSIGNMENTS
    # ============================================
    op.create_table(
        'unified_vehicle_assignments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('vehicle_id', sa.String(36), nullable=False, index=True),
        sa.Column('driver_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('assigned_by_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('unassigned_at', sa.DateTime(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='1', index=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 12. VEHICLE PAIRINGS
    # ============================================
    op.create_table(
        'vehicle_pairings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('tractor_id', sa.String(36), nullable=False, index=True),
        sa.Column('trailer_id', sa.String(36), nullable=False, index=True),
        sa.Column('paired_by_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('paired_at', sa.DateTime(), nullable=False),
        sa.Column('unpaired_at', sa.DateTime(), nullable=True),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default='1', index=True),
        sa.Column('notes', sa.Text(), nullable=True),
    )

    # ============================================
    # 13. VEHICLE MAINTENANCE LOGS
    # ============================================
    op.create_table(
        'vehicle_maintenance_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('vehicle_id', sa.String(36), nullable=False, index=True),
        sa.Column('performed_by', sa.String(255), nullable=True),
        sa.Column('approved_by_actor_id', sa.String(36), nullable=True),
        sa.Column('maintenance_type', sa.String(30), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('mileage_at_maintenance', sa.Float(), nullable=True),
        sa.Column('maintenance_date', sa.Date(), nullable=False),
        sa.Column('completion_date', sa.Date(), nullable=True),
        sa.Column('cost', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('parts_replaced', sa.JSON(), nullable=True),
        sa.Column('documents', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 14. VEHICLE FUEL LOGS
    # ============================================
    op.create_table(
        'vehicle_fuel_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('vehicle_id', sa.String(36), nullable=False, index=True),
        sa.Column('driver_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('order_id', sa.String(36), nullable=True, index=True),
        sa.Column('fuel_type', sa.String(20), nullable=False),
        sa.Column('liters', sa.Float(), nullable=False),
        sa.Column('price_per_liter', sa.Float(), nullable=False),
        sa.Column('total_cost', sa.Float(), nullable=False),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('station_name', sa.String(255), nullable=True),
        sa.Column('station_address', sa.Text(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('mileage_at_fill', sa.Float(), nullable=True),
        sa.Column('distance_since_last_fill', sa.Float(), nullable=True),
        sa.Column('consumption_l_per_100km', sa.Float(), nullable=True),
        sa.Column('receipt_number', sa.String(100), nullable=True),
        sa.Column('receipt_image', sa.Text(), nullable=True),
        sa.Column('filled_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 15. INVOICES
    # ============================================
    op.create_table(
        'invoices',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('invoice_type', sa.String(20), nullable=False, index=True),
        sa.Column('counterpart_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('invoice_number', sa.String(50), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='DRAFT', index=True),
        sa.Column('invoice_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('subtotal', sa.Float(), nullable=False, server_default='0'),
        sa.Column('tax_rate', sa.Float(), nullable=True),
        sa.Column('tax_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('discount_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_amount', sa.Float(), nullable=False, server_default='0'),
        sa.Column('amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('amount_due', sa.Float(), nullable=False, server_default='0'),
        sa.Column('order_ids', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('internal_notes', sa.Text(), nullable=True),
        sa.Column('attachments', sa.JSON(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 16. INVOICE ITEMS
    # ============================================
    op.create_table(
        'invoice_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('invoice_id', sa.String(36), nullable=False, index=True),
        sa.Column('order_id', sa.String(36), nullable=True, index=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False, server_default='1'),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 17. PAYMENTS
    # ============================================
    op.create_table(
        'payments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('invoice_id', sa.String(36), nullable=True, index=True),
        sa.Column('payer_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('payee_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('payment_number', sa.String(50), nullable=True, index=True),
        sa.Column('payment_date', sa.DateTime(), nullable=False),
        sa.Column('payment_method', sa.String(30), nullable=False, server_default='BANK_TRANSFER'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('bank_name', sa.String(255), nullable=True),
        sa.Column('bank_account', sa.String(100), nullable=True),
        sa.Column('bank_reference', sa.String(100), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='COMPLETED'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('receipt_image', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 18. PAYMENT TERMS
    # ============================================
    op.create_table(
        'payment_terms',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('counterpart_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('payment_cycle', sa.String(30), nullable=False, server_default='ON_DELIVERY'),
        sa.Column('credit_limit', sa.Float(), nullable=True),
        sa.Column('current_balance', sa.Float(), nullable=False, server_default='0'),
        sa.Column('default_rate_per_order', sa.Float(), nullable=True),
        sa.Column('default_rate_per_km', sa.Float(), nullable=True),
        sa.Column('default_rate_per_container', sa.JSON(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 19. FINANCIAL SUMMARIES
    # ============================================
    op.create_table(
        'financial_summaries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('owner_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('period_type', sa.String(20), nullable=False, index=True),
        sa.Column('period_start', sa.Date(), nullable=False, index=True),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_revenue', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_freight_charges', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_additional_charges', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_driver_payments', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_fuel_costs', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_maintenance_costs', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_other_costs', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_costs', sa.Float(), nullable=False, server_default='0'),
        sa.Column('gross_profit', sa.Float(), nullable=False, server_default='0'),
        sa.Column('profit_margin', sa.Float(), nullable=True),
        sa.Column('total_receivables', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_received', sa.Float(), nullable=False, server_default='0'),
        sa.Column('outstanding_receivables', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_payables', sa.Float(), nullable=False, server_default='0'),
        sa.Column('total_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('outstanding_payables', sa.Float(), nullable=False, server_default='0'),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 20. DRIVER EARNINGS
    # ============================================
    op.create_table(
        'driver_earnings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('driver_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('employer_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('period_type', sa.String(20), nullable=False, index=True),
        sa.Column('period_start', sa.Date(), nullable=False, index=True),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('total_orders', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_distance_km', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(10), nullable=False, server_default='VND'),
        sa.Column('gross_earnings', sa.Float(), nullable=False, server_default='0'),
        sa.Column('deductions', sa.Float(), nullable=False, server_default='0'),
        sa.Column('net_earnings', sa.Float(), nullable=False, server_default='0'),
        sa.Column('earnings_breakdown', sa.JSON(), nullable=True),
        sa.Column('deductions_breakdown', sa.JSON(), nullable=True),
        sa.Column('payment_status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('amount_paid', sa.Float(), nullable=False, server_default='0'),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 21. NOTIFICATIONS
    # ============================================
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('recipient_actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('type', sa.String(50), nullable=False, index=True),
        sa.Column('priority', sa.String(20), nullable=False, server_default='NORMAL'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('short_message', sa.String(255), nullable=True),
        sa.Column('reference_type', sa.String(50), nullable=True),
        sa.Column('reference_id', sa.String(36), nullable=True, index=True),
        sa.Column('sender_actor_id', sa.String(36), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='0', index=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('channels', sa.JSON(), nullable=True),
        sa.Column('channel_statuses', sa.JSON(), nullable=True),
        sa.Column('action_url', sa.Text(), nullable=True),
        sa.Column('action_data', sa.JSON(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 22. NOTIFICATION PREFERENCES
    # ============================================
    op.create_table(
        'notification_preferences',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('notification_type', sa.String(50), nullable=False, index=True),
        sa.Column('in_app_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('push_enabled', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('email_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('sms_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('quiet_hours_start', sa.String(10), nullable=True),
        sa.Column('quiet_hours_end', sa.String(10), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 23. NOTIFICATION TEMPLATES
    # ============================================
    op.create_table(
        'notification_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False, index=True),
        sa.Column('channel', sa.String(20), nullable=False, index=True),
        sa.Column('language', sa.String(10), nullable=False, server_default='vi', index=True),
        sa.Column('title_template', sa.Text(), nullable=False),
        sa.Column('message_template', sa.Text(), nullable=False),
        sa.Column('short_message_template', sa.String(255), nullable=True),
        sa.Column('email_subject_template', sa.String(255), nullable=True),
        sa.Column('email_html_template', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 24. PUSH TOKENS
    # ============================================
    op.create_table(
        'push_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('device_id', sa.String(100), nullable=False, index=True),
        sa.Column('token', sa.Text(), nullable=False, index=True),
        sa.Column('platform', sa.String(20), nullable=False),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_model', sa.String(100), nullable=True),
        sa.Column('app_version', sa.String(20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 25. AUDIT LOGS
    # ============================================
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('actor_type', sa.String(20), nullable=True),
        sa.Column('action', sa.String(30), nullable=False, index=True),
        sa.Column('resource_type', sa.String(50), nullable=False, index=True),
        sa.Column('resource_id', sa.String(36), nullable=True, index=True),
        sa.Column('context_actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('changed_fields', sa.JSON(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('request_id', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 26. ACTOR SESSIONS
    # ============================================
    op.create_table(
        'actor_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('actor_id', sa.String(36), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, index=True),
        sa.Column('refresh_token_hash', sa.String(255), nullable=True),
        sa.Column('device_id', sa.String(100), nullable=True),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_type', sa.String(20), nullable=True),
        sa.Column('platform', sa.String(20), nullable=True),
        sa.Column('app_version', sa.String(20), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('country', sa.String(10), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1', index=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_active_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('revoked_reason', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )

    # ============================================
    # 27. LOGIN ATTEMPTS
    # ============================================
    op.create_table(
        'login_attempts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('identifier', sa.String(255), nullable=False, index=True),
        sa.Column('actor_id', sa.String(36), nullable=True, index=True),
        sa.Column('success', sa.Boolean(), nullable=False, index=True),
        sa.Column('failure_reason', sa.String(50), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True, index=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_id', sa.String(100), nullable=True),
        sa.Column('country', sa.String(10), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('extra_data', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('login_attempts')
    op.drop_table('actor_sessions')
    op.drop_table('audit_logs')
    op.drop_table('push_tokens')
    op.drop_table('notification_templates')
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
    op.drop_table('driver_earnings')
    op.drop_table('financial_summaries')
    op.drop_table('payment_terms')
    op.drop_table('payments')
    op.drop_table('invoice_items')
    op.drop_table('invoices')
    op.drop_table('vehicle_fuel_logs')
    op.drop_table('vehicle_maintenance_logs')
    op.drop_table('vehicle_pairings')
    op.drop_table('unified_vehicle_assignments')
    op.drop_table('unified_vehicles')
    op.drop_table('unified_rates')
    op.drop_table('location_aliases')
    op.drop_table('unified_locations')
    op.drop_table('order_status_history')
    op.drop_table('unified_order_sequences')
    op.drop_table('order_assignments')
    op.drop_index('ix_unified_orders_owner_code', 'unified_orders')
    op.drop_index('ix_unified_orders_owner_status', 'unified_orders')
    op.drop_table('unified_orders')
    op.drop_index('ix_actor_relationships_pair_type', 'actor_relationships')
    op.drop_table('actor_relationships')
    op.drop_table('actors')
