"""Check AI Training data"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg://tms:tms@localhost:5432/tms')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    # Check corrections
    result = conn.execute(text('SELECT COUNT(*) FROM fms_ai_corrections'))
    print(f'Total corrections: {result.scalar()}')

    # Check rules
    result = conn.execute(text('SELECT COUNT(*) FROM fms_ai_customer_rules'))
    print(f'Total rules: {result.scalar()}')

    # Check sessions
    result = conn.execute(text('SELECT COUNT(*) FROM fms_ai_parsing_sessions'))
    print(f'Total sessions: {result.scalar()}')

    # Check approved sessions
    result = conn.execute(text("SELECT COUNT(*) FROM fms_ai_parsing_sessions WHERE status = 'APPROVED'"))
    print(f'Approved sessions: {result.scalar()}')

    # Show recent corrections
    print('\n--- Recent Corrections ---')
    result = conn.execute(text('''
        SELECT c.field_name, c.original_value, c.corrected_value, s.shipper_name
        FROM fms_ai_corrections c
        JOIN fms_ai_parsing_sessions s ON c.session_id = s.id
        ORDER BY c.corrected_at DESC
        LIMIT 10
    '''))
    for row in result:
        print(f'  {row[0]}: "{row[1]}" → "{row[2]}" (shipper: {row[3]})')

    # Show rules
    print('\n--- AI Customer Rules ---')
    result = conn.execute(text('''
        SELECT shipper_pattern, rule_type, source_field, target_field, times_applied
        FROM fms_ai_customer_rules
        ORDER BY created_at DESC
        LIMIT 10
    '''))
    for row in result:
        print(f'  Pattern: {row[0]}, Type: {row[1]}, {row[2]} → {row[3]}, Applied: {row[4]}x')
