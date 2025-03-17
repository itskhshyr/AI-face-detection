import AIDetection from "./components/AIDetection";
import Home from "./components/Home";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  BrowserRouter,
} from "react-router-dom";
const App = () => {
  const RoutesToShow = () => {
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/main" element={<AIDetection />} />
      </Routes>
    );
  };
  return (
    <Router>
      <RoutesToShow />
    </Router>
  );
};

export default App;
