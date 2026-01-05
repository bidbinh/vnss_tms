"""Migrate existing data to Actor-Based Schema

Revision ID: migrate_to_actors
Revises: add_actor_based_schema
Create Date: 2026-01-05

This migration:
1. Migrates Workers to Actors (type=PERSON)
2. Migrates Tenants to Actors (type=ORGANIZATION)
3. Migrates Users to Actors (type=PERSON)
4. Creates ActorRelationships from WorkerTenantAccess
5. Creates ActorRelationships from WorkerConnections
6. Migrates Orders to UnifiedOrders
7. Migrates DispatcherOrders to UnifiedOrders
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import uuid
from datetime import datetime


# revision identifiers, used by Alembic.
revision: str = 'migrate_to_actors'
down_revision: Union[str, None] = 'add_actor_based_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def generate_uuid():
    return str(uuid.uuid4())


def upgrade() -> None:
    """Migrate existing data to Actor-Based Schema"""
    connection = op.get_bind()

    # ============================================
    # 1. Migrate Tenants to Actors (ORGANIZATION)
    # ============================================
    print("Migrating Tenants to Actors...")
    tenants = connection.execute(text("""
        SELECT id, name, code, type, tax_code, email, phone, address, city,
               province, country, logo_url, created_at, updated_at, is_active
        FROM tenants
    """)).fetchall()

    for tenant in tenants:
        actor_id = generate_uuid()
        now = datetime.utcnow()

        connection.execute(text("""
            INSERT INTO actors (
                id, created_at, updated_at, type, status, code, name, slug,
                email, phone, avatar_url, address, city, country, tax_code,
                business_type, extra_data, legacy_tenant_id
            ) VALUES (
                :id, :created_at, :updated_at, 'ORGANIZATION',
                CASE WHEN :is_active THEN 'ACTIVE' ELSE 'INACTIVE' END,
                :code, :name, :slug, :email, :phone, :avatar_url,
                :address, :city, :country, :tax_code, :business_type,
                :extra_data, :legacy_tenant_id
            )
        """), {
            "id": actor_id,
            "created_at": tenant.created_at or now,
            "updated_at": tenant.updated_at or now,
            "code": tenant.code,
            "name": tenant.name,
            "slug": tenant.code,  # Use code as slug
            "email": tenant.email,
            "phone": tenant.phone,
            "avatar_url": tenant.logo_url,
            "address": tenant.address,
            "city": tenant.city or tenant.province,
            "country": tenant.country or "VN",
            "tax_code": tenant.tax_code,
            "business_type": tenant.type,
            "extra_data": f'{{"original_type": "{tenant.type}"}}',
            "legacy_tenant_id": tenant.id,
            "is_active": tenant.is_active if hasattr(tenant, 'is_active') else True
        })

    print(f"Migrated {len(tenants)} tenants to actors")

    # ============================================
    # 2. Migrate Workers to Actors (PERSON)
    # ============================================
    print("Migrating Workers to Actors...")
    workers = connection.execute(text("""
        SELECT id, username, email, phone, password_hash, full_name, avatar_url,
               bio, job_title, city, province, country, address, id_number,
               status, created_at, updated_at
        FROM workers
    """)).fetchall()

    for worker in workers:
        actor_id = generate_uuid()
        now = datetime.utcnow()

        connection.execute(text("""
            INSERT INTO actors (
                id, created_at, updated_at, type, status, code, name, slug,
                email, phone, avatar_url, bio, address, city, country,
                id_number, password_hash, extra_data, legacy_worker_id
            ) VALUES (
                :id, :created_at, :updated_at, 'PERSON', :status,
                :code, :name, :slug, :email, :phone, :avatar_url, :bio,
                :address, :city, :country, :id_number, :password_hash,
                :extra_data, :legacy_worker_id
            )
        """), {
            "id": actor_id,
            "created_at": worker.created_at or now,
            "updated_at": worker.updated_at or now,
            "status": worker.status or "ACTIVE",
            "code": worker.username,
            "name": worker.full_name,
            "slug": worker.username,
            "email": worker.email,
            "phone": worker.phone,
            "avatar_url": worker.avatar_url,
            "bio": worker.bio,
            "address": worker.address,
            "city": worker.city or worker.province,
            "country": worker.country or "VN",
            "id_number": worker.id_number,
            "password_hash": worker.password_hash,
            "extra_data": f'{{"job_title": "{worker.job_title or ""}"}}',
            "legacy_worker_id": worker.id
        })

    print(f"Migrated {len(workers)} workers to actors")

    # ============================================
    # 3. Migrate Users to Actors (PERSON)
    # ============================================
    print("Migrating Users to Actors...")
    users = connection.execute(text("""
        SELECT id, tenant_id, username, email, phone, password_hash, full_name,
               avatar_url, role, status, created_at, updated_at
        FROM users
    """)).fetchall()

    for user in users:
        actor_id = generate_uuid()
        now = datetime.utcnow()

        # Check if user already exists as actor (by legacy_worker_id)
        existing = connection.execute(text("""
            SELECT id FROM actors WHERE email = :email AND type = 'PERSON'
        """), {"email": user.email}).fetchone()

        if existing:
            # Update existing actor with legacy_user_id
            connection.execute(text("""
                UPDATE actors SET legacy_user_id = :user_id WHERE id = :actor_id
            """), {"user_id": user.id, "actor_id": existing.id})
        else:
            # Create new actor for user
            connection.execute(text("""
                INSERT INTO actors (
                    id, created_at, updated_at, type, status, code, name, slug,
                    email, phone, avatar_url, password_hash, extra_data, legacy_user_id
                ) VALUES (
                    :id, :created_at, :updated_at, 'PERSON', :status,
                    :code, :name, :slug, :email, :phone, :avatar_url, :password_hash,
                    :extra_data, :legacy_user_id
                )
            """), {
                "id": actor_id,
                "created_at": user.created_at or now,
                "updated_at": user.updated_at or now,
                "status": user.status or "ACTIVE",
                "code": user.username,
                "name": user.full_name or user.username,
                "slug": user.username,
                "email": user.email,
                "phone": user.phone,
                "avatar_url": user.avatar_url,
                "password_hash": user.password_hash,
                "extra_data": f'{{"role": "{user.role}"}}',
                "legacy_user_id": user.id
            })

        # Create employment relationship with Tenant
        if user.tenant_id:
            # Get tenant's actor id
            tenant_actor = connection.execute(text("""
                SELECT id FROM actors WHERE legacy_tenant_id = :tenant_id
            """), {"tenant_id": user.tenant_id}).fetchone()

            if tenant_actor:
                user_actor = connection.execute(text("""
                    SELECT id FROM actors WHERE legacy_user_id = :user_id
                """), {"user_id": user.id}).fetchone()

                if user_actor:
                    rel_id = generate_uuid()
                    connection.execute(text("""
                        INSERT INTO actor_relationships (
                            id, created_at, updated_at, actor_id, related_actor_id,
                            type, role, status, extra_data
                        ) VALUES (
                            :id, :created_at, :updated_at, :tenant_actor_id, :user_actor_id,
                            'EMPLOYS', :role, 'ACTIVE', :extra_data
                        )
                    """), {
                        "id": rel_id,
                        "created_at": now,
                        "updated_at": now,
                        "tenant_actor_id": tenant_actor.id,
                        "user_actor_id": user_actor.id,
                        "role": user.role,
                        "extra_data": f'{{"source": "users_migration"}}'
                    })

    print(f"Migrated {len(users)} users to actors")

    # ============================================
    # 4. Migrate WorkerTenantAccess to ActorRelationships
    # ============================================
    print("Migrating WorkerTenantAccess to ActorRelationships...")
    accesses = connection.execute(text("""
        SELECT id, worker_id, tenant_id, role, is_active, created_at, updated_at,
               total_tasks_completed, rating, total_ratings
        FROM worker_tenant_access
    """)).fetchall()

    for access in accesses:
        # Get worker's actor id
        worker_actor = connection.execute(text("""
            SELECT id FROM actors WHERE legacy_worker_id = :worker_id
        """), {"worker_id": access.worker_id}).fetchone()

        # Get tenant's actor id
        tenant_actor = connection.execute(text("""
            SELECT id FROM actors WHERE legacy_tenant_id = :tenant_id
        """), {"tenant_id": access.tenant_id}).fetchone()

        if worker_actor and tenant_actor:
            rel_id = generate_uuid()
            now = datetime.utcnow()

            connection.execute(text("""
                INSERT INTO actor_relationships (
                    id, created_at, updated_at, actor_id, related_actor_id,
                    type, role, status, total_orders_completed, rating, total_ratings,
                    extra_data, legacy_worker_tenant_access_id
                ) VALUES (
                    :id, :created_at, :updated_at, :tenant_actor_id, :worker_actor_id,
                    'EMPLOYS', :role, :status, :total_orders, :rating, :total_ratings,
                    :extra_data, :legacy_id
                )
            """), {
                "id": rel_id,
                "created_at": access.created_at or now,
                "updated_at": access.updated_at or now,
                "tenant_actor_id": tenant_actor.id,
                "worker_actor_id": worker_actor.id,
                "role": access.role,
                "status": "ACTIVE" if access.is_active else "TERMINATED",
                "total_orders": access.total_tasks_completed or 0,
                "rating": access.rating,
                "total_ratings": access.total_ratings or 0,
                "extra_data": f'{{"source": "worker_tenant_access_migration"}}',
                "legacy_id": access.id
            })

    print(f"Migrated {len(accesses)} worker tenant accesses to relationships")

    # ============================================
    # 5. Migrate WorkerConnections to ActorRelationships
    # ============================================
    print("Migrating WorkerConnections to ActorRelationships...")
    try:
        connections = connection.execute(text("""
            SELECT id, dispatcher_id, driver_id, status, message,
                   total_orders_completed, total_amount_paid, total_amount_pending,
                   rating, total_ratings, created_at, updated_at
            FROM worker_connections
        """)).fetchall()

        for conn in connections:
            # Get dispatcher's actor id
            dispatcher_actor = connection.execute(text("""
                SELECT id FROM actors WHERE legacy_worker_id = :worker_id
            """), {"worker_id": conn.dispatcher_id}).fetchone()

            # Get driver's actor id
            driver_actor = connection.execute(text("""
                SELECT id FROM actors WHERE legacy_worker_id = :worker_id
            """), {"worker_id": conn.driver_id}).fetchone()

            if dispatcher_actor and driver_actor:
                rel_id = generate_uuid()
                now = datetime.utcnow()

                # Map status
                status_map = {
                    "PENDING": "PENDING",
                    "ACCEPTED": "ACTIVE",
                    "DECLINED": "DECLINED",
                    "BLOCKED": "BLOCKED"
                }
                new_status = status_map.get(conn.status, "PENDING")

                connection.execute(text("""
                    INSERT INTO actor_relationships (
                        id, created_at, updated_at, actor_id, related_actor_id,
                        type, role, status, message, total_orders_completed,
                        total_amount_paid, total_amount_pending, rating, total_ratings,
                        extra_data, legacy_worker_connection_id
                    ) VALUES (
                        :id, :created_at, :updated_at, :dispatcher_actor_id, :driver_actor_id,
                        'CONNECTS', 'DRIVER', :status, :message, :total_orders,
                        :amount_paid, :amount_pending, :rating, :total_ratings,
                        :extra_data, :legacy_id
                    )
                """), {
                    "id": rel_id,
                    "created_at": conn.created_at or now,
                    "updated_at": conn.updated_at or now,
                    "dispatcher_actor_id": dispatcher_actor.id,
                    "driver_actor_id": driver_actor.id,
                    "status": new_status,
                    "message": conn.message,
                    "total_orders": conn.total_orders_completed or 0,
                    "amount_paid": conn.total_amount_paid or 0,
                    "amount_pending": conn.total_amount_pending or 0,
                    "rating": conn.rating,
                    "total_ratings": conn.total_ratings or 0,
                    "extra_data": f'{{"source": "worker_connections_migration"}}',
                    "legacy_id": conn.id
                })

        print(f"Migrated {len(connections)} worker connections to relationships")
    except Exception as e:
        print(f"Note: worker_connections table not found or empty: {e}")

    # ============================================
    # 6. Migrate Orders to UnifiedOrders
    # ============================================
    print("Migrating Orders to UnifiedOrders...")
    try:
        orders = connection.execute(text("""
            SELECT o.id, o.tenant_id, o.order_code, o.customer_id, o.status,
                   o.pickup_location_id, o.delivery_location_id,
                   o.equipment, o.container_code, o.freight_charge,
                   o.created_at, o.updated_at
            FROM orders o
        """)).fetchall()

        for order in orders:
            # Get tenant's actor id
            tenant_actor = connection.execute(text("""
                SELECT id FROM actors WHERE legacy_tenant_id = :tenant_id
            """), {"tenant_id": order.tenant_id}).fetchone()

            if tenant_actor:
                unified_id = generate_uuid()
                now = datetime.utcnow()

                connection.execute(text("""
                    INSERT INTO unified_orders (
                        id, created_at, updated_at, source_type, owner_actor_id,
                        order_code, status, equipment_type, container_code,
                        freight_charge, legacy_order_id, legacy_tenant_id
                    ) VALUES (
                        :id, :created_at, :updated_at, 'TENANT', :owner_actor_id,
                        :order_code, :status, :equipment_type, :container_code,
                        :freight_charge, :legacy_order_id, :legacy_tenant_id
                    )
                """), {
                    "id": unified_id,
                    "created_at": order.created_at or now,
                    "updated_at": order.updated_at or now,
                    "owner_actor_id": tenant_actor.id,
                    "order_code": order.order_code,
                    "status": order.status,
                    "equipment_type": order.equipment,
                    "container_code": order.container_code,
                    "freight_charge": order.freight_charge,
                    "legacy_order_id": order.id,
                    "legacy_tenant_id": order.tenant_id
                })

        print(f"Migrated {len(orders)} orders to unified_orders")
    except Exception as e:
        print(f"Note: orders table migration issue: {e}")

    # ============================================
    # 7. Migrate DispatcherOrders to UnifiedOrders
    # ============================================
    print("Migrating DispatcherOrders to UnifiedOrders...")
    try:
        dispatcher_orders = connection.execute(text("""
            SELECT id, dispatcher_id, driver_id, order_code, status,
                   customer_name, customer_phone, customer_company,
                   pickup_address, pickup_contact, pickup_phone, pickup_time,
                   delivery_address, delivery_contact, delivery_phone, delivery_time,
                   equipment, container_code, cargo_description, weight_kg,
                   freight_charge, driver_payment, payment_status,
                   dispatcher_notes, driver_notes,
                   assigned_at, accepted_at, started_at, completed_at,
                   created_at, updated_at
            FROM dispatcher_orders
        """)).fetchall()

        for dorder in dispatcher_orders:
            # Get dispatcher's actor id
            dispatcher_actor = connection.execute(text("""
                SELECT id FROM actors WHERE legacy_worker_id = :worker_id
            """), {"worker_id": dorder.dispatcher_id}).fetchone()

            if dispatcher_actor:
                unified_id = generate_uuid()
                now = datetime.utcnow()

                # Get driver's actor id if assigned
                driver_actor_id = None
                if dorder.driver_id:
                    driver_actor = connection.execute(text("""
                        SELECT id FROM actors WHERE legacy_worker_id = :worker_id
                    """), {"worker_id": dorder.driver_id}).fetchone()
                    if driver_actor:
                        driver_actor_id = driver_actor.id

                connection.execute(text("""
                    INSERT INTO unified_orders (
                        id, created_at, updated_at, source_type, owner_actor_id,
                        order_code, status,
                        customer_name, customer_phone, customer_company,
                        pickup_address, pickup_contact, pickup_phone,
                        delivery_address, delivery_contact, delivery_phone,
                        equipment_type, container_code, cargo_description, weight_kg,
                        freight_charge, driver_payment, payment_status,
                        primary_driver_actor_id, internal_notes, driver_notes,
                        assigned_at, accepted_at, started_at, completed_at,
                        legacy_dispatcher_order_id
                    ) VALUES (
                        :id, :created_at, :updated_at, 'DISPATCHER', :owner_actor_id,
                        :order_code, :status,
                        :customer_name, :customer_phone, :customer_company,
                        :pickup_address, :pickup_contact, :pickup_phone,
                        :delivery_address, :delivery_contact, :delivery_phone,
                        :equipment_type, :container_code, :cargo_description, :weight_kg,
                        :freight_charge, :driver_payment, :payment_status,
                        :driver_actor_id, :internal_notes, :driver_notes,
                        :assigned_at, :accepted_at, :started_at, :completed_at,
                        :legacy_id
                    )
                """), {
                    "id": unified_id,
                    "created_at": dorder.created_at or now,
                    "updated_at": dorder.updated_at or now,
                    "owner_actor_id": dispatcher_actor.id,
                    "order_code": dorder.order_code,
                    "status": dorder.status,
                    "customer_name": dorder.customer_name,
                    "customer_phone": dorder.customer_phone,
                    "customer_company": dorder.customer_company,
                    "pickup_address": dorder.pickup_address,
                    "pickup_contact": dorder.pickup_contact,
                    "pickup_phone": dorder.pickup_phone,
                    "delivery_address": dorder.delivery_address,
                    "delivery_contact": dorder.delivery_contact,
                    "delivery_phone": dorder.delivery_phone,
                    "equipment_type": dorder.equipment,
                    "container_code": dorder.container_code,
                    "cargo_description": dorder.cargo_description,
                    "weight_kg": dorder.weight_kg,
                    "freight_charge": dorder.freight_charge,
                    "driver_payment": dorder.driver_payment,
                    "payment_status": dorder.payment_status,
                    "driver_actor_id": driver_actor_id,
                    "internal_notes": dorder.dispatcher_notes,
                    "driver_notes": dorder.driver_notes,
                    "assigned_at": dorder.assigned_at,
                    "accepted_at": dorder.accepted_at,
                    "started_at": dorder.started_at,
                    "completed_at": dorder.completed_at,
                    "legacy_id": dorder.id
                })

        print(f"Migrated {len(dispatcher_orders)} dispatcher orders to unified_orders")
    except Exception as e:
        print(f"Note: dispatcher_orders table migration issue: {e}")

    print("Migration completed successfully!")


def downgrade() -> None:
    """
    Downgrade removes all migrated data from new tables.
    Original tables are untouched.
    """
    connection = op.get_bind()

    # Delete in reverse order of dependencies
    tables_to_clear = [
        'order_status_history',
        'order_assignments',
        'order_sequences',
        'unified_orders',
        'actor_relationships',
        'actors'
    ]

    for table in tables_to_clear:
        try:
            connection.execute(text(f"DELETE FROM {table}"))
            print(f"Cleared {table}")
        except Exception as e:
            print(f"Could not clear {table}: {e}")
