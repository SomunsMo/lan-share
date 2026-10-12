import styled from "@emotion/styled";

const Card = styled.div`
    display: flex;
    width: 30vw;
    min-width: 280px;
    /* 内容区最小高度，视口过矮时由页面滚动兜底 */
    min-height: 230px;
    padding: 20px 24px;
    margin: 8px;
    flex-grow: 1;
    flex-direction: column;

    background-color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    /* 不裁剪：卡片内的记录/文件列表是滚动容器，部分安卓浏览器（如 Via）在
       overflow:hidden 祖先内部收不到列表的触摸滚动 */

    & > h1, & > h2, & > h3, & > h4, & > h5, & > h6 {
        margin: 4px auto;
    }

    form {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: center;
    }
`
export default Card;
