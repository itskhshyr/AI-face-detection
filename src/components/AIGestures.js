import React, { useEffect, useRef, useState } from "react";
import * as handTrack from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import "@tensorflow/tfjs";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

const AIGestures = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [fingerCount, setFingerCount] = useState(0);

  useEffect(() => {
    const handsModel = new handTrack.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    handsModel.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    handsModel.onResults(onResults);

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await handsModel.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });

    camera.start();

    function calculateFingerCount(landmarks) {
      const fingerTips = [4, 8, 12, 16, 20];
      let count = 0;

      for (let tip of fingerTips) {
        if (landmarks[tip].y < landmarks[tip - 2].y) {
          count++;
        }
      }

      return count;
    }

    function onResults(results) {
      if (!results.multiHandLandmarks) return;

      const landmarks = results.multiHandLandmarks[0];
      const count = calculateFingerCount(landmarks);
      setFingerCount(count);

      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
        drawConnectors(context, landmarks, handTrack.HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 5 });
        drawLandmarks(context, landmarks, { color: "#FF0000", lineWidth: 2 });
      }
    }
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
      />
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1, width: "100%", height: "100%" }}
      />
      <div style={{ position: "absolute", top: "20px", left: "20px", color: "white", fontSize: "24px" }}>
        <h2>Detected Finger Count: {fingerCount}</h2>
      </div>
    </div>
  );
};

