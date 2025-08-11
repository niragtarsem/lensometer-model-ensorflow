// utils/renderBox.js
import labels from "./labels.json";

// --- tuning knobs ---
const STABLE_FRAMES   = 2;        // consecutive frames of triangle before capture
const COOLDOWN_MS     = 2000;     // min gap between any two captures
const PHASE_GAP_MS    = 6000;     // wait after first capture before allowing the second

// module-scope state (persists while page is loaded)
let captured = {
  without_glass_image: false,
  with_glass_image:    false,
};
let stable = { triangle: 0 };
let lastCaptureAt = 0;
let phase1DoneAt  = 0;

export function renderBoxes(
  canvasRef,
  threshold,
  boxes_data,
  scores_data,
  classes_data,
  ratios,              // [xRatio, yRatio] from detect.js
  captureImage,        // fn(type)
  setDistance,         // optional UI update
  onLog = () => {}     // optional logger
) {
  const ctx = canvasRef.getContext("2d");
  const W = canvasRef.width, H = canvasRef.height;
  const [xRatio = 1, yRatio = 1] = Array.isArray(ratios) ? ratios : [1, 1];

  ctx.clearRect(0, 0, W, H);

  // what we saw this frame
  let seenTriangle = false;
  let bestScore    = 0;
  let drawn        = 0;

  const drawSet = (boxes, scores, classes) => {
    if (!boxes || !scores) return;
    const n = Math.min(Math.floor(boxes.length / 4), scores.length);

    for (let i = 0; i < n; i++) {
      const s = scores[i];
      if (s < (threshold ?? 0.15)) continue;
      bestScore = Math.max(bestScore, s);

      const clsId = classes?.[i] ?? 0;
      const klass = labels?.[clsId] ?? `cls_${clsId}`;

      // coords
      let x1 = boxes[i*4+0], y1 = boxes[i*4+1], x2 = boxes[i*4+2], y2 = boxes[i*4+3];
      const normalized = Math.max(x1, y1, x2, y2) <= 1.5;
      if (normalized) { x1 *= W; x2 *= W; y1 *= H; y2 *= H; }
      else { x1 /= xRatio; x2 /= xRatio; y1 /= yRatio; y2 /= yRatio; }

      const bx = Math.max(0, Math.min(W, x1));
      const by = Math.max(0, Math.min(H, y1));
      const bw = Math.max(0, Math.min(W, x2) - bx);
      const bh = Math.max(0, Math.min(H, y2) - by);

      // draw
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,255,0,0.9)";
      ctx.strokeRect(bx, by, bw, bh);
      const label = `${klass} ${s.toFixed(2)}`;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      const padH = 16, textW = 6 * label.length + 8;
      ctx.fillRect(bx, Math.max(0, by - padH), textW, padH);
      ctx.fillStyle = "#0f0"; ctx.font = "12px sans-serif";
      ctx.fillText(label, bx + 4, Math.max(12, by - 4));

      // optional: expose a proxy “distance” (here: px width) to your UI
      if (klass === "triangle" && setDistance) {
        setDistance({ model: "triangle", distance: +bw.toFixed(2) });
      }

      if (klass === "triangle") seenTriangle = true;

      drawn++;
    }
  };

  for (let k = 0; k < boxes_data.length; k++) {
    drawSet(boxes_data[k], scores_data[k], classes_data?.[k]);
  }

  onLog(`[render] drawn=${drawn} best=${bestScore.toFixed(3)} triangle=${seenTriangle}`);

  // ---- capture logic (triangle-driven only) ----
  const now = Date.now();
  const cooledDown = now - lastCaptureAt > COOLDOWN_MS;

  if (seenTriangle) stable.triangle++; else stable.triangle = 0;
  onLog(`[cap] triangle stable=${stable.triangle}/${STABLE_FRAMES} cooled=${cooledDown}`);

  // Phase 1: capture WITHOUT GLASS
  if (!captured.without_glass_image) {
    if (stable.triangle >= STABLE_FRAMES && cooledDown) {
      captured.without_glass_image = true;
      lastCaptureAt = now;
      phase1DoneAt  = now;
      onLog("📸 capturing: without_glass_image");
      captureImage?.("without_glass_image");
      stable.triangle = 0; // reset so phase 2 requires stability again
    }
    return; // don't attempt phase 2 yet
  }

  // Phase 2: after a grace period, capture WITH GLASS on triangle again
  const phaseGapOk = now - phase1DoneAt > PHASE_GAP_MS;
  if (!captured.with_glass_image && phaseGapOk) {
    if (stable.triangle >= STABLE_FRAMES && cooledDown) {
      captured.with_glass_image = true;
      lastCaptureAt = now;
      onLog("📸 capturing: with_glass_image");
      captureImage?.("with_glass_image");
      stable.triangle = 0;
    }
  } else if (!phaseGapOk) {
    onLog(`[cap] waiting phase gap… ${(PHASE_GAP_MS - (now - phase1DoneAt))}ms`);
  }
}

// Optional helper if you ever need to restart the flow:
export function resetCaptureState() {
  captured = { without_glass_image: false, with_glass_image: false };
  stable = { triangle: 0 };
  lastCaptureAt = 0;
  phase1DoneAt  = 0;
}
