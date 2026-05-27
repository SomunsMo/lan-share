fn main() {
    tauri_build::build();

    // 构建 web 前端并嵌入到可执行程序
    let manifest_dir = std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let src_web_dir = manifest_dir.join("..").join("src-web");
    let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());

    if !src_web_dir.join("package.json").exists() {
        // src-web 不存在时使用 fallback，不会 panic 阻塞开发
        let fallback = r#"pub const FRONTEND_HTML: &str = "<!DOCTYPE html><title>LAN Share</title><body>Client Page Not Found</body>";"#;
        std::fs::write(out_dir.join("frontend_html.rs"), fallback).unwrap();
        println!("cargo:warning=src-web not found, skipped web frontend build");
        return;
    }

    // 检查 node_modules，避免不清晰的报错
    if !src_web_dir.join("node_modules").exists() {
        panic!("src-web/node_modules not found. Run 'cd src-web && pnpm install' first.");
    }

    // 执行 src-web 打包
    let pnpm_cmd = if cfg!(target_os = "windows") {
        "pnpm.cmd"
    } else {
        "pnpm"
    };
    let status = std::process::Command::new(pnpm_cmd)
        .args(["run", "build"])
        .current_dir(&src_web_dir)
        .status()
        .expect("failed to execute pnpm build for src-web");

    if !status.success() {
        panic!("Web frontend build failed (exit code: {:?})", status.code());
    }

    // 读取打包后的 HTML 并嵌入
    let dist_dir = src_web_dir.join("dist");
    let html = std::fs::read_to_string(dist_dir.join("index.html"))
        .expect("built frontend index.html not found");

    let embedded = format!("pub const FRONTEND_HTML: &str = {:?};", html);
    std::fs::write(out_dir.join("frontend_html.rs"), embedded)
        .expect("failed to write frontend_html.rs");

    // 最后，给 下一次构建 声明一下编译本文件(build.rs)的前置条件

    // 下方输出语句改变编译流程原理：
    // Cargo 会解析 build.rs 所有 stdout 输出，识别 "cargo:" 前缀的指令。
    // "rerun-if-changed" 指令告知 Cargo 仅当所列路径变化时才重跑 build.rs；
    // 一旦输出过此指令，Cargo 即认为构建脚本已明确声明依赖，不再自动监控其他文件。
    println!("cargo:rerun-if-changed=../src-web/src");
    println!("cargo:rerun-if-changed=../src-web/package.json");
    println!("cargo:rerun-if-changed=../src-web/vite.config.js");
}
