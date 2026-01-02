"""
Accounting - Bank Account & Transaction API Routes
Quản lý tài khoản ngân hàng và giao dịch
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func, or_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.db.session import get_session
from app.models import User
from app.models.accounting import (
    BankAccount, BankAccountType, BankAccountStatus,
    BankTransaction, TransactionType, TransactionStatus,
    BankStatement, BankStatementLine, BankReconciliation, ReconciliationStatus,
    BankTransfer, CashCount, ChartOfAccounts
)
from app.core.security import get_current_user

router = APIRouter()


# =====================
# PYDANTIC SCHEMAS
# =====================

class BankAccountCreate(BaseModel):
    account_number: str
    account_name: str
    bank_name: str
    bank_code: Optional[str] = None
    branch_name: Optional[str] = None
    swift_code: Optional[str] = None
    account_type: str = BankAccountType.CURRENT.value
    currency: str = "VND"
    gl_account_id: Optional[str] = None
    opening_balance: Decimal = Decimal("0")
    notes: Optional[str] = None


class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    branch_name: Optional[str] = None
    swift_code: Optional[str] = None
    status: Optional[str] = None
    gl_account_id: Optional[str] = None
    notes: Optional[str] = None


class BankTransactionCreate(BaseModel):
    bank_account_id: str
    transaction_date: datetime
    transaction_type: str  # DEPOSIT, WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT, FEE, INTEREST
    amount: Decimal
    reference: Optional[str] = None
    description: str
    partner_name: Optional[str] = None
    partner_account: Optional[str] = None
    partner_bank: Optional[str] = None
    notes: Optional[str] = None


class BankTransferCreate(BaseModel):
    from_account_id: str
    to_account_id: str
    transfer_date: datetime
    amount: Decimal
    fee: Decimal = Decimal("0")
    reference: Optional[str] = None
    description: str
    notes: Optional[str] = None


class CashCountCreate(BaseModel):
    count_date: datetime
    cashier_id: Optional[str] = None
    denomination_500000: int = 0
    denomination_200000: int = 0
    denomination_100000: int = 0
    denomination_50000: int = 0
    denomination_20000: int = 0
    denomination_10000: int = 0
    denomination_5000: int = 0
    denomination_2000: int = 0
    denomination_1000: int = 0
    denomination_500: int = 0
    denomination_200: int = 0
    denomination_100: int = 0
    notes: Optional[str] = None


# =====================
# BANK ACCOUNTS
# =====================

@router.get("/bank-accounts")
def list_bank_accounts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    account_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
):
    """List all bank accounts"""
    tenant_id = str(current_user.tenant_id)

    query = select(BankAccount).where(BankAccount.tenant_id == tenant_id)

    if account_type:
        query = query.where(BankAccount.account_type == account_type)

    if status:
        query = query.where(BankAccount.status == status)

    if currency:
        query = query.where(BankAccount.currency == currency)

    query = query.order_by(BankAccount.bank_name, BankAccount.account_number)

    accounts = session.exec(query).all()

    return {"items": [acc.model_dump() for acc in accounts]}


@router.post("/bank-accounts")
def create_bank_account(
    payload: BankAccountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new bank account"""
    tenant_id = str(current_user.tenant_id)

    # Check unique account number
    existing = session.exec(
        select(BankAccount).where(
            BankAccount.tenant_id == tenant_id,
            BankAccount.account_number == payload.account_number
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Account number '{payload.account_number}' already exists")

    # Validate GL account if provided
    if payload.gl_account_id:
        gl_account = session.get(ChartOfAccounts, payload.gl_account_id)
        if not gl_account or str(gl_account.tenant_id) != tenant_id:
            raise HTTPException(400, "Invalid gl_account_id")

    account = BankAccount(
        tenant_id=tenant_id,
        **payload.model_dump(),
        current_balance=payload.opening_balance,
        status=BankAccountStatus.ACTIVE.value,
        created_by=str(current_user.id),
    )

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


@router.get("/bank-accounts/{account_id}")
def get_bank_account(
    account_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get bank account by ID with recent transactions"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(BankAccount, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Bank account not found")

    # Get recent transactions
    transactions = session.exec(
        select(BankTransaction)
        .where(BankTransaction.bank_account_id == account_id)
        .order_by(BankTransaction.transaction_date.desc())
        .limit(10)
    ).all()

    return {
        **account.model_dump(),
        "recent_transactions": [t.model_dump() for t in transactions]
    }


@router.put("/bank-accounts/{account_id}")
def update_bank_account(
    account_id: str,
    payload: BankAccountUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a bank account"""
    tenant_id = str(current_user.tenant_id)

    account = session.get(BankAccount, account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(404, "Bank account not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(account, key, value)

    account.updated_at = datetime.utcnow()

    session.add(account)
    session.commit()
    session.refresh(account)

    return account


# =====================
# BANK TRANSACTIONS
# =====================

@router.get("/bank-transactions")
def list_bank_transactions(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    bank_account_id: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    search: Optional[str] = Query(None),
):
    """List bank transactions with pagination"""
    tenant_id = str(current_user.tenant_id)

    query = select(BankTransaction).where(BankTransaction.tenant_id == tenant_id)

    if bank_account_id:
        query = query.where(BankTransaction.bank_account_id == bank_account_id)

    if transaction_type:
        query = query.where(BankTransaction.transaction_type == transaction_type)

    if status:
        query = query.where(BankTransaction.status == status)

    if date_from:
        query = query.where(BankTransaction.transaction_date >= date_from)

    if date_to:
        query = query.where(BankTransaction.transaction_date <= date_to)

    if search:
        search_filter = or_(
            BankTransaction.reference.ilike(f"%{search}%"),
            BankTransaction.description.ilike(f"%{search}%"),
            BankTransaction.partner_name.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(BankTransaction.transaction_date.desc())
    query = query.offset(offset).limit(page_size)

    transactions = session.exec(query).all()

    return {
        "items": [t.model_dump() for t in transactions],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/bank-transactions")
def create_bank_transaction(
    payload: BankTransactionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a bank transaction"""
    tenant_id = str(current_user.tenant_id)

    # Validate bank account
    account = session.get(BankAccount, payload.bank_account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid bank_account_id")

    if account.status != BankAccountStatus.ACTIVE.value:
        raise HTTPException(400, "Bank account is not active")

    # Determine if debit or credit based on transaction type
    is_debit = payload.transaction_type in [
        TransactionType.WITHDRAWAL.value,
        TransactionType.TRANSFER_OUT.value,
        TransactionType.FEE.value,
    ]

    # Calculate running balance
    running_balance = account.current_balance
    if is_debit:
        running_balance -= payload.amount
    else:
        running_balance += payload.amount

    transaction = BankTransaction(
        tenant_id=tenant_id,
        **payload.model_dump(),
        running_balance=running_balance,
        status=TransactionStatus.PENDING.value,
        created_by=str(current_user.id),
    )

    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return transaction


@router.post("/bank-transactions/{transaction_id}/confirm")
def confirm_bank_transaction(
    transaction_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm a pending bank transaction and update balance"""
    tenant_id = str(current_user.tenant_id)

    transaction = session.get(BankTransaction, transaction_id)
    if not transaction or str(transaction.tenant_id) != tenant_id:
        raise HTTPException(404, "Transaction not found")

    if transaction.status != TransactionStatus.PENDING.value:
        raise HTTPException(400, f"Cannot confirm transaction with status {transaction.status}")

    account = session.get(BankAccount, transaction.bank_account_id)
    if not account:
        raise HTTPException(400, "Bank account not found")

    # Update balance
    is_debit = transaction.transaction_type in [
        TransactionType.WITHDRAWAL.value,
        TransactionType.TRANSFER_OUT.value,
        TransactionType.FEE.value,
    ]

    if is_debit:
        account.current_balance -= transaction.amount
    else:
        account.current_balance += transaction.amount

    account.last_transaction_date = transaction.transaction_date
    account.updated_at = datetime.utcnow()

    # Update transaction
    transaction.running_balance = account.current_balance
    transaction.status = TransactionStatus.CONFIRMED.value
    transaction.confirmed_at = datetime.utcnow()
    transaction.confirmed_by = str(current_user.id)
    transaction.updated_at = datetime.utcnow()

    session.add(account)
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return {"success": True, "transaction": transaction.model_dump()}


# =====================
# BANK TRANSFERS
# =====================

@router.post("/bank-transfers")
def create_bank_transfer(
    payload: BankTransferCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create an internal bank transfer"""
    tenant_id = str(current_user.tenant_id)

    # Validate accounts
    from_account = session.get(BankAccount, payload.from_account_id)
    to_account = session.get(BankAccount, payload.to_account_id)

    if not from_account or str(from_account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid from_account_id")

    if not to_account or str(to_account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid to_account_id")

    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(400, "Cannot transfer to the same account")

    if from_account.current_balance < (payload.amount + payload.fee):
        raise HTTPException(400, "Insufficient balance")

    # Create transfer record
    transfer = BankTransfer(
        tenant_id=tenant_id,
        from_account_id=payload.from_account_id,
        to_account_id=payload.to_account_id,
        transfer_date=payload.transfer_date,
        amount=payload.amount,
        fee=payload.fee,
        from_currency=from_account.currency,
        to_currency=to_account.currency,
        exchange_rate=Decimal("1"),  # TODO: lookup rate for cross-currency
        reference=payload.reference,
        description=payload.description,
        status="PENDING",
        notes=payload.notes,
        created_by=str(current_user.id),
    )

    session.add(transfer)
    session.flush()

    # Create outgoing transaction
    out_txn = BankTransaction(
        tenant_id=tenant_id,
        bank_account_id=payload.from_account_id,
        transaction_date=payload.transfer_date,
        transaction_type=TransactionType.TRANSFER_OUT.value,
        amount=payload.amount + payload.fee,
        reference=payload.reference,
        description=f"Chuyển tiền: {payload.description}",
        partner_name=to_account.bank_name,
        partner_account=to_account.account_number,
        running_balance=from_account.current_balance - (payload.amount + payload.fee),
        status=TransactionStatus.PENDING.value,
        bank_transfer_id=transfer.id,
        created_by=str(current_user.id),
    )

    # Create incoming transaction
    in_txn = BankTransaction(
        tenant_id=tenant_id,
        bank_account_id=payload.to_account_id,
        transaction_date=payload.transfer_date,
        transaction_type=TransactionType.TRANSFER_IN.value,
        amount=payload.amount,
        reference=payload.reference,
        description=f"Nhận tiền: {payload.description}",
        partner_name=from_account.bank_name,
        partner_account=from_account.account_number,
        running_balance=to_account.current_balance + payload.amount,
        status=TransactionStatus.PENDING.value,
        bank_transfer_id=transfer.id,
        created_by=str(current_user.id),
    )

    session.add(out_txn)
    session.add(in_txn)

    transfer.out_transaction_id = out_txn.id
    transfer.in_transaction_id = in_txn.id
    session.add(transfer)

    session.commit()
    session.refresh(transfer)

    return transfer


@router.post("/bank-transfers/{transfer_id}/confirm")
def confirm_bank_transfer(
    transfer_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Confirm a bank transfer"""
    tenant_id = str(current_user.tenant_id)

    transfer = session.get(BankTransfer, transfer_id)
    if not transfer or str(transfer.tenant_id) != tenant_id:
        raise HTTPException(404, "Transfer not found")

    if transfer.status != "PENDING":
        raise HTTPException(400, f"Cannot confirm transfer with status {transfer.status}")

    # Update balances
    from_account = session.get(BankAccount, transfer.from_account_id)
    to_account = session.get(BankAccount, transfer.to_account_id)

    from_account.current_balance -= (transfer.amount + transfer.fee)
    from_account.last_transaction_date = transfer.transfer_date
    from_account.updated_at = datetime.utcnow()

    to_account.current_balance += transfer.amount
    to_account.last_transaction_date = transfer.transfer_date
    to_account.updated_at = datetime.utcnow()

    # Confirm transactions
    out_txn = session.get(BankTransaction, transfer.out_transaction_id)
    in_txn = session.get(BankTransaction, transfer.in_transaction_id)

    if out_txn:
        out_txn.status = TransactionStatus.CONFIRMED.value
        out_txn.confirmed_at = datetime.utcnow()
        out_txn.confirmed_by = str(current_user.id)
        out_txn.running_balance = from_account.current_balance
        session.add(out_txn)

    if in_txn:
        in_txn.status = TransactionStatus.CONFIRMED.value
        in_txn.confirmed_at = datetime.utcnow()
        in_txn.confirmed_by = str(current_user.id)
        in_txn.running_balance = to_account.current_balance
        session.add(in_txn)

    transfer.status = "COMPLETED"
    transfer.completed_at = datetime.utcnow()
    transfer.updated_at = datetime.utcnow()

    session.add(from_account)
    session.add(to_account)
    session.add(transfer)
    session.commit()
    session.refresh(transfer)

    return {"success": True, "transfer": transfer.model_dump()}


# =====================
# CASH COUNT
# =====================

@router.get("/cash-counts")
def list_cash_counts(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List cash counts"""
    tenant_id = str(current_user.tenant_id)

    query = select(CashCount).where(CashCount.tenant_id == tenant_id)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(CashCount.count_date.desc())
    query = query.offset(offset).limit(page_size)

    counts = session.exec(query).all()

    return {
        "items": [c.model_dump() for c in counts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.post("/cash-counts")
def create_cash_count(
    payload: CashCountCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new cash count"""
    tenant_id = str(current_user.tenant_id)

    # Calculate total from denominations
    total = (
        payload.denomination_500000 * 500000 +
        payload.denomination_200000 * 200000 +
        payload.denomination_100000 * 100000 +
        payload.denomination_50000 * 50000 +
        payload.denomination_20000 * 20000 +
        payload.denomination_10000 * 10000 +
        payload.denomination_5000 * 5000 +
        payload.denomination_2000 * 2000 +
        payload.denomination_1000 * 1000 +
        payload.denomination_500 * 500 +
        payload.denomination_200 * 200 +
        payload.denomination_100 * 100
    )

    cash_count = CashCount(
        tenant_id=tenant_id,
        **payload.model_dump(),
        counted_amount=Decimal(str(total)),
        created_by=str(current_user.id),
    )

    session.add(cash_count)
    session.commit()
    session.refresh(cash_count)

    return cash_count


# =====================
# BANK RECONCILIATION
# =====================

@router.get("/bank-reconciliations")
def list_reconciliations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    bank_account_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """List bank reconciliations"""
    tenant_id = str(current_user.tenant_id)

    query = select(BankReconciliation).where(BankReconciliation.tenant_id == tenant_id)

    if bank_account_id:
        query = query.where(BankReconciliation.bank_account_id == bank_account_id)

    if status:
        query = query.where(BankReconciliation.status == status)

    query = query.order_by(BankReconciliation.reconciliation_date.desc())

    reconciliations = session.exec(query).all()

    return {"items": [r.model_dump() for r in reconciliations]}


@router.post("/bank-reconciliations")
def create_reconciliation(
    bank_account_id: str,
    statement_ending_balance: Decimal,
    reconciliation_date: datetime,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Start a new bank reconciliation"""
    tenant_id = str(current_user.tenant_id)

    # Validate bank account
    account = session.get(BankAccount, bank_account_id)
    if not account or str(account.tenant_id) != tenant_id:
        raise HTTPException(400, "Invalid bank_account_id")

    # Get unreconciled transactions
    unreconciled = session.exec(
        select(BankTransaction).where(
            BankTransaction.bank_account_id == bank_account_id,
            BankTransaction.is_reconciled == False,
            BankTransaction.status == TransactionStatus.CONFIRMED.value,
        )
    ).all()

    # Calculate book balance and difference
    book_balance = account.current_balance
    difference = statement_ending_balance - book_balance

    reconciliation = BankReconciliation(
        tenant_id=tenant_id,
        bank_account_id=bank_account_id,
        reconciliation_date=reconciliation_date,
        statement_ending_balance=statement_ending_balance,
        book_balance=book_balance,
        difference=difference,
        unreconciled_count=len(unreconciled),
        status=ReconciliationStatus.IN_PROGRESS.value,
        created_by=str(current_user.id),
    )

    session.add(reconciliation)
    session.commit()
    session.refresh(reconciliation)

    return {
        **reconciliation.model_dump(),
        "unreconciled_transactions": [t.model_dump() for t in unreconciled]
    }


@router.post("/bank-reconciliations/{reconciliation_id}/match")
def match_transactions(
    reconciliation_id: str,
    transaction_ids: List[str],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark transactions as reconciled"""
    tenant_id = str(current_user.tenant_id)

    reconciliation = session.get(BankReconciliation, reconciliation_id)
    if not reconciliation or str(reconciliation.tenant_id) != tenant_id:
        raise HTTPException(404, "Reconciliation not found")

    if reconciliation.status == ReconciliationStatus.COMPLETED.value:
        raise HTTPException(400, "Reconciliation is already completed")

    matched_count = 0
    for txn_id in transaction_ids:
        txn = session.get(BankTransaction, txn_id)
        if txn and str(txn.tenant_id) == tenant_id:
            txn.is_reconciled = True
            txn.reconciliation_id = reconciliation_id
            txn.updated_at = datetime.utcnow()
            session.add(txn)
            matched_count += 1

    # Update reconciliation
    reconciliation.unreconciled_count -= matched_count
    reconciliation.updated_at = datetime.utcnow()
    session.add(reconciliation)

    session.commit()

    return {"success": True, "matched_count": matched_count}


@router.post("/bank-reconciliations/{reconciliation_id}/complete")
def complete_reconciliation(
    reconciliation_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Complete a bank reconciliation"""
    tenant_id = str(current_user.tenant_id)

    reconciliation = session.get(BankReconciliation, reconciliation_id)
    if not reconciliation or str(reconciliation.tenant_id) != tenant_id:
        raise HTTPException(404, "Reconciliation not found")

    if reconciliation.status == ReconciliationStatus.COMPLETED.value:
        raise HTTPException(400, "Reconciliation is already completed")

    # Check if difference is zero
    if reconciliation.difference != Decimal("0"):
        raise HTTPException(400, f"Cannot complete: difference of {reconciliation.difference} remains")

    reconciliation.status = ReconciliationStatus.COMPLETED.value
    reconciliation.completed_at = datetime.utcnow()
    reconciliation.completed_by = str(current_user.id)
    reconciliation.updated_at = datetime.utcnow()

    # Update bank account last reconciled date
    account = session.get(BankAccount, reconciliation.bank_account_id)
    if account:
        account.last_reconciled_date = reconciliation.reconciliation_date
        account.last_reconciled_balance = reconciliation.statement_ending_balance
        account.updated_at = datetime.utcnow()
        session.add(account)

    session.add(reconciliation)
    session.commit()
    session.refresh(reconciliation)

    return {"success": True, "reconciliation": reconciliation.model_dump()}
