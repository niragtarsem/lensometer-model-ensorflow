import React, { useEffect, useState } from 'react';
import '@/styles/web_style.css';
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo';
import { getServerSideProps } from '@/components/MainVariable.jsx';
import axios from 'axios';
import { useRouter } from 'next/router';
import { isMobile } from 'react-device-detect';
import { Form, Input, Button, message } from 'antd';
import getDeviceId from '@/components/deviceId';
const OtpSection = ({ BaseUrl }) => {
  const [randomdata, setrandomdata] = useState([]); // Initialize with a default value
  const router = useRouter();
  const deviceId = getDeviceId();
  
  const fetchData = async () => {
    try {

      const result = await axios.get(`${BaseUrl}/generate-code/?device_id=${deviceId}`);
      if (result.data.status === 200) {
        localStorage.setItem('web-device-id', deviceId);
        setrandomdata(result.data.random_number);
        setTimeout(() => {
          message.success('Please proceed further with mobile');
        }, 2000);
      }
    } catch (error) {
      console.log(error, 'hereeee');
    }
  };

  const fetchverifyData = async () => {
    try {
      if (randomdata.length !== 0) {
        let read_text = `${randomdata[0]}${randomdata[1]}${randomdata[2]}${randomdata[3]}`;
        const result = await axios.get(`${BaseUrl}/verify-token/?code=${read_text}`);

        console.log(result.data.status); // Log the result to check if it's working
        if(result.data.status==true){
          localStorage.setItem('otp_code', read_text);
          router.push(`/hybrid-lensometer/`)
        }
      }
    } catch (error) {
      console.log(error, 'hereeee');
    }
  };

  useEffect(() => {
    if (isMobile === true) {
      router.push(`/`);
    } else {
      fetchData(); // Call fetchData initially

      // Set interval to call fetchverifyData every 2 seconds
    }
  }, []);
  useEffect(() => {
    
      const intervalId = setInterval(() => {
        if (randomdata.length !== 0) {
          fetchverifyData();
        }
      }, 2000);

      // Cleanup function to clear the interval when the component unmounts
      return () => clearInterval(intervalId);
    
  }, [randomdata]);

  return (
    <section className="main-wrapper">
    <div className="containeru">
        <div className="row align-items-center gx-0">
            <div className="col-md-6">
                <div className="code-wrap">
                    <div className="caption-top text-center">
                        <h6>Enter the code</h6>
                        <p>Enter this generated code in your phone</p>
                    </div>
                    <div className="otp-input-fields text-center">
                    {randomdata.length > 0 ? (
                      <>
                      <input type="number" className="otp__digit otp__field__1 me-1" value={randomdata[0]} readOnly/>
                        <input type="number" className="otp__digit otp__field__2 me-1" value={randomdata[1]} readOnly/>
                        <input type="number" className="otp__digit otp__field__3 me-1" value={randomdata[2]} readOnly/>
                        <input type="number" className="otp__digit otp__field__4" value={randomdata[3]} readOnly/>
                      </>
                        
                      ) : (
                        <div>No data available.</div>
                      )}
                    </div>
                    <p className="mt-3"><a href="#">Resend OTP</a></p>
                </div>
            </div>
            <div className="col-md-6">
                <div className="logo-wrapper">
                    <div className="logowrap">
                        <img src="/images/web_images/logo-z.png" alt="" />
                    </div>
                    <div className="precisewrap">
                        <p>Get precise lens measurements from the comfort of your home. Start your online lensometer test <br /> now and ensure optimal vision care. </p>
                        <div className="doctorwrap text-end">
                            <img src="/images/web_images/doctors-day.png" alt="" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
  );
}

export { getServerSideProps };
export default OtpSection;
