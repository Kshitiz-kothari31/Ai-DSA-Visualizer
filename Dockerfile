# Use Python 3.9 slim as base
FROM python:3.9-slim

# Install system dependencies (C++, Java, Node.js)
RUN apt-get update && apt-get install -y \
    build-essential \
    default-jdk-headless \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code and scripts
COPY backend/ .
COPY scripts/ /app/scripts/

# Expose the port Flask operates on
EXPOSE 5000

# Run with eventlet for WebSocket support
CMD ["python", "app.py"]
