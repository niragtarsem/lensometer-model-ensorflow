import React,{ useEffect } from 'react';
import '@/styles/styles.css'
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo'
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
const OtpScanning = () => {
    const router = useRouter();
    useEffect(() => {
        if (isMobile==false) {
          router.push(`/`);
        }
    },[]);
    return (
        <section className="generate-code-scan">
             <Dynmictitle title="otp-scanning"/>
            <div className="inner-code">
            <Logo/>
                <h6 className="hdng-scan text-center">Start Scanning</h6>
                <div className="scanning-wrap text-center">
                    <img src="/images/loading.png" alt="" />
                </div>
                <div className="back-wrap"><a href="#"> <i className="fa-solid fa-chevron-left"></i>
                    <i className="fa-solid fa-chevron-left"></i></a></div>
            </div>
        </section>
    );
}

export default OtpScanning;
