import styled from "styled-components";

const NavbarStyle = styled.nav`
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: var(--navbar-width);
    height: 100vh;
    flex-shrink: 0;
    user-select: none;
    overflow: hidden;
    background-color: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    position: sticky;
    top: 0;

    .logo-area {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 24px 20px 20px;
        flex-shrink: 0;
    }

    .logo-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius);
        background: var(--primary-container);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .logo-icon svg {
        width: 22px;
        height: 22px;
        fill: none;
        stroke: var(--on-primary-container);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .logo-text {
        display: flex;
        flex-direction: column;
    }

    .logo-brand {
        font-size: 18px;
        font-weight: 600;
        color: var(--on-surface);
        line-height: 1.2;
    }

    .logo-tagline {
        font-size: 11px;
        font-weight: 500;
        color: var(--on-surface-variant);
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    .nav-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px;
        overflow-y: auto;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border-radius: var(--radius-md);
        color: var(--on-surface-variant);
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        transition: all var(--dur-fast) var(--ease);
        text-decoration: none;
        cursor: pointer;
    }

    .nav-item:hover {
        background: var(--surface-container);
        color: var(--on-surface);
        transform: translateX(2px);
    }

    .nav-item.active {
        background: var(--primary-container);
        color: var(--on-primary-container);
        font-weight: 600;
    }

    .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .nav-item svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        display: block;
    }

    .nav-divider {
        height: 1px;
        background: var(--outline-variant);
        margin: 8px 20px;
        flex-shrink: 0;
    }

    .nav-bottom {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex-shrink: 0;
    }
`;

export default NavbarStyle;
