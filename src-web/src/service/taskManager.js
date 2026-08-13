// 活跃传输任务计数（文件/图片上传等 Web 端进行中的网络请求）。
// 端口热切换跳转需要等所有任务执行完毕后才刷新，避免中断正在进行的传输。

let active = 0;
const idleCallbacks = new Set();

export function beginTask() {
    active += 1;
}

export function endTask() {
    active = Math.max(0, active - 1);
    if (active === 0) {
        idleCallbacks.forEach(cb => cb());
        idleCallbacks.clear();
    }
}

// 包装 Promise：开始计数，结束后立即释放（成功/失败都会释放）
export function track(promise) {
    beginTask();
    return Promise.resolve(promise).then(
        (v) => { endTask(); return v; },
        (e) => { endTask(); throw e; }
    );
}

export function hasActiveTasks() {
    return active > 0;
}

// 所有任务执行完毕后调用 cb；当前无任务则立即执行
export function whenIdle(cb) {
    if (active === 0) {
        cb();
    } else {
        idleCallbacks.add(cb);
    }
}