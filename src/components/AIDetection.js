import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import ageIcon from "../assets/age.png";
import genderIcon from "../assets/gender.png";
import happy from "../assets/happy.png";
import normal from "../assets/normal.png";
import sad from "../assets/sad.png";
import angry from "../assets/angry.png";
import sup from "../assets/sup.png";

const AIDetection = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [age, setAge] = useState(null);
  const [gender, setGender] = useState(null);
  const [genderProbability, setGenderProbability] = useState(null);
  const [isProcessingAge, setIsProcessingAge] = useState(false); // برای جلوگیری از پردازش مکرر سن
  const [expression, setExpression] = useState(null); // برای ذخیره احساس چهره
  useEffect(() => {
    const loadModels = async () => {
      try {
        // بارگذاری مدل‌ها از پوشه public/models
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.ageGenderNet.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        console.log("Emotion model loaded successfully");

        // دسترسی به وب‌کم
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
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam: ", err);
      }
    };

    loadModels();
  }, []);

  const getExpressionImage = (expression) => {
    if (expression === "neutral") {
      return normal;
    } else if (expression === "sad") {
      return sad;
    } else if (expression === "happy") {
      return happy;
    } else if (expression === "angry") {
      return angry;
    } else if (expression === "surprised") {
      return sup;
    } else {
      return normal; // اگر حالت ناشناخته باشد یا هیچ کدام از شرایط برآورده نشود
    }
  };

  const handleVideoPlay = () => {
    // تعریف یک متغیر برای جلوگیری از فراخوانی مکرر
    let lastTime = Date.now();

    const detectFaces = async () => {
      // اگر مدت زمان زیادی از آخرین فراخوانی گذشته باشد، تشخیص چهره انجام شود
      if (Date.now() - lastTime > 100) {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;

          // تشخیص چهره و استخراج سن و جنسیت
          const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withAgeAndGender()
            .withFaceExpressions(); // اضافه کردن مدل احساسات

          // لاگ نتایج تشخیص چهره
          console.log("Detections:", detections);

          // اگر چهره‌ای شناسایی شد، جنسیت را ذخیره می‌کنیم
          if (detections && detections.length > 0) {
            const result = detections[0]; // گرفتن اولین چهره (اگر چند چهره باشد)
            setGender(result.gender);
            setGenderProbability(result.genderProbability);

            // فقط برای سن، پردازش را زمانی شروع می‌کنیم که کاربر ثابت جلوی دوربین باشد
            if (!isProcessingAge) {
              setIsProcessingAge(true);
              // شروع تایمر برای پردازش سن بعد از 3 ثانیه
              setTimeout(() => {
                setAge(result.age);
                setIsProcessingAge(false);
              }, 3000); // 3 ثانیه انتظار
            }

            console.log("result.expressions", result.expressions); // برای بررسی اینکه آیا احساسات در داده‌ها موجود است
            // بررسی اینکه آیا expressions موجود است یا خیر
            if (result.expressions) {
              const emotions = result.expressions;
              const dominantEmotion = Object.keys(emotions).reduce((a, b) =>
                emotions[a] > emotions[b] ? a : b
              ); // پیدا کردن احساس غالب
              setExpression(dominantEmotion); // ذخیره احساس غالب
            } else {
              setExpression("No emotion detected"); // در صورتی که احساسات وجود ندارد
            }
          }

          // تنظیم ابعاد ویدیو و canvas
          const canvas = canvasRef.current;
          const displaySize = {
            width: video.videoWidth,
            height: video.videoHeight,
          };
          faceapi.matchDimensions(canvas, displaySize);

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );
          const context = canvas.getContext("2d");

          // پاک کردن canvas
          context.clearRect(0, 0, canvas.width, canvas.height);

          // رسم شناسایی چهره
          faceapi.draw.drawDetections(canvas, resizedDetections);

          // نمایش سن و جنسیت
          resizedDetections.forEach((result) => {
            const { x, y } = result.detection.box;

            // نمایش اطلاعات
            context.fillStyle = "red";
            context.font = "16px Arial";
            context.fillText(
              `${result.gender} (${Math.round(
                result.genderProbability * 100
              )}%)`,
              x,
              y - 10
            );
            if (age !== null) {
              context.fillText(`Age: ${Math.round(age)}`, x, y - 30);
            }
          });
        }
        lastTime = Date.now(); // بروزرسانی زمان آخرین تشخیص
      }

      // فراخوانی مجدد در هر فریم برای جلوگیری از متوقف شدن آن
      requestAnimationFrame(detectFaces);
    };

    // شروع به تشخیص چهره‌ها
    requestAnimationFrame(detectFaces);
  };

  return (
    <div
      className="shadow mt-5"
      style={{ border: "6px solid #fff", borderRadius: "24px" }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        onPlay={handleVideoPlay}
        className="video-container"
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
        }}
      />

      {/* نمایش جنسیت و سن در بخش UI */}
      <div
        style={{
          position: "absolute",
          bottom: "20rem",
          left: "50%",
          transform: "translateX(-50%)",
          color: "white",
          textAlign: "center", // برای تراز وسط متن
        }}
      >
        <div className="d-flex align-items-center mx-auto font-container">
          <div className="d-flex align-items-center mx-3">
            <div className=" rounded-container ">
              <img src={ageIcon} className="img-fluid" />
            </div>
            <div className="mx-4">{age !== null ? Math.round(age) : "-"}</div>
          </div>

          <div className="d-flex align-items-center mx-3">
            <div className=" rounded-container ">
              <img src={genderIcon} className="img-fluid" />
            </div>
            <div className="mx-4">
              {gender
                ? gender === "male"
                  ? "آقا"
                  : gender === "female"
                  ? "خانم"
                  : "-"
                : "-"}
            </div>
          </div>

          <div className="d-flex align-items-center mx-3">
            <div className=" rounded-container ">
              <img
                src={getExpressionImage(expression)}
                className="img-fluid d-flex align-items-center align-items-center mx-auto"
                alt="Emotion Sticker"
              />
            </div>
            <div className="mx-4">{expression ? expression : "-"}</div>
          </div>
        </div>

        <div className="mt-5">
          <span>درصد تخمین : </span>
          <span>
            {genderProbability
              ? Math.round(genderProbability * 100)
              : "Not detected"}
            %
          </span>
        </div>
        {/* <h2>Detected Information:</h2>
        <p>Gender: {gender ? gender : "Not detected"}</p>
        <p>
          Gender Probability:{" "}
          {genderProbability
            ? Math.round(genderProbability * 100)
            : "Not detected"}
          %
        </p>
        <p>Age: {age !== null ? Math.round(age) : "Not detected"}</p>
        <p>Emotion: {expression ? expression : "Not detected"}</p> */}
      </div>
    </div>
  );
};

export default AIDetection;
