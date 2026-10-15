import styled from "@emotion/styled";

const AppStyle = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
/* 根容器高度必须"确定"（height 而不是 min-height）：只有确定高度时 flex 才会把剩余空间
       分配给 .content，填满效果才生效；min-height 下 flex 不分配剩余空间，整页会变成滚动。
       代价是文档本身不可滚动，可滚动的只有卡片内的列表 */
    height: 100vh;
    height: 100svh;
    overflow: hidden;

    > main {
        position: relative;
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 40px 20px 10px;
        text-align: center;
        box-sizing: border-box;
    }

    .appTitle {
        margin-top: 10px;
        font-size: 1.8rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-primary);
    }

    .theme-btn {
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 0.88rem;
        transition: border-color 0.15s;
    }

    .theme-btn:hover {
        border-color: var(--accent);
    }

    .topLeftBar {
        position: absolute;
        top: 10px;
        left: 20px;
        z-index: 60;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .theme-toggle-btn,
    .lang-selector {
        display: inline-flex;
        align-items: center;
        height: 34px;
        padding: 0 14px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        color: var(--text-secondary);
        font-family: inherit;
        font-size: 0.88rem;
        line-height: 1;
        box-sizing: border-box;
        transition: border-color 0.15s;
    }

    .theme-toggle-btn:hover,
    .lang-selector:hover {
        border-color: var(--accent);
        background-color: var(--bg-card);
    }

    .lang-selector {
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-image: none;
        text-align: center;
        min-width: 72px;
        font-size: 0.78rem;
    }

    .appSubtitle {
        margin: 4px 0 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }

    .qrIcon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        padding: 5px;
        box-sizing: border-box;
        background-color: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 20px;
        cursor: pointer;
        transition: border-color 0.15s;

        img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }

    .qrIcon:hover {
        border-color: var(--accent);
    }

    /* 内容区：占满标题区以下的剩余高度；本身不作为滚动容器，放不下时整页滚动 */
    .content {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        width: 100%;
        max-width: 1400px;
        padding: 0 20px 20px;
        margin: 0 auto;
        align-items: center;
        box-sizing: border-box;
    }

    /* 行容器占满剩余高度，卡片靠 align-items: stretch 取同样高度，最低 230px */
    .textRow, .fileRow {
        display: flex;
        flex: 1;
        min-height: 230px;
        width: 100%;
        justify-content: center;
        align-items: stretch;
        box-sizing: border-box;
    }

    /* 图文共享：宽屏两张卡并排（单行，stretch 使两卡等高填满） */
    .textRow {
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 0;
    }

    /* 窄屏两张卡纵向排列：输入卡 38.2%、记录卡 61.8%（黄金比例）
       纵向排列时主轴变成竖直方向，justify-content 必须改回 flex-start：
       保持 center 会把超出部分同时压到上下两侧，内容被顶到标题区下面、底部还被裁掉
       卡片允许按比例收缩（min-height: 0），230px 下限由行容器 .textRow 的 min-height 承担，
       这样两张卡合计正好等于行高，不会溢出；flex-basis 各减 16px 是扣掉 Card 自带的上下 margin */
    @media (max-width: 767px) {
        .content .textRow {
            flex-direction: column;
            justify-content: flex-start;
        }

        .content .textRow .textCard {
            flex: 1 1 calc(38.2% - 16px);
            min-height: 0;
            width: auto;
        }

        .content .textRow .recordCard {
            flex-basis: calc(61.8% - 16px);
        }
    }
`

export default AppStyle;
