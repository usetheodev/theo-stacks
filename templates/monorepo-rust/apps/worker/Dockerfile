FROM rust:1-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY apps/api/Cargo.toml ./apps/api/
COPY apps/worker/Cargo.toml ./apps/worker/
COPY pkg/shared/Cargo.toml ./pkg/shared/
RUN mkdir -p apps/api/src apps/worker/src pkg/shared/src && \
    echo 'fn main() {}' > apps/api/src/main.rs && \
    echo 'fn main() {}' > apps/worker/src/main.rs && \
    echo '' > pkg/shared/src/lib.rs && \
    cargo build --release -p worker && \
    rm -rf apps pkg
COPY . .
RUN cargo build --release -p worker

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/worker /usr/local/bin/worker
EXPOSE 8081
CMD ["worker"]
