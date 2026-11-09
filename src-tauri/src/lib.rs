use std::{collections::HashMap, sync::Mutex};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

#[derive(Default)]
struct Sessions(Mutex<HashMap<String, String>>);

#[derive(Serialize, Deserialize)]
struct Account {
    login: String,
    avatar_url: Option<String>,
    name: Option<String>,
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("github-mobile-ide/0.1")
        .build()
        .map_err(|_| "Could not initialize GitHub network client".to_string())
}

async fn read_response(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let body = response.text().await.map_err(|_| "Could not read GitHub response".to_string())?;
    let json: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
    if !status.is_success() {
        let detail = json.get("message").and_then(Value::as_str).unwrap_or("Request rejected");
        return Err(format!("GitHub HTTP {}: {}", status.as_u16(), detail));
    }
    Ok(json)
}

#[tauri::command]
async fn connect_account(token: String, sessions: State<'_, Sessions>) -> Result<Account, String> {
    let token = token.trim();
    if token.is_empty() || token.len() > 10240 {
        return Err("Provide a valid GitHub access token".into());
    }
    let response = client()?.get("https://api.github.com/user")
        .bearer_auth(token)
        .header("Accept", "application/vnd.github+json")
        .send().await.map_err(|_| "Cannot connect to GitHub".to_string())?;
    let info = read_response(response).await?;
    let account: Account = serde_json::from_value(info)
        .map_err(|_| "GitHub did not return a valid account".to_string())?;
    let mut sessions = sessions.0.lock().map_err(|_| "Session unavailable".to_string())?;
    sessions.insert(account.login.clone(), token.to_owned());
    Ok(account)
}

#[tauri::command]
fn disconnect_account(login: String, sessions: State<'_, Sessions>) -> Result<(), String> {
    sessions.0.lock().map_err(|_| "Session unavailable".to_string())?.remove(&login);
    Ok(())
}

#[tauri::command]
async fn github_api(
    account: String,
    method: String,
    path: String,
    body: Option<Value>,
    sessions: State<'_, Sessions>,
) -> Result<Value, String> {
    let token = {
        let sessions = sessions.0.lock().map_err(|_| "Session unavailable".to_string())?;
        sessions.get(&account).cloned().ok_or("Account is not connected")?
    };
    if !path.starts_with('/') || path.starts_with("//") || path.contains('\\') {
        return Err("Invalid GitHub API path".into());
    }
    let url = reqwest::Url::parse(&format!("https://api.github.com{}", path))
        .map_err(|_| "Invalid API URL".to_string())?;
    if url.host_str() != Some("api.github.com") || url.username() != "" || url.password().is_some() {
        return Err("Only the official GitHub API is allowed".into());
    }
    let method = match method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        _ => return Err("Unsupported request method".into()),
    };
    let mut request = client()?.request(method, url)
        .bearer_auth(&token)
        .header("Accept", "application/vnd.github+json")
        .header("X-GitHub-Api-Version", "2022-11-28");
    if let Some(body) = body { request = request.json(&body); }
    let response = request.send().await.map_err(|_| "Network request failed".to_string())?;
    read_response(response).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Sessions::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![connect_account, disconnect_account, github_api])
        .run(tauri::generate_context!())
        .expect("Unable to start GitHub Mobile IDE");
}
