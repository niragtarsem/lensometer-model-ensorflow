import React,{ useEffect, useState } from 'react';
import '@/styles/mobile_style.css'
import Dynmictitle from '@/components/title';
import Logo from '@/components/logo'
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import Camera from '@/components/userVideo';

// import '@/styles/camera.css'
const OtpScanning = () => {
    const router = useRouter();
    const [showLogo, setShowLogo] = useState(true);
    useEffect(() => {
        if (isMobile==false) {
          router.push(`/`);
        }
        const timer = setTimeout(() => {
            setShowLogo(false);
        }, 5000);
        return () => clearTimeout(timer);
    },[router]);
    return (
        <section className="step-wrapper">
        <div className="inner-div">
        <Dynmictitle title="camera-screen"/>
        {/* {showLogo && (
                    <div className="logo-wrap gif-wrap">
                        <a href="#"><img src="/images/mobile_images/logo.png" alt="Logo" /></a>
                    </div>
                )} */}
            <div className="outer-step-wrap">
            <Camera/>
                {/* <div className="bottomwrap gif-btmwrap">
                    <div className="hdngwrap gifhdng-wrap">
                        <div className="lines-ideal">
                        
                        </div>
                    </div>
                </div> */}
            </div>
        </div>
    </section>
    );
}

export default OtpScanning;
