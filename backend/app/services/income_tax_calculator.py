"""
Income Tax Calculator Service
Calculates Vietnamese Personal Income Tax (Thuế Thu nhập Cá nhân - TNCN)
"""

from sqlmodel import Session, select
from app.models import IncomeTaxSetting, Driver, AdvancePayment
from datetime import date, datetime
from typing import Dict, Optional
import math


def calculate_seniority_bonus(driver: Driver, report_date: date) -> int:
    """
    Calculate seniority bonus (Thưởng thâm niên)
    Formula: Base Salary × 3% × Years (only count years > 1)

    Args:
        driver: Driver object with hire_date and base_salary
        report_date: Date to calculate seniority from

    Returns:
        Seniority bonus amount in VND
    """
    if not driver.hire_date:
        return 0

    # Calculate years of service
    years = (report_date - driver.hire_date).days / 365.25
    years_int = int(years)

    # Only count years greater than 1
    if years_int <= 1:
        return 0

    bonus = int(driver.base_salary * 0.03 * years_int)
    return bonus


def get_advance_payments_for_period(
    session: Session,
    driver_id: str,
    tenant_id: str,
    year: int,
    month: int,
    salary_payment_day: int = 10,
    update_status: bool = False
) -> int:
    """
    Get total advance payments that should be deducted for this salary period

    Salary for month N (for trips delivered in month N) is paid on 10th of month N+1.
    Advance payments from 11th of month N to 10th of month N+1 are deducted.

    Examples:
    - Salary Dec 2025 (for trips in Dec 2025) paid on 10/Jan/2026
      -> Deduct advance payments from 11/Dec/2025 to 10/Jan/2026
    - Salary Nov 2025 (for trips in Nov 2025) paid on 10/Dec/2025
      -> Deduct advance payments from 11/Nov/2025 to 10/Dec/2025

    Args:
        session: Database session
        driver_id: Driver ID
        tenant_id: Tenant ID
        year: Salary year (month of trips)
        month: Salary month (month of trips)
        salary_payment_day: Day of next month when salary is paid (default 10)
        update_status: If True, mark payments as deducted in database (default False)

    Returns:
        Total advance payment amount to deduct
    """
    import calendar

    # From: 11th of current month (month of trips)
    from_date = date(year, month, 11)

    # To: 10th of next month (salary payment date)
    if month == 12:
        next_month = 1
        next_year = year + 1
    else:
        next_month = month + 1
        next_year = year

    to_date = date(next_year, next_month, salary_payment_day)

    # Query advance payments in this period that haven't been deducted yet
    payments = session.exec(
        select(AdvancePayment).where(
            AdvancePayment.tenant_id == tenant_id,
            AdvancePayment.driver_id == driver_id,
            AdvancePayment.payment_date >= from_date,
            AdvancePayment.payment_date <= to_date,
            AdvancePayment.is_deducted == False
        )
    ).all()

    total_advance = sum(p.amount for p in payments)

    # Only mark as deducted if update_status is True (when confirming payment)
    if update_status:
        for payment in payments:
            payment.is_deducted = True
            payment.deducted_month = month
            payment.deducted_year = year
            session.add(payment)

        session.commit()

    return total_advance


def calculate_income_tax(
    taxable_income: int,
    tax_setting: IncomeTaxSetting
) -> int:
    """
    Calculate progressive income tax based on Vietnamese tax brackets

    Formula from user:
    =ROUND(IF(AG18<=5000000,AG18*0.05,
           IF(AG18<=10000000,AG18*0.1-250000,
           IF(AG18<=18000000,AG18*0.15-750000,
           IF(AG18<=32000000,AG18*0.2-1650000,
           IF(AG18<=52000000,AG18*0.25-3250000,
           IF(AG18<=80000000,AG18*0.3-5850000,
           AG18*0.35-9850000)))))),0)

    Args:
        taxable_income: Income subject to tax (after deductions)
        tax_setting: Tax setting with brackets and rates

    Returns:
        Tax amount in VND (rounded)
    """
    if taxable_income <= 0:
        return 0

    tax = 0

    if taxable_income <= tax_setting.bracket_1_limit:
        tax = taxable_income * tax_setting.bracket_1_rate
    elif taxable_income <= tax_setting.bracket_2_limit:
        tax = taxable_income * tax_setting.bracket_2_rate - tax_setting.bracket_2_deduction
    elif taxable_income <= tax_setting.bracket_3_limit:
        tax = taxable_income * tax_setting.bracket_3_rate - tax_setting.bracket_3_deduction
    elif taxable_income <= tax_setting.bracket_4_limit:
        tax = taxable_income * tax_setting.bracket_4_rate - tax_setting.bracket_4_deduction
    elif taxable_income <= tax_setting.bracket_5_limit:
        tax = taxable_income * tax_setting.bracket_5_rate - tax_setting.bracket_5_deduction
    elif taxable_income <= tax_setting.bracket_6_limit:
        tax = taxable_income * tax_setting.bracket_6_rate - tax_setting.bracket_6_deduction
    else:
        tax = taxable_income * tax_setting.bracket_7_rate - tax_setting.bracket_7_deduction

    return round(tax)


def calculate_salary_deductions(
    session: Session,
    driver: Driver,
    base_salary: int,
    trip_salary: int,
    monthly_bonus: int,
    seniority_bonus: int,
    tenant_id: str,
    year: int,
    month: int,
    tax_setting: Optional[IncomeTaxSetting] = None,
    update_advance_payment_status: bool = False
) -> Dict:
    """
    Calculate all salary deductions including:
    - Social Insurance (BHXH)
    - Health Insurance (BHYT)
    - Unemployment Insurance (BHTN)
    - Personal Income Tax (Thuế TNCN)
    - Advance Payments (Tạm ứng)

    Args:
        session: Database session
        driver: Driver object
        base_salary: Base salary for the month
        trip_salary: Total trip-based salary
        monthly_bonus: Monthly bonus based on trip count
        seniority_bonus: Seniority bonus
        tenant_id: Tenant ID
        year: Salary year
        month: Salary month
        tax_setting: Income tax setting (optional, will fetch active if not provided)
        update_advance_payment_status: If True, mark advance payments as deducted (default False)

    Returns:
        Dictionary with deduction details and net salary
    """
    # Get tax setting if not provided
    if not tax_setting:
        tax_setting = session.exec(
            select(IncomeTaxSetting).where(
                IncomeTaxSetting.tenant_id == tenant_id,
                IncomeTaxSetting.status == "ACTIVE"
            ).limit(1)
        ).first()

    if not tax_setting:
        # Return zeros if no tax setting
        return {
            "gross_income": base_salary + trip_salary + monthly_bonus + seniority_bonus,
            "social_insurance": 0,
            "health_insurance": 0,
            "unemployment_insurance": 0,
            "total_insurance": 0,
            "personal_deduction": 0,
            "dependent_deduction": 0,
            "total_deduction": 0,
            "taxable_income": 0,
            "income_tax": 0,
            "advance_payment": 0,
            "total_deductions": 0,
            "net_salary": base_salary + trip_salary + monthly_bonus + seniority_bonus
        }

    # Calculate gross income
    gross_income = base_salary + trip_salary + monthly_bonus + seniority_bonus

    # Calculate insurance based on base salary only (10.5% total)
    insurance_base = base_salary
    social_insurance = round(insurance_base * tax_setting.social_insurance_rate)  # 8%
    health_insurance = round(insurance_base * tax_setting.health_insurance_rate)  # 1.5%
    unemployment_insurance = round(insurance_base * tax_setting.unemployment_insurance_rate)  # 1%
    total_insurance = social_insurance + health_insurance + unemployment_insurance

    # Calculate taxable income
    # Taxable Income = Gross Income - Insurance - Personal Deduction - Dependent Deduction
    personal_deduction = tax_setting.personal_deduction  # 11,000,000
    dependent_deduction = tax_setting.dependent_deduction * driver.dependent_count  # 4,400,000 per dependent
    total_deduction = total_insurance + personal_deduction + dependent_deduction

    taxable_income = gross_income - total_deduction

    # Calculate income tax
    income_tax = calculate_income_tax(taxable_income, tax_setting)

    # Get advance payments for this period
    advance_payment = get_advance_payments_for_period(
        session=session,
        driver_id=driver.id,
        tenant_id=tenant_id,
        year=year,
        month=month,
        update_status=update_advance_payment_status
    )

    # Calculate total deductions
    total_deductions = total_insurance + income_tax + advance_payment

    # Calculate net salary
    net_salary = gross_income - total_deductions

    return {
        "gross_income": gross_income,
        "social_insurance": social_insurance,
        "health_insurance": health_insurance,
        "unemployment_insurance": unemployment_insurance,
        "total_insurance": total_insurance,
        "personal_deduction": personal_deduction,
        "dependent_deduction": dependent_deduction,
        "total_deduction": total_deduction,
        "taxable_income": max(0, taxable_income),
        "income_tax": income_tax,
        "advance_payment": advance_payment,
        "total_deductions": total_deductions,
        "net_salary": net_salary
    }
