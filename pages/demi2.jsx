import React,{ useEffect, useState } from 'react';
import '@/styles/styles.css'
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo'
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import { getServerSideProps } from '@/components/MainVariable.jsx';
import '@/styles/demi.css';
import axios from 'axios';
const LensometerSection = ({ BaseUrl }) => {
  const router = useRouter();
  useEffect(() => {
    if (isMobile === true) {
      router.push(`/`);
    }
  }, []);
  const fetchverifysphtest = async () => {
    var web_id = localStorage.getItem('web-device-id');
    var otp_code = localStorage.getItem('otp_code');
    try {
      const result = await axios.get(`${BaseUrl}/verify-test/?code=${otp_code}`);
      if(result.data.is_sph_test_sync==false){
        router.push(`/otp/`)
      }
    } catch (error) {
      console.log(error, 'hereeee');
    }
  };
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchverifysphtest();
    }, 1000);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  
}, []);
  return (
    <section className="lensometer-wrap">
        <Dynmictitle title="lensometer face"/>
        
        {/* <div className="qr-code-wrap"><img src="/images/qr-selected.png" alt="" /></div> */}
      <div className="inner-code-screen">
        {/* <img src="/images/dotted-line.svg" alt="" className='right-top' /> */}
         <Logo/>
        <h6 className="test-hdng">Lensometer Test</h6>
        
        
     <div className="top-img-trio">
     <div className='text-center top-trioimg'>
            <img src="/images/triangle_1.svg" alt="triangle"/>
          </div>
     </div>
     <div id='center-boxwrap'>
      <div className='max-wrapimg left-tioimg'>
      <img src="/images/triangle_1.svg" alt="triangle"/>
      </div>
        <div className="lenso-img-wrap text-center">
          <img src="/images/SS11.svg" alt="" />
        </div>
        <div className='max-wrapimg right-tioimg'>
      <img src="/images/triangle_1.svg" alt="triangle"/>
      </div>
        </div>
        <div className="bottom-trio-wrap">
        <div className='max-wrapimg bottom-tioimg'>
      <img src="/images/triangle_1.svg" alt="triangle"/>
      </div>
        </div>
     
        <div className="back-wrap">
          <a href="#">
            <i className="fa-solid fa-chevron-left"></i>
            <i className="fa-solid fa-chevron-left"></i>
          </a>
        </div>
      </div>
    </section>
  );
}
export { getServerSideProps };
export default LensometerSection;
