import styled from "styled-components";

const NavbarStyle = styled.div`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--navbar-width);
    height: 100%;
    flex-shrink: 0;
    user-select: none;
    overflow: hidden;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border);

    ul {
        display: flex;
        flex-direction: column;
        width: 100%;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
    }

    li {
        box-sizing: border-box;
        margin: 1px 8px;
        flex-shrink: 0;
        list-style: none;
        border-radius: var(--radius);
        cursor: pointer;
    }

    li:hover {
        background-color: var(--bg-hover);
    }

    li.active {
        background-color: var(--bg-hover);
    }

    li .nav-icon {
        display: inline-flex;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        margin-right: 10px;
    }

    li .nav-icon svg {
        width: 18px;
        height: 18px;
        stroke: var(--text-secondary);
        fill: none;
        stroke-width: 1.6;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    li.active .nav-icon svg {
        stroke: var(--text-primary);
    }

    li > a {
        display: flex;
        padding: 9px 12px;
        flex-grow: 1;
        font-size: 0.88rem;
        font-weight: 400;
        align-items: center;
        color: var(--text-primary);
        text-decoration: none;
    }

    .top {
        flex-grow: 1;
        padding-top: 8px;
    }

    .bottom {
        position: relative;
        flex-grow: 0;
        flex-shrink: 0;
        padding: 6px 0 10px;
    }

    .bottom::before {
        content: '';
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 24px);
        height: 1px;
        background-color: var(--border);
    }
`

export default NavbarStyle;
