import * as tf from "@tensorflow/tfjs";
import { renderBoxes } from "./renderBox";

/* ---------- helpers ---------- */

function parseInputSpec(shape) {
  // Handles rank-3 and rank-4 shapes
  if (Array.isArray(shape)) {
    if (shape.length === 4) {
      const channelsFirst = shape[1] === 3 && shape[3] !== 3; // [1,3,H,W]
      const H = channelsFirst ? shape[2] : shape[1];
      const W = channelsFirst ? shape[3] : shape[2];
      return { rank: 4, H, W, channelsFirst };
    }
    if (shape.length === 3) {
      const channelsFirst = shape[0] === 3 && shape[2] !== 3; // [3,H,W] or [H,W,3]
      const H = channelsFirst ? shape[1] : shape[0];
      const W = channelsFirst ? shape[2] : shape[1];
      return { rank: 3, H, W, channelsFirst };
    }
  }
  // Fallback
  return { rank: 4, H: 320, W: 320, channelsFirst: false };
}

// SSR-safe pad canvas
function createPadCanvas() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("pad canvas requested during SSR");
  }
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  return { canvas: c, ctx };
}

function buildInput(video, H, W, channelsFirst, withBatch, padCanvas, padCtx) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  const maxSize = Math.max(vw, vh);

  if (padCanvas.width !== maxSize) padCanvas.width = maxSize;
  if (padCanvas.height !== maxSize) padCanvas.height = maxSize;

  padCtx.clearRect(0, 0, maxSize, maxSize);
  padCtx.drawImage(video, 0, 0, vw, vh);

  const xRatio = maxSize / vw;
  const yRatio = maxSize / vh;

  const tensor = tf.tidy(() => {
    let img = tf.browser.fromPixels(padCanvas);     // [max,max,3]
    img = tf.image.resizeBilinear(img, [H, W]).toFloat().div(255);
    if (channelsFirst) {
      img = tf.transpose(img, [2, 0, 1]);           // [3,H,W]
      return withBatch ? img.expandDims(0) : img;   // [1,3,H,W] or [3,H,W]
    }
    // NHWC
    return withBatch ? img.expandDims(0) : img;     // [1,H,W,3] or [H,W,3]
  });

  return { tensor, xRatio, yRatio };
}

async function tryExecute(net, input) {
  let out;
  try {
    out = await net.executeAsync(input);
    return out;
  } finally {
    // caller disposes outputs; input disposed by caller
  }
}

async function extractDetections(res) {
  const [boxesT, scoresT, classesT] = res.slice(0, 3);
  const boxes = await boxesT.data();
  const hasAny = boxes.some((v) => v !== 0);
  if (!hasAny) return null;
  const scores = await scoresT.data();
  const classes = classesT ? await classesT.data() : null;
  return { boxes, scores, classes };
}

function disposeAll(o) {
  if (!o) return;
  if (o.dispose) { try { o.dispose(); } catch {} return; }
  if (Array.isArray(o)) o.forEach((t) => { try { t?.dispose?.(); } catch {} });
  else if (typeof o === "object") Object.values(o).forEach((t) => { try { t?.dispose?.(); } catch {} });
}

/* ---------- main loop ---------- */

export const detectVideo = (
  vidSource,
  model,               // { net, inputShape }
  classThreshold,
  canvasRef,
  ocModel,             // can be null now
  captureImage,
  setDistance,
  onLog = () => {}
) => {
  if (typeof window === "undefined") return;

  const specMain = parseInputSpec(model?.inputShape || model?.net?.inputs?.[0]?.shape);
  const specOc   = ocModel?.net ? parseInputSpec(ocModel?.inputShape || ocModel?.net?.inputs?.[0]?.shape) : null;

  let pad;
  try { pad = createPadCanvas(); }
  catch (e) { onLog(`[detect] pad canvas error: ${e?.message || e}`); return; }

  const ctx = canvasRef.getContext("2d");
  let frameCount = 0;

  const step = async () => {
    try {
      if (!vidSource || (!vidSource.videoWidth && !vidSource.srcObject)) {
        try { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); } catch {}
        return;
      }

      const vw = vidSource.videoWidth, vh = vidSource.videoHeight;
      if (canvasRef.width !== vw) canvasRef.width = vw;
      if (canvasRef.height !== vh) canvasRef.height = vh;

      // overlay only
      ctx.clearRect(0, 0, vw, vh);

      let boxes_data = [];
      let scores_data = [];
      let classes_data = [];
      let xRatioMain, yRatioMain;

      // --- (optional) ocModel — skipped when you pass null from web.jsx
      if (specOc && ocModel?.net) {
        try {
          // preferred attempt only (batch + preferred layout). You can re-enable
          // the flexible attempts later once main path works.
          const builtOc = buildInput(vidSource, specOc.H, specOc.W, specOc.channelsFirst, specOc.rank !== 3, pad.canvas, pad.ctx);
          const resOc = await tryExecute(ocModel.net, builtOc.tensor);
          const detsOc = await extractDetections(resOc);
          disposeAll(resOc); builtOc.tensor.dispose();
          if (detsOc) {
            boxes_data.push(detsOc.boxes);
            scores_data.push(detsOc.scores);
            classes_data.push(detsOc.classes);
          }
        } catch (e) {
          onLog(`[detect] oc error: ${e?.message || e}`);
        }
      }

      // --- main model (use its ratios for render)
      try {
        const built = buildInput(vidSource, specMain.H, specMain.W, specMain.channelsFirst, true, pad.canvas, pad.ctx);
        xRatioMain = built.xRatio; yRatioMain = built.yRatio;

        const res = await tryExecute(model?.net, built.tensor);
        const dets = await extractDetections(res);
        disposeAll(res); built.tensor.dispose();

        if (dets) {
          // Log the strongest score to see if threshold is blocking captures
          const maxScore = Array.from(dets.scores || []).reduce((m, v) => (v > m ? v : m), 0);
          onLog(`[detect] main maxScore=${maxScore.toFixed(3)} thr=${(classThreshold ?? 0).toFixed(2)}`);

          boxes_data.push(dets.boxes);
          scores_data.push(dets.scores);
          classes_data.push(dets.classes);
        } else {
          onLog(`[detect] main: no detections`);
        }
      } catch (e) {
        onLog(`[detect] main error: ${e?.message || e}`);
      }

      const xRatio = xRatioMain ?? 1;
      const yRatio = yRatioMain ?? 1;

      try {
        renderBoxes(
          canvasRef,
          classThreshold,
          boxes_data,
          scores_data,
          classes_data,
          [xRatio, yRatio],
          captureImage,
          setDistance
        );
        if (frameCount % 15 === 0) onLog(`[detect] 💓 tick=${frameCount}`);
      } catch (e) {
        onLog(`[detect] render error: ${e?.message || e}`);
      }

      frameCount++;
    } catch (e) {
      onLog(`[detect] loop error: ${e?.message || e}`);
    } finally {
      schedule();
    }
  };

  const schedule = () => {
    const v = vidSource;
    const hasRVFC =
      typeof HTMLVideoElement !== "undefined" &&
      HTMLVideoElement.prototype &&
      "requestVideoFrameCallback" in HTMLVideoElement.prototype;
    if (hasRVFC && v?.requestVideoFrameCallback) {
      v.requestVideoFrameCallback(() => step());
    } else {
      requestAnimationFrame(() => step());
    }
  };

  schedule();
};
