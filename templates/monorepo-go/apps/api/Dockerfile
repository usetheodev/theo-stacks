FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.work go.work.sum* ./
COPY apps/api/go.mod apps/api/go.sum* ./apps/api/
COPY pkg/shared/go.mod pkg/shared/go.sum* ./pkg/shared/
RUN cd apps/api && go mod download
COPY . .
RUN cd apps/api && CGO_ENABLED=0 GOOS=linux go build -o /bin/api .

FROM scratch
COPY --from=builder /bin/api /api
EXPOSE 8080
ENTRYPOINT ["/api"]
