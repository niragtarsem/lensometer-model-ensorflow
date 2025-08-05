import React, { useEffect, useRef, useState } from 'react';
import { getModels } from '@/utils/models';
import { detectVideo } from '@/utils/detect';
import { Webcam } from '@/utils/webcam';
import { useRouter } from 'next/router';
import axios from 'axios';
import Swal from 'sweetalert2';
import Voice from '@/components/voice';
import { notification } from 'antd';

const classThreshold = 0.50;
const webcam = new Webcam();

const WebCam = ({ setDistance }) => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingreport, setLoadingReport] = useState(false);
  const [popupCompleted, setPopupCompleted] = useState(false);
  const [voicecontent, setvoicecontent] = useState();
  const [model, setModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  });
  const [ocModel, setOcModel] = useState({
    net: null,
    inputShape: [1, 0, 0, 3],
  });

  // const fetchModels = async () => {
  //   const response = await getModels();
  //   setLoading(false);
  //   setModel({
  //     ...response.model
  //   })
  //   setOcModel({
  //     ...response.ocModel
  //   })
  // }

  const fetchModels = async () => {
    try {
      const response = await getModels();
      setLoading(false);
      setModel({
        ...response.model
      });
      setOcModel({
        ...response.ocModel
      });
    } catch (error) {
      console.error('Error fetching models:', error);
      // Show Ant Design notification
      notification.error({
        message: 'Error',
        description: 'Model loading failed due to network issue. Please try again.',
      }).then(() => {
        // Reload the page
        window.location.reload();
      });
    }
  };

  useEffect(() => {
    fetchModels()
  }, []);

  useEffect(() => {

  }, [model.net, ocModel.net]);

  useEffect(() => {
    var popupTimeout = ''
    if (!popupCompleted && model.net && ocModel.net && !loadingreport && !loading) {
      popupTimeout = setTimeout(() => {
        Swal.fire({
          title: '<span class="custom-title">Instruction</span>',
          text: 'Align your phone in front of your desktop screen for accurate readings.',
          timer: 3000,
          timerProgressBar: true,
          allowOutsideClick: false,
          showConfirmButton: false, // Hide the OK button
        }).then(() => {
          if (model.net && ocModel.net) {
            webcam.open(videoRef.current);
            setLoading(false)
            setvoicecontent('camera_screen_cyl')
          } else {
            setLoading(true);
          }
          setPopupCompleted(true); // Mark popup as completed when it's closed
        });
      }, 100);
    }

    // Clean up the camera stream when the component unmounts
    return () => {
      if (!popupCompleted) {
        clearTimeout(popupTimeout);
      }
    };
  }, [popupCompleted, model.net, ocModel.net, loading, loadingreport]);

  

  const captureImage = (type) => {
    const video = videoRef.current;
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      console.log(video.videoWidth,'width>>>>>>>>>>>>>', video.videoHeight,'height>>>>>>>>>>>>')
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const quality = 1;

      // Convert the canvas to Blob object
      canvas.toBlob((blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append(type, blob, `${type}.jpg`);
          sendImageToBackendcalculate(formData, type);
        }
      }, 'image/jpeg', quality);
    }
  };

  const sendImageToBackendcalculate = async (formData, type) => {
    const Business_Url = localStorage.getItem("BusinessBaseurl");
    const authToken = localStorage.getItem("business_access_token");
    const config = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    const response = await axios.post(`${Business_Url}/save-images/`, formData, config);
    console.log(response, "=================backend image send response");
    if (response.data.status === 200 && type === 'with_glass_image') {
      calculatefinalreport()
      // const timeOut = setTimeout(function () {
      //   calculatefinalreport()
      //   clearTimeout(timeOut);
      // }, 3000);
      
    } else if (response.data.status === 200 && response.data.message === 'With glass image saved successfully') {
      setLoadingReport(true)
    }else if(response.data.status === 200 && response.data.message === 'Without glass image saved successfully'){
      setvoicecontent('put_glass_data')
    }
  }

  const calculatefinalreport = async () => {
    const Business_Url = localStorage.getItem("BusinessBaseurl");
    const authToken = localStorage.getItem("business_access_token");
    const config = {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    const response = await axios.post(`${Business_Url}/calculate-final-report/`, {}, config);
    if(response.data.status == 200){
      setLoadingReport(true)
      if (response.data.message == 'Test Completed' && response.data.status == 200) {
        webcam.close(videoRef.current);
        setvoicecontent('test_completed')
        const timeOut = setTimeout(function () {
        router.push('/report/');
        clearTimeout(timeOut);
      }, 4000);
    }
    }
    else if (response.data.message !== 'Test Completed') {
      setLoadingReport(true)
      webcam.close(videoRef.current);
      const timeOut = setTimeout(function () {
        Swal.fire({
          title: '<span class="custom-title">Instruction</span>',
          text: 'Your camera or eyeglass is not clear please clean it and test again.',
          timer: 5000,
          timerProgressBar: true,
          allowOutsideClick: false,
          showConfirmButton: false, // Hide the OK button
        }).then(() => {
          localStorage.removeItem('business_access_token');
          localStorage.removeItem('business_access_refresh');
          router.push('/login/')
        });
        clearTimeout(timeOut);
      }, 12000);
    }
    console.log(response, "==============final response")
  };


  return (
    <>
     
      <Voice text={voicecontent}/>
      {loading && <div className='fetching-report-pending-message'>
        <img src="/images/mobile_images/outputonlinegif.gif" style={{
          width: '100%',
          maxWidth: '91px'
        }} />
        <h2>We are getting ready for you!</h2>
      </div>}
      
      {loadingreport && <div className='fetching-report-pending-message'>
        <img src="/images/mobile_images/report-gif.gif" style={{
          width: '80px',
          maxWidth: '100%'
        }} />
        <h2>
          We are fetching your report...
        </h2>
      </div>} 
      <div className='custom-wrapclass' style={{
        position: 'relative',
        margin: '14px 0'
      }}>
        {!loadingreport && !loading && ocModel.net && model.net ? <><video
          autoPlay
          muted
          style={{
            width: 335,
            height: 450,
            position: 'absolute',
            left: 0
          }}
          // style={{
          //   width: '335px',
          //   height: '450px',  // Added 'px' to height for consistency
          //   position: 'absolute',
          //   left: '50%',
          //   transform: 'translateX(-50%)'  // Wrapped the value in quotes
          // }}
          ref={videoRef}
          onPlay={() => detectVideo(videoRef.current, model, classThreshold, canvasRef.current, ocModel, captureImage, setDistance)}
        />
          <canvas style={{ position: 'absolute', top: 0, left: 0 }} width={335} height={450} ref={canvasRef} /></> : <></>}
      </div>
    </>
  )
}

export default React.memo(WebCam);
