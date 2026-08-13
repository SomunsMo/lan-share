const STORAGE_KEY = 'lan-share-client-id';

export const getClientId = () => {
    let id;
    try { id = localStorage.getItem(STORAGE_KEY); } catch { /* localStorage 不可用则忽略 */ }
    if (!id) {
        id = (crypto.randomUUID && crypto.randomUUID()) ||
             'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
                c => { const r = Math.random()*16|0; const v = c==='x'?r:(r&0x3|0x8); return v.toString(16); });
        try { localStorage.setItem(STORAGE_KEY, id); } catch { /* localStorage 不可用则忽略 */ }
    }
    return id;
};

const listeners = new Set();
const statusListeners = new Set();
let source = null;
let reconnectCount = 0;
let retryTimer = null;
// 连接状态：connected 是否已连接；nextAttemptAt 下一次自动重连时刻（null=不在等待期）
// connecting 正在连接尝试中（源已建、await onopen/onerror）；retryStopped 超过 15 次失败已停止自动重试
let connected = false;
let nextAttemptAt = null;
let connecting = false;
let retryStopped = false;

// 重连退避：失败 <=5 次 5s、<=10 次 15s、<=15 次 30s；超过 15 次停止自动重试，仅保留手动重连
const RETRY_DELAYS = [5000, 15000, 30000];
const MAX_AUTO_RETRIES = 15;

function getRetryDelay() {
    if (reconnectCount <= 5) return RETRY_DELAYS[0];
    if (reconnectCount <= 10) return RETRY_DELAYS[1];
    return RETRY_DELAYS[2];
}

function emitStatus() {
    const status = {connected, nextAttemptAt, connecting, retryStopped};
    statusListeners.forEach(cb => cb(status));
}

export function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

// 订阅连接状态：{connected, nextAttemptAt, connecting, retryStopped}
export function subscribeStatus(cb) {
    statusListeners.add(cb);
    cb({connected, nextAttemptAt, connecting, retryStopped});
    return () => statusListeners.delete(cb);
}

// dispatch/onmessage 说明：正常 SSE 事件是 {kind, action, seq, ts} 形式的共享事件。
// 若载荷带有 type 字段（例如 {"type":"reload"}），则是后端检测到广播滞后下发的重载哨兵帧，
// 由订阅者自行处理，不属于共享事件，此处不做过滤。
function dispatch(parsed) {
    listeners.forEach(cb => cb(parsed));
}

export function startEventSource() {
    if (source) return;
    connecting = true;
    emitStatus();
    source = new EventSource('/api/events');
    source.onopen = () => {
        reconnectCount = 0; // 连接成功，重置重连退避
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
        connected = true;
        nextAttemptAt = null;
        connecting = false;
        retryStopped = false;
        emitStatus();
        console.debug('SSE connected');
    };
    source.onerror = () => {
        // 手动接管重连：关闭当前源，按失败次数分档延时重连，避免浏览器原生自动重连叠加定时器
        if (source) { source.close(); source = null; }
        connected = false;
        connecting = false;
        if (retryTimer) return; // 已有待执行重连，避免叠加
        reconnectCount += 1;
        if (reconnectCount > MAX_AUTO_RETRIES) {
            // 超过最大自动重试次数：停止自动重试，只保留手动重连按钮
            retryStopped = true;
            nextAttemptAt = null;
            emitStatus();
            console.debug(`SSE 连续失败 ${reconnectCount} 次，已停止自动重试`);
            return;
        }
        const delay = getRetryDelay();
        nextAttemptAt = Date.now() + delay;
        retryStopped = false;
        emitStatus();
        console.debug(`SSE 断开，${delay / 1000}s 后重连（第 ${reconnectCount} 次失败）`);
        retryTimer = setTimeout(() => { retryTimer = null; startEventSource(); }, delay);
    };
    source.onmessage = (msg) => {
        try {
            const evt = JSON.parse(msg.data);
            dispatch(evt);
        } catch (e) {
            console.error('SSE 数据解析失败', e);
        }
    };
}

// 手动重连：重置失败计数并取消待执行的自动重连，立即新建连接
export function retryNow() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (source) { source.close(); source = null; }
    reconnectCount = 0;
    connected = false;
    nextAttemptAt = null;
    connecting = false;
    retryStopped = false;
    emitStatus();
    startEventSource();
}

export function stopEventSource() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    if (source) { source.close(); source = null; }
    connected = false;
    nextAttemptAt = null;
    connecting = false;
    retryStopped = false;
    emitStatus();
}