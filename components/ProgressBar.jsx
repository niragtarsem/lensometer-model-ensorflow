import React from 'react';
import useWidth from '@/hooks/useWidth';

const modelMap = {
  'triangle': 'Mobile',
  'glass': 'Glass'
}

const imageMap = {
  0: '/images/mobile_images/mobile-move-red.png',
  1: '/images/mobile_images/mobile-move-green.png',
  2: '/images/mobile_images/mobile-move.png'
}

const ProgressBar = ({distance}) => {
  const currentDistance = distance?.distance || 0;
  const { width, correctDistance, image } = useWidth(distance?.distance || 0, distance?.model);
  console.log(distance, correctDistance, image, "========================progress bar distance")

  let left = 0;

  if(distance?.model === 'glass') {
    left = 56;
  } else if(distance?.model === 'triangle') {
    left = 19;
  }

  return (
    <>
      {!distance?.model ? <div className="logo-wrap gif-wrap">
          <a href="#"><img src="/images/mobile_images/logo.png" alt="Logo" /></a>
        </div> : <></>}
      {/* <h5>Camera steps Instruction</h5> */}
      <div className="distance-wrap text-center">
        <div className="inner-distance">
          {distance?.model ? <>
            <img src="/images/mobile_images/distance-equal-1.png" alt="" />
          <div className="mobile-movewrap" style={{ left: correctDistance ? `${left}%` : `${width}%` }}>
            <div className="inner-move-mob">
              <>
                <img src={imageMap[image]} alt="" />
                {distance?.model === 'glass' ? <span className="text-span">{currentDistance >= 23 && currentDistance <= 28 ? 25 : parseInt(currentDistance)}cm</span> : <span className="text-span">{currentDistance >= 48 && currentDistance <=52 ? 50 : parseInt(currentDistance)}cm</span>}
              </>
            </div>
          </div></> : <></>}
        </div>
      </div>
      {distance?.model ? <p className='mobile-distance-text'>{modelMap[distance?.model]} Distance: {currentDistance} CM</p> : <></>}
    </>
  )
}

export default ProgressBar;
