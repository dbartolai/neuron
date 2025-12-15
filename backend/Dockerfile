# backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .

RUN pip install "fastapi[standard]" "uvicorn[standard]" pydantic

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
