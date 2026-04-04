use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::json;
use std::net::SocketAddr;
use tokio::signal;
use tower_http::cors::CorsLayer;
use tracing_subscriber::fmt;

#[tokio::main]
async fn main() {
    fmt::init();

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .expect("PORT must be a number");

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/ready", get(ready))
        .layer(CorsLayer::permissive())
        .fallback(not_found);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("server starting on port {}", port);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    tracing::info!("server stopped");
}

async fn root() -> impl IntoResponse {
    Json(json!({ "message": "Hello from Theo!" }))
}

async fn health() -> impl IntoResponse {
    Json(json!({ "status": "ok" }))
}

async fn ready() -> impl IntoResponse {
    // Customize: add database/redis connectivity checks for production
    Json(json!({ "status": "ready" }))
}

async fn not_found() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Json(json!({ "error": "Not Found" })))
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
