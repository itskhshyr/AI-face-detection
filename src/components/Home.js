import React from "react";
import { useNavigate } from "react-router-dom";
import AiButton from "../assets/button-circle.png";
import ArrowIcon from "../assets/arrow-2.png";
const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="homepage-wrapper ">
      <div class=" d-flex justify-content-center flex-column">
        <div class="neon-text mb-3">برای شروع اسکن چهره خود کلیک کنید </div>
        <img src={ArrowIcon} className="mx-auto mt-4"  />
      </div>

      <img
        className="heartbeat mt-5 pt-5"
        width="500"
        onClick={() => navigate("/main")}
        src={AiButton}
      />
 

    </div>
  );
};

export default Home;
