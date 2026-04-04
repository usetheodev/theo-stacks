use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn ready() -> Json<Value> {
    Json(json!({ "status": "ready" }))
}

#[tokio::test]
async fn test_health_and_ready() {
    let app = Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let resp = reqwest::get(format!("http://{}/health", addr)).await.unwrap();
    assert_eq!(resp.status(), 200);

    let resp = reqwest::get(format!("http://{}/ready", addr)).await.unwrap();
    assert_eq!(resp.status(), 200);
}
