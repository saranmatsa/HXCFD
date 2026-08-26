//! Backend Process Manager - Simplified for FastAPI backend on port 8000
//!
//! Instead of managing a complex Python process, this connects to the
//! already-running FastAPI backend at http://127.0.0.1:8000

use anyhow::{Context, Result};
use std::sync::Arc;
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::{Mutex, RwLock};

/// Backend process state
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum BackendStatus {
    Stopped,
    Starting,
    Running,
    Stopping,
    Error(String),
}

/// Backend log entry
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BackendLog {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

/// Backend manager - connects to FastAPI backend on port 8000
#[derive(Clone)]
pub struct BackendManager {
    status: Arc<RwLock<BackendStatus>>,
    logs: Arc<RwLock<Vec<BackendLog>>>,
    endpoint: Arc<RwLock<Option<String>>>,
    startup_lock: Arc<Mutex<()>>,
    max_logs: usize,
}

impl BackendManager {
    /// Create a new backend manager
    pub fn new() -> Self {
        Self {
            status: Arc::new(RwLock::new(BackendStatus::Stopped)),
            logs: Arc::new(RwLock::new(Vec::new())),
            endpoint: Arc::new(RwLock::new(None)),
            startup_lock: Arc::new(Mutex::new(())),
            max_logs: 1000,
        }
    }

    /// Get the current backend status
    pub async fn status(&self) -> BackendStatus {
        self.status.read().await.clone()
    }

    /// Get backend logs
    pub async fn logs(&self) -> Vec<BackendLog> {
        self.logs.read().await.clone()
    }

    /// Add a log entry
    async fn add_log(&self, level: &str, message: &str) {
        let log = BackendLog {
            timestamp: chrono::Utc::now().to_rfc3339(),
            level: level.to_string(),
            message: message.to_string(),
        };
        let mut logs = self.logs.write().await;
        logs.push(log);
        if logs.len() > self.max_logs {
            let excess = logs.len() - self.max_logs;
            logs.drain(0..excess);
        }
    }

    /// Emit status change to frontend
    async fn emit_status(&self, app: &AppHandle, status: BackendStatus) {
        let _ = app.emit("backend-status-changed", &status);
    }

    /// Start the backend - connects to FastAPI on port 8000
    pub async fn start(&self, app: &AppHandle) -> Result<()> {
        let _startup_guard = self.startup_lock.lock().await;

        if matches!(self.status().await, BackendStatus::Running) {
            self.add_log("info", "Backend already running").await;
            return Ok(());
        }

        *self.status.write().await = BackendStatus::Starting;
        self.emit_status(app, BackendStatus::Starting).await;
        self.add_log("info", "Connecting to FastAPI backend on port 8000...").await;

        // FastAPI backend runs on port 8000
        let endpoint = "http://127.0.0.1:8000".to_string();
        
        // Test connection
        let client = reqwest::Client::new();
        match client.get(&format!("{}/health", endpoint))
            .timeout(Duration::from_secs(5))
            .send()
            .await 
        {
            Ok(resp) if resp.status().is_success() => {
                *self.endpoint.write().await = Some(endpoint.clone());
                *self.status.write().await = BackendStatus::Running;
                self.emit_status(app, BackendStatus::Running).await;
                self.add_log("info", "Connected to FastAPI backend successfully").await;
                Ok(())
            }
            Ok(resp) => {
                let msg = format!("FastAPI backend returned error: {}", resp.status());
                *self.status.write().await = BackendStatus::Error(msg.clone());
                self.emit_status(app, BackendStatus::Error(msg.clone())).await;
                self.add_log("error", &msg).await;
                Err(anyhow::anyhow!(msg))
            }
            Err(e) => {
                let msg = format!("Failed to connect to FastAPI backend: {}", e);
                *self.status.write().await = BackendStatus::Error(msg.clone());
                self.emit_status(app, BackendStatus::Error(msg.clone())).await;
                self.add_log("error", &msg).await;
                Err(anyhow::anyhow!(msg))
            }
        }
    }

    /// Stop the backend - just clears connection
    pub async fn stop(&self) -> Result<()> {
        *self.status.write().await = BackendStatus::Stopped;
        *self.endpoint.write().await = None;
        self.add_log("info", "Disconnected from FastAPI backend").await;
        Ok(())
    }

    /// Restart the backend
    pub async fn restart(&self, app: &AppHandle) -> Result<()> {
        self.stop().await?;
        tokio::time::sleep(Duration::from_secs(1)).await;
        self.start(app).await
    }

    /// Check backend health
    pub async fn health_check(&self) -> Result<bool> {
        Ok(self.probe_health(Duration::from_secs(5)).await)
    }

    /// Probe the FastAPI health endpoint
    async fn probe_health(&self, request_timeout: Duration) -> bool {
        let endpoint = match self.endpoint.read().await.clone() {
            Some(endpoint) => endpoint,
            None => return false,
        };

        static HEALTH_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
        let client = HEALTH_CLIENT.get_or_init(|| {
            reqwest::Client::builder()
                .connect_timeout(Duration::from_secs(2))
                .build()
                .expect("Failed to create health check client")
        });

        match client
            .get(format!("{}/health", endpoint))
            .timeout(request_timeout)
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Call the FastAPI backend API
    async fn call_fastapi_api(
        &self,
        method: reqwest::Method,
        path: &str,
        payload: Option<&serde_json::Value>,
        request_timeout: Duration,
    ) -> Result<serde_json::Value> {
        let endpoint = self
            .endpoint
            .read()
            .await
            .clone()
            .context("FastAPI backend not connected")?;

        let url = format!("{}{}", endpoint, path);
        let client = reqwest::Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(request_timeout)
            .build()
            .context("Failed to create HTTP client")?;

        let mut request = client.request(method, &url);
        if let Some(payload) = payload {
            request = request.json(payload);
        }

        let response = request
            .send()
            .await
            .with_context(|| format!("API request failed: {}", path))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .context("Failed to read response")?;

        if !status.is_success() {
            anyhow::bail!("API {} {} failed with HTTP {}: {}", method, path, status, body);
        }

        if body.trim().is_empty() {
            return Ok(serde_json::Value::Null);
        }

        serde_json::from_str(&body).context("Invalid JSON response")
    }

    /// Get engine inventory from FastAPI
    pub async fn engine_inventory(&self) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::GET,
            "/api/v1/workflow/engines?refresh=true",
            None,
            Duration::from_secs(30),
        )
        .await
    }

    /// List local projects
    pub async fn list_local_projects(&self) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::GET,
            "/api/v1/workflow/projects",
            None,
            Duration::from_secs(30),
        )
        .await
    }

    /// Create local project
    pub async fn create_local_project(&self, project_id: &str) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::POST,
            "/api/v1/workflow/projects",
            Some(&serde_json::json!({ "project_id": project_id })),
            Duration::from_secs(30),
        )
        .await
    }

    /// Get workflow snapshot
    pub async fn workflow_snapshot(&self, project_id: &str) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::GET,
            &format!("/api/v1/workflow/projects/{}", project_id),
            None,
            Duration::from_secs(30),
        )
        .await
    }

    /// Configure workflow stage
    pub async fn configure_workflow_stage(
        &self,
        project_id: &str,
        stage_id: &str,
        recipe: &serde_json::Value,
    ) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::PUT,
            &format!("/api/v1/workflow/projects/{}/stages/{}", project_id, stage_id),
            Some(&serde_json::json!({ "configuration": recipe })),
            Duration::from_secs(30),
        )
        .await
    }

    /// Execute workflow stage
    pub async fn execute_workflow_stage(
        &self,
        project_id: &str,
        stage_id: &str,
        recipe: Option<&serde_json::Value>,
    ) -> Result<serde_json::Value> {
        self.call_fastapi_api(
            reqwest::Method::POST,
            &format!("/api/v1/workflow/projects/{}/stages/{}/execute", project_id, stage_id),
            Some(&serde_json::json!({ "recipe": recipe })),
            Duration::from_secs(7_500),
        )
        .await
    }
}

impl Default for BackendManager {
    fn default() -> Self {
        Self::new()
    }
}