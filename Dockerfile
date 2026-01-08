# Luna AI - Production Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy Python requirements
COPY requirements.txt ./

# CRITICAL: Install CPU-only Torch first to avoid massive CUDA download (Timeout Fix)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Environment variable for port (Railway provides this)
ENV PORT=8001

# Expose the port
EXPOSE ${PORT}

# Start server (Railway will override PORT)
CMD ["python", "-m", "server.main"]
