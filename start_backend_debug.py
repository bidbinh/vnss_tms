"""Start backend with detailed logging"""
import subprocess
import sys

print("Starting backend with debug logging...")
print("Press Ctrl+C to stop\n")

try:
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--reload", "--host", "127.0.0.1", "--port", "8000",
         "--log-level", "debug"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Stream output
    for line in proc.stdout:
        print(line, end='')

except KeyboardInterrupt:
    print("\nStopping backend...")
    proc.terminate()
    proc.wait()
