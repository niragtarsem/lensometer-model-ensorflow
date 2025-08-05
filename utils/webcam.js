/**
 * Class to handle webcam
 */
export class Webcam {
  /**
   * Open webcam and stream it through video tag.
   * @param {HTMLVideoElement} videoRef video tag reference
   * @param {number} frameRate desired frame rate
   */
  captureAndCompressFrame = (videoRef, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      if (!videoRef.srcObject) {
        reject("Webcam is not open");
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.videoWidth;
      canvas.height = videoRef.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject("Failed to compress frame");
        }
      }, 'image/jpeg', quality);
    });
  };

  open = (videoRef) => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Check if the 'zoom' constraint is supported
      // const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
      // if (supportedConstraints.zoom) {
      //   // If supported, request the video stream with the desired zoom level
      //   navigator.mediaDevices
      //   .getUserMedia({
      //     audio: false,
      //     video: {
      //       facingMode: "environment",
      //       advanced: [{ zoom: 1. }],  // Set the zoom level here
      //       focusMode: 'continuous',
      //       width: { ideal: 1920 },
      //       height: { ideal: 1080 },
      //       aspectRatio: 1.777777778,
      //     },
      //   })
      //   .then((stream) => {
      //     videoRef.srcObject = stream;
      //   })
      //   .catch((error) => {
      //     console.error("Error accessing webcam: ", error);
      //     alert("Can't open Webcam!");
      //   });
      // } else {
        // If 'zoom' is not supported, proceed without setting the zoom level
        navigator.mediaDevices
        .getUserMedia({

          audio: false,
          video: {
            facingMode: "environment",
            advanced: [
              { zoom: 1.0 },  // Set the zoom level here
              { focusMode: "manual" },  // Try to set focus mode to manual
            ],
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            aspectRatio: 1.777777778,
          },
        })
        .then((stream) => {
          videoRef.srcObject = stream;
        })
        .catch((error) => {
          console.error("Error accessing webcam: ", error);
          alert("Can't open Webcam!");
        });
      //}//
    }
  };

  /**
   * Close opened webcam.
   * @param {HTMLVideoElement} videoRef video tag reference
   */
  close = (videoRef) => {
    if (videoRef.srcObject) {
      videoRef.srcObject.getTracks().forEach((track) => {
        track.stop();
      });
      videoRef.srcObject = null;
    } else {
      alert("Please open Webcam first!");
    }
  };
}
