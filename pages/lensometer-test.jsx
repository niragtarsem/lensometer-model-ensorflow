import React, { useEffect } from 'react';
import '@/styles/style_lenso.css';
import { isMobile } from 'react-device-detect';
import { useRouter } from 'next/router';
import Dynmictitle from '@/components/title';
function LensometerSection() {
    const router = useRouter();
    useEffect(() => {
      if (isMobile == true) {
        router.push(`/`);
      }
    }, []);
  return (
    <section className="lensor-wrap">
        <Dynmictitle title="lensometer-test" />
      <div className="inner-lenso-screen">
        <div className="logo-wrap mb-2">
          <a href="#"><img src="/logo/text-logo.png" alt="" /></a>
        </div>
        <div className="lenso-test-main">
          <div className="lenso-test-distance">
            <div className="trioimg">
              <img src="/images/trio-02-.jpg" alt="" />
            </div>
            <div className="both-wrapper">
              <div className="start-one">
                <div className="circlewrap"></div>
              </div>
              <div className="start-one second-one">
                <div className="circlewrap"></div>
              </div>
            </div>
          </div>
        </div>

        <h6 className="lenso-hdng">Lensometer Test</h6>

        <div className="prev-wrap">
          <a href="#">
            <i className="fa-solid fa-chevron-left"></i>
            <i className="fa-solid fa-chevron-left"></i>
          </a>
        </div>
      </div>
    </section>
  );
}

export default LensometerSection;
