"""
FMS Document API Routes
Quản lý chứng từ lô hàng
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from app.db.session import get_session
from app.models.fms import FMSDocument, FMSDocumentType, FMSShipment
from app.models import User
from app.core.security import get_current_user

router = APIRouter(prefix="/documents", tags=["FMS Documents"])


class DocumentCreate(BaseModel):
    shipment_id: str
    document_type: str
    document_no: Optional[str] = None
    document_name: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    issue_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    issued_by: Optional[str] = None
    remarks: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    shipment_id: str
    document_type: str
    document_no: Optional[str]
    document_name: str
    description: Optional[str]
    file_path: Optional[str]
    file_name: Optional[str]
    file_size: Optional[int]
    mime_type: Optional[str]
    issue_date: Optional[datetime]
    expiry_date: Optional[datetime]
    issued_by: Optional[str]
    is_verified: bool
    verified_at: Optional[datetime]
    verified_by: Optional[str]
    remarks: Optional[str]
    created_at: datetime


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int


@router.get("/shipment/{shipment_id}", response_model=DocumentListResponse)
def get_shipment_documents(
    shipment_id: str,
    document_type: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get documents for a shipment"""
    tenant_id = str(current_user.tenant_id)

    # Verify shipment
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    query = select(FMSDocument).where(
        FMSDocument.shipment_id == shipment_id,
        FMSDocument.is_deleted == False,
    )

    if document_type:
        query = query.where(FMSDocument.document_type == document_type)

    query = query.order_by(FMSDocument.created_at.desc())
    documents = session.exec(query).all()

    return DocumentListResponse(
        items=[DocumentResponse(
            id=d.id,
            shipment_id=d.shipment_id,
            document_type=d.document_type,
            document_no=d.document_no,
            document_name=d.document_name,
            description=d.description,
            file_path=d.file_path,
            file_name=d.file_name,
            file_size=d.file_size,
            mime_type=d.mime_type,
            issue_date=d.issue_date,
            expiry_date=d.expiry_date,
            issued_by=d.issued_by,
            is_verified=d.is_verified,
            verified_at=d.verified_at,
            verified_by=d.verified_by,
            remarks=d.remarks,
            created_at=d.created_at,
        ) for d in documents],
        total=len(documents),
    )


@router.post("", response_model=DocumentResponse)
def create_document(
    payload: DocumentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a document record"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    # Verify shipment
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == payload.shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    document = FMSDocument(
        tenant_id=tenant_id,
        created_by=user_id,
        **payload.model_dump()
    )

    session.add(document)
    session.commit()
    session.refresh(document)

    return DocumentResponse(
        id=document.id,
        shipment_id=document.shipment_id,
        document_type=document.document_type,
        document_no=document.document_no,
        document_name=document.document_name,
        description=document.description,
        file_path=document.file_path,
        file_name=document.file_name,
        file_size=document.file_size,
        mime_type=document.mime_type,
        issue_date=document.issue_date,
        expiry_date=document.expiry_date,
        issued_by=document.issued_by,
        is_verified=document.is_verified,
        verified_at=document.verified_at,
        verified_by=document.verified_by,
        remarks=document.remarks,
        created_at=document.created_at,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document by ID"""
    tenant_id = str(current_user.tenant_id)

    document = session.exec(
        select(FMSDocument).where(
            FMSDocument.id == document_id,
            FMSDocument.tenant_id == tenant_id,
            FMSDocument.is_deleted == False,
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=document.id,
        shipment_id=document.shipment_id,
        document_type=document.document_type,
        document_no=document.document_no,
        document_name=document.document_name,
        description=document.description,
        file_path=document.file_path,
        file_name=document.file_name,
        file_size=document.file_size,
        mime_type=document.mime_type,
        issue_date=document.issue_date,
        expiry_date=document.expiry_date,
        issued_by=document.issued_by,
        is_verified=document.is_verified,
        verified_at=document.verified_at,
        verified_by=document.verified_by,
        remarks=document.remarks,
        created_at=document.created_at,
    )


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: str,
    payload: DocumentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    document = session.exec(
        select(FMSDocument).where(
            FMSDocument.id == document_id,
            FMSDocument.tenant_id == tenant_id,
            FMSDocument.is_deleted == False,
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(document, key, value)

    document.updated_at = datetime.utcnow()
    document.updated_by = user_id

    session.add(document)
    session.commit()
    session.refresh(document)

    return DocumentResponse(
        id=document.id,
        shipment_id=document.shipment_id,
        document_type=document.document_type,
        document_no=document.document_no,
        document_name=document.document_name,
        description=document.description,
        file_path=document.file_path,
        file_name=document.file_name,
        file_size=document.file_size,
        mime_type=document.mime_type,
        issue_date=document.issue_date,
        expiry_date=document.expiry_date,
        issued_by=document.issued_by,
        is_verified=document.is_verified,
        verified_at=document.verified_at,
        verified_by=document.verified_by,
        remarks=document.remarks,
        created_at=document.created_at,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    document = session.exec(
        select(FMSDocument).where(
            FMSDocument.id == document_id,
            FMSDocument.tenant_id == tenant_id,
            FMSDocument.is_deleted == False,
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_deleted = True
    document.deleted_at = datetime.utcnow()
    document.deleted_by = user_id

    session.add(document)
    session.commit()

    return {"message": "Document deleted"}


@router.post("/{document_id}/verify")
def verify_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Verify a document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    document = session.exec(
        select(FMSDocument).where(
            FMSDocument.id == document_id,
            FMSDocument.tenant_id == tenant_id,
            FMSDocument.is_deleted == False,
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_verified = True
    document.verified_at = datetime.utcnow()
    document.verified_by = user_id
    document.updated_at = datetime.utcnow()
    document.updated_by = user_id

    session.add(document)
    session.commit()

    return {"message": "Document verified"}


@router.post("/{document_id}/unverify")
def unverify_document(
    document_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove verification from a document"""
    tenant_id = str(current_user.tenant_id)
    user_id = str(current_user.id)

    document = session.exec(
        select(FMSDocument).where(
            FMSDocument.id == document_id,
            FMSDocument.tenant_id == tenant_id,
            FMSDocument.is_deleted == False,
        )
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_verified = False
    document.verified_at = None
    document.verified_by = None
    document.updated_at = datetime.utcnow()
    document.updated_by = user_id

    session.add(document)
    session.commit()

    return {"message": "Document verification removed"}


@router.get("/types/list")
def get_document_types():
    """Get list of document types"""
    return [{"value": t.value, "label": t.value.replace("_", " ").title()} for t in FMSDocumentType]


@router.get("/checklist/{shipment_id}")
def get_document_checklist(
    shipment_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get document checklist for a shipment"""
    tenant_id = str(current_user.tenant_id)

    # Verify shipment
    shipment = session.exec(
        select(FMSShipment).where(
            FMSShipment.id == shipment_id,
            FMSShipment.tenant_id == tenant_id,
        )
    ).first()

    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    # Get existing documents
    existing_docs = session.exec(
        select(FMSDocument.document_type).where(
            FMSDocument.shipment_id == shipment_id,
            FMSDocument.is_deleted == False,
        )
    ).all()

    existing_types = set(existing_docs)

    # Determine required documents based on shipment type
    required_docs = []

    # Common documents
    common_docs = [
        FMSDocumentType.COMMERCIAL_INVOICE,
        FMSDocumentType.PACKING_LIST,
    ]

    # Sea freight documents
    sea_docs = [
        FMSDocumentType.BILL_OF_LADING,
        FMSDocumentType.HOUSE_BL,
        FMSDocumentType.SHIPPING_ORDER,
        FMSDocumentType.CONTAINER_LIST,
    ]

    # Air freight documents
    air_docs = [
        FMSDocumentType.AIR_WAYBILL,
        FMSDocumentType.HOUSE_AWB,
        FMSDocumentType.SHIPPER_LETTER,
    ]

    # Import documents
    import_docs = [
        FMSDocumentType.CUSTOMS_DECLARATION,
        FMSDocumentType.IMPORT_LICENSE,
        FMSDocumentType.ARRIVAL_NOTICE,
        FMSDocumentType.DELIVERY_ORDER,
    ]

    # Export documents
    export_docs = [
        FMSDocumentType.CUSTOMS_DECLARATION,
        FMSDocumentType.EXPORT_LICENSE,
        FMSDocumentType.CERTIFICATE_OF_ORIGIN,
        FMSDocumentType.BOOKING_CONFIRMATION,
    ]

    # Build required list based on shipment
    required_docs.extend(common_docs)

    if shipment.shipment_mode in ['SEA_FCL', 'SEA_LCL', 'SEA_BULK']:
        required_docs.extend(sea_docs)
    elif shipment.shipment_mode == 'AIR':
        required_docs.extend(air_docs)

    if shipment.shipment_type == 'IMPORT':
        required_docs.extend(import_docs)
    elif shipment.shipment_type == 'EXPORT':
        required_docs.extend(export_docs)

    # Build checklist
    checklist = []
    for doc_type in required_docs:
        checklist.append({
            "document_type": doc_type.value,
            "label": doc_type.value.replace("_", " ").title(),
            "required": True,
            "uploaded": doc_type.value in existing_types,
        })

    # Add other uploaded documents
    for doc_type in existing_types:
        if doc_type not in [d.value for d in required_docs]:
            checklist.append({
                "document_type": doc_type,
                "label": doc_type.replace("_", " ").title(),
                "required": False,
                "uploaded": True,
            })

    return {
        "shipment_id": shipment_id,
        "shipment_no": shipment.shipment_no,
        "checklist": checklist,
        "total_required": len([c for c in checklist if c["required"]]),
        "total_uploaded": len([c for c in checklist if c["uploaded"]]),
        "completion_rate": round(
            len([c for c in checklist if c["required"] and c["uploaded"]]) /
            max(1, len([c for c in checklist if c["required"]])) * 100, 1
        ),
    }
