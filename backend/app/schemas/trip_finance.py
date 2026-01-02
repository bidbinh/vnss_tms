from pydantic import BaseModel

class TripFinanceItemCreate(BaseModel):
    direction: str          # INCOME / EXPENSE
    category: str           # FUEL / TOLL / SALARY / FREIGHT ...
    amount: float
    currency: str = "VND"
    is_cod: bool = False
    payer: str | None = None
    note: str | None = None

class TripFinanceItemRead(BaseModel):
    id: str
    trip_id: str
    direction: str
    category: str
    amount: float
    currency: str
    is_cod: bool
    payer: str | None
    note: str | None

class TripFinanceSummary(BaseModel):
    trip_id: str
    income_total: float
    expense_total: float
    profit: float
    cod_total: float
    currency: str
