# Gunakan Python 3.10 sebagai base image
FROM python:3.10-slim

# Set direktori kerja untuk Python
WORKDIR /app

# Install dependensi dasar untuk Python dan sistem
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-distutils \
    python3-setuptools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Salin file requirements.txt dan install dependensi Python (Rasa)
COPY requirements.txt /app/
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Install Node.js (versi LTS)
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Salin file package.json dan install dependensi Node.js
COPY package.json /app/
RUN npm install

# Salin seluruh kode aplikasi Node.js ke dalam container
COPY . /app/
