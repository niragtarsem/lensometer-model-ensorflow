// pages/mobile-screen.js
import React, { useEffect } from 'react';
import Swal from 'sweetalert2';
import { useRouter } from 'next/router';
import { isMobile } from 'react-device-detect';

const MobileScreenPage = () => {
  const router = useRouter();
  if(isMobile==false){
    var screen = 'mobile screen'
  }else{
    var screen = 'web screen'
  }

  const openPopup = () => {
    Swal.fire({
      title: 'Access denied',
      text: `Kindly open this link on ${screen}.`,
      icon: 'warning',
      confirmButtonText: 'OK',
    }).then((result) => {
      // Check if the user clicked "OK"
      if (result.isConfirmed) {
        // Open the popup again
        openPopup();
      } else {
        // Handle the case where the user clicked "Cancel" or closed the popup
        // You can redirect or perform any other action here
        router.push('/'); // Redirect to home page as an example
      }
    });
  };

  useEffect(() => {
    // This will be triggered when the component mounts
    openPopup();
  }, []);

  return <></>;
};

export default MobileScreenPage;
