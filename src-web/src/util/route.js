// Web 端页面路由：基于 hash，与文件列表使用的 ?dir= 查询参数互不干扰。
// 形式为 `#/text`、`#/files`，缺省或非法值回落到默认页面。

export const ROUTE_TEXT = 'text';
export const ROUTE_FILES = 'files';
export const DEFAULT_ROUTE = ROUTE_TEXT;

const VALID_ROUTES = [ROUTE_TEXT, ROUTE_FILES];

export const DEFAULT_ROUTE_HASH = `#/${DEFAULT_ROUTE}`;

// 解析 hash 得到路由名
export const parseRoute = (hash) => {
    const name = (hash || '').replace(/^#\/?/, '').replace(/\/$/, '');
    return VALID_ROUTES.includes(name) ? name : DEFAULT_ROUTE;
};

export const getRouteHash = (route) => `#/${route}`;

// 当前页面路由
export const getCurrentRoute = () => parseRoute(window.location.hash);

// 切换路由（走 hashchange，可前进后退）
export const navigateTo = (route) => {
    if (getCurrentRoute() === route) return;
    window.location.hash = getRouteHash(route);
};

// 拼接当前路由 hash：文件列表用 pushState 改写 ?dir= 时不能把路由冲掉
export const withRouteHash = (pathAndQuery) => `${pathAndQuery}${window.location.hash || DEFAULT_ROUTE_HASH}`;