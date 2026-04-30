# Use a newer, more stable Python image
FROM python:3.10-slim

# Install System Dependencies with increased reliability
RUN apt-get update --fix-missing && apt-get install -y \
    g++ \
    gdb \
    && apt-get clean \
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
