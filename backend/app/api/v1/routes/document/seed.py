"""
Document Management - Seed Data API Routes
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from datetime import datetime, timedelta

from app.db.session import get_session
from app.models import User
from app.models.document import (
    Folder, FolderType,
    Document, DocumentStatus, DocumentType,
    DocumentVersion,
    DocumentTag,
    DocumentTemplate, TemplateCategory,
    TemplateField, FieldType,
    ArchivePolicy, ArchiveAction,
)
from app.core.security import get_current_user

router = APIRouter()


@router.post("/seed")
def seed_dms_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Seed Document Management sample data"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)
    user_name = current_user.full_name or current_user.email

    created = {
        "folders": 0,
        "documents": 0,
        "versions": 0,
        "tags": 0,
        "templates": 0,
        "fields": 0,
        "policies": 0,
    }

    # ===================
    # 1. FOLDERS
    # ===================
    folder_data = [
        ("ROOT-COMPANY", "Tài liệu công ty", None, FolderType.GENERAL.value),
        ("ROOT-HR", "Tài liệu nhân sự", None, FolderType.GENERAL.value),
        ("ROOT-FINANCE", "Tài liệu tài chính", None, FolderType.GENERAL.value),
        ("ROOT-CONTRACTS", "Hợp đồng", None, FolderType.GENERAL.value),
        ("ROOT-PROJECTS", "Dự án", None, FolderType.PROJECT.value),
    ]

    folders = {}
    for code, name, parent_code, folder_type in folder_data:
        existing = session.exec(
            select(Folder).where(
                Folder.tenant_id == tenant_id,
                Folder.name == name,
                Folder.parent_id == None
            )
        ).first()

        if not existing:
            folder = Folder(
                tenant_id=tenant_id,
                parent_id=folders.get(parent_code) if parent_code else None,
                name=name,
                path=f"/{name}",
                folder_type=folder_type,
                owner_id=user_id,
                created_by=user_id,
            )
            session.add(folder)
            session.flush()
            folders[code] = folder.id
            created["folders"] += 1
        else:
            folders[code] = existing.id

    # Subfolders
    subfolder_data = [
        ("Quy trình nội bộ", "ROOT-COMPANY"),
        ("Chính sách công ty", "ROOT-COMPANY"),
        ("Hồ sơ nhân viên", "ROOT-HR"),
        ("Bảng lương", "ROOT-HR"),
        ("Hóa đơn", "ROOT-FINANCE"),
        ("Báo cáo tài chính", "ROOT-FINANCE"),
        ("Hợp đồng khách hàng", "ROOT-CONTRACTS"),
        ("Hợp đồng nhà cung cấp", "ROOT-CONTRACTS"),
    ]

    for name, parent_code in subfolder_data:
        parent_id = folders.get(parent_code)
        if parent_id:
            existing = session.exec(
                select(Folder).where(
                    Folder.tenant_id == tenant_id,
                    Folder.name == name,
                    Folder.parent_id == parent_id
                )
            ).first()

            if not existing:
                parent = session.get(Folder, parent_id)
                folder = Folder(
                    tenant_id=tenant_id,
                    parent_id=parent_id,
                    name=name,
                    path=f"{parent.path}/{name}" if parent else f"/{name}",
                    folder_type=FolderType.GENERAL.value,
                    owner_id=user_id,
                    created_by=user_id,
                )
                session.add(folder)
                created["folders"] += 1

    session.flush()

    # ===================
    # 2. DOCUMENTS
    # ===================
    document_data = [
        ("DOC-001", "Nội quy công ty 2024", "ROOT-COMPANY", DocumentType.POLICY.value),
        ("DOC-002", "Quy trình xin nghỉ phép", "ROOT-COMPANY", DocumentType.PROCEDURE.value),
        ("DOC-003", "Hướng dẫn sử dụng hệ thống", "ROOT-COMPANY", DocumentType.MANUAL.value),
        ("DOC-004", "Báo cáo tài chính Q3-2024", "ROOT-FINANCE", DocumentType.REPORT.value),
        ("DOC-005", "Mẫu hợp đồng lao động", "ROOT-HR", DocumentType.TEMPLATE.value),
    ]

    documents = {}
    for code, name, folder_code, doc_type in document_data:
        existing = session.exec(
            select(Document).where(
                Document.tenant_id == tenant_id,
                Document.name == name
            )
        ).first()

        if not existing:
            doc = Document(
                tenant_id=tenant_id,
                folder_id=folders.get(folder_code),
                name=name,
                description=f"Tài liệu: {name}",
                document_type=doc_type,
                status=DocumentStatus.PUBLISHED.value,
                file_name=f"{code}.pdf",
                file_extension="pdf",
                file_size=1024 * 100,  # 100KB
                mime_type="application/pdf",
                owner_id=user_id,
                owner_name=user_name,
                created_by=user_id,
            )
            session.add(doc)
            session.flush()
            documents[code] = doc.id
            created["documents"] += 1

            # Create version
            version = DocumentVersion(
                tenant_id=tenant_id,
                document_id=doc.id,
                version_number=1,
                file_size=1024 * 100,
                is_current=True,
                change_summary="Phiên bản đầu tiên",
                created_by=user_id,
                created_by_name=user_name,
            )
            session.add(version)
            created["versions"] += 1
        else:
            documents[code] = existing.id

    session.flush()

    # ===================
    # 3. TAGS
    # ===================
    tag_data = [
        ("DOC-001", "Quan trọng", "#FF0000"),
        ("DOC-001", "Nội bộ", "#0000FF"),
        ("DOC-002", "HR", "#00FF00"),
        ("DOC-004", "Tài chính", "#FFA500"),
        ("DOC-004", "Q3-2024", "#800080"),
    ]

    for doc_code, tag_name, color in tag_data:
        doc_id = documents.get(doc_code)
        if doc_id:
            existing = session.exec(
                select(DocumentTag).where(
                    DocumentTag.tenant_id == tenant_id,
                    DocumentTag.document_id == doc_id,
                    DocumentTag.tag_name == tag_name
                )
            ).first()

            if not existing:
                tag = DocumentTag(
                    tenant_id=tenant_id,
                    document_id=doc_id,
                    tag_name=tag_name,
                    tag_color=color,
                    created_by=user_id,
                )
                session.add(tag)
                created["tags"] += 1

    # ===================
    # 4. TEMPLATES
    # ===================
    template_data = [
        {
            "code": "TPL-CONTRACT",
            "name": "Hợp đồng lao động",
            "category": TemplateCategory.CONTRACT.value,
            "content_type": "HTML",
            "fields": [
                ("employee_name", "Họ tên nhân viên", FieldType.TEXT.value, True),
                ("employee_id", "Mã nhân viên", FieldType.TEXT.value, True),
                ("position", "Vị trí", FieldType.TEXT.value, True),
                ("department", "Phòng ban", FieldType.TEXT.value, True),
                ("start_date", "Ngày bắt đầu", FieldType.DATE.value, True),
                ("salary", "Mức lương", FieldType.NUMBER.value, True),
            ]
        },
        {
            "code": "TPL-INVOICE",
            "name": "Hóa đơn bán hàng",
            "category": TemplateCategory.INVOICE.value,
            "content_type": "HTML",
            "fields": [
                ("customer_name", "Tên khách hàng", FieldType.TEXT.value, True),
                ("customer_address", "Địa chỉ", FieldType.TEXTAREA.value, False),
                ("invoice_date", "Ngày hóa đơn", FieldType.DATE.value, True),
                ("total_amount", "Tổng tiền", FieldType.NUMBER.value, True),
                ("notes", "Ghi chú", FieldType.TEXTAREA.value, False),
            ]
        },
        {
            "code": "TPL-REPORT",
            "name": "Báo cáo tháng",
            "category": TemplateCategory.REPORT.value,
            "content_type": "HTML",
            "fields": [
                ("report_title", "Tiêu đề báo cáo", FieldType.TEXT.value, True),
                ("report_period", "Kỳ báo cáo", FieldType.TEXT.value, True),
                ("summary", "Tóm tắt", FieldType.RICH_TEXT.value, True),
                ("author", "Người lập", FieldType.TEXT.value, True),
            ]
        },
    ]

    for tmpl_data in template_data:
        existing = session.exec(
            select(DocumentTemplate).where(
                DocumentTemplate.tenant_id == tenant_id,
                DocumentTemplate.code == tmpl_data["code"]
            )
        ).first()

        if not existing:
            template = DocumentTemplate(
                tenant_id=tenant_id,
                code=tmpl_data["code"],
                name=tmpl_data["name"],
                description=f"Mẫu: {tmpl_data['name']}",
                category=tmpl_data["category"],
                content_type=tmpl_data["content_type"],
                is_active=True,
                created_by=user_id,
            )
            session.add(template)
            session.flush()
            created["templates"] += 1

            # Create fields
            for i, (key, label, field_type, required) in enumerate(tmpl_data["fields"]):
                field = TemplateField(
                    tenant_id=tenant_id,
                    template_id=template.id,
                    field_order=i + 1,
                    field_key=key,
                    field_label=label,
                    field_type=field_type,
                    is_required=required,
                )
                session.add(field)
                created["fields"] += 1

    # ===================
    # 5. ARCHIVE POLICIES
    # ===================
    policy_data = [
        {
            "name": "Lưu trữ tài liệu cũ",
            "description": "Lưu trữ tài liệu sau 2 năm",
            "retention_days": 730,
            "action": ArchiveAction.ARCHIVE.value,
        },
        {
            "name": "Xóa tài liệu tạm",
            "description": "Xóa tài liệu draft sau 30 ngày",
            "retention_days": 30,
            "action": ArchiveAction.DELETE.value,
        },
        {
            "name": "Thông báo tài liệu sắp hết hạn",
            "description": "Thông báo trước 30 ngày khi tài liệu sắp hết hạn",
            "retention_days": 365,
            "action": ArchiveAction.NOTIFY.value,
            "notify_before_days": 30,
        },
    ]

    for pol_data in policy_data:
        existing = session.exec(
            select(ArchivePolicy).where(
                ArchivePolicy.tenant_id == tenant_id,
                ArchivePolicy.name == pol_data["name"]
            )
        ).first()

        if not existing:
            policy = ArchivePolicy(
                tenant_id=tenant_id,
                name=pol_data["name"],
                description=pol_data["description"],
                is_active=True,
                retention_days=pol_data["retention_days"],
                action=pol_data["action"],
                notify_before_days=pol_data.get("notify_before_days", 30),
                created_by=user_id,
            )
            session.add(policy)
            created["policies"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Document Management sample data created successfully",
        "created": created,
    }


@router.delete("/dms/seed")
def delete_dms_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete all Document Management sample data"""
    tenant_id = str(current_user.tenant_id)

    deleted = {
        "policies": 0,
        "fields": 0,
        "templates": 0,
        "tags": 0,
        "versions": 0,
        "documents": 0,
        "folders": 0,
    }

    from app.models.document import (
        ArchivePolicy, ArchivedDocument, DocumentRetention,
        TemplateField, DocumentTemplate, GeneratedDocument,
        DocumentTag, DocumentComment, DocumentVersion, Document,
        ShareLink, DocumentShare,
        FolderPermission, Folder,
    )

    # Delete in order (respecting foreign keys)
    policies = session.exec(select(ArchivePolicy).where(ArchivePolicy.tenant_id == tenant_id)).all()
    for item in policies:
        session.delete(item)
        deleted["policies"] += 1

    fields = session.exec(select(TemplateField).where(TemplateField.tenant_id == tenant_id)).all()
    for item in fields:
        session.delete(item)
        deleted["fields"] += 1

    templates = session.exec(select(DocumentTemplate).where(DocumentTemplate.tenant_id == tenant_id)).all()
    for item in templates:
        session.delete(item)
        deleted["templates"] += 1

    tags = session.exec(select(DocumentTag).where(DocumentTag.tenant_id == tenant_id)).all()
    for item in tags:
        session.delete(item)
        deleted["tags"] += 1

    versions = session.exec(select(DocumentVersion).where(DocumentVersion.tenant_id == tenant_id)).all()
    for item in versions:
        session.delete(item)
        deleted["versions"] += 1

    documents = session.exec(select(Document).where(Document.tenant_id == tenant_id)).all()
    for item in documents:
        session.delete(item)
        deleted["documents"] += 1

    folders = session.exec(select(Folder).where(Folder.tenant_id == tenant_id)).all()
    for item in folders:
        session.delete(item)
        deleted["folders"] += 1

    session.commit()

    return {
        "success": True,
        "message": "Document Management data deleted successfully",
        "deleted": deleted,
    }
