import React, { useEffect, useRef, useState } from "react";
import { Webcam } from "@/utils/webcam";
import { getModels } from "@/utils/models";
import { detectVideo } from "@/utils/detect";

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [debugText, setDebugText] = useState("Loading...");

  useEffect(() => {
    let webcam = new Webcam();

    const startCameraAndDetection = async () => {
      try {
        // Open webcam
        await webcam.open(videoRef.current, { preferRear: true });

        // Load models
        const { model, ocModel } = await getModels();

        // Start detection loop with debug callback
        detectVideo(
          videoRef.current,
          model,
          0.3,
          canvasRef.current,
          ocModel,
          null,
          null,
          (msg) => setDebugText(msg) // instead of console.log, show on screen
        );
      } catch (err) {
        setDebugText("Error: " + err.message);
      }
    };

    startCameraAndDetection();
    return () => webcam?._stopTracks?.();
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "auto" }}>
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "auto",
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          padding: "8px",
          background: "rgba(0,0,0,0.6)",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "14px",
          borderRadius: "6px",
          maxWidth: "90%",
          whiteSpace: "pre-line",
          zIndex: 9999,
        }}
      >
        {debugText}
      </div>
    </div>
  );
};

export default Camera;
