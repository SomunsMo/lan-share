import styled from "styled-components";

const Card = styled.div`
    display: flex;
    width: 30vw;
    min-width: 200px;
    //height: calc(30vw * 0.45);
    min-height: 240px;
    max-height: 61.8dvh;
    padding: 15px;
    margin: 10px;
    flex-grow: 1;
    flex-direction: column;

    background-color: whitesmoke;

    border-radius: 10px;
    overflow-x: hidden;
    overflow-y: auto;

    & > h1, & > h2, & > h3, & > h4, & > h5, & > h6 {
        margin: 4px auto;
    }

    form {
        display: flex;
        flex-direction: column;
        flex-grow: 1;

        justify-content: center;
    }

    .cardTips {
        padding: 0;
        margin: 0;
        color: dimgrey;
        font-size: small;
        text-align: left;
    }

    .cardTips::before {
        content: "说明：";
    }

`
export default Card;