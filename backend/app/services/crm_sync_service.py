"""
CRM Sync Service
Synchronize data from CRM Account to TMS Customer
"""
from typing import Optional
from datetime import datetime
from sqlmodel import Session, select
from sqlalchemy import and_
import logging

from app.models.customer import Customer
from app.models.customer_address import CustomerAddress, AddressType
from app.models.customer_bank_account import CustomerBankAccount
from app.models.customer_contact import CustomerContact, ContactType
from app.models.crm.account import Account
from app.models.crm.contact import Contact


class CRMSyncService:
    """Service to sync data from CRM Account to TMS Customer"""

    def __init__(self, session: Session):
        self.session = session

    def get_linked_tms_customer(self, account_id: str) -> Optional[Customer]:
        """Get the TMS Customer linked to a CRM Account"""
        account = self.session.get(Account, account_id)
        if not account or not account.tms_customer_id:
            return None
        return self.session.get(Customer, account.tms_customer_id)

    def sync_crm_to_tms(self, account_id: str) -> bool:
        """
        Sync CRM Account data to linked TMS Customer.
        Called after any changes to CRM Account.

        Returns True if sync was successful, False if no TMS customer linked.
        """
        account = self.session.get(Account, account_id)
        if not account:
            return False

        tms_customer = self.get_linked_tms_customer(account_id)
        if not tms_customer:
            return False

        # Sync basic fields
        self._sync_basic_fields(account, tms_customer)

        # Sync bank account if CRM has bank info
        if account.bank_name or account.bank_account:
            self._sync_bank_to_tms(account, tms_customer)

        # Sync CRM Contacts to TMS CustomerContacts
        self._sync_contacts_to_tms(account, tms_customer)

        self.session.commit()
        return True

    def _sync_basic_fields(self, account: Account, customer: Customer):
        """Sync basic fields from CRM Account to TMS Customer"""
        # Only sync if field is set in CRM
        if account.name:
            customer.name = account.name
        if account.tax_code:
            customer.tax_code = account.tax_code
        if account.phone:
            customer.phone = account.phone
        if account.fax:
            customer.fax = account.fax
        if account.email:
            customer.email = account.email
        if account.website:
            customer.website = account.website
        if account.address:
            customer.address = account.address
        if account.city:
            customer.city = account.city
        if account.country:
            customer.country = account.country
        if account.payment_terms:
            customer.payment_terms = account.payment_terms
        if account.credit_limit:
            customer.credit_limit = account.credit_limit
        if account.credit_days:
            customer.credit_days = account.credit_days
        if account.industry:
            customer.industry = account.industry
        if account.source:
            customer.source = account.source
        if account.assigned_to:
            customer.assigned_to = account.assigned_to
        if account.notes:
            customer.notes = account.notes

        self.session.add(customer)

    def _sync_bank_to_tms(self, account: Account, customer: Customer):
        """
        Sync CRM Account bank info to TMS CustomerBankAccount.
        Creates or updates a bank account record.
        """
        tenant_id = str(account.tenant_id)

        # Find existing bank account from CRM sync (by bank_name + account_number)
        existing_bank = self.session.exec(
            select(CustomerBankAccount).where(
                and_(
                    CustomerBankAccount.customer_id == customer.id,
                    CustomerBankAccount.tenant_id == tenant_id,
                    CustomerBankAccount.account_number == account.bank_account,
                    CustomerBankAccount.is_active == True
                )
            )
        ).first()

        if existing_bank:
            # Update existing
            existing_bank.bank_name = account.bank_name
            existing_bank.bank_branch = account.bank_branch
            existing_bank.account_holder = account.bank_account_name
            existing_bank.account_id = account.id  # Ensure account_id is set
            self.session.add(existing_bank)
        else:
            # Check if customer has any bank accounts
            any_bank = self.session.exec(
                select(CustomerBankAccount).where(
                    and_(
                        CustomerBankAccount.customer_id == customer.id,
                        CustomerBankAccount.tenant_id == tenant_id,
                        CustomerBankAccount.is_active == True
                    )
                )
            ).first()

            # Create new bank account with both account_id and customer_id
            new_bank = CustomerBankAccount(
                tenant_id=tenant_id,
                account_id=account.id,  # New unified FK
                customer_id=customer.id,  # Backward compatibility
                bank_name=account.bank_name,
                bank_branch=account.bank_branch,
                account_number=account.bank_account,
                account_holder=account.bank_account_name,
                is_primary=any_bank is None,  # Primary if first account
                is_active=True,
            )
            self.session.add(new_bank)

        # Also update legacy fields on Customer
        customer.bank_name = account.bank_name
        customer.bank_branch = account.bank_branch
        customer.bank_account = account.bank_account
        customer.bank_account_name = account.bank_account_name
        self.session.add(customer)

    def _sync_contacts_to_tms(self, account: Account, customer: Customer):
        """
        Sync CRM Contacts to TMS CustomerContacts.
        """
        tenant_id = str(account.tenant_id)

        # Get CRM contacts for this account
        crm_contacts = self.session.exec(
            select(Contact).where(Contact.account_id == account.id)
        ).all()

        # Get existing TMS contacts
        existing_tms_contacts = self.session.exec(
            select(CustomerContact).where(
                and_(
                    CustomerContact.customer_id == customer.id,
                    CustomerContact.tenant_id == tenant_id,
                    CustomerContact.is_active == True
                )
            )
        ).all()
        existing_map = {c.name: c for c in existing_tms_contacts}

        for crm_contact in crm_contacts:
            contact_name = crm_contact.full_name or f"{crm_contact.first_name or ''} {crm_contact.last_name or ''}".strip()
            if not contact_name:
                continue

            tms_contact = existing_map.get(contact_name)

            if tms_contact:
                # Update existing
                tms_contact.title = crm_contact.title
                tms_contact.department = crm_contact.department
                tms_contact.phone = crm_contact.phone
                tms_contact.mobile = crm_contact.mobile
                tms_contact.email = crm_contact.email
                tms_contact.zalo = crm_contact.zalo
                tms_contact.is_primary = crm_contact.is_primary
                tms_contact.is_decision_maker = crm_contact.decision_maker
                tms_contact.notes = crm_contact.notes
                tms_contact.account_id = account.id  # Ensure account_id is set

                # Map CRM flags to contact type
                if crm_contact.is_billing_contact:
                    tms_contact.contact_type = ContactType.BILLING.value
                elif crm_contact.is_shipping_contact:
                    tms_contact.contact_type = ContactType.SHIPPING.value

                self.session.add(tms_contact)
            else:
                # Create new TMS contact with both account_id and customer_id
                contact_type = ContactType.GENERAL.value
                if crm_contact.is_billing_contact:
                    contact_type = ContactType.BILLING.value
                elif crm_contact.is_shipping_contact:
                    contact_type = ContactType.SHIPPING.value

                new_contact = CustomerContact(
                    tenant_id=tenant_id,
                    account_id=account.id,  # New unified FK
                    customer_id=customer.id,  # Backward compatibility
                    name=contact_name,
                    title=crm_contact.title,
                    department=crm_contact.department,
                    phone=crm_contact.phone,
                    mobile=crm_contact.mobile,
                    email=crm_contact.email,
                    zalo=crm_contact.zalo,
                    contact_type=contact_type,
                    is_primary=crm_contact.is_primary,
                    is_decision_maker=crm_contact.decision_maker,
                    notes=crm_contact.notes,
                    is_active=True,
                )
                self.session.add(new_contact)


def sync_crm_to_tms(account_id: str, session: Session) -> bool:
    """
    Convenience function to sync CRM Account to TMS Customer.
    Call this after any changes to CRM Account.

    This function is designed to be non-blocking - if sync fails,
    it logs the error but doesn't raise an exception.
    """
    try:
        service = CRMSyncService(session)
        return service.sync_crm_to_tms(account_id)
    except Exception as e:
        logging.warning(f"Failed to sync CRM account {account_id} to TMS: {str(e)}")
        return False
