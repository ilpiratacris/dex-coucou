//! Chat through the installed Codex and Claude Code clients. The clients own
//! their subscription sign-in; Coucou never reads or forwards OAuth tokens.
//! Processes have no visible console and cannot modify the workspace.

use std::io::{Read, Write};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::{Duration, Instant};

use serde_json::{json, Value};

use crate::chat::{self, Chat, ChatContext, ChatReply, ModelInfo};
use crate::platform;

pub const CODEX: &str = "codex_subscription";
pub const CLAUDE: &str = "claude_subscription";
const TIMEOUT: Duration = Duration::from_secs(120);
const MAX_OUTPUT: u64 = 1024 * 1024;
const MAX_CONTEXT: u64 = 128 * 1024;
static ACTIVE_CHATS: AtomicUsize = AtomicUsize::new(0);

struct ChatSlot;
impl ChatSlot {
    fn acquire() -> Result<Self, String> {
        let count = ACTIVE_CHATS.fetch_add(1, Ordering::AcqRel);
        if count >= 2 {
            ACTIVE_CHATS.fetch_sub(1, Ordering::AcqRel);
            return Err("Two subscription chats are already running. Try again shortly.".into());
        }
        Ok(Self)
    }
}
impl Drop for ChatSlot {
    fn drop(&mut self) { ACTIVE_CHATS.fetch_sub(1, Ordering::AcqRel); }
}

struct ReplyCleanup(Option<std::path::PathBuf>);
impl Drop for ReplyCleanup {
    fn drop(&mut self) {
        if let Some(path) = &self.0 { let _ = std::fs::remove_file(path); }
    }
}

pub fn models(provider: &str) -> Vec<ModelInfo> {
    let label = if provider == CODEX { "Codex (account ChatGPT)" } else { "Claude (account Claude)" };
    vec![ModelInfo { id: "account".into(), label: label.into() }]
}

pub async fn send(chat: &Chat, provider: &str, query: String, context: Option<ChatContext>) -> Result<ChatReply, String> {
    let turn = chat.begin(provider);
    let question = chat::plain_question(turn.first, context.as_ref(), &query);
    let file_text = match context.as_ref().filter(|_| turn.first) {
        Some(ChatContext::File { path, .. }) => {
            let file = std::fs::File::open(path).map_err(|e| format!("File context: {e}"))?;
            let mut bytes = Vec::new();
            file.take(MAX_CONTEXT + 1).read_to_end(&mut bytes).map_err(|e| format!("File context: {e}"))?;
            if bytes.len() as u64 > MAX_CONTEXT { return Err("File too large for subscription chat (128 KB).".into()); }
            Some(String::from_utf8(bytes).map_err(|_| "Only UTF-8 text files can be sent to subscription chat.")?)
        }
        _ => None,
    };
    let prompt = build_prompt(&turn.history, &question, file_text.as_deref());
    let provider_owned = provider.to_string();
    let answer = tauri::async_runtime::spawn_blocking(move || run(&provider_owned, &prompt))
        .await.map_err(|e| format!("Chat process: {e}"))??;
    let history_question = if let Some(file) = file_text.as_deref() {
        format!("{question}\n\nAttached file content:\n{file}")
    } else { question.clone() };
    chat.commit(&turn, json!({"role":"user","content":history_question}), json!({"role":"assistant","content":answer}), &history_question, &answer);
    Ok(ChatReply { text: answer })
}

fn build_prompt(history: &[Value], question: &str, file_text: Option<&str>) -> String {
    let mut prompt = chat::system_prompt(false);
    prompt.push_str(" Answer the user's latest message only. Do not inspect files, use tools or run commands.\n\n");
    // The UI caps the visible conversation; cap transferred history as well.
    for turn in history.iter().rev().take(16).rev() {
        let role = if turn["role"] == "assistant" { "Assistant" } else { "User" };
        if let Some(text) = turn["content"].as_str() {
            let limit = if text.contains("Attached file content:\n") { MAX_CONTEXT as usize + 500 } else { 8000 };
            prompt.push_str(&format!("{role}: {}\n\n", text.chars().take(limit).collect::<String>()));
        }
    }
    prompt.push_str("User: ");
    prompt.push_str(question);
    if let Some(file) = file_text { prompt.push_str("\n\nAttached file content:\n"); prompt.push_str(file); }
    prompt.push_str("\n\nAssistant:");
    prompt
}

fn run(provider: &str, prompt: &str) -> Result<String, String> {
    let _slot = ChatSlot::acquire()?;
    if provider != CODEX && provider != CLAUDE { return Err(format!("Unknown subscription provider: {provider}")); }
    let workdir = platform::local_dir().join("subscription-chat");
    platform::ensure_private_dir(&workdir).map_err(|e| format!("Chat directory: {e}"))?;
    let output_file = (provider == CODEX).then(|| workdir.join(format!("reply-{}-{}.txt", std::process::id(), unique_suffix())));
    let _cleanup = ReplyCleanup(output_file.clone());
    let mut cmd = if provider == CODEX {
        let exe = platform::codex_candidates().into_iter().next().ok_or("Codex CLI not installed. Install it and sign in with ChatGPT.")?;
        let mut cmd = Command::new(exe);
        cmd.args(["exec", "--ignore-user-config", "--skip-git-repo-check", "--sandbox", "read-only", "--ephemeral", "--color", "never", "--output-last-message"]);
        cmd.arg(output_file.as_ref().unwrap()).arg("-");
        cmd
    } else {
        let exe = platform::find_on_path("claude")
            .or_else(|| Some(platform::home_dir().join(".local/bin/claude.exe")).filter(|p| p.is_file()))
            .ok_or("Claude Code CLI not installed. Install it and sign in with Claude.")?;
        let mut cmd = Command::new(exe);
        cmd.args(["--print", "--output-format", "json", "--no-session-persistence", "--safe-mode", "--strict-mcp-config", "--tools", "", "--permission-mode", "plan"]);
        cmd
    };
    check_plan_login(provider, cmd.get_program(), &workdir)?;
    cmd.current_dir(&workdir).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    // A key in the user's environment would silently switch either client to
    // metered API billing. Child processes use only their own subscription login.
    remove_api_environment(&mut cmd);
    platform::no_console(&mut cmd);
    let mut child = cmd.spawn().map_err(|e| format!("Cannot start {provider}: {e}"))?;
    let stdout = child.stdout.take().ok_or("Chat output unavailable")?;
    let stderr = child.stderr.take().ok_or("Chat errors unavailable")?;
    let out_thread = std::thread::spawn(move || read_bounded(stdout));
    let err_thread = std::thread::spawn(move || read_bounded(stderr));
    let mut stdin = child.stdin.take().ok_or("Chat input unavailable")?;
    if let Err(e) = stdin.write_all(prompt.as_bytes()) {
        let _ = child.kill();
        let _ = child.wait();
        let _ = out_thread.join();
        let _ = err_thread.join();
        return Err(format!("Chat input: {e}"));
    }
    drop(stdin);
    let status = wait_child(&mut child, TIMEOUT);
    let out = out_thread.join().map_err(|_| "Chat output reader failed")??;
    let err = err_thread.join().map_err(|_| "Chat error reader failed")??;
    let status = status?;
    let result = if status.success() {
        if let Some(path) = &output_file {
            let file = std::fs::File::open(path).map_err(|e| format!("Codex response: {e}"))?;
            let mut bytes = Vec::new();
            file.take(MAX_OUTPUT + 1).read_to_end(&mut bytes).map_err(|e| format!("Codex response: {e}"))?;
            if bytes.len() as u64 > MAX_OUTPUT { return Err("Codex response exceeded 1 MB.".into()); }
            String::from_utf8(bytes).map_err(|_| "Codex returned invalid text.")?
        } else {
            let parsed: Value = serde_json::from_str(&out).map_err(|_| "Claude returned an invalid response.")?;
            if parsed["is_error"] == true { return Err("Claude could not answer with the subscription client.".into()); }
            parsed["result"].as_str().ok_or("Claude returned no response.")?.to_string()
        }
    } else {
        let detail = if err.trim().is_empty() { out.trim() } else { err.trim() };
        Err(format!("{} chat failed: {}", if provider == CODEX { "Codex" } else { "Claude" }, detail.chars().take(400).collect::<String>()))?
    };
    let answer = result.trim();
    if answer.is_empty() { return Err("The subscription client returned an empty response.".into()); }
    Ok(answer.into())
}

fn remove_api_environment(cmd: &mut Command) {
    for key in ["OPENAI_API_KEY", "CODEX_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_BASE_URL", "OPENAI_BASE_URL", "CLAUDE_CODE_USE_BEDROCK",
        "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY", "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "GOOGLE_APPLICATION_CREDENTIALS"] {
        cmd.env_remove(key);
    }
}

fn check_plan_login(provider: &str, exe: &std::ffi::OsStr, workdir: &std::path::Path) -> Result<(), String> {
    if provider == CLAUDE {
        for name in ["settings.json", "settings.local.json"] {
            let path = platform::home_dir().join(".claude").join(name);
            if path.is_file() {
                let raw = std::fs::read_to_string(path).map_err(|_| "Cannot inspect Claude settings for API billing.")?;
                let v = serde_json::from_str::<Value>(&raw).map_err(|_| "Invalid Claude settings; subscription billing cannot be verified.")?;
                if {
                    v.get("apiKeyHelper").is_some()
                        || ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL",
                            "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY"]
                            .iter().any(|key| v["env"].get(key).is_some())
                } {
                    return Err("Claude API or cloud billing is configured. Subscription chat is disabled to avoid extra charges.".into());
                }
            }
        }
    }
    let mut command = Command::new(exe);
    if provider == CODEX { command.args(["login", "status"]); } else { command.args(["auth", "status"]); }
    command.current_dir(workdir).stdin(Stdio::null());
    remove_api_environment(&mut command);
    platform::no_console(&mut command);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|_| "Cannot check subscription sign-in.")?;
    wait_child(&mut child, Duration::from_secs(15))?;
    let output = child.wait_with_output().map_err(|_| "Cannot read subscription sign-in status.")?;
    if !output.status.success() { return Err("Sign in to the subscription client before using Coucou chat.".into()); }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let plan = if provider == CODEX {
        stdout.contains("Logged in using ChatGPT")
            || String::from_utf8_lossy(&output.stderr).contains("Logged in using ChatGPT")
    } else {
        serde_json::from_str::<Value>(&stdout).ok().is_some_and(|v| v["loggedIn"] == true
            && v["authMethod"] == "claude.ai" && v["apiProvider"] == "firstParty"
            && v["subscriptionType"].as_str().is_some_and(|s| !s.is_empty()))
    };
    if !plan { return Err("Subscription login not detected; API billing is blocked for this chat.".into()); }
    Ok(())
}

fn unique_suffix() -> u128 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() }

fn read_bounded(mut stream: impl Read) -> Result<String, String> {
    let mut bytes = Vec::new();
    let mut chunk = [0u8; 8192];
    let mut exceeded = false;
    loop {
        let n = stream.read(&mut chunk).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        if bytes.len() + n > MAX_OUTPUT as usize { exceeded = true; }
        if !exceeded { bytes.extend_from_slice(&chunk[..n]); }
    }
    if exceeded { return Err("Chat output exceeded 1 MB.".into()); }
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_the_latest_question_and_limits_history() {
        let turns = vec![json!({"role":"user","content":"Prima"}), json!({"role":"assistant","content":"Risposta"})];
        let prompt = build_prompt(&turns, "Ora?", None);
        assert!(prompt.contains("User: Prima\n\nAssistant: Risposta\n\nUser: Ora?"));
        assert!(prompt.contains("Do not inspect files"));
    }

    #[test]
    #[ignore = "requires the locally signed-in subscription clients"]
    fn signed_in_clients_answer_without_api_keys() {
        for provider in [CODEX, CLAUDE] {
            let answer = run(provider, "Rispondi soltanto OK. Do not use tools.").unwrap();
            assert!(answer.to_uppercase().contains("OK"), "{provider}: {answer}");
        }
    }
}

fn wait_child(child: &mut Child, timeout: Duration) -> Result<std::process::ExitStatus, String> {
    let start = Instant::now();
    loop {
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? { return Ok(status); }
        if start.elapsed() >= timeout {
            #[cfg(windows)] {
                let mut kill = Command::new("taskkill");
                kill.args(["/T", "/F", "/PID", &child.id().to_string()]);
                platform::no_console(&mut kill);
                let _ = kill.status();
            }
            let _ = child.kill();
            let _ = child.wait();
            return Err("Subscription client timed out.".into());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}
