import styled from "@emotion/styled";

const Card = styled.div`
    display: flex;
    width: 30vw;
    min-width: 280px;
    min-height: 240px;
    max-height: 75vh;
    padding: 20px 24px;
    margin: 8px;
    flex-grow: 1;
    flex-direction: column;

    background-color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    overflow: hidden;

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
