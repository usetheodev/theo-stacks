FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.work go.work.sum* ./
COPY apps/api/go.mod apps/api/go.sum* ./apps/api/
COPY apps/worker/go.mod apps/worker/go.sum* ./apps/worker/
COPY pkg/shared/go.mod pkg/shared/go.sum* ./pkg/shared/
RUN cd apps/worker && go mod download
COPY . .
RUN cd apps/worker && CGO_ENABLED=0 GOOS=linux go build -o /bin/worker .

FROM scratch
COPY --from=builder /bin/worker /worker
EXPOSE 8081
ENTRYPOINT ["/worker"]
