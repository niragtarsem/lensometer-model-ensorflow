import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getModels } from '@/utils/models';
import { detectVideo } from '@/utils/detect';
import { Webcam } from '@/utils/webcam';
import { useRouter } from 'next/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import Voice from '@/components/voice';
import { notification } from 'antd';

const classThreshold = 0.15; // lowered while debugging
const webcam = new Webcam();

const WebCam = ({ setDistance }) => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const detectStartedRef = useRef(false);

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingreport, setLoadingReport] = useState(false);
  const [popupCompleted, setPopupCompleted] = useState(false);
  const [voicecontent, setvoicecontent] = useState();

  const [model, setModel] = useState({ net: null, inputShape: [1, 0, 0, 3] });
  const [ocModel, setOcModel] = useState({ net: null, inputShape: [1, 0, 0, 3] });

  // UI messages
  const [banner, setBanner] = useState('Starting…');
  const [logs, setLogs] = useState([]);

  const addMsg = useCallback((msg) => {
    setLogs((prev) => [...prev, msg]);
    setBanner(msg);
  }, []);

  // --- Model loading
  const fetchModels = async () => {
    addMsg('🔄 Loading models…');
    try {
      const response = await getModels();
      setModel({ ...response.model });
      setOcModel({ ...response.ocModel });
      setLoading(false);
      addMsg('✅ Models loaded');
    } catch (error) {
      console.error('Error fetching models:', error);
      addMsg('❌ Model loading failed (network). Retrying after reload…');
      notification.error({
        message: 'Error',
        description: 'Model loading failed due to network issue. Please try again.',
      });
      setTimeout(() => window.location.reload(), 1200);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  // --- Instruction popup + camera open
  useEffect(() => {
    let popupTimeout;
    const canShowPopup = !popupCompleted && model.net && ocModel.net && !loadingreport && !loading;
    if (canShowPopup) {
      addMsg('📋 Showing instruction popup…');
      popupTimeout = setTimeout(() => {
        Swal.fire({
          title: '<span class="custom-title">Instruction</span>',
          text: 'Align your phone in front of your desktop screen for accurate readings.',
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: false,
          showConfirmButton: false,
        }).then(async () => {
          addMsg('📋 Instruction popup closed');
          try {
            addMsg('🎥 Opening camera…');
            await webcam.open(videoRef.current, { preferRear: true, width: 640, height: 480 });
            addMsg('✅ Camera stream opened');
            setLoading(false);
            setvoicecontent('camera_screen_cyl');
          } catch (e) {
            addMsg(`❌ Camera open failed: ${e.message}`);
            setLoading(true);
          }
          setPopupCompleted(true);
        });
      }, 100);
    }

    return () => {
      if (!popupCompleted) clearTimeout(popupTimeout);
    };
  }, [popupCompleted, model.net, ocModel.net, loading, loadingreport, addMsg]);

  // Close webcam on unmount
  useEffect(() => {
    return () => {
      try { webcam.close(videoRef.current); } catch {}
    };
  }, []);

  // --- Capture (called by detectVideo)
  const captureImage = useCallback((type) => {
    const video = videoRef.current;
    if (!video) {
      addMsg('❌ Capture failed: no video element');
      return;
    }
    addMsg(`📸 Capturing frame (${type})…`);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!video.videoWidth || !video.videoHeight) {
      addMsg('❌ Capture failed: video has no dimensions yet');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const quality = 1;
    canvas.toBlob((blob) => {
      if (!blob) {
        addMsg('❌ Capture failed: toBlob returned null');
        return;
      }
      const formData = new FormData();
      formData.append(type, blob, `${type}.jpg`);
      addMsg('⬆️ Uploading captured frame…');
      sendImageToBackendcalculate(formData, type);
    }, 'image/jpeg', quality);
  }, [addMsg]);

  // --- Upload + subsequent actions
  const sendImageToBackendcalculate = async (formData, type) => {
    try {
      const Business_Url = localStorage.getItem('BusinessBaseurl');
      const authToken = localStorage.getItem('business_access_token');

      if (!Business_Url || !authToken) {
        addMsg('❌ Missing BusinessBaseurl or token in localStorage');
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      };

      const response = await axios.post(`${Business_Url}/save-images/`, formData, config);
      addMsg(`📥 Upload response: ${response?.data?.message || response?.status}`);

      if (response.data.status === 200 && type === 'with_glass_image') {
        addMsg('🧮 Starting final report calculation…');
        await calculatefinalreport();
      } else if (response.data.status === 200 && response.data.message === 'With glass image saved successfully') {
        setLoadingReport(true);
        addMsg('✅ With-glass image saved (report pending)…');
      } else if (response.data.status === 200 && response.data.message === 'Without glass image saved successfully') {
        setvoicecontent('put_glass_data');
        addMsg('✅ Without-glass image saved — prompt user to put glasses on');
      } else {
        addMsg('ℹ️ Upload done but unexpected response');
      }
    } catch (e) {
      addMsg(`❌ Upload failed: ${e.message}`);
    }
  };

  const calculatefinalreport = async () => {
    try {
      const Business_Url = localStorage.getItem('BusinessBaseurl');
      const authToken = localStorage.getItem('business_access_token');

      if (!Business_Url || !authToken) {
        addMsg('❌ Missing BusinessBaseurl or token for final report');
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      addMsg('🧮 Calculating final report…');
      const response = await axios.post(`${Business_Url}/calculate-final-report/`, {}, config);
      addMsg(`📥 Final report response: ${response?.data?.message || response?.status}`);

      if (response.data.status == 200) {
        setLoadingReport(true);

        if (response.data.message == 'Test Completed') {
          addMsg('✅ Test Completed — stopping camera and navigating to report');
          webcam.close(videoRef.current);
          setvoicecontent('test_completed');

          const timeOut = setTimeout(() => {
            router.push('/report/');
            clearTimeout(timeOut);
          }, 4000);
        } else {
          addMsg('⚠️ Report not completed — cleaning & redirecting to login');
          setLoadingReport(true);
          webcam.close(videoRef.current);

          const timeOut = setTimeout(() => {
            Swal.fire({
              title: '<span class="custom-title">Instruction</span>',
              text: 'Your camera or eyeglass is not clear please clean it and test again.',
              timer: 5000,
              timerProgressBar: true,
              allowOutsideClick: false,
              showConfirmButton: false,
            }).then(() => {
              localStorage.removeItem('business_access_token');
              localStorage.removeItem('business_access_refresh');
              router.push('/login/');
            });
            clearTimeout(timeOut);
          }, 12000);
        }
      } else {
        addMsg('❌ Final report failed — showing instruction and logging out');
        setLoadingReport(true);
        webcam.close(videoRef.current);

        const timeOut = setTimeout(() => {
          Swal.fire({
            title: '<span class="custom-title">Instruction</span>',
            text: 'Your camera or eyeglass is not clear please clean it and test again.',
            timer: 5000,
            timerProgressBar: true,
            allowOutsideClick: false,
            showConfirmButton: false,
          }).then(() => {
            localStorage.removeItem('business_access_token');
            localStorage.removeItem('business_access_refresh');
            router.push('/login/');
          });
          clearTimeout(timeOut);
        }, 12000);
      }
    } catch (e) {
      addMsg(`❌ Final report error: ${e.message}`);
    }
  };

  // --- Detection starter wrapped so we can message it
  const handleVideoPlay = useCallback(() => {
    if (detectStartedRef.current) {
      addMsg('ℹ️ detectVideo already running');
      return;
    }
    detectStartedRef.current = true;
    addMsg('🚀 Starting detectVideo…');

    try {
      detectVideo(
        videoRef.current,
        model,
        classThreshold,
        canvasRef.current,
        null,           // ⬅️ disable ocModel for now
        captureImage,   // capture callback
        setDistance,
        addMsg          // pipe detect.js logs to UI
      );
      addMsg('✅ detectVideo loop started');
    } catch (e) {
      addMsg(`❌ detectVideo failed to start: ${e.message}`);
    }
  }, [model, captureImage, setDistance, addMsg]);

  return (
    <>
      <Voice text={voicecontent} />

      {loading && (
        <div className="fetching-report-pending-message">
          <img src="/images/mobile_images/outputonlinegif.gif" style={{ width: '100%', maxWidth: '91px' }} alt="Loading"/>
          <h2>We are getting ready for you!</h2>
        </div>
      )}

      {loadingreport && (
        <div className="fetching-report-pending-message">
          <img src="/images/mobile_images/report-gif.gif" style={{ width: '80px', maxWidth: '100%' }} alt="Fetching report"/>
          <h2>We are fetching your report...</h2>
        </div>
      )}

      <div className="custom-wrapclass" style={{ position: 'relative', margin: '14px 0' }}>
        {!loadingreport && !loading && model.net ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{ width: 335, height: 450, position: 'absolute', left: 0 }}
              onPlay={handleVideoPlay}
            />
            <canvas
              ref={canvasRef}
              width={335}
              height={450}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            />
          </>
        ) : null}
      </div>

      {/* Status Banner */}
      {banner && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: '1rem',
            zIndex: 1000,
            textAlign: 'center',
            minWidth: 240,
            pointerEvents: 'none'
          }}
        >
          {banner}
        </div>
      )}

      {/* Debug Log Panel */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.6)',
          color: '#0f0',
          fontSize: 12,
          maxHeight: 160,
          overflowY: 'auto',
          padding: 6,
          zIndex: 1001
        }}
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </>
  );
};

export default React.memo(WebCam);
