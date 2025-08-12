import * as tf from "@tensorflow/tfjs";
import { renderBoxes } from "./renderBox";

// FIXED: Correct labels mapping that matches your model training order
// Make sure this matches EXACTLY how your model was trained
const LABELS_MAP = {
  0: "left_square",
  1: "right_square",
  2: "triangle",
  3: "glass",
  4: "left_circle",
  5: "right_circle"
};

// FIXED: Function to get proper label names
function getClassLabel(classId) {
  if (LABELS_MAP[classId] !== undefined) {
    return LABELS_MAP[classId];
  }



  // Handle unexpected class IDs by mapping them to our 6 classes
  const mappedId = classId % 6;
  return LABELS_MAP[mappedId] || `unknown_${classId}`;
}

/* ---------- helpers ---------- */
function parseInputSpec(shape) {
  if (Array.isArray(shape)) {
    if (shape.length === 4) {
      const channelsFirst = shape[1] === 3 && shape[3] !== 3;
      const H = channelsFirst ? shape[2] : shape[1];
      const W = channelsFirst ? shape[3] : shape[2];
      return { rank: 4, H, W, channelsFirst };
    }
    if (shape.length === 3) {
      const channelsFirst = shape[0] === 3 && shape[2] !== 3;
      const H = channelsFirst ? shape[1] : shape[0];
      const W = channelsFirst ? shape[2] : shape[1];
      return { rank: 3, H, W, channelsFirst };
    }
  }
  return { rank: 4, H: 640, W: 640, channelsFirst: false };
}

function createPadCanvas() {
  const c = document.createElement("canvas");
  return { canvas: c, ctx: c.getContext("2d") };
}

function buildInput(video, H, W, channelsFirst, withBatch, padCanvas, padCtx) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  const maxSize = Math.max(vw, vh) || Math.max(H, W);

  if (padCanvas.width !== maxSize) padCanvas.width = maxSize;
  if (padCanvas.height !== maxSize) padCanvas.height = maxSize;

  padCtx.clearRect(0, 0, maxSize, maxSize);
  padCtx.drawImage(video, 0, 0, vw, vh);

  const xRatio = maxSize / W;
  const yRatio = maxSize / H;

  const tensor = tf.tidy(() => {
    let img = tf.browser.fromPixels(padCanvas);
    img = tf.image.resizeBilinear(img, [H, W]).toFloat().div(255);
    if (channelsFirst) {
      img = tf.transpose(img, [2, 0, 1]);
      return withBatch ? img.expandDims(0) : img;
    }
    return withBatch ? img.expandDims(0) : img;
  });

  return { tensor, xRatio, yRatio };
}

async function tryExecute(net, input) {
  return await net.executeAsync(input);
}

// FIXED: Complete rewrite of detection extraction for YOLOv8 TensorFlow.js format
export async function extractDetections(res, threshold = 0.25, inputW = 640, inputH = 640) {
  console.log("=== DETECTION EXTRACTION DEBUG ===");

  const outputs = Array.isArray(res) ? res : [res];
  console.log("Number of outputs:", outputs.length);
  console.log("Output shape:", outputs[0]?.shape);

  if (outputs.length === 0) {
    console.log("No outputs from model");
    return { boxes: [], scores: [], classes: [] };
  }

  // Get the output tensor
  const output = outputs[0];
  const outputData = await output.data();
  const outputShape = output.shape;

  console.log("Output tensor shape:", outputShape);
  console.log("Output data length:", outputData.length);

  // For YOLOv8 with 6 classes: expected shape is [1, 11, 8400]
  // 11 = 4 (bbox) + 6 (classes) + 1 (objectness, sometimes)
  if (outputShape.length !== 3) {
    console.error("Unexpected output shape:", outputShape);
    return { boxes: [], scores: [], classes: [] };
  }

  const [batchSize, channels, anchors] = outputShape;
  console.log(`Batch: ${batchSize}, Channels: ${channels}, Anchors: ${anchors}`);

  // Determine the format based on channels
  const numClasses = 6;
  const expectedChannels = 4 + numClasses; // 10 for bbox + classes
  const hasObjectness = channels === (4 + numClasses + 1); // 11 if objectness included

  console.log(`Expected channels: ${expectedChannels}, Has objectness: ${hasObjectness}`);

  const boxes = [];
  const scores = [];
  const classes = [];

  // Process each anchor point
  for (let i = 0; i < anchors; i++) {
    // Extract data for this anchor
    const cx = outputData[i] || 0; // center x
    const cy = outputData[anchors + i] || 0; // center y  
    const w = outputData[2 * anchors + i] || 0; // width
    const h = outputData[3 * anchors + i] || 0; // height

    // Extract class scores
    const classScores = [];
    const startIdx = hasObjectness ? 5 : 4; // Skip objectness if present

    for (let c = 0; c < numClasses; c++) {
      const scoreIdx = (startIdx + c) * anchors + i;
      classScores.push(outputData[scoreIdx] || 0);
    }

    // Find the class with highest confidence
    let maxScore = -1;
    let classId = 0;

    for (let c = 0; c < classScores.length; c++) {
      if (classScores[c] > maxScore) {
        maxScore = classScores[c];
        classId = c;
      }
    }

    // Apply objectness score if present
    if (hasObjectness) {
      const objectness = outputData[4 * anchors + i] || 0;
      maxScore = maxScore * objectness; // Multiply class score by objectness
    }

    // Filter by threshold
    if (maxScore >= threshold) {
      // Convert normalized coordinates to pixel coordinates
      const x1 = (cx - w / 2) * inputW;
      const y1 = (cy - h / 2) * inputH;
      const x2 = (cx + w / 2) * inputW;
      const y2 = (cy + h / 2) * inputH;

      // Ensure valid bounding box
      if (x2 > x1 && y2 > y1 && w > 0 && h > 0) {
        boxes.push(x1, y1, x2, y2);
        scores.push(maxScore);
        classes.push(classId);

        const className = getClassLabel(classId);
        console.log(`Valid detection: ${className} (${(maxScore * 100).toFixed(1)}%) at [${x1.toFixed(1)}, ${y1.toFixed(1)}, ${x2.toFixed(1)}, ${y2.toFixed(1)}]`);
      }
    }
  }

  console.log(`Total detections above threshold: ${boxes.length / 4}`);
  console.log(`Threshold used: ${(threshold * 100).toFixed(1)}%`);

  return { boxes, scores, classes };
}

function disposeAll(o) {
  if (!o) return;
  if (o.dispose) {
    try { o.dispose(); } catch { }
    return;
  }
  if (Array.isArray(o)) {
    o.forEach((t) => {
      try { t?.dispose?.(); } catch { }
    });
  } else if (typeof o === "object") {
    Object.values(o).forEach((t) => {
      try { t?.dispose?.(); } catch { }
    });
  }
}

/* ---------- main loop ---------- */
export const detectVideo = (
  vidSource,
  model,
  classThreshold,
  canvasRef,
  ocModel,
  captureImage,
  setDistance,
  onLog = () => { }
) => {
  const specMain = parseInputSpec(model?.inputShape || model?.net?.inputs?.[0]?.shape);
  const pad = createPadCanvas();
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 0;
  let isProcessing = false; // Prevent overlapping processing

  // Cache canvas context
  const ctx = canvasRef.getContext("2d");

  console.log("=== DETECTION LOOP STARTED ===");
  console.log("Model input spec:", specMain);
  console.log("Model shape:", model?.net?.inputs?.[0]?.shape);

  const step = async () => {
    // Skip frame if still processing previous one
    if (isProcessing) {
      requestAnimationFrame(step);
      return;
    }

    const now = performance.now();
    frameCount++;

    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }

    try {
      if (!vidSource?.videoWidth) {
        ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
        requestAnimationFrame(step);
        return;
      }

      isProcessing = true;
      const vw = vidSource.videoWidth;
      const vh = vidSource.videoHeight;

      // Only resize canvas if dimensions changed
      if (canvasRef.width !== vw || canvasRef.height !== vh) {
        canvasRef.width = vw;
        canvasRef.height = vh;
      }

      let boxes_data = [];
      let scores_data = [];
      let classes_data = [];
      let xRatioMain, yRatioMain;

      // Main model inference
      try {
        const inferenceStart = performance.now();

        const built = buildInput(vidSource, specMain.H, specMain.W, specMain.channelsFirst, true, pad.canvas, pad.ctx);
        xRatioMain = built.xRatio;
        yRatioMain = built.yRatio;

        console.log("Input ratios:", { xRatio: xRatioMain, yRatio: yRatioMain });

        const res = await tryExecute(model?.net, built.tensor);

        // FIXED: Use correct extraction with better debugging
        const dets = await extractDetections(res, classThreshold, specMain.W, specMain.H);

        const inferenceTime = performance.now() - inferenceStart;

        // Proper cleanup
        disposeAll(res);
        built.tensor.dispose();

        if (dets && dets.scores.length > 0) {
          boxes_data.push(dets.boxes);
          scores_data.push(dets.scores);
          classes_data.push(dets.classes);

          // Create debug message with proper labels
          const detectionSummary = dets.classes.map((classId, idx) => {
            const className = getClassLabel(classId);
            const score = Math.round(dets.scores[idx] * 100);
            return `${className}(${score}%)`;
          }).join(', ');

          onLog(`FPS: ${fps} | Inference: ${inferenceTime.toFixed(1)}ms | Detections: ${dets.scores.length} | ${detectionSummary}`);
        } else {
          onLog(`FPS: ${fps} | Inference: ${inferenceTime.toFixed(1)}ms | No detections above ${Math.round(classThreshold * 100)}%`);
        }

      } catch (e) {
        console.error("Detection error:", e);
        onLog(`Error: ${e.message}`);
      }

      // FIXED: Pass proper ratios to renderBoxes
      renderBoxes(
        canvasRef,
        classThreshold,
        boxes_data,
        scores_data,
        classes_data,
        [xRatioMain || 1, yRatioMain || 1],
        captureImage,
        setDistance,
        getClassLabel, // Pass the label function
        onLog
      );

    } catch (e) {
      console.error("Main loop error:", e);
      onLog(`Loop error: ${e.message}`);
    } finally {
      isProcessing = false;
      // Limit to 15 FPS to reduce CPU load
      setTimeout(() => requestAnimationFrame(step), 67);
    }
  };

  step();
};

// Export the label function for use in other modules
export { getClassLabel };