import styled from "@emotion/styled";

const AboutStyle = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 40px 0;
    gap: 48px;

    .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
    }

    .hero-icon {
        width: 96px;
        height: 96px;
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-md);
    }

    .hero-icon img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }

    .hero-title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--on-surface);
    }

    .hero-version {
        display: inline-block;
        padding: 4px 12px;
        background: var(--surface-container);
        color: var(--on-surface-variant);
        border-radius: var(--radius-full);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.02em;
        border: var(--glass-border);
    }

    .bento-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        width: 100%;
        max-width: 600px;
    }

    @media (max-width: 768px) {
        .bento-grid {
            grid-template-columns: 1fr;
        }
    }

    .info-card {
        background: var(--surface-container-lowest);
        border: var(--glass-border);
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: var(--shadow-sm);
        transition: border-color var(--dur-fast) var(--ease);
    }

    .info-card:hover {
        border-color: var(--primary);
    }

    .info-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
    }

    .info-card-header svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: var(--primary);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .info-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .info-row + .info-row {
        margin-top: 16px;
    }

    .info-label {
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--on-surface-variant);
    }

    .info-value {
        font-size: 16px;
        font-weight: 400;
        color: var(--on-surface);
    }

    .info-value a {
        color: var(--primary);
        text-decoration: none;
    }

    .info-value a:hover {
        text-decoration: underline;
    }

    .license-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--surface-container-high);
        color: var(--on-surface);
        border-radius: var(--radius);
        border: var(--glass-border);
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: text-decoration var(--dur-fast) var(--ease);
    }

    .license-badge:hover {
        text-decoration: underline;
    }

    .license-large {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--surface-container-high);
        color: var(--on-surface);
        border-radius: var(--radius);
        border: var(--glass-border);
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
        transition: text-decoration var(--dur-fast) var(--ease);
        width: fit-content;
    }

    .license-large:hover {
        text-decoration: underline;
    }


`;

export default AboutStyle;
