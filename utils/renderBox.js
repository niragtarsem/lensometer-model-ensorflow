// Enhanced renderBox.js with multi-class capture functionality

// FIXED: Proper labels mapping - MUST match your model's training order
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

// Enhanced color mapping for better visibility
const CLASS_COLORS = {
    'left_square': '#FF4444',   // Red
    'right_square': '#44FF44',  // Green
    'triangle': '#4444FF',      // Blue
    'glass': '#FFFF44',         // Yellow
    'left_circle': '#FF44FF',   // Magenta
    'right_circle': '#44FFFF'   // Cyan
};

// --- Capture logic constants ---
const STABLE_FRAMES = 2;
const COOLDOWN_MS = 2000;
const PHASE_GAP_MS = 6000;
const MULTI_CLASS_CONFIDENCE_THRESHOLD = 0.6; // 60% confidence for multi-class capture

// Target classes for phase 1 multi-class capture
const PHASE1_TARGET_CLASSES = ['triangle', 'left_square', 'right_circle'];

// Module-scope state
let captured = {
    without_glass_image: false,
    with_glass_image: false,
    multi_class_frame: false, // NEW: Track multi-class capture
};
let stable = { 
    triangle: 0,
    multiClass: 0 // NEW: Stability counter for multi-class detection
};
let lastCaptureAt = 0;
let phase1DoneAt = 0;

// NEW: Function to capture and crop detected objects
async function captureAndCropObjects(canvasRef, detections, captureCallback) {
    try {
        const canvas = canvasRef;
        const ctx = canvas.getContext('2d');
        
        // Capture full frame
        const fullFrameDataUrl = canvas.toDataURL('image/png');
        console.log("📸 Full frame captured");
        
        // Create an array to store cropped objects
        const croppedObjects = [];
        
        // Process each detection for cropping
        for (let i = 0; i < detections.length; i++) {
            const detection = detections[i];
            const { className, bbox, confidence } = detection;
            const [left, top, right, bottom] = bbox;
            
            // Calculate crop dimensions
            const cropWidth = right - left;
            const cropHeight = bottom - top;
            
            if (cropWidth > 10 && cropHeight > 10) { // Ensure reasonable crop size
                // Create temporary canvas for cropping
                const cropCanvas = document.createElement('canvas');
                const cropCtx = cropCanvas.getContext('2d');
                
                cropCanvas.width = cropWidth;
                cropCanvas.height = cropHeight;
                
                // Draw the cropped portion
                cropCtx.drawImage(
                    canvas,
                    left, top, cropWidth, cropHeight,  // Source rectangle
                    0, 0, cropWidth, cropHeight        // Destination rectangle
                );
                
                const croppedDataUrl = cropCanvas.toDataURL('image/png');
                
                croppedObjects.push({
                    className: className,
                    confidence: confidence,
                    bbox: [left, top, right, bottom],
                    dimensions: { width: cropWidth, height: cropHeight },
                    imageData: croppedDataUrl
                });
                
                console.log(`🖼️ Cropped ${className} object: ${cropWidth}x${cropHeight}px`);
            }
        }
        
        // Call the callback with captured data
        if (captureCallback) {
            captureCallback({
                type: 'multi_class_capture',
                fullFrame: fullFrameDataUrl,
                croppedObjects: croppedObjects,
                timestamp: Date.now(),
                detectionCount: detections.length
            });
        }
        
        // Also display results to user (you can customize this part)
        displayCapturedResults(fullFrameDataUrl, croppedObjects);
        
        return {
            fullFrame: fullFrameDataUrl,
            croppedObjects: croppedObjects
        };
        
    } catch (error) {
        console.error("Error in captureAndCropObjects:", error);
        return null;
    }
}

// NEW: Function to display captured results (customize as needed)
function displayCapturedResults(fullFrameDataUrl, croppedObjects) {
    console.log("=== CAPTURED RESULTS ===");
    console.log("Full frame size:", fullFrameDataUrl.length, "bytes");
    console.log("Cropped objects:", croppedObjects.length);
    
    // Create a results container in the DOM (you can customize this)
    let resultsContainer = document.getElementById('capture-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'capture-results';
        resultsContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            max-width: 300px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 1000;
            font-size: 12px;
        `;
        document.body.appendChild(resultsContainer);
    }
    
    // Display full frame thumbnail
    resultsContainer.innerHTML = `
        <h4>📸 Multi-Class Capture Results</h4>
        <div style="margin-bottom: 10px;">
            <strong>Full Frame:</strong><br>
            <img src="${fullFrameDataUrl}" style="max-width: 150px; border: 1px solid #ccc; margin: 5px 0;">
        </div>
        <div>
            <strong>Cropped Objects (${croppedObjects.length}):</strong><br>
            ${croppedObjects.map(obj => `
                <div style="margin: 5px 0; padding: 5px; border: 1px solid ${CLASS_COLORS[obj.className] || '#fff'};">
                    <div><strong>${obj.className}</strong> (${Math.round(obj.confidence * 100)}%)</div>
                    <div>Size: ${obj.dimensions.width}×${obj.dimensions.height}px</div>
                    <img src="${obj.imageData}" style="max-width: 80px; margin-top: 3px;">
                </div>
            `).join('')}
        </div>
        <button onclick="this.parentElement.style.display='none'" style="margin-top: 10px; padding: 5px;">Close</button>
    `;
    
    // Auto-hide after 30 seconds
    setTimeout(() => {
        if (resultsContainer.parentElement) {
            resultsContainer.style.display = 'none';
        }
    }, 30000);
}

// FIXED: Simplified coordinate conversion function
function convertToCanvasCoords(boxes, canvasWidth, canvasHeight, xRatio = 1, yRatio = 1) {
    const convertedBoxes = [];
    
    for (let i = 0; i < boxes.length; i += 4) {
        let x1 = boxes[i + 0];
        let y1 = boxes[i + 1]; 
        let x2 = boxes[i + 2];
        let y2 = boxes[i + 3];
        
        console.log(`Raw coordinates: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
        
        // Check if coordinates are already in pixel space or normalized
        const maxCoord = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2));
        const isNormalized = maxCoord <= 1.5;
        
        if (isNormalized) {
            // Normalized coordinates [0,1] -> scale to canvas size
            x1 = x1 * canvasWidth;
            y1 = y1 * canvasHeight;
            x2 = x2 * canvasWidth;
            y2 = y2 * canvasHeight;
            console.log(`Normalized -> Canvas: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
        } else {
            // Model pixel coordinates -> convert using ratios to canvas space
            x1 = x1 / xRatio;
            y1 = y1 / yRatio;
            x2 = x2 / xRatio;  
            y2 = y2 / yRatio;
            console.log(`Model pixels -> Canvas: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
        }
        
        // Ensure coordinates are within canvas bounds and properly ordered
        const left = Math.max(0, Math.min(x1, x2));
        const top = Math.max(0, Math.min(y1, y2));
        const right = Math.min(canvasWidth, Math.max(x1, x2));
        const bottom = Math.min(canvasHeight, Math.max(y1, y2));
        
        convertedBoxes.push(left, top, right, bottom);
    }
    
    return convertedBoxes;
}

export function renderBoxes(
    canvasRef,
    threshold,
    boxes_data,
    scores_data,
    classes_data,
    ratios,
    captureImage,
    setDistance,
    labelFunction = null,
    onLog = () => {}
) {
    const ctx = canvasRef.getContext("2d");
    const W = canvasRef.width;
    const H = canvasRef.height;
    const [xRatio = 1, yRatio = 1] = Array.isArray(ratios) ? ratios : [1, 1];

    console.log("=== RENDER DEBUG ===");
    console.log("Canvas dimensions:", W, "x", H);
    console.log("Ratios:", { xRatio, yRatio });
    console.log("Data lengths:", {
        boxes: boxes_data.length,
        scores: scores_data.length,
        classes: classes_data.length
    });

    // FIXED: Clear entire canvas
    ctx.clearRect(0, 0, W, H);

    let seenTriangle = false;
    let totalDrawn = 0;
    let allDetections = [];
    
    // NEW: Track high-confidence detections for multi-class capture
    let highConfidenceDetections = [];

    const drawSet = (boxes, scores, classes) => {
        if (!boxes || !scores || boxes.length === 0 || scores.length === 0) {
            console.log("No valid boxes or scores to draw");
            return;
        }

        const numDetections = Math.min(Math.floor(boxes.length / 4), scores.length);
        console.log(`Processing ${numDetections} detections`);
        
        if (numDetections === 0) {
            console.log("No detections to process");
            return;
        }
        
        // FIXED: Convert coordinates properly
        const convertedBoxes = convertToCanvasCoords(boxes, W, H, xRatio, yRatio);

        for (let i = 0; i < numDetections; i++) {
            const score = scores[i];
            if (score < threshold) {
                console.log(`Skipping detection ${i}: score ${(score * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`);
                continue;
            }

            const classId = classes?.[i] ?? 0;
            const className = labelFunction ? labelFunction(classId) : getClassLabel(classId);

            // Get converted coordinates
            const left = convertedBoxes[i * 4 + 0];
            const top = convertedBoxes[i * 4 + 1];
            const right = convertedBoxes[i * 4 + 2];
            const bottom = convertedBoxes[i * 4 + 3];

            const boxWidth = right - left;
            const boxHeight = bottom - top;

            console.log(`Detection ${i}: ${className} (${(score * 100).toFixed(1)}%) at [${left.toFixed(1)}, ${top.toFixed(1)}] size ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);

            // Only draw if box has reasonable dimensions
            if (boxWidth > 5 && boxHeight > 5) {
                // FIXED: Draw bounding box with class-specific color
                const color = CLASS_COLORS[className] || '#00FF00';
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(left, top, boxWidth, boxHeight);

                // FIXED: Draw label with background
                const confidencePercent = Math.round(score * 100);
                const label = `${className} ${confidencePercent}%`;
                ctx.font = 'bold 16px Arial';
                const textMetrics = ctx.measureText(label);
                const textWidth = textMetrics.width + 12;
                const textHeight = 22;

                // Label background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fillRect(left, Math.max(0, top - textHeight), textWidth, textHeight);

                // Label text
                ctx.fillStyle = color;
                ctx.fillText(label, left + 6, Math.max(16, top - 6));

                // FIXED: Triangle detection for capture logic
                if (className === "triangle") {
                    seenTriangle = true;
                    if (setDistance) {
                        setDistance({ model: "triangle", distance: boxWidth.toFixed(2) });
                    }
                }

                // NEW: Track high-confidence detections for multi-class capture
                if (score >= MULTI_CLASS_CONFIDENCE_THRESHOLD) {
                    highConfidenceDetections.push({
                        className: className,
                        confidence: score,
                        bbox: [left, top, right, bottom],
                        boxWidth: boxWidth,
                        boxHeight: boxHeight
                    });
                }

                allDetections.push(`${className}(${confidencePercent}%)`);
                totalDrawn++;
                console.log(`✓ Drew ${className} at [${left.toFixed(1)},${top.toFixed(1)}] size ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
            } else {
                console.log(`✗ Skipped ${className} - box too small: ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
            }
        }
    };

    // FIXED: Process all detection data
    for (let k = 0; k < boxes_data.length; k++) {
        drawSet(boxes_data[k], scores_data[k], classes_data?.[k]);
    }

    console.log(`=== RENDER SUMMARY ===`);
    console.log(`Total drawn: ${totalDrawn}`);
    console.log(`Detections: ${allDetections.join(', ')}`);
    console.log(`Triangle seen: ${seenTriangle}`);
    console.log(`High confidence detections: ${highConfidenceDetections.length}`);

    // NEW: Check for multi-class capture condition
    const detectedClassNames = highConfidenceDetections.map(d => d.className);
    const hasAllTargetClasses = PHASE1_TARGET_CLASSES.every(targetClass => 
        detectedClassNames.includes(targetClass)
    );

    console.log(`Multi-class check: detected=[${detectedClassNames.join(',')}] hasAllTargets=${hasAllTargetClasses}`);

    // ---- Enhanced Capture logic ----
    const now = Date.now();
    const cooledDown = now - lastCaptureAt > COOLDOWN_MS;

    // Update stability counters
    if (seenTriangle) stable.triangle++; 
    else stable.triangle = 0;
    
    // NEW: Multi-class stability
    if (hasAllTargetClasses) stable.multiClass++;
    else stable.multiClass = 0;

    const captureDebug = `[capture] triangle_stable=${stable.triangle}/${STABLE_FRAMES} multi_class_stable=${stable.multiClass}/${STABLE_FRAMES} cooled=${cooledDown}`;
    console.log(captureDebug);

    // NEW: Priority 1 - Multi-class capture (if not already captured)
    if (!captured.multi_class_frame && hasAllTargetClasses) {
        if (stable.multiClass >= STABLE_FRAMES && cooledDown) {
            captured.multi_class_frame = true;
            lastCaptureAt = now;
            console.log("📸 MULTI-CLASS CAPTURE TRIGGERED!");
            
            // Filter detections to only include target classes
            const targetDetections = highConfidenceDetections.filter(d => 
                PHASE1_TARGET_CLASSES.includes(d.className)
            );
            
            console.log(`Capturing ${targetDetections.length} target objects:`, 
                targetDetections.map(d => `${d.className}(${Math.round(d.confidence * 100)}%)`).join(', '));
            
            // Perform the capture and crop
            captureAndCropObjects(canvasRef, targetDetections, captureImage);
            
            stable.multiClass = 0;
        }
        return; // Exit early if multi-class capture is prioritized
    }

    // Existing Phase 1: capture WITHOUT GLASS (triangle only)
    if (!captured.without_glass_image) {
        if (stable.triangle >= STABLE_FRAMES && cooledDown) {
            captured.without_glass_image = true;
            lastCaptureAt = now;
            phase1DoneAt = now;
            console.log("📸 CAPTURING: without_glass_image");
            captureImage?.("without_glass_image");
            stable.triangle = 0;
        }
        return;
    }

    // Phase 2: after a grace period, capture WITH GLASS
    const phaseGapOk = now - phase1DoneAt > PHASE_GAP_MS;
    if (!captured.with_glass_image && phaseGapOk) {
        if (stable.triangle >= STABLE_FRAMES && cooledDown) {
            captured.with_glass_image = true;
            lastCaptureAt = now;
            console.log("📸 CAPTURING: with_glass_image");
            captureImage?.("with_glass_image");
            stable.triangle = 0;
        }
    } else if (!phaseGapOk) {
        const waitTime = PHASE_GAP_MS - (now - phase1DoneAt);
        console.log(`[capture] waiting phase gap... ${waitTime}ms remaining`);
    }

    // Log final summary
    const summary = `Rendered: ${totalDrawn} objects | ${allDetections.join(', ')} | Triangle: ${seenTriangle} | MultiClass: ${hasAllTargetClasses ? 'YES' : 'NO'}`;
    onLog(summary);
}

// Enhanced reset function
export function resetCaptureState() {
    captured = { 
        without_glass_image: false, 
        with_glass_image: false,
        multi_class_frame: false // NEW
    };
    stable = { 
        triangle: 0,
        multiClass: 0 // NEW
    };
    lastCaptureAt = 0;
    phase1DoneAt = 0;
    console.log("Capture state reset (including multi-class)");
    
    // Clear results display
    const resultsContainer = document.getElementById('capture-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// Enhanced stats function
export function getDetectionStats() {
    return {
        captured: { ...captured },
        stability: { 
            triangle: stable.triangle,
            multiClass: stable.multiClass
        },
        lastCaptureTime: lastCaptureAt,
        phase1Time: phase1DoneAt,
        targetClasses: PHASE1_TARGET_CLASSES,
        confidenceThreshold: MULTI_CLASS_CONFIDENCE_THRESHOLD
    };
}

// NEW: Utility function to download captured images
export function downloadCapturedData(capturedData) {
    if (!capturedData) return;
    
    try {
        // Download full frame
        const fullFrameLink = document.createElement('a');
        fullFrameLink.href = capturedData.fullFrame;
        fullFrameLink.download = `multi_class_full_frame_${capturedData.timestamp}.png`;
        document.body.appendChild(fullFrameLink);
        fullFrameLink.click();
        document.body.removeChild(fullFrameLink);
        
        // Download each cropped object
        capturedData.croppedObjects.forEach((obj, index) => {
            const link = document.createElement('a');
            link.href = obj.imageData;
            link.download = `${obj.className}_${Math.round(obj.confidence * 100)}%_${capturedData.timestamp}_${index}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        console.log(`Downloaded ${1 + capturedData.croppedObjects.length} images`);
    } catch (error) {
        console.error("Error downloading captured data:", error);
    }
}


// // utils/renderBox.js

// // FIXED: Proper labels mapping - MUST match your model's training order
// const LABELS_MAP = {
//     0: "left_square",
//     1: "right_square",
//     2: "triangle", 
//     3: "glass",
//     4: "left_circle",
//     5: "right_circle"
// };

// // FIXED: Function to get proper label names
// function getClassLabel(classId) {
//     if (LABELS_MAP[classId] !== undefined) {
//         return LABELS_MAP[classId];
//     }
//     // Handle unexpected class IDs by mapping them to our 6 classes
//     const mappedId = classId % 6;
//     return LABELS_MAP[mappedId] || `unknown_${classId}`;
// }

// // Enhanced color mapping for better visibility
// const CLASS_COLORS = {
//     'left_square': '#FF4444',   // Red
//     'right_square': '#44FF44',  // Green
//     'triangle': '#4444FF',      // Blue
//     'glass': '#FFFF44',         // Yellow
//     'left_circle': '#FF44FF',   // Magenta
//     'right_circle': '#44FFFF'   // Cyan
// };

// // --- Capture logic constants ---
// const STABLE_FRAMES = 2;
// const COOLDOWN_MS = 2000;
// const PHASE_GAP_MS = 6000;

// // Module-scope state
// let captured = {
//     without_glass_image: false,
//     with_glass_image: false,
// };
// let stable = { triangle: 0 };
// let lastCaptureAt = 0;
// let phase1DoneAt = 0;

// // FIXED: Simplified coordinate conversion function
// function convertToCanvasCoords(boxes, canvasWidth, canvasHeight, xRatio = 1, yRatio = 1) {
//     const convertedBoxes = [];
    
//     for (let i = 0; i < boxes.length; i += 4) {
//         let x1 = boxes[i + 0];
//         let y1 = boxes[i + 1];
//         let x2 = boxes[i + 2];
//         let y2 = boxes[i + 3];
        
//         console.log(`Raw coordinates: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
        
//         // Check if coordinates are already in pixel space or normalized
//         const maxCoord = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2));
//         const isNormalized = maxCoord <= 1.5;
        
//         if (isNormalized) {
//             // Normalized coordinates [0,1] -> scale to canvas size
//             x1 = x1 * canvasWidth;
//             y1 = y1 * canvasHeight;
//             x2 = x2 * canvasWidth;
//             y2 = y2 * canvasHeight;
//             console.log(`Normalized -> Canvas: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
//         } else {
//             // Model pixel coordinates -> convert using ratios to canvas space
//             x1 = x1 / xRatio;
//             y1 = y1 / yRatio;
//             x2 = x2 / xRatio;  
//             y2 = y2 / yRatio;
//             console.log(`Model pixels -> Canvas: [${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)}]`);
//         }
        
//         // Ensure coordinates are within canvas bounds and properly ordered
//         const left = Math.max(0, Math.min(x1, x2));
//         const top = Math.max(0, Math.min(y1, y2));
//         const right = Math.min(canvasWidth, Math.max(x1, x2));
//         const bottom = Math.min(canvasHeight, Math.max(y1, y2));
        
//         convertedBoxes.push(left, top, right, bottom);
//     }
    
//     return convertedBoxes;
// }

// export function renderBoxes(
//     canvasRef,
//     threshold,
//     boxes_data,
//     scores_data,
//     classes_data,
//     ratios,
//     captureImage,
//     setDistance,
//     labelFunction = null,
//     onLog = () => {}
// ) {
//     const ctx = canvasRef.getContext("2d");
//     const W = canvasRef.width;
//     const H = canvasRef.height;
//     const [xRatio = 1, yRatio = 1] = Array.isArray(ratios) ? ratios : [1, 1];

//     console.log("=== RENDER DEBUG ===");
//     console.log("Canvas dimensions:", W, "x", H);
//     console.log("Ratios:", { xRatio, yRatio });
//     console.log("Data lengths:", {
//         boxes: boxes_data.length,
//         scores: scores_data.length,
//         classes: classes_data.length
//     });

//     // FIXED: Clear entire canvas
//     ctx.clearRect(0, 0, W, H);

//     let seenTriangle = false;
//     let totalDrawn = 0;
//     let allDetections = [];

//     const drawSet = (boxes, scores, classes) => {
//         if (!boxes || !scores || boxes.length === 0 || scores.length === 0) {
//             console.log("No valid boxes or scores to draw");
//             return;
//         }

//         const numDetections = Math.min(Math.floor(boxes.length / 4), scores.length);
//         console.log(`Processing ${numDetections} detections`);
        
//         if (numDetections === 0) {
//             console.log("No detections to process");
//             return;
//         }
        
//         // FIXED: Convert coordinates properly
//         const convertedBoxes = convertToCanvasCoords(boxes, W, H, xRatio, yRatio);

//         for (let i = 0; i < numDetections; i++) {
//             const score = scores[i];
//             if (score < threshold) {
//                 console.log(`Skipping detection ${i}: score ${(score * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(1)}%`);
//                 continue;
//             }

//             const classId = classes?.[i] ?? 0;
//             const className = labelFunction ? labelFunction(classId) : getClassLabel(classId);

//             // Get converted coordinates
//             const left = convertedBoxes[i * 4 + 0];
//             const top = convertedBoxes[i * 4 + 1];
//             const right = convertedBoxes[i * 4 + 2];
//             const bottom = convertedBoxes[i * 4 + 3];

//             const boxWidth = right - left;
//             const boxHeight = bottom - top;

//             console.log(`Detection ${i}: ${className} (${(score * 100).toFixed(1)}%) at [${left.toFixed(1)}, ${top.toFixed(1)}] size ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);

//             // Only draw if box has reasonable dimensions
//             if (boxWidth > 5 && boxHeight > 5) {
//                 // FIXED: Draw bounding box with class-specific color
//                 const color = CLASS_COLORS[className] || '#00FF00';
//                 ctx.strokeStyle = color;
//                 ctx.lineWidth = 3;
//                 ctx.strokeRect(left, top, boxWidth, boxHeight);

//                 // FIXED: Draw label with background
//                 const confidencePercent = Math.round(score * 100);
//                 const label = `${className} ${confidencePercent}%`;
//                 ctx.font = 'bold 16px Arial';
//                 const textMetrics = ctx.measureText(label);
//                 const textWidth = textMetrics.width + 12;
//                 const textHeight = 22;

//                 // Label background
//                 ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
//                 ctx.fillRect(left, Math.max(0, top - textHeight), textWidth, textHeight);

//                 // Label text
//                 ctx.fillStyle = color;
//                 ctx.fillText(label, left + 6, Math.max(16, top - 6));

//                 // FIXED: Triangle detection for capture logic
//                 if (className === "triangle") {
//                     seenTriangle = true;
//                     if (setDistance) {
//                         setDistance({ model: "triangle", distance: boxWidth.toFixed(2) });
//                     }
//                 }

//                 allDetections.push(`${className}(${confidencePercent}%)`);
//                 totalDrawn++;
//                 console.log(`✓ Drew ${className} at [${left.toFixed(1)},${top.toFixed(1)}] size ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
//             } else {
//                 console.log(`✗ Skipped ${className} - box too small: ${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`);
//             }
//         }
//     };

//     // FIXED: Process all detection data
//     for (let k = 0; k < boxes_data.length; k++) {
//         drawSet(boxes_data[k], scores_data[k], classes_data?.[k]);
//     }

//     console.log(`=== RENDER SUMMARY ===`);
//     console.log(`Total drawn: ${totalDrawn}`);
//     console.log(`Detections: ${allDetections.join(', ')}`);
//     console.log(`Triangle seen: ${seenTriangle}`);

//     // ---- Capture logic (triangle-driven only) ----
//     const now = Date.now();
//     const cooledDown = now - lastCaptureAt > COOLDOWN_MS;

//     if (seenTriangle) stable.triangle++; 
//     else stable.triangle = 0;

//     const captureDebug = `[capture] triangle_stable=${stable.triangle}/${STABLE_FRAMES} cooled=${cooledDown}`;
//     console.log(captureDebug);

//     // Phase 1: capture WITHOUT GLASS
//     if (!captured.without_glass_image) {
//         if (stable.triangle >= STABLE_FRAMES && cooledDown) {
//             captured.without_glass_image = true;
//             lastCaptureAt = now;
//             phase1DoneAt = now;
//             console.log("📸 CAPTURING: without_glass_image");
//             captureImage?.("without_glass_image");
//             stable.triangle = 0;
//         }
//         return;
//     }

//     // Phase 2: after a grace period, capture WITH GLASS
//     const phaseGapOk = now - phase1DoneAt > PHASE_GAP_MS;
//     if (!captured.with_glass_image && phaseGapOk) {
//         if (stable.triangle >= STABLE_FRAMES && cooledDown) {
//             captured.with_glass_image = true;
//             lastCaptureAt = now;
//             console.log("📸 CAPTURING: with_glass_image");
//             captureImage?.("with_glass_image");
//             stable.triangle = 0;
//         }
//     } else if (!phaseGapOk) {
//         const waitTime = PHASE_GAP_MS - (now - phase1DoneAt);
//         console.log(`[capture] waiting phase gap... ${waitTime}ms remaining`);
//     }

//     // Log final summary
//     const summary = `Rendered: ${totalDrawn} objects | ${allDetections.join(', ')} | Triangle: ${seenTriangle}`;
//     onLog(summary);
// }

// // Optional helper to reset capture state
// export function resetCaptureState() {
//     captured = { without_glass_image: false, with_glass_image: false };
//     stable = { triangle: 0 };
//     lastCaptureAt = 0;
//     phase1DoneAt = 0;
//     console.log("Capture state reset");
// }

// // Helper to get current detection stats
// export function getDetectionStats() {
//     return {
//         captured: { ...captured },
//         triangleStability: stable.triangle,
//         lastCaptureTime: lastCaptureAt,
//         phase1Time: phase1DoneAt
//     };
// }