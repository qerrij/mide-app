"""initial migration

Revision ID: initial
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Получаем соединение
    connection = op.get_bind()
    
    # Список enum типов для создания
    enum_types = [
        ('userrole', ['OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER', 'ACCOUNTANT']),
        ('reportstatus', ['DRAFT', 'SUBMITTED', 'AWAITING_FIX', 'AWAITING_ACCOUNTANT', 'AWAITING_MANAGER', 'APPROVED', 'REJECTED']),
        ('revisiontype', ['USER', 'GROUP', 'CLUSTER', 'CITY', 'GENERAL']),
        ('revisionstatus', ['REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REJECTED']),
        ('transferstatus', ['REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'ARRIVED', 'CHECKING', 'COMPLETED', 'REJECTED', 'CANCELLED']),
        ('notificationtype', ['REVISION_REQUEST', 'REVISION_COMPLETED', 'REVISION_VERIFIED', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_REJECTED', 'REPORT_ACCOUNTANT', 'INVENTORY_LOW', 'SYSTEM_MESSAGE', 'TRANSFER_REQUEST', 'TRANSFER_APPROVED', 'TRANSFER_IN_TRANSIT', 'TRANSFER_DISCREPANCY', 'TRANSFER_COMPLETED', 'TRANSFER_REJECTED', 'TRANSFER_MANAGER_REQUEST', 'TRANSFER_STATUS', 'REJECTION_REQUEST', 'REJECTION_APPROVED', 'REJECTION_REJECTED', 'OTHER']),
        ('notificationstatus', ['UNREAD', 'READ', 'ARCHIVED']),
        ('rejectionstatus', ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
        ('transferitemstatus', ['EXPECTED', 'RECEIVED', 'MISSING', 'EXCESS', 'REJECTED']),
    ]
    
    # Создаем enum типы если они не существуют
    for enum_name, enum_values in enum_types:
        # Проверяем существует ли тип через текстовый SQL запрос
        result = connection.execute(
            sa.text(f"SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}')")
        ).scalar()
        
        if not result:
            values = "', '".join(enum_values)
            op.execute(f"CREATE TYPE {enum_name} AS ENUM ('{values}')")
            print(f"Создан тип {enum_name}")
        else:
            print(f"Тип {enum_name} уже существует")

    # 2. Создаем таблицу users без внешних ключей
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('telegram', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('role', postgresql.ENUM('OWNER', 'ADMIN', 'SENIOR_SELLER', 'MENTOR', 'SELLER', 'ACCOUNTANT', name='userrole', create_type=False), nullable=False),
        sa.Column('rate', sa.Float(), nullable=True, server_default='0'),
        sa.Column('cluster_id', sa.Integer(), nullable=True),
        sa.Column('group_id', sa.Integer(), nullable=True),
        sa.Column('mentor_id', sa.Integer(), nullable=True),
        sa.Column('senior_seller_id', sa.Integer(), nullable=True),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('_admin_clusters', sa.Text(), nullable=True),
        sa.Column('accountant_user_ids', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # 3. Создаем product_categories
    op.create_table('product_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_product_categories_id'), 'product_categories', ['id'], unique=False)
    op.create_index(op.f('ix_product_categories_name'), 'product_categories', ['name'], unique=True)

    # 4. Создаем clusters (теперь users уже существует)
    op.create_table('clusters',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('senior_seller_id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['senior_seller_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_clusters_id'), 'clusters', ['id'], unique=False)
    op.create_index(op.f('ix_clusters_name'), 'clusters', ['name'], unique=False)

    # 5. Создаем groups
    op.create_table('groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('cluster_id', sa.Integer(), nullable=True),
        sa.Column('senior_seller_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['cluster_id'], ['clusters.id'], ),
        sa.ForeignKeyConstraint(['mentor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['senior_seller_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_groups_id'), 'groups', ['id'], unique=False)
    op.create_index(op.f('ix_groups_name'), 'groups', ['name'], unique=False)

    # 6. Теперь добавляем внешние ключи в users
    op.create_foreign_key('fk_users_cluster_id', 'users', 'clusters', ['cluster_id'], ['id'])
    op.create_foreign_key('fk_users_group_id', 'users', 'groups', ['group_id'], ['id'])
    op.create_foreign_key('fk_users_mentor_id', 'users', 'users', ['mentor_id'], ['id'])
    op.create_foreign_key('fk_users_senior_seller_id', 'users', 'users', ['senior_seller_id'], ['id'])
    op.create_foreign_key('fk_users_admin_id', 'users', 'users', ['admin_id'], ['id'])

    # 6. Создаем остальные таблицы
    op.create_table('company_balance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=False, server_default='0'),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('operation_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('reference_id', sa.Integer(), nullable=True),
        sa.Column('reference_type', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_company_balance_id'), 'company_balance', ['id'], unique=False)

    op.create_table('company_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )
    op.create_index(op.f('ix_company_settings_id'), 'company_settings', ['id'], unique=False)
    op.create_index(op.f('ix_company_settings_key'), 'company_settings', ['key'], unique=True)

    op.create_table('notification_summary',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('unread_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('last_notification_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('sku', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['category_id'], ['product_categories.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku')
    )
    op.create_index(op.f('ix_products_id'), 'products', ['id'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)

    op.create_table('reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('transfer_amount', sa.Float(), nullable=False),
        sa.Column('transfer_photos', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('status', sa.Enum('DRAFT', 'SUBMITTED', 'AWAITING_FIX', 'AWAITING_ACCOUNTANT', 'AWAITING_MANAGER', 'APPROVED', 'REJECTED', name='reportstatus'), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('review_date', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.Column('accountant_amount', sa.Float(), nullable=True),
        sa.Column('accountant_reviewed_by', sa.Integer(), nullable=True),
        sa.Column('accountant_comment', sa.Text(), nullable=True),
        sa.Column('accountant_final_amount', sa.Float(), nullable=True),
        sa.Column('accountant_review_date', sa.DateTime(), nullable=True),
        sa.Column('accountant_status', sa.Enum('DRAFT', 'SUBMITTED', 'AWAITING_FIX', 'AWAITING_ACCOUNTANT', 'AWAITING_MANAGER', 'APPROVED', 'REJECTED', name='reportstatus'), nullable=True),
        sa.Column('was_with_accountant', sa.Boolean(), nullable=True, server_default='false'),
        sa.ForeignKeyConstraint(['accountant_reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['seller_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_id'), 'reports', ['id'], unique=False)
    op.create_index(op.f('ix_reports_seller_id'), 'reports', ['seller_id'], unique=False)

    op.create_table('revisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('requested_by_id', sa.Integer(), nullable=False),
        sa.Column('target_user_id', sa.Integer(), nullable=True),
        sa.Column('target_group_id', sa.Integer(), nullable=True),
        sa.Column('target_cluster_id', sa.Integer(), nullable=True),
        sa.Column('target_city', sa.String(), nullable=True),
        sa.Column('type', sa.Enum('USER', 'GROUP', 'CLUSTER', 'CITY', 'GENERAL', name='revisiontype'), nullable=False),
        sa.Column('status', sa.Enum('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REJECTED', name='revisionstatus'), nullable=False),
        sa.Column('verified_by_id', sa.Integer(), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('verification_comment', sa.Text(), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['requested_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['target_cluster_id'], ['clusters.id'], ),
        sa.ForeignKeyConstraint(['target_group_id'], ['groups.id'], ),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['verified_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revisions_id'), 'revisions', ['id'], unique=False)

    op.create_table('transfers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('from_user_id', sa.Integer(), nullable=False),
        sa.Column('to_user_id', sa.Integer(), nullable=False),
        sa.Column('executor_id', sa.Integer(), nullable=True),
        sa.Column('request_type', sa.String(length=50), nullable=False, server_default='user_request'),
        sa.Column('status', sa.Enum('REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT', 'ARRIVED', 'CHECKING', 'COMPLETED', 'REJECTED', 'CANCELLED', name='transferstatus'), nullable=False),
        sa.Column('files', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('arrival_files', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('discrepancy_files', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('discrepancy_accepted_by_id', sa.Integer(), nullable=True),
        sa.Column('discrepancy_accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('discrepancy_approved_by_id', sa.Integer(), nullable=True),
        sa.Column('discrepancy_approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('arrived_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['discrepancy_accepted_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['discrepancy_approved_by_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['executor_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['from_user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['to_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfers_id'), 'transfers', ['id'], unique=False)

    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('REVISION_REQUEST', 'REVISION_COMPLETED', 'REVISION_VERIFIED', 'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_REJECTED', 'REPORT_ACCOUNTANT', 'INVENTORY_LOW', 'SYSTEM_MESSAGE', 'TRANSFER_REQUEST', 'TRANSFER_APPROVED', 'TRANSFER_IN_TRANSIT', 'TRANSFER_DISCREPANCY', 'TRANSFER_COMPLETED', 'TRANSFER_REJECTED', 'TRANSFER_MANAGER_REQUEST', 'TRANSFER_STATUS', 'REJECTION_REQUEST', 'REJECTION_APPROVED', 'REJECTION_REJECTED', 'OTHER', name='notificationtype'), nullable=False),
        sa.Column('status', sa.Enum('UNREAD', 'READ', 'ARCHIVED', name='notificationstatus'), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('sender_id', sa.Integer(), nullable=True),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notifications_id'), 'notifications', ['id'], unique=False)

    op.create_table('rejections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', name='rejectionstatus'), nullable=True),
        sa.Column('photo_paths', sa.Text(), nullable=True),
        sa.Column('video_paths', sa.Text(), nullable=True),
        sa.Column('total_items', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('total_value', sa.Float(), nullable=True, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rejections_id'), 'rejections', ['id'], unique=False)
    op.create_index(op.f('ix_rejections_user_id'), 'rejections', ['user_id'], unique=False)

    op.create_table('user_inventory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reserved_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_inventory_id'), 'user_inventory', ['id'], unique=False)
    op.create_index(op.f('ix_user_inventory_product_id'), 'user_inventory', ['product_id'], unique=False)
    op.create_index(op.f('ix_user_inventory_user_id'), 'user_inventory', ['user_id'], unique=False)

    op.create_table('rejection_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('rejection_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Float(), nullable=False),
        sa.Column('total_price', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['rejection_id'], ['rejections.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rejection_items_id'), 'rejection_items', ['id'], unique=False)
    op.create_index(op.f('ix_rejection_items_rejection_id'), 'rejection_items', ['rejection_id'], unique=False)

    op.create_table('report_products',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('report_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('sold_amount', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['report_id'], ['reports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_report_products_id'), 'report_products', ['id'], unique=False)

    op.create_table('revision_discrepancies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('revision_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Integer(), nullable=False),
        sa.Column('actual_quantity', sa.Integer(), nullable=False),
        sa.Column('discrepancy', sa.Integer(), nullable=False),
        sa.Column('is_positive', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['revision_id'], ['revisions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_discrepancies_id'), 'revision_discrepancies', ['id'], unique=False)

    op.create_table('revision_fillings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('revision_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'REJECTED', name='revisionstatus'), nullable=False),
        sa.Column('filled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('photos', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('is_completed', sa.Boolean(), nullable=True, server_default='false'),
        sa.ForeignKeyConstraint(['revision_id'], ['revisions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_fillings_id'), 'revision_fillings', ['id'], unique=False)

    op.create_table('transfer_approvals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('approved', sa.Boolean(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('approved_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['transfer_id'], ['transfers.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_approvals_id'), 'transfer_approvals', ['id'], unique=False)

    op.create_table('transfer_discrepancy_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Integer(), nullable=False),
        sa.Column('actual_quantity', sa.Integer(), nullable=False),
        sa.Column('discrepancy', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['transfer_id'], ['transfers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_discrepancy_items_id'), 'transfer_discrepancy_items', ['id'], unique=False)

    op.create_table('transfer_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('expected_quantity', sa.Integer(), nullable=False),
        sa.Column('received_quantity', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('status', sa.Enum('EXPECTED', 'RECEIVED', 'MISSING', 'EXCESS', 'REJECTED', name='transferitemstatus'), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['transfer_id'], ['transfers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_items_id'), 'transfer_items', ['id'], unique=False)

    op.create_table('revision_filling_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filling_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['product_categories.id'], ),
        sa.ForeignKeyConstraint(['filling_id'], ['revision_fillings.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_filling_items_id'), 'revision_filling_items', ['id'], unique=False)


def downgrade() -> None:
    # Удаляем в обратном порядке
    op.drop_table('revision_filling_items')
    op.drop_table('transfer_items')
    op.drop_table('transfer_discrepancy_items')
    op.drop_table('transfer_approvals')
    op.drop_table('revision_fillings')
    op.drop_table('revision_discrepancies')
    op.drop_table('report_products')
    op.drop_table('rejection_items')
    op.drop_table('user_inventory')
    op.drop_table('rejections')
    op.drop_table('notifications')
    op.drop_table('transfers')
    op.drop_table('revisions')
    op.drop_table('reports')
    op.drop_table('products')
    op.drop_table('notification_summary')
    op.drop_table('company_settings')
    op.drop_table('company_balance')
    
    # Удаляем внешние ключи из users
    op.drop_constraint('fk_users_admin_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_senior_seller_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_mentor_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_group_id', 'users', type_='foreignkey')
    op.drop_constraint('fk_users_cluster_id', 'users', type_='foreignkey')
    
    op.drop_table('groups')
    op.drop_table('clusters')
    op.drop_table('product_categories')
    op.drop_table('users')
    
    # Удаляем созданные enum типы
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS reportstatus')
    op.execute('DROP TYPE IF EXISTS revisiontype')
    op.execute('DROP TYPE IF EXISTS revisionstatus')
    op.execute('DROP TYPE IF EXISTS transferstatus')
    op.execute('DROP TYPE IF EXISTS notificationtype')
    op.execute('DROP TYPE IF EXISTS notificationstatus')
    op.execute('DROP TYPE IF EXISTS rejectionstatus')
    op.execute('DROP TYPE IF EXISTS transferitemstatus')