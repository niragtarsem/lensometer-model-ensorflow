import React, { useEffect } from 'react';
import '@/styles/style_lenso_new.css';
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import Dynmictitle from '@/components/title';

function LensometerComponent() {
    const router = useRouter();
    useEffect(() => {
      if (isMobile == true) {
        router.push(`/`);
      }
    }, []);
  return (
    <section className="lensor-wrap">
        <Dynmictitle title="lensometer-test-new" />
      <div className="inner-lenso-screen">
        {/* <div className="logo-wrapp">
          <img src="./images/text-logo.png" />
        </div> */}
        <div className="top-wrap">
          <div className="lenso-test-distance">
            <div className="trio-wrap">
              <div className="trioimg"></div>
            </div>
            <div className="both-wrapper">
              <div className="both-in-one">
                <div className="start-one">
                  <div className="circlewrap left-box"></div>
                </div>
                <div className="start-one second-one">
                  <div className="circlewrap right-box"></div>
                </div>
              </div>
            </div>
          </div>
          <h6 className="lenso-hdng">Lensometer Test</h6>
        </div>
        <div className="prev-wrap">
          <a href="#">
            
            <i className="fa-solid fa-chevron-left"></i>
            <i className="fa-solid fa-chevron-left"></i>
          </a>
        </div>
        <div className="logo-wrapp-right">
          <img src="/images/logo-change.png" alt="" />
        </div>
      </div>
    </section>
  );
}

export default LensometerComponent;
