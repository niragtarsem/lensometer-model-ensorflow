import React, { useEffect } from 'react';
import '@/styles/styles.css'
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo'
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import '@/styles/demi.css';
import axios from 'axios';
import { getServerSideProps } from '@/components/MainVariable.jsx';
const YourComponent = ({ BaseUrl }) => {
  const router = useRouter();
  useEffect(() => {
    if (isMobile == true) {
      router.push(`/`);
    }
  }, []);

  const fetchverifytest = async () => {
    var web_id = localStorage.getItem('web-device-id');
    var otp_code = localStorage.getItem('otp_code');
    try {
      const result = await axios.get(`${BaseUrl}/verify-test/?code=${otp_code}`);
      if (result.data.is_cyl_test == true) {
        router.push(`/lensometer-face/`)
      } else if (result.data.is_cyl_test_sync == false) {
        router.push(`/otp/`)
      }
    } catch (error) {
      console.log(error, 'hereeee');
    }
  };
  useEffect(() => {

    const intervalId = setInterval(() => {
      fetchverifytest();
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);

  }, []);
  return (
    <section className="generate-screnotp-wrap">
      <Dynmictitle title="lensometer" />
      {/* <div className="qr-code-wrap"><img src="/images/qr-selected.png" alt="" /></div> */}
      <div className="inner-code-screen">
        <Logo />
        <h6 className="test-hdng">Lensometer Test</h6>
        
       
      
        <div className='demo-topwrap text-center'>
          <img src="/images/triangle_1.svg" alt="" />
        </div>
        <div className='center-demo-wrap'>
       <div className='left-demoimg'>
        <img src="/images/triangle_1.svg" alt="" />
       </div>
        
      <div className="img-wrapper text-center">
        <img src="/images/SS.png" alt="" />
      </div>
      <div className='right-demoimg'>
        <img src="/images/triangle_1.svg" alt="" />
       </div>
      </div>
      <div className='bottom-demoimg'>
      <img src="/images/triangle_1.svg" alt="" />
      </div>

      <div className="back-wrap"><a href="#"> <i className="fa-solid fa-chevron-left"></i>
        <i className="fa-solid fa-chevron-left"></i></a></div>
    </div>
    </section >
  );
};
export { getServerSideProps };
export default YourComponent;
