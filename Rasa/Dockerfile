# Gunakan Python 3.10 (atau 3.9 jika perlu)
FROM python:3.10-slim

# Set direktori kerja
WORKDIR /app

# Install dependensi dasar
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-distutils \
    python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

# Salin file requirements.txt ke dalam container
COPY requirements.txt /app/

# Install pip terbaru & dependensi proyek
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt