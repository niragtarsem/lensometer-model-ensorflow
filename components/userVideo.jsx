import { useState, useEffect } from 'react';
import '@/styles/camera.css';
import '@/styles/videocamera.css';
import WebCam from './WebCam';
import ProgressBar from './ProgressBar';
import useWidth from '@/hooks/useWidth';

const CameraComponent = () => {
  const [distance, setDistance] = useState({
    model: '',
    distance: 0
  });

  const { correctDistance } = useWidth(distance?.distance, distance?.model);
  const [showMessage, setShowMessage] = useState(false);
  
  useEffect(() => {
    // Set timeout to show message after 6 seconds
    const timeout = setTimeout(() => {
      setShowMessage(true);
    }, 8000); // 6000 milliseconds = 6 seconds

    // Clean up timeout to avoid memory leaks
    return () => clearTimeout(timeout);
  }, []);
  
  return (
    <>
      <div className='video-processing-camera'>
        {/* {distance?.model === 'triangle' && !correctDistance ? <div className="gifwrapp">
          <img src="/images/mobile_images/1st_gif.gif" />
        </div> : <></>}
        
        {distance?.model === 'triangle' && correctDistance ? <div className="gifwrapp">
          <img src="/images/mobile_images/2nd_gif.gif" />
        </div> : <></>} */}
        <div className='camera-wrapp'>

          {/*<Voice text={voicecontent}/>*/}
          <ProgressBar distance={distance} />
          {!distance?.model ? showMessage && (
          <p className="error-req mb-0">
            Please align your Camera
          </p>
        ) : null}
          <WebCam setDistance={setDistance} />
        </div>
      </div>
    </>
  );
};

export default CameraComponent;
