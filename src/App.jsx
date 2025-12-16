import "./App.css";
import Navbar from "./components/navbar/index.jsx";
import {useRoutes} from "react-router";
import {routes} from "./pages/_router-map.jsx";

function App() {
    return (
        <div className="container">
            <Navbar/>
            <main className={"content"}>
                {useRoutes(routes)}
            </main>
        </div>
    );
}

export default App;