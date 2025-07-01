# Use a build argument to specify the Python version
ARG PYTHON_VERSION=3.11

# Use the specified Python base image
FROM docker.arvancloud.ir/python:${PYTHON_VERSION} AS base

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 --fix-missing

# Upgrade pip to the latest version
RUN pip install --upgrade pip

# Install Python dependencies from requirements.txt
RUN --mount=type=cache,target=~/.cache/pip \
    --mount=type=bind,source=./requirements.txt,target=/app/requirements.txt \
    pip install -r requirements.txt

# Set environment variables for Flask
ENV FLASK_APP=src/app.py
ENV FLASK_ENV=development

# Copy the application code into the container
COPY . .

# Expose port 80 for the Flask app
EXPOSE 80

# Start the Flask application
CMD ["flask" , "run" , "--host=0.0.0.0", "--port=80"]