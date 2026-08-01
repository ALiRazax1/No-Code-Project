// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//   tauri::Builder::default()
//     .plugin(tauri_plugin_http::init())
//     .setup(|app| {
//       if cfg!(debug_assertions) {
//         app.handle().plugin(
//           tauri_plugin_log::Builder::default()
//             .level(log::LevelFilter::Info)
//             .build(),
//         )?;
//       }
//       Ok(())
//     })
//     .run(tauri::generate_context!())
//     .expect("error while running tauri application");
// }

// --------------------------------------

// #[tauri::command]
// async fn docker_request(path: String, method: String) -> Result<String, String> {
//     let client = reqwest::Client::new();
//     let url = format!("http://172.25.82.18:2375{}", path);

//     let res = match method.as_str() {
//         "POST" => client.post(&url).send().await,
//         _ => client.get(&url).send().await,
//     };

//     match res {
//         Ok(r) => r.text().await.map_err(|e| e.to_string()),
//         Err(e) => Err(e.to_string()),
//     }
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_http::init())
//         .invoke_handler(tauri::generate_handler![docker_request])
//         .setup(|app| {
//             if cfg!(debug_assertions) {
//                 app.handle().plugin(
//                     tauri_plugin_log::Builder::default()
//                         .level(log::LevelFilter::Info)
//                         .build(),
//                 )?;
//             }
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// ----------------------------------------------

// use std::process::Command;

// fn get_wsl_ip() -> String {
//     let output = Command::new("wsl")
//         .args(["-d", "Ubuntu", "--", "hostname", "-I"])
//         .output();

//     match output {
//         Ok(o) => {
//             let stdout = String::from_utf8_lossy(&o.stdout);
//             stdout.split_whitespace()
//                 .next()
//                 .unwrap_or("")
//                 .to_string()
//         }
//         Err(_) => String::new(),
//     }
// }

// #[tauri::command]
// async fn docker_request(path: String, method: String) -> Result<String, String> {
//     let ip = get_wsl_ip();
//     if ip.is_empty() {
//         return Err("WSL is not running".to_string());
//     }

//     let client = reqwest::Client::new();
//     let url = format!("http://{}:2375{}", ip, path);

//     let res = match method.as_str() {
//         "POST" => client.post(&url).send().await,
//         _ => client.get(&url).send().await,
//     };

//     match res {
//         Ok(r) => r.text().await.map_err(|e| e.to_string()),
//         Err(_) => Err("Docker is not running".to_string()),
//     }
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_http::init())
//         .invoke_handler(tauri::generate_handler![docker_request])
//         .setup(|app| {
//             if cfg!(debug_assertions) {
//                 app.handle().plugin(
//                     tauri_plugin_log::Builder::default()
//                         .level(log::LevelFilter::Info)
//                         .build(),
//                 )?;
//             }
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// =============================================
// Below Code Was Working
// ============================================
// use std::process::Command;
// use std::sync::OnceLock;

// #[cfg(windows)]
// use std::os::windows::process::CommandExt;

// const CREATE_NO_WINDOW: u32 = 0x08000000;

// static WSL_IP: OnceLock<String> = OnceLock::new();

// fn get_wsl_ip() -> String {
//     WSL_IP.get_or_init(|| {
//         #[cfg(windows)]
//         let output = Command::new("wsl")
//             .args(["-d", "Ubuntu", "--", "hostname", "-I"])
//             .creation_flags(CREATE_NO_WINDOW)
//             .output();

//         #[cfg(not(windows))]
//         let output = Command::new("wsl")
//             .args(["-d", "Ubuntu", "--", "hostname", "-I"])
//             .output();

//         match output {
//             Ok(o) => {
//                 let stdout = String::from_utf8_lossy(&o.stdout);
//                 stdout.split_whitespace()
//                     .next()
//                     .unwrap_or("")
//                     .to_string()
//             }
//             Err(_) => String::new(),
//         }
//     }).clone()
// }

// #[tauri::command]
// async fn docker_request(path: String, method: String) -> Result<String, String> {
//     let ip = get_wsl_ip();
//     if ip.is_empty() {
//         return Err("WSL is not running".to_string());
//     }

//     let client = reqwest::Client::new();
//     let url = format!("http://{}:2375{}", ip, path);

//     let res = match method.as_str() {
//         "POST" => client.post(&url).send().await,
//         _ => client.get(&url).send().await,
//     };

//     match res {
//         Ok(r) => r.text().await.map_err(|e| e.to_string()),
//         Err(_) => Err("Docker is not running".to_string()),
//     }
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_http::init())
//         .invoke_handler(tauri::generate_handler![docker_request])
//         .setup(|app| {
//             if cfg!(debug_assertions) {
//                 app.handle().plugin(
//                     tauri_plugin_log::Builder::default()
//                         .level(log::LevelFilter::Info)
//                         .build(),
//                 )?;
//             }
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// =========================================================
// No socat needed. working perfectly but starting wsl itself
// =========================================================
// use std::process::Command;

// #[cfg(windows)]
// use std::os::windows::process::CommandExt;

// const CREATE_NO_WINDOW: u32 = 0x08000000;

// fn run_docker(path: &str, method: &str) -> Result<String, String> {
//     let url = format!("http://localhost{}", path);

//     let mut cmd = Command::new("wsl");
//     cmd.args([
//         "-d", "Ubuntu",
//         "--",
//         "curl",
//         "--silent",
//         "--unix-socket", "/var/run/docker.sock",
//         "-X", method,
//         "-H", "Content-Type: application/json",
//         &url,
//     ]);

//     #[cfg(windows)]
//     cmd.creation_flags(CREATE_NO_WINDOW);

//     let output = cmd.output().map_err(|e| e.to_string())?;

//     if output.status.success() {
//         Ok(String::from_utf8_lossy(&output.stdout).to_string())
//     } else {
//         let stderr = String::from_utf8_lossy(&output.stderr).to_string();
//         if stderr.is_empty() {
//             Err("WSL is not running".to_string())
//         } else {
//             Err(stderr)
//         }
//     }
// }

// #[tauri::command]
// async fn docker_request(path: String, method: String) -> Result<String, String> {
//     tokio::task::spawn_blocking(move || run_docker(&path, &method))
//         .await
//         .map_err(|e| e.to_string())?
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_http::init())
//         .invoke_handler(tauri::generate_handler![docker_request])
//         .setup(|app| {
//             if cfg!(debug_assertions) {
//                 app.handle().plugin(
//                     tauri_plugin_log::Builder::default()
//                         .level(log::LevelFilter::Info)
//                         .build(),
//                 )?;
//             }
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
// ===============================================
// App is working fine, but wsl is keep running even if I log out from the linux
// ===============================================
// use std::process::Command;

// #[cfg(windows)]
// use std::os::windows::process::CommandExt;

// const CREATE_NO_WINDOW: u32 = 0x08000000;

// fn is_wsl_running() -> bool {
//     let mut cmd = Command::new("wsl");
//     cmd.args(["--list", "--running", "--quiet"]);

//     #[cfg(windows)]
//     cmd.creation_flags(CREATE_NO_WINDOW);

//     match cmd.output() {
//         Ok(o) => {
//             // WSL outputs UTF-16 LE on Windows — decode it properly
//             let bytes = &o.stdout;
//             if bytes.len() < 2 {
//                 return false;
//             }
//             // Convert UTF-16 LE bytes to u16 pairs then to String
//             let utf16: Vec<u16> = bytes
//                 .chunks_exact(2)
//                 .map(|b| u16::from_le_bytes([b[0], b[1]]))
//                 .collect();
//             let decoded = String::from_utf16_lossy(&utf16);
//             decoded.contains("Ubuntu")
//         }
//         Err(_) => false,
//     }
// }

// fn run_docker(path: &str, method: &str) -> Result<String, String> {
//     if !is_wsl_running() {
//         return Err("WSL is not running".to_string());
//     }

//     let url = format!("http://localhost{}", path);

//     let mut cmd = Command::new("wsl");
//     cmd.args([
//         "-d", "Ubuntu",
//         "--",
//         "curl",
//         "--silent",
//         "--unix-socket", "/var/run/docker.sock",
//         "-X", method,
//         "-H", "Content-Type: application/json",
//         &url,
//     ]);

//     #[cfg(windows)]
//     cmd.creation_flags(CREATE_NO_WINDOW);

//     let output = cmd.output().map_err(|e| e.to_string())?;

//     if output.status.success() {
//         let result = String::from_utf8_lossy(&output.stdout).to_string();
//         if result.trim().is_empty() {
//             Err("Docker is not running".to_string())
//         } else {
//             Ok(result)
//         }
//     } else {
//         Err("Docker is not running".to_string())
//     }
// }

// #[tauri::command]
// async fn docker_request(path: String, method: String) -> Result<String, String> {
//     tokio::task::spawn_blocking(move || run_docker(&path, &method))
//         .await
//         .map_err(|e| e.to_string())?
// }

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_http::init())
//         .invoke_handler(tauri::generate_handler![docker_request])
//         .setup(|app| {
//             if cfg!(debug_assertions) {
//                 app.handle().plugin(
//                     tauri_plugin_log::Builder::default()
//                         .level(log::LevelFilter::Info)
//                         .build(),
//                 )?;
//             }
//             Ok(())
//         })
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// =============================================

// =============================================
use std::process::Command;
use std::sync::Mutex;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// Cache IP — fetched once, cleared on connection failure
static WSL_IP: Mutex<Option<String>> = Mutex::new(None);

fn is_wsl_running() -> bool {
    let mut cmd = Command::new("wsl");
    cmd.args(["--list", "--running", "--quiet"]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(o) => {
            let bytes = &o.stdout;
            if bytes.len() < 2 {
                return false;
            }
            let utf16: Vec<u16> = bytes
                .chunks_exact(2)
                .map(|b| u16::from_le_bytes([b[0], b[1]]))
                .collect();
            let decoded = String::from_utf16_lossy(&utf16);
            decoded.contains("Ubuntu")
        }
        Err(_) => false,
    }
}

fn fetch_wsl_ip() -> Option<String> {
    let mut cmd = Command::new("wsl");
    cmd.args(["-d", "Ubuntu", "--", "hostname", "-I"]);

    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(o) if o.status.success() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            stdout.split_whitespace().next().map(|s| s.to_string())
        }
        _ => None,
    }
}

fn get_cached_ip() -> Option<String> {
    let mut cache = WSL_IP.lock().unwrap();
    if cache.is_none() {
        *cache = fetch_wsl_ip();
    }
    cache.clone()
}

fn clear_ip_cache() {
    *WSL_IP.lock().unwrap() = None;
}

fn run_docker(path: &str, method: &str) -> Result<String, String> {
    // Step 1 — check WSL without starting it
    if !is_wsl_running() {
        clear_ip_cache();
        return Err("WSL is not running".to_string());
    }

    // Step 2 — get cached IP (WSL already running so safe)
    let ip = get_cached_ip().ok_or("Could not get WSL IP".to_string())?;
    let url = format!("http://{}:2375{}", ip, path);

    // Step 3 — talk to Docker over TCP
    let client = reqwest::blocking::Client::new();
    let res = match method {
        "POST" => client.post(&url).send(),
        _ => client.get(&url).send(),
    };

    match res {
        Ok(r) => r.text().map_err(|e| e.to_string()),
        Err(_) => {
            clear_ip_cache();
            Err("Docker is not running. Run: sudo service docker start".to_string())
        }
    }
}

#[tauri::command]
async fn docker_request(path: String, method: String) -> Result<String, String> {
    tokio::task::spawn_blocking(move || run_docker(&path, &method))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![docker_request])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}