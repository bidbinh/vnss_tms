"""Delete all customs declarations from database"""
import os
import sys
os.chdir('d:\\vnss_tms\\backend')
sys.path.insert(0, os.getcwd())

output = open('d:\\vnss_tms\\backend\\delete_output.txt', 'w')

def log(msg):
    output.write(msg + '\n')
    output.flush()

try:
    from app.db.session import engine
    from sqlalchemy import text
    log("Imports OK")

    with engine.connect() as conn:
        # First delete HS codes (foreign key constraint)
        result1 = conn.execute(text('DELETE FROM fms_hs_codes'))
        log(f'Deleted {result1.rowcount} HS code items')

        # Then delete declarations
        result2 = conn.execute(text('DELETE FROM fms_customs_declarations'))
        log(f'Deleted {result2.rowcount} customs declarations')

        conn.commit()
        log('Done!')
except Exception as e:
    log(f'Error: {e}')
    import traceback
    log(traceback.format_exc())
finally:
    output.close()
