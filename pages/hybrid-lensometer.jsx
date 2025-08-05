import React, { useEffect } from 'react';
import '@/styles/hybrid-lensometer.css';
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import Dynmictitle from '@/components/title';
import { getServerSideProps } from '@/components/MainVariable.jsx';
import axios from 'axios';
const YourComponentName = ({ BaseUrl }) => {
    const router = useRouter();
    useEffect(() => {
      if (isMobile == true) {
        router.push(`/`);
      }
    }, []);
    const fetchverifytest = async () => {
        var otp_code = localStorage.getItem('otp_code');
        try {
          const result = await axios.get(`${BaseUrl}/verify-test/?code=${otp_code}`);
          if(result.data.is_test_done===true || result.data.error_processing==true || result.data.report_crash==true){
            setTimeout(function() {
              router.push(`/otp/`)
          }, 2000);
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
        <section className="lensor-wrap">
            <Dynmictitle title='hybrid-lensometer'/>
        <h6 class="lenso-hdng d-none">Lensometer Test</h6>
        <div className="inner-lenso-screen">
            {/* <div className="logo-wrapp">
                <img src="./images/text-logo.png" />
            </div> */}
            <div className="top-wrap">
                <div className="lenso-test-distance">
                    <div className="trio-wrap">
                        <div className="toptrio-wrap">
                            <span className="upper-left"><i className="fa-solid fa-star"></i></span>
                            <div className="trio-top">
                                <div className="trioimg">
                                </div>
                            </div>
                            <span className="upper-right"><i className="fa-solid fa-won-sign"></i></span>
                        </div>
                        <div className="top-vertical-lines">
                            {/* <div className="left-lines"></div> */}
                            {/* <div className="right-lines"></div> */}
                        </div>
                    </div>
                    <div className="both-wrapper">
                        <div className="wrapp-btm-box">
                            <div className="symbol-wrap">
                                <span className="lower-left"><i className="fa-solid fa-xmark"></i></span>
                                {/* <span className="left-alignline"></span> */}
                            </div>

                            <div className="both-in-one">
                                <div className="start-one">
                                    <div className="circlewrap left-box"></div>
                                </div>
                                <div className="start-one second-one">
                                    <div className="circlewrap right-box"></div>
                                </div>
                            </div>
                            <div className="symbol-wrap">
                                <span className="lower-right"><i className="fa-solid fa-snowflake"></i></span>
                                {/* <span className="right-alignline"></span> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="logo-wrapp-right">
               {/* <img src="./images/logo-change.png" alt="" /> */}
            </div>
        </div>
        </section>
    );
};
export { getServerSideProps };
export default YourComponentName;
