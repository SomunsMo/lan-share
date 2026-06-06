import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {BrowserRouter} from "react-router";
import initI18n from "./i18n";

// Initialize i18n before rendering
initI18n().then(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(
        <React.StrictMode>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </React.StrictMode>,
    );
});
