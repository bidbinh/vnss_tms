FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements and install dependencies
COPY pyproject.toml /app/

RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    uvicorn[standard]==0.30.0 \
    python-multipart==0.0.9 \
    SQLModel==0.0.22 \
    "psycopg[binary]==3.2.1" \
    redis==5.0.7 \
    boto3==1.35.0 \
    python-jose==3.3.0 \
    passlib==1.7.4 \
    python-dotenv==1.0.1 \
    anthropic==0.40.0 \
    bcrypt==4.2.0 \
    alembic==1.13.2 \
    pydantic-settings==2.2.1 \
    openpyxl==3.1.5 \
    pandas==2.2.0 \
    google-generativeai==0.8.0 \
    pdfplumber==0.11.0 \
    httpx==0.27.0 \
    aiohttp==3.10.0

# Copy application code
COPY app /app/app
COPY alembic /app/alembic
COPY alembic.ini /app/
COPY start.sh /app/

RUN chmod +x /app/start.sh

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["/app/start.sh"]
