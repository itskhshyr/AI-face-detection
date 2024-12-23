import AIDetection from "./components/AIDetection";
import AIGestures from "./components/AIGestures";

const App = () => {
  return (
    <>
      <div className="container-fluid vh-100">
        <div className="d-flex justify-content-center align-items-center p-4">
          <AIDetection />
        </div>
      </div>
      {/* <div>
        <AIGestures />
      </div> */}
    </>
  );
};

export default App;
