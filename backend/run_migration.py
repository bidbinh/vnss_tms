import subprocess
import sys

result = subprocess.run(
    [sys.executable, '-m', 'alembic', 'upgrade', 'head'],
    capture_output=True,
    text=True,
    cwd='d:\\vnss_tms\\backend'
)

with open('d:\\vnss_tms\\backend\\migration_output.txt', 'w') as f:
    f.write("STDOUT:\n")
    f.write(result.stdout or "(empty)")
    f.write("\n\nSTDERR:\n")
    f.write(result.stderr or "(empty)")
    f.write(f"\n\nReturn code: {result.returncode}")
