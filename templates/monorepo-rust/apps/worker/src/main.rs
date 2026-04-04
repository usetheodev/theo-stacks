use axum::{response::IntoResponse, routing::get, Json, Router};
use serde_json::json;
use std::net::SocketAddr;
use tokio::signal;
use tracing_subscriber::{fmt, EnvFilter};

#[tokio::main]
async fn main() {
    fmt::Subscriber::builder()
        .with_env_filter(EnvFilter::from_default_env())
        .json()
        .init();

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse()
        .expect("PORT must be a number");

    tracing::info!("worker v{} starting", shared::VERSION);

    let app = Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready));
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    tracing::info!("worker health endpoint on port {}", port);

    let cancel = tokio_util::sync::CancellationToken::new();
    let cancel_clone = cancel.clone();

    let worker_handle = tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = tokio::time::sleep(std::time::Duration::from_secs(10)) => {
                    tracing::info!("worker tick");
                }
                _ = cancel_clone.cancelled() => {
                    tracing::info!("worker loop cancelled");
                    break;
                }
            }
        }
    });

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    cancel.cancel();
    let _ = worker_handle.await;

    tracing::info!("worker stopped");
}

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}

async fn ready() -> impl IntoResponse {
    // Customize: add database/redis connectivity checks for production
    Json(json!({ "status": "ready" }))
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("failed to listen for ctrl+c");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to listen for SIGTERM")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("shutdown signal received");
}
