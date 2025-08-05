import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Swal from 'sweetalert2';

const ConnectionStatus = () => {
  const [isPoorConnection, setIsPoorConnection] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleConnectionChange = () => {
      const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

      if (connection) {
        const effectiveType = connection.effectiveType || '';
        setIsPoorConnection(
          effectiveType.includes('slow-2g') ||
          effectiveType.includes('2g') ||
          effectiveType.includes('slow-3g') ||
          effectiveType.includes('3g')
        );
      } else {
        setIsPoorConnection(false);
      }
    };

    handleConnectionChange(); // Call initially to check connection status

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  useEffect(() => {
    if (isPoorConnection) {
      Swal.fire({
        title: '<span class="custom-title">Instruction</span>',
        html: 'Please check your network internet speed and test again',
        timer: 3000,
        timerProgressBar: true,
        allowOutsideClick: false,
        showConfirmButton: false,
      }).then(() => {
        router.push('/login/');
      });
    }
  }, [isPoorConnection, router, Swal]);

  return null;
};

export default ConnectionStatus;
