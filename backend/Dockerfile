FROM python:3.11-slim

WORKDIR /app

# System dependencies needed for pikepdf, pdfplumber
RUN apt-get update && apt-get install -y --no-install-recommends \
    libqpdf-dev \
    poppler-utils \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Create storage dir
RUN mkdir -p pdfs_storage

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
