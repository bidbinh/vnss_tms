"""
Customer Sync Service
Synchronize data between TMS Customer and CRM Account
"""
from typing import Optional
from datetime import datetime
from sqlmodel import Session, select
from sqlalchemy import and_

from app.models.customer import Customer
from app.models.customer_address import CustomerAddress, AddressType
from app.models.customer_bank_account import CustomerBankAccount
from app.models.customer_contact import CustomerContact, ContactType
from app.models.crm.account import Account
from app.models.crm.contact import Contact


class CustomerSyncService:
    """Service to sync data between TMS Customer and CRM Account"""

    def __init__(self, session: Session):
        self.session = session

    def get_linked_crm_account(self, customer_id: str) -> Optional[Account]:
        """Get the CRM Account linked to a TMS Customer"""
        customer = self.session.get(Customer, customer_id)
        if not customer or not customer.crm_account_id:
            return None
        return self.session.get(Account, customer.crm_account_id)

    def sync_customer_to_crm(self, customer_id: str) -> bool:
        """
        Sync all customer data to linked CRM Account.
        Called after any changes to customer addresses, bank_accounts, or contacts.

        Returns True if sync was successful, False if no CRM account linked.
        """
        crm_account = self.get_linked_crm_account(customer_id)
        if not crm_account:
            return False

        # Sync each component
        self._sync_addresses_to_crm(customer_id, crm_account)
        self._sync_bank_accounts_to_crm(customer_id, crm_account)
        self._sync_contacts_to_crm(customer_id, crm_account)

        # Update sync timestamp
        crm_account.synced_at = datetime.utcnow().isoformat()
        self.session.add(crm_account)
        self.session.commit()

        return True

    def _sync_addresses_to_crm(self, customer_id: str, crm_account: Account):
        """
        Sync OPERATING address to CRM Account's address field.
        CRM Account only stores one address, so we use the OPERATING type.
        """
        # Find OPERATING address
        statement = select(CustomerAddress).where(
            and_(
                CustomerAddress.customer_id == customer_id,
                CustomerAddress.address_type == AddressType.OPERATING.value,
                CustomerAddress.is_active == True
            )
        )
        operating_address = self.session.exec(statement).first()

        if operating_address:
            # Build full address string
            address_parts = [operating_address.address]
            if operating_address.ward:
                address_parts.append(operating_address.ward)
            if operating_address.district:
                address_parts.append(operating_address.district)

            crm_account.address = ", ".join(filter(None, address_parts))
            crm_account.city = operating_address.city
            crm_account.country = operating_address.country or "VN"
            crm_account.postal_code = operating_address.postal_code

            # Also sync to default_pickup_address if it's the operating address
            crm_account.default_pickup_address = crm_account.address

        # Find default SHIPPING address for default_delivery_address
        statement = select(CustomerAddress).where(
            and_(
                CustomerAddress.customer_id == customer_id,
                CustomerAddress.address_type == AddressType.SHIPPING.value,
                CustomerAddress.is_default == True,
                CustomerAddress.is_active == True
            )
        )
        default_shipping = self.session.exec(statement).first()

        if default_shipping:
            address_parts = [default_shipping.address]
            if default_shipping.ward:
                address_parts.append(default_shipping.ward)
            if default_shipping.district:
                address_parts.append(default_shipping.district)
            if default_shipping.city:
                address_parts.append(default_shipping.city)
            crm_account.default_delivery_address = ", ".join(filter(None, address_parts))

        self.session.add(crm_account)

    def _sync_bank_accounts_to_crm(self, customer_id: str, crm_account: Account):
        """
        Sync PRIMARY bank account to CRM Account's bank fields.
        CRM Account only stores one bank account.
        """
        # Find primary bank account
        statement = select(CustomerBankAccount).where(
            and_(
                CustomerBankAccount.customer_id == customer_id,
                CustomerBankAccount.is_primary == True,
                CustomerBankAccount.is_active == True
            )
        )
        primary_bank = self.session.exec(statement).first()

        if primary_bank:
            crm_account.bank_name = primary_bank.bank_name
            crm_account.bank_branch = primary_bank.bank_branch
            crm_account.bank_account = primary_bank.account_number
            crm_account.bank_account_name = primary_bank.account_holder
        else:
            # If no primary, find any active bank account
            statement = select(CustomerBankAccount).where(
                and_(
                    CustomerBankAccount.customer_id == customer_id,
                    CustomerBankAccount.is_active == True
                )
            )
            any_bank = self.session.exec(statement).first()
            if any_bank:
                crm_account.bank_name = any_bank.bank_name
                crm_account.bank_branch = any_bank.bank_branch
                crm_account.bank_account = any_bank.account_number
                crm_account.bank_account_name = any_bank.account_holder

        self.session.add(crm_account)

    def _sync_contacts_to_crm(self, customer_id: str, crm_account: Account):
        """
        Sync TMS CustomerContacts to CRM Contact table.
        CRM Contact has a different structure, so we need to map fields.
        """
        # Get all active TMS contacts
        statement = select(CustomerContact).where(
            and_(
                CustomerContact.customer_id == customer_id,
                CustomerContact.is_active == True
            )
        )
        tms_contacts = self.session.exec(statement).all()

        # Get existing CRM contacts for this account
        statement = select(Contact).where(Contact.account_id == crm_account.id)
        existing_crm_contacts = self.session.exec(statement).all()
        existing_crm_map = {c.full_name: c for c in existing_crm_contacts}

        for tms_contact in tms_contacts:
            # Try to find existing CRM contact by name
            crm_contact = existing_crm_map.get(tms_contact.name)

            if crm_contact:
                # Update existing
                self._update_crm_contact_from_tms(crm_contact, tms_contact)
            else:
                # Create new CRM Contact
                crm_contact = self._create_crm_contact_from_tms(crm_account.id, tms_contact)
                self.session.add(crm_contact)

    def _update_crm_contact_from_tms(self, crm_contact: Contact, tms_contact: CustomerContact):
        """Update CRM Contact fields from TMS CustomerContact"""
        # Parse name (TMS has single name field, CRM has first/last)
        name_parts = tms_contact.name.split(" ", 1)
        crm_contact.first_name = name_parts[0]
        crm_contact.last_name = name_parts[1] if len(name_parts) > 1 else None
        crm_contact.full_name = tms_contact.name

        crm_contact.title = tms_contact.title
        crm_contact.department = tms_contact.department
        crm_contact.phone = tms_contact.phone
        crm_contact.mobile = tms_contact.mobile
        crm_contact.email = tms_contact.email
        crm_contact.zalo = tms_contact.zalo

        crm_contact.is_primary = tms_contact.is_primary
        crm_contact.decision_maker = tms_contact.is_decision_maker

        # Map contact type to CRM flags
        crm_contact.is_billing_contact = tms_contact.contact_type == ContactType.BILLING.value
        crm_contact.is_shipping_contact = tms_contact.contact_type == ContactType.SHIPPING.value

        crm_contact.notes = tms_contact.notes
        crm_contact.status = "ACTIVE" if tms_contact.is_active else "INACTIVE"

        self.session.add(crm_contact)

    def _create_crm_contact_from_tms(self, account_id: str, tms_contact: CustomerContact) -> Contact:
        """Create new CRM Contact from TMS CustomerContact"""
        name_parts = tms_contact.name.split(" ", 1)

        return Contact(
            account_id=account_id,
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else None,
            full_name=tms_contact.name,
            title=tms_contact.title,
            department=tms_contact.department,
            phone=tms_contact.phone,
            mobile=tms_contact.mobile,
            email=tms_contact.email,
            zalo=tms_contact.zalo,
            is_primary=tms_contact.is_primary,
            decision_maker=tms_contact.is_decision_maker,
            is_billing_contact=tms_contact.contact_type == ContactType.BILLING.value,
            is_shipping_contact=tms_contact.contact_type == ContactType.SHIPPING.value,
            notes=tms_contact.notes,
            status="ACTIVE" if tms_contact.is_active else "INACTIVE",
        )


def sync_customer_to_crm(customer_id: str, session: Session) -> bool:
    """
    Convenience function to sync customer data to CRM.
    Call this after any CRUD operations on customer addresses, bank_accounts, or contacts.

    This function is designed to be non-blocking - if sync fails,
    it logs the error but doesn't raise an exception.
    """
    try:
        service = CustomerSyncService(session)
        return service.sync_customer_to_crm(customer_id)
    except Exception as e:
        # Log but don't fail the main operation
        import logging
        logging.warning(f"Failed to sync customer {customer_id} to CRM: {str(e)}")
        return False
