# Gunakan Python 3.10 sebagai base image
FROM python:3.10-slim

# Buat pengguna dan direktori untuk Rasa
RUN adduser --disabled-password --gecos "" rasauser && \
    mkdir -p /app && \
    chown rasauser:rasauser /app

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
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Salin file package.json dan install dependensi Node.js
COPY package.json /app/
RUN npm install

RUN apt update && apt install -y lsof net-tools

# Salin seluruh kode aplikasi Node.js ke dalam container
COPY . /app/

# Ubah kepemilikan folder kerja ke pengguna rasauser
RUN chown -R rasauser:rasauser /app

# Jalankan aplikasi Node.js dengan pengguna rasauser
USER rasauser

# Tidak perlu lagi menjalankan Rasa di sini, karena dikendalikan oleh Node.js
CMD ["npm", "start"]
