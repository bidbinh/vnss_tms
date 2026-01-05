# HRM Module Models
from .department import Department, Branch, Team, Position
from .employee import Employee, EmployeeDependent, EmployeeDocument, EmployeeStatus, EmployeeType, Gender, MaritalStatus
from .contract import Contract, ContractType, ContractStatus
from .attendance import (
    WorkShift, ShiftAssignment, AttendanceRecord, AttendanceStatus,
    OvertimeRequest, OvertimeStatus
)
from .leave import (
    LeaveType, LeaveBalance, LeaveRequest, LeaveStatus,
    LeaveApprovalFlow, LeaveApprover
)
from .payroll import (
    SalaryStructure, SalaryComponent, ComponentType,
    EmployeeSalary, PayrollPeriod, PayrollRecord, PayrollItem,
    Deduction, DeductionType
)
from .advance import AdvanceRequest, AdvanceStatus, AdvanceRepayment
from .insurance import InsuranceRecord, InsuranceType
from .training import Training, TrainingParticipant, Certificate
from .evaluation import (
    EvaluationPeriod, EvaluationTemplate, EvaluationCriteria,
    EmployeeEvaluation, EvaluationScore
)
from .recruitment import JobPosting, Candidate, CandidateStatus, Interview
from .namecard import EmployeeNameCard, NameCardTemplate

__all__ = [
    # Organization
    "Department", "Branch", "Team", "Position",
    # Employee
    "Employee", "EmployeeDependent", "EmployeeDocument",
    "EmployeeStatus", "EmployeeType", "Gender", "MaritalStatus",
    # Contract
    "Contract", "ContractType", "ContractStatus",
    # Attendance
    "WorkShift", "ShiftAssignment", "AttendanceRecord", "AttendanceStatus",
    "OvertimeRequest", "OvertimeStatus",
    # Leave
    "LeaveType", "LeaveBalance", "LeaveRequest", "LeaveStatus",
    "LeaveApprovalFlow", "LeaveApprover",
    # Payroll
    "SalaryStructure", "SalaryComponent", "ComponentType",
    "EmployeeSalary", "PayrollPeriod", "PayrollRecord", "PayrollItem",
    "Deduction", "DeductionType",
    # Advance
    "AdvanceRequest", "AdvanceStatus", "AdvanceRepayment",
    # Insurance
    "InsuranceRecord", "InsuranceType",
    # Training
    "Training", "TrainingParticipant", "Certificate",
    # Evaluation
    "EvaluationPeriod", "EvaluationTemplate", "EvaluationCriteria",
    "EmployeeEvaluation", "EvaluationScore",
    # Recruitment
    "JobPosting", "Candidate", "CandidateStatus", "Interview",
    # Name Card
    "EmployeeNameCard", "NameCardTemplate",
]
