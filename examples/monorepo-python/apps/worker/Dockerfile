FROM python:3.12-slim
WORKDIR /app
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
RUN pip install --no-cache-dir ./packages/shared
EXPOSE 8001
CMD ["python", "apps/worker/worker.py"]
