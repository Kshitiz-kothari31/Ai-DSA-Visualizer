# Use an official Python runtime as a parent image
FROM python:3.9-slim-buster

# Install System Dependencies (Required for C++ Compilation and Tracing)
RUN apt-get update && apt-get install -y \
    g++ \
    gdb \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the engine code
COPY . .

# Expose the port the Engine Service operates on
EXPOSE 5001

# Command to run the application
CMD ["python", "app.py"]
