FROM python:3.12-slim
WORKDIR /app
COPY packages/shared ./packages/shared
COPY apps/api/pyproject.toml ./apps/api/
RUN pip install --no-cache-dir ./packages/shared
COPY apps/api ./apps/api
RUN pip install --no-cache-dir fastapi uvicorn
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "apps/api"]
