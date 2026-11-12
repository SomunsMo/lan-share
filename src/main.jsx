import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from "./App";
import {BrowserRouter} from "react-router";
import initI18n from "./i18n";
import { initMotion } from "./utils/motion.js";
import theme from "./theme";

// 支持 View Transitions 的平台由过渡 API 负责页面切换动画，
// 关闭 CSS 入场动画避免两套动效叠加。
// 注意：这里只能标记能力，是否真的播放过渡由 navTransition 决定；
// 若过渡在运行期失败，navTransition 会移除该标记，让 CSS 兜底动画重新生效。
if (typeof document.startViewTransition === "function") {
    document.documentElement.classList.add("vt-ready");
}

// 语言与动效偏好都就绪后再渲染：动效偏好决定首屏是否播放完整动画
Promise.all([initI18n(), initMotion()]).then(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(
        <React.StrictMode>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {/* unstable_useTransitions={false} 是 flushSync 生效的前提：
                    react-router v7 的 BrowserRouter 默认把路由更新包在 React.startTransition 里，
                    而 startTransition 的更新不会被 flushSync 同步提交，
                    于是 startViewTransition 的回调返回时新页面还没渲染，过渡就会拍下两张相同的快照。 */}
                <BrowserRouter unstable_useTransitions={false}>
                    <App/>
                </BrowserRouter>
            </ThemeProvider>
        </React.StrictMode>,
    );
});
