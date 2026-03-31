FROM python:3.11-slim

WORKDIR /app

# System dependencies needed for pikepdf, pdfplumber, pdf2image, pytesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    libqpdf-dev \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-por \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencie
COPY requirements.txt .
# Usamos o 'uv', um instalador hiper rápido, para derrubar o tempo de deploy de 15min para poucos segundos
RUN pip install --no-cache-dir uv && \
    uv pip install --system --no-cache -r requirements.txt

# App code
COPY . .

# Create storage dir
RUN mkdir -p pdfs_storage

EXPOSE 8000

# Usamos um shell script ou passamos como argumento do bash para poder usar a variável de ambiente $PORT fornecida pelo Render
CMD bash -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"
