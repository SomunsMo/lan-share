#!/usr/bin/env bash
# 在 mac 上用 Docker 构建与 GitHub Actions 完全一致的 deb/rpm 包
# 复刻 build-exe.yml 的 Linux 步骤：pnpm tauri build --bundles deb,rpm
# 前置：先运行 scripts/linux/build-linux.sh 预编译 Rust 依赖（加速，非必需）
# 产物：target/x86_64-unknown-linux-gnu/release/bundle/{deb,rpm}/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMG_NAME="lan-share-linux-builder"
# Linux 产物 root：CARGO_TARGET_DIR 指到 target，cargo 生成 target/x86_64-unknown-linux-gnu/
TARGET_DIR="$REPO_ROOT/target"
# cargo 缓存卷 + 两个 node_modules 卷（桌面端 + src-web），避免污染宿主机源码目录
CACHE_VOL="lan-share-cargo-cache"
ROOT_NODE_VOL="lan-share-root-node-modules"
WEB_NODE_VOL="lan-share-node-modules"

# 复用/预构建镜像；镜像已存在则跳过（避免每次 OrbStack 重建镜像的网络卡顿）
echo "[step 1] 检查镜像 $IMG_NAME ..."
if ! docker image inspect "$IMG_NAME" >/dev/null 2>&1; then
  echo "  镜像不存在，正在构建..."
  docker build -f "$REPO_ROOT/scripts/linux/Dockerfile.ubuntu24" -t "$IMG_NAME" "$REPO_ROOT"
else
  echo "  镜像已存在，跳过构建"
fi

# 容器内完整复刻 GitHub Linux 构建：pnpm install → pnpm tauri build --bundles deb,rpm
# 与 build-exe.yml 第 80-94 行逻辑一致
echo "[step 2] 容器内 pnpm tauri build --bundles deb,rpm ..."
docker run --rm \
  -v "$REPO_ROOT:/src" \
  -v "$TARGET_DIR:/target" \
  -v "$CACHE_VOL:/usr/local/cargo" \
  -v "$ROOT_NODE_VOL:/src/node_modules" \
  -v "$WEB_NODE_VOL:/src/src-web/node_modules" \
  --name lan-share-tauri-builder \
  "$IMG_NAME" \
  bash -c "
set -euo pipefail
export CARGO_TERM_COLOR=always
# CI 模式：避免 pnpm 因 no-TTY 要求清理 node_modules 确认时中止
export CI=true
# CARGO_TARGET_DIR=target，产物生成到 target/x86_64-unknown-linux-gnu/release/
export CARGO_TARGET_DIR=/target

# Rust 工具链来自缓存卷；补写 crates.io 中科大镜像配置（卷本身不含，用 base64 避免双层 shell 引号问题）
mkdir -p /usr/local/cargo
/usr/bin/base64 -d > /usr/local/cargo/config.toml <<'B64'
W3NvdXJjZS5jcmF0ZXMtaW9dCnJlcGxhY2Utd2l0aCA9ICJ1c3RjIgpbc291cmNlLnVzdGNdCnJlZ2lzdHJ5ID0gInNwYXJzZStodHRwczovL21pcnJvcnMudXN0Yy5lZHUuY24vY3JhdGVzLmlvLWluZGV4LyIK
B64

# 镜像内已内置 pnpm@11.3.0（Node 24，与 GitHub 一致）
pnpm --version

# 桌面端 + src-web 依赖（GitHub: pnpm install && cd src-web && pnpm install）
cd /src && pnpm install
cd /src/src-web && pnpm install

# 官方 bundler：自动生成依赖、图标、desktop 文件（与 GitHub 完全一致）
cd /src && pnpm tauri build -v -t x86_64-unknown-linux-gnu --bundles deb,rpm

echo '=== bundle 输出 ==='
find /target/x86_64-unknown-linux-gnu/release/bundle -type f 2>/dev/null || echo '(无 bundle)'
"

echo ""
echo "完成。产物在:"
echo "  $TARGET_DIR/x86_64-unknown-linux-gnu/release/bundle/deb/"
echo "  $TARGET_DIR/x86_64-unknown-linux-gnu/release/bundle/rpm/"
