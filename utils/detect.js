import * as tf from "@tensorflow/tfjs";
import { renderBoxes } from "./renderBox";
import { Webcam } from "./webcam";

const preprocess = async (source, modelWidth, modelHeight) => {
  let img;
  if (source instanceof Blob) {
    // Convert blob to image element
    img = await new Promise((resolve, reject) => {
      const imgElement = new Image();
      imgElement.onload = () => resolve(imgElement);
      imgElement.onerror = (err) => reject(err);
      imgElement.src = URL.createObjectURL(source);
    });
  } else if (source instanceof HTMLImageElement) {
    img = source;
  } else {
    throw new Error("Unsupported source type");
  }

  const tfImg = tf.browser.fromPixels(img);

  // padding image to square => [n, m] to [n, n], n > m
  const [h, w] = tfImg.shape.slice(0, 2); // get source width and height
  const maxSize = Math.max(w, h); // get max size
  const imgPadded = tf.tidy(() => {
    return tfImg.pad([
      [0, maxSize - h], // padding y [bottom only]
      [0, maxSize - w], // padding x [right only]
      [0, 0],
    ]);
  });

  const xRatio = maxSize / w; // update xRatio
  const yRatio = maxSize / h; // update yRatio

  const input = tf.tidy(() => {
    return tf.image
      .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
      .div(255.0) // normalize
      .expandDims(0); // add batch
  });

  // Dispose tensors not needed anymore
  tfImg.dispose();
  imgPadded.dispose();

  return [input, xRatio, yRatio];
};

export const detectVideo = (vidSource, model, classThreshold, canvasRef, ocModel, captureImage, setDistance) => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3); // get model width and height
  const webcam = new Webcam();

  /**
   * Function to detect every frame from video
   */
  const detectFrame = async () => {
    if (vidSource.videoWidth === 0 && vidSource.srcObject === null) {
      const ctx = canvasRef.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas
      return; // handle if source is closed
    }

    tf.engine().startScope(); // start scoping tf engine
    const compressedFrame = await webcam.captureAndCompressFrame(vidSource, 0.5);
    const [input, xRatio, yRatio] = await preprocess(compressedFrame, modelWidth, modelHeight);

    let boxes_data = [];
    let scores_data = [];
    let classes_data = [];
    await ocModel?.net?.executeAsync(input).then(res => {
      const [boxes, scores, classes] = res.slice(0, 3);
      const boxes_array = boxes.dataSync();
      if(boxes_array.some(boxes => boxes !== 0)) {
        boxes_data = [boxes_array];
        scores_data = [scores.dataSync()];
        classes_data = [classes.dataSync()];
      }
    });
  
    await model?.net?.executeAsync(input).then((res) => {
      const [boxes, scores, classes] = res.slice(0, 3);
      const boxes_array = boxes.dataSync();
      if(boxes_array.some(boxes => boxes !== 0)) {
        boxes_data.push(boxes_array);
        scores_data.push(scores.dataSync());
        classes_data.push(classes.dataSync());
        tf.dispose(res); // clear memory
      }
    });
  
    renderBoxes(canvasRef, classThreshold, boxes_data, scores_data, classes_data, [xRatio, yRatio], captureImage, setDistance); // render boxes

    requestAnimationFrame(detectFrame); // get another frame
    tf.engine().endScope(); // end of scoping
  };

  detectFrame(); // initialize to detect every frame
};
