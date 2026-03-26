import os

from fastapi import FastAPI

app = FastAPI(title="{{project-name}}")

port = int(os.environ.get("PORT", 8000))


@app.get("/")
async def root():
    return {"message": "Hello from Theo!"}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=port)
