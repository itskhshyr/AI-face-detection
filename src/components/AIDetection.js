import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import io from "socket.io-client";
import ageIcon from "../assets/age.png";
import genderIcon from "../assets/gender.png";
import happy from "../assets/happy.png";
import normal from "../assets/normal.png";
import sad from "../assets/sad.png";
import angry from "../assets/angry.png";
import sup from "../assets/sup.png";
import { useNavigate } from "react-router-dom";
import backIcon from "../assets/back.png";

const AIDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceTimers, setFaceTimers] = useState({});
  const [intervals, setIntervals] = useState({}); // ذخیره `setInterval` برای هر چهره
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.ageGenderNet.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        startVideo();
      } catch (error) {
        console.error("Error loading models: ", error);
      }
    };

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setLoading(false); // 🔹 وقتی ویدیو مقدار گرفت، لودینگ خاموش شو
      } catch (err) {
        console.error("Error accessing webcam: ", err);
      }
    };

    // Initialize socket connection
    socketRef.current = io("wss://faceapi.liara.run/", {
      query: {
        token:
          // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0MTg1NTAwNCwianRpIjoiYzAzMmMzYjctOWM3Mi00N2VmLTgxNGEtNTY1YTdkNGE5YTI4IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjEiLCJuYmYiOjE3NDE4NTUwMDQsImNzcmYiOiI5MmEzNDA0Mi1jMWM4LTQ1YTYtYWE1ZC0yNTJlMzAyNmFlM2YiLCJleHAiOjE3NDMxNTEwMDR9.lhchUckl1NHX2PX6SzoLKgEKIrQT83kdgL03B2ndmLU"
          "08b58360ee4dd193b958e3cc165cf66b22098efdca099e32a4a7368511910950",
      },
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socketRef.current.on("response", (data) => {
      console.log("Response from server:", data);
    });

    socketRef.current.on("new_face_data", (data) => {
      console.log("New Face Data from server:", data);
    });

    socketRef.current.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    loadModels();

    // Cleanup socket connection on component unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const getExpressionImage = (expression) => {
    switch (expression) {
      case "neutral":
        return normal;
      case "sad":
        return sad;
      case "happy":
        return happy;
      case "angry":
        return angry;
      case "surprised":
        return sup;
      default:
        return normal;
    }
  };

  const drawTextCardOnCanvas = (context, texts, expression, x, y) => {
    context.font = "26px yekan";
    context.textBaseline = "top";
    context.fillStyle = "black"; // رنگ متن

    const padding = 15;
    const lineHeight = 49;
    const iconSize = 70; // اندازه‌ی آیکون احساسات
    const spaceForIcon = 20; // فضای اضافه برای تصویر احساس
    const textWidth =
      Math.max(...texts.map((text) => context.measureText(text).width)) +
      spaceForIcon;
    const textHeight = texts.length * lineHeight;
    const radius = 16;

    // 🛠️ رسم پس‌زمینه‌ی مشکی شفاف
    context.fillStyle = "rgba(0, 0, 0, 0.8)";
    context.beginPath();
    context.moveTo(x - padding + radius, y - padding);
    context.lineTo(x + textWidth + padding - radius, y - padding);
    context.quadraticCurveTo(
      x + textWidth + padding,
      y - padding,
      x + textWidth + padding,
      y - padding + radius
    );
    context.lineTo(x + textWidth + padding, y + textHeight + padding - radius);
    context.quadraticCurveTo(
      x + textWidth + padding,
      y + textHeight + padding,
      x + textWidth + padding - radius,
      y + textHeight + padding
    );
    context.lineTo(x - padding + radius, y + textHeight + padding);
    context.quadraticCurveTo(
      x - padding,
      y + textHeight + padding,
      x - padding,
      y + textHeight + padding - radius
    );
    context.lineTo(x - padding, y - padding + radius);
    context.quadraticCurveTo(
      x - padding,
      y - padding,
      x - padding + radius,
      y - padding
    );
    context.closePath();
    context.fill();

    // 🎨 نمایش متن‌ها و تصویر احساسات
    context.fillStyle = "white";
    texts.forEach((text, index) => {
      const textX = x;
      const textY = y + index * lineHeight;

      if (text.startsWith("احساس:")) {
        // 📌 نمایش تصویر احساس کنار متن
        const img = new Image();
        img.src = getExpressionImage(expression);
        img.onload = () => {
          const imgX = textX + context.measureText(text).width + 70; // موقعیت کنار متن
          const imgY = textY - 28; // کمی بالاتر برای تراز شدن
          context.drawImage(img, imgX, imgY, iconSize, iconSize);
        };
      }

      context.fillText(text, textX, textY);
    });
  };

  const handleVideoPlay = () => {
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current) {
        return;
      }

      const video = videoRef.current;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withAgeAndGender()
        .withFaceExpressions()
        .withFaceDescriptors();

      // Format and send detections via WebSocket
      if (detections.length > 0 && socketRef.current?.connected) {
        socketRef.current.emit("submit_face_data", {
          faces: detections.map((detection) => ({
            detection: {
              _imageDims: {
                _width: video.videoWidth,
                _height: video.videoHeight,
              },
              _score: detection.detection._score,
              _classScore: detection.detection._classScore,
              _className: "",
              _box: {
                _x: detection.detection._box._x,
                _y: detection.detection._box._y,
                _width: detection.detection._box._width,
                _height: detection.detection._box._height,
              },
            },
            landmarks: {
              _imgDims: {
                _width: Math.round(detection.detection._box._width),
                _height: Math.round(detection.detection._box._height),
              },
              _shift: {
                _x: detection.detection._box._x,
                _y: detection.detection._box._y,
              },
              _positions: detection.landmarks.positions.map((pos) => ({
                _x: pos._x,
                _y: pos._y,
              })),
            },
            unshiftedLandmarks: {
              _imgDims: {
                _width: Math.round(detection.detection._box._width),
                _height: Math.round(detection.detection._box._height),
              },
              _shift: {
                _x: 0,
                _y: 0,
              },
              _positions: detection.landmarks.positions.map((pos) => ({
                _x: pos._x - detection.detection._box._x,
                _y: pos._y - detection.detection._box._y,
              })),
            },
            alignedRect: {
              _imageDims: {
                _width: video.videoWidth,
                _height: video.videoHeight,
              },
              _score: detection.detection._score,
              _classScore: detection.detection._score,
              _className: "",
              _box: {
                _x: detection.detection._box._x,
                _y: detection.detection._box._y,
                _width: detection.detection._box._width,
                _height: detection.detection._box._height,
              },
            },
            descriptor: Object.fromEntries(
              Array.from(detection.descriptor).map((value, index) => [
                index,
                value,
              ])
            ),
            gender: detection.gender,
            genderProbability: detection.genderProbability,
            age: detection.age,
            expressions: detection.expressions,
          })),
        });
      }

      // Rest of your existing canvas drawing code
      const canvas = canvasRef.current;
      const displaySize = {
        width: video.videoWidth,
        height: video.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.clearRect(0, 0, canvas.width, canvas.height);

      let activeFaceIds = [];

      detections.forEach((result) => {
        const { x, y, width } = result.detection.box;
        const centerX = x + width / 2 + 50;
        const faceId = `${Math.round(x)}-${Math.round(y)}`;

        activeFaceIds.push(faceId);

        // ✅ اگر چهره جدید است، تایمر را شروع کن
        if (!intervals[faceId]) {
          setFaceTimers((prev) => ({
            ...prev,
            [faceId]: prev[faceId] || 0, // مقدار قبلی را نگه دار
          }));

          const intervalId = setInterval(() => {
            setFaceTimers((prev) => {
              const newTimers = { ...prev };
              newTimers[faceId] = (prev[faceId] || 0) + 1; // افزایش مقدار
              return newTimers;
            });
          }, 1000);

          setIntervals((prev) => ({ ...prev, [faceId]: intervalId }));
        }

        const emotions = result.expressions;
        const sortedEmotions = Object.entries(emotions).sort(
          (a, b) => b[1] - a[1]
        );

        // 🎨 نمایش اطلاعات روی صفحه
        drawTextCardOnCanvas(
          context,
          [
            `⏳ زمان حضور: ${faceTimers[faceId] || 0} ثانیه`,
            `سن: ${Math.round(result.age)}`,
            `جنسیت: ${result.gender === "male" ? "آقا 🧔🏻‍♂️" : "خانم 👩🏻‍🦰"}`,
            `احساس: ${sortedEmotions[0][0]} (${Math.round(
              sortedEmotions[0][1] * 100
            )}%)`,
          ],
          sortedEmotions[0][0], // ارسال نوع احساس برای دریافت تصویر
          centerX,
          y - 80
        );
      });

      // ✨ چهره‌هایی که دیگر در تصویر نیستند، تایمرشان را حذف کن
      Object.keys(faceTimers).forEach((faceId) => {
        if (!activeFaceIds.includes(faceId)) {
          clearInterval(intervals[faceId]); // متوقف کردن تایمر
          setFaceTimers((prev) => {
            const updatedTimers = { ...prev };
            delete updatedTimers[faceId];
            return updatedTimers;
          });
          setIntervals((prev) => {
            const updatedIntervals = { ...prev };
            delete updatedIntervals[faceId];
            return updatedIntervals;
          });
        }
      });

      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

      requestAnimationFrame(detectFaces);
    };
    requestAnimationFrame(detectFaces);
  };

  //  useEffect(()=>{

  //  },[socketRef.current])

  return (
    <div
      className={`d-flex flex-column Ai-detection-wrapper pt-5 vh-100 ${
        loading ? "blurres" : ""
      }`}
    >
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <div
        className="d-flex justify-content-between align-items-center  text-white px-5"
        onClick={() => navigate("/")}
      >
        <div className="back-btn">
          <span
            style={{ fontFamily: "popins", fontSize: "18px" }}
            className="me-1"
          >
            بازگشت
          </span>
          <img className="ms-1" src={backIcon} />
        </div>
        <div className="brand">طراحی و توسعه شرکت دانش آوران</div>
      </div>
      <div class="neon-line"></div>
      <div className="">
        <video
          ref={videoRef}
          autoPlay
          muted
          onPlay={handleVideoPlay}
          style={styles.video}
        />
        <canvas ref={canvasRef} style={styles.canvas} />
      </div>
    </div>
  );
};

const styles = {
  video: {
    position: "absolute",
    width: 900,
    height: 650,
    left: "50%",
    transform: "translateX(-50%)",
  },
  canvas: {
    border: "13px solid #fff",
    borderRadius: "24px",
    position: "absolute",
    width: 900,
    height: 650,
    left: "50%",
    transform: "translateX(-50%)",
  },
  message: { marginTop: "3rem", color: "black", textAlign: "center" },
};

// 🔹 استایل‌های CSS
const loadingStyles = `
.ai-detection-wrapper {
  position: relative;
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

.video-container {
  position: relative;
  transition: filter 0.5s ease;
}

.blurred {
  filter: blur(10px);
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.spinner {
  width: 160px;
  height: 160px;
  border: 10px solid rgba(255, 255, 255, 0.3);
  border-top: 10px solid #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// 🔹 اضافه کردن CSS به صفحه
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = loadingStyles;
document.head.appendChild(styleSheet);

export default AIDetection;
