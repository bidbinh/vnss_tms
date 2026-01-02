#!/usr/bin/env python
import sys
import os
import logging

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('server.log'),
        logging.StreamHandler()
    ]
)

os.environ['PYTHONPATH'] = os.path.dirname(__file__)

try:
    from app.main import app
    import uvicorn
    
    print("Starting server...")
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        log_level="debug"
    )
except Exception as e:
    print(f"Failed to start server: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
