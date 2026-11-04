// 访问密码相关的全局事件
// 任何接口返回 401 时通知界面切回登录页

const listeners = new Set();

export function onUnauthorized(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

export function emitUnauthorized() {
    listeners.forEach(cb => {
        try {
            cb();
        } catch (e) {
            console.error('处理未授权事件失败:', e);
        }
    });
}
