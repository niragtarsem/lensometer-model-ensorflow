import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // use WebGL for speed

// FIXED: Add cache-busting and model validation
export async function getModels() {
    return new Promise((resolve, reject) => {
        tf.ready().then(async () => {
            try {
                console.log("=== MODEL LOADING WITH VALIDATION ===");
                console.log("TensorFlow.js version:", tf.version.tfjs);
                console.log("TensorFlow.js backend:", tf.getBackend());
                console.log("WebGL supported:", !!tf.findBackend("webgl"));
                
                // FIXED: Add cache-busting timestamp to force fresh download
                const timestamp = Date.now();
                const modelPath = `/oc2_best_web_model/model.json?v=${timestamp}`;
                console.log("Loading YOLOv8 model from:", modelPath);

                // FIXED: Validate model.json file first
                console.log("Step 1: Validating model.json...");
                const modelJsonResponse = await fetch(modelPath);
                
                if (!modelJsonResponse.ok) {
                    throw new Error(`Failed to fetch model.json: ${modelJsonResponse.status} ${modelJsonResponse.statusText}`);
                }
                
                const modelJson = await modelJsonResponse.json();
                console.log("✓ model.json loaded successfully");
                console.log("Model JSON structure:", Object.keys(modelJson));
                
                // FIXED: More flexible model structure validation
                if (!modelJson.modelTopology && !modelJson.model) {
                    throw new Error("Invalid model.json: missing modelTopology or model");
                }
                
                if (!modelJson.weightsManifest && !modelJson.weightData && !modelJson.weightSpecs) {
                    throw new Error("Invalid model.json: missing weight information");
                }
                
                console.log("✓ Model structure validation passed");
                
                // FIXED: Handle different weight manifest structures
                let weightManifest = [];
                if (modelJson.weightsManifest) {
                    weightManifest = modelJson.weightsManifest;
                } else if (modelJson.weightSpecs) {
                    // Some models have weightSpecs instead
                    console.log("Using weightSpecs structure");
                    weightManifest = [{ paths: modelJson.format === 'layers_model' ? ['weights.bin'] : ['model.weights.bin'] }];
                }
                
                console.log("Expected weight files:", weightManifest.length);
                
                // FIXED: Validate weight files exist (only if we have manifest)
                if (weightManifest.length > 0) {
                    console.log("Step 2: Validating weight files...");
                    for (let i = 0; i < weightManifest.length; i++) {
                        const manifest = weightManifest[i];
                        for (const path of manifest.paths || []) {
                            const weightPath = `/oc2_best_web_model/${path}?v=${timestamp}`;
                            try {
                                const response = await fetch(weightPath, { method: 'HEAD' });
                                if (!response.ok) {
                                    console.error(`❌ Weight file missing or corrupted: ${path}`);
                                    throw new Error(`Weight file not accessible: ${path} (${response.status})`);
                                }
                                console.log(`✓ Weight file validated: ${path}`);
                            } catch (error) {
                                console.error(`❌ Failed to validate weight file: ${path}`, error);
                                throw new Error(`Cannot access weight file: ${path}`);
                            }
                        }
                    }
                    console.log("✓ All weight files validated");
                }
                
                // FIXED: Determine correct loading method
                console.log("Step 3: Loading model...");
                let yolov8;
                
                try {
                    // Try loadGraphModel first (for converted models)
                    console.log("Attempting to load as Graph Model...");
                    yolov8 = await tf.loadGraphModel(modelPath, {
                        onProgress: (fraction) => {
                            console.log(`Model loading progress: ${(fraction * 100).toFixed(1)}%`);
                        },
                        requestInit: {
                            cache: 'no-cache',
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        }
                    });
                    console.log("✓ Successfully loaded as Graph Model");
                } catch (graphError) {
                    console.log("Graph model loading failed, trying Layers Model...", graphError.message);
                    try {
                        yolov8 = await tf.loadLayersModel(modelPath, {
                            onProgress: (fraction) => {
                                console.log(`Layers model loading progress: ${(fraction * 100).toFixed(1)}%`);
                            }
                        });
                        console.log("✓ Successfully loaded as Layers Model");
                    } catch (layersError) {
                        console.error("❌ Both model loading methods failed");
                        console.error("Graph model error:", graphError);
                        console.error("Layers model error:", layersError);
                        
                        // Provide specific error messages
                        if (graphError.message.includes('length') || layersError.message.includes('length')) {
                            throw new Error("Model file corruption detected. Please clear browser cache and reload the page.");
                        } else if (graphError.message.includes('JSON') || layersError.message.includes('JSON')) {
                            throw new Error("Invalid model.json format. Please verify your model export.");
                        } else if (graphError.message.includes('fetch') || layersError.message.includes('fetch')) {
                            throw new Error("Network error loading model files. Check server accessibility.");
                        } else {
                            throw new Error(`Model loading failed. Graph: ${graphError.message}, Layers: ${layersError.message}`);
                        }
                    }
                }

                console.log("✓ Model loaded successfully");
                
                // FIXED: More flexible model inspection
                console.log("Step 4: Model validation...");
                
                let inputShape = null;
                let outputShape = null;
                
                // Handle different model types
                if (yolov8.inputs && yolov8.inputs[0]) {
                    // Graph model or Layers model with inputs
                    inputShape = yolov8.inputs[0].shape;
                    console.log("Found inputs array, input shape:", inputShape);
                } else if (yolov8.input && yolov8.input.shape) {
                    // Some models have single input property
                    inputShape = yolov8.input.shape;
                    console.log("Found single input property, input shape:", inputShape);
                } else if (yolov8.inputLayers && yolov8.inputLayers[0]) {
                    // Layers model inputLayers
                    inputShape = yolov8.inputLayers[0].batchInputShape;
                    console.log("Found inputLayers, input shape:", inputShape);
                }
                
                if (yolov8.outputs && yolov8.outputs[0]) {
                    // Graph model or Layers model with outputs
                    outputShape = yolov8.outputs[0].shape;
                    console.log("Found outputs array, output shape:", outputShape);
                } else if (yolov8.output && yolov8.output.shape) {
                    // Some models have single output property
                    outputShape = yolov8.output.shape;
                    console.log("Found single output property, output shape:", outputShape);
                } else if (yolov8.outputLayers && yolov8.outputLayers[0]) {
                    // Layers model outputLayers
                    outputShape = yolov8.outputLayers[0].getOutputAt(0).shape;
                    console.log("Found outputLayers, output shape:", outputShape);
                }
                
                console.log("Model validation details:");
                console.log("- Input shape:", inputShape);
                console.log("- Output shape:", outputShape);
                console.log("- Model type:", yolov8.constructor.name);
                
                // FIXED: More flexible shape validation
                if (!inputShape) {
                    console.warn("⚠️ Could not determine input shape, using default [null, 3, 640, 640]");
                    inputShape = [null, 3, 640, 640]; // Default YOLOv8 input
                }
                
                if (!outputShape) {
                    console.warn("⚠️ Could not determine output shape, using default [null, 11, 8400]");
                    outputShape = [null, 11, 8400]; // Default YOLOv8 output for 6 classes
                }
                
                // Validate input shape (should be 4D)
                if (inputShape && inputShape.length !== 4 && inputShape.length !== 3) {
                    console.warn(`⚠️ Unexpected input shape length: ${inputShape.length}, expected 3 or 4`);
                }
                
                // Output shape validation is more flexible now
                if (outputShape && outputShape.length >= 2) {
                    const lastDim = outputShape[outputShape.length - 1];
                    const secondLastDim = outputShape[outputShape.length - 2];
                    console.log(`Output format analysis: second_last=${secondLastDim}, last=${lastDim}`);
                    
                    // For YOLOv8, we might have [batch, channels, anchors] or [batch, anchors, channels]
                    if (secondLastDim === 11 || lastDim === 11 || secondLastDim === 10 || lastDim === 10) {
                        console.log("✓ Detected YOLOv8-like output structure for 6 classes");
                    } else {
                        console.warn(`⚠️ Unexpected output structure. Expected 10-11 channels for 6-class model`);
                    }
                } else {
                    console.warn(`⚠️ Unusual output shape: ${outputShape}`);
                }
                
                console.log("✓ Model structure validation completed");

                // FIXED: Improved warmup with better error handling
                console.log("Step 5: Model warmup...");
                
                // Use the actual input shape or fallback
                const warmupShape = inputShape || [1, 3, 640, 640];
                console.log("Using warmup shape:", warmupShape);
                
                const dummyInput = tf.randomNormal(warmupShape);
                
                try {
                    const warmupStart = performance.now();
                    let warmupOutput;
                    
                    // Handle different model execution methods
                    if (yolov8.executeAsync) {
                        warmupOutput = await yolov8.executeAsync(dummyInput);
                    } else if (yolov8.predict) {
                        warmupOutput = yolov8.predict(dummyInput);
                    } else {
                        throw new Error("Model does not have executeAsync or predict method");
                    }
                    
                    const warmupTime = performance.now() - warmupStart;
                    console.log(`✓ Model warmup successful (${warmupTime.toFixed(1)}ms)`);
                    
                    // Validate output
                    if (!warmupOutput) {
                        throw new Error("Model warmup failed: no output generated");
                    }
                    
                    // Handle different output formats
                    let actualOutputShape;
                    if (Array.isArray(warmupOutput)) {
                        actualOutputShape = warmupOutput[0]?.shape;
                        console.log("Warmup output (array):", warmupOutput.map(t => t.shape));
                    } else if (warmupOutput.shape) {
                        actualOutputShape = warmupOutput.shape;
                        console.log("Warmup output shape:", actualOutputShape);
                    }
                    
                    // Update output shape with actual shape from inference
                    if (actualOutputShape) {
                        outputShape = actualOutputShape;
                        console.log("Updated output shape from warmup:", outputShape);
                    }
                    
                    // Clean up warmup tensors
                    if (Array.isArray(warmupOutput)) {
                        warmupOutput.forEach(tensor => {
                            try { tensor.dispose(); } catch (e) { console.warn("Cleanup warning:", e); }
                        });
                    } else if (warmupOutput?.dispose) {
                        warmupOutput.dispose();
                    }
                    
                } catch (warmupError) {
                    console.error("❌ Model warmup failed:", warmupError);
                    throw new Error(`Model execution failed: ${warmupError.message}`);
                } finally {
                    dummyInput.dispose();
                }

                console.log("🎉 Model loading completed successfully!");
                console.log("Final model info:", {
                    inputShape,
                    outputShape,
                    modelType: yolov8.constructor.name,
                    hasExecuteAsync: !!yolov8.executeAsync,
                    hasPredict: !!yolov8.predict
                });

                // Return comprehensive model info
                resolve({
                    model: {
                        net: yolov8,
                        inputShape: inputShape,
                        outputShape: outputShape,
                        expectedClasses: 6,
                        modelPath: modelPath,
                        loadTime: Date.now(),
                        modelType: yolov8.constructor.name
                    },
                    ocModel: null
                });

            } catch (err) {
                console.error("❌ Model loading pipeline failed:", err);
                console.error("Error details:", {
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                });
                
                // Provide actionable error messages
                let userMessage = "Model loading failed: ";
                
                if (err.message.includes("corruption")) {
                    userMessage += "Model files appear corrupted. Please clear browser cache (Ctrl+Shift+Del) and reload the page.";
                } else if (err.message.includes("fetch") || err.message.includes("404")) {
                    userMessage += "Cannot access model files. Verify the /oc2_best_web_model/ directory contains all required files.";
                } else if (err.message.includes("JSON")) {
                    userMessage += "Model configuration is invalid. Please re-export your YOLOv8 model to TensorFlow.js format.";
                } else if (err.message.includes("WebGL")) {
                    userMessage += "WebGL is not available. Enable hardware acceleration in your browser settings.";
                } else if (err.message.includes("length")) {
                    userMessage += "Model file corruption detected. Clear browser cache and ensure all model files are complete.";
                } else if (err.message.includes("output shape")) {
                    userMessage += "Model output format is not as expected. This might be a model conversion issue.";
                } else {
                    userMessage += err.message;
                }
                
                reject(new Error(userMessage));
            }
        }).catch((tfError) => {
            console.error("❌ TensorFlow.js initialization failed:", tfError);
            reject(new Error(`TensorFlow.js failed to initialize: ${tfError.message}`));
        });
    });
}

// FIXED: Add utility to clear model cache
export function clearModelCache() {
    console.log("Clearing model cache...");
    
    // Clear TensorFlow.js model cache if available
    if (tf.io && tf.io.removeModel) {
        try {
            tf.io.removeModel('/oc2_best_web_model/model.json');
            console.log("✓ TensorFlow.js model cache cleared");
        } catch (e) {
            console.log("No cached model to clear");
        }
    }
    
    // Request user to clear browser cache
    console.log("Please clear your browser cache (Ctrl+Shift+Del) to ensure fresh model files");
}

// FIXED: Add model file integrity check utility
export async function checkModelFiles() {
    console.log("=== MODEL FILES INTEGRITY CHECK ===");
    
    const baseUrl = '/oc2_best_web_model/';
    
    // First check if model.json exists and get its content
    let requiredFiles = ['model.json'];
    
    try {
        const modelJsonResponse = await fetch(baseUrl + 'model.json');
        if (modelJsonResponse.ok) {
            const modelJson = await modelJsonResponse.json();
            console.log("Model JSON loaded for file list extraction");
            
            // Extract weight files from manifest
            if (modelJson.weightsManifest) {
                modelJson.weightsManifest.forEach(manifest => {
                    if (manifest.paths) {
                        requiredFiles.push(...manifest.paths);
                    }
                });
            } else {
                // Add common weight file patterns
                console.log("No weightsManifest found, checking common patterns");
                const commonPatterns = [
                    'weights.bin',
                    'model.weights.bin',
                    'group1-shard1of1.bin'
                ];
                requiredFiles.push(...commonPatterns);
            }
        }
    } catch (error) {
        console.error("Could not load model.json for file checking:", error);
        return [{ file: 'model.json', status: false, error: error.message }];
    }
    
    console.log("Checking files:", requiredFiles);
    
    const results = [];
    
    for (const file of requiredFiles) {
        try {
            const response = await fetch(baseUrl + file, { method: 'HEAD' });
            const status = response.ok ? '✓' : '❌';
            const size = response.headers.get('content-length') || 'unknown';
            
            console.log(`${status} ${file} (${size} bytes)`);
            results.push({
                file,
                status: response.ok,
                size: size,
                statusCode: response.status
            });
        } catch (error) {
            console.log(`❌ ${file} - Error: ${error.message}`);
            results.push({
                file,
                status: false,
                error: error.message
            });
        }
    }
    
    const allPresent = results.every(r => r.status);
    console.log(`\nModel files check: ${allPresent ? '✅ PASSED' : '❌ FAILED'}`);
    
    return results;
}

// FIXED: Add debugging utility
export function debugModelStructure(model) {
    console.log("=== MODEL STRUCTURE DEBUG ===");
    
    if (!model) {
        console.log("No model provided");
        return;
    }
    
    console.log("Model object keys:", Object.keys(model));
    console.log("Model constructor:", model.constructor.name);
    console.log("Model prototype:", Object.getPrototypeOf(model).constructor.name);
    
    // Check for different properties
    const properties = [
        'inputs', 'input', 'inputLayers',
        'outputs', 'output', 'outputLayers', 
        'layers', 'weights', 'trainableWeights',
        'executeAsync', 'predict', 'apply'
    ];
    
    properties.forEach(prop => {
        if (model[prop] !== undefined) {
            console.log(`${prop}:`, typeof model[prop], Array.isArray(model[prop]) ? `(array length: ${model[prop].length})` : '');
            if (prop.includes('input') || prop.includes('output')) {
                if (Array.isArray(model[prop]) && model[prop][0]) {
                    console.log(`  ${prop}[0].shape:`, model[prop][0].shape);
                } else if (model[prop].shape) {
                    console.log(`  ${prop}.shape:`, model[prop].shape);
                }
            }
        }
    });
}

// FIXED: Add model execution wrapper
export async function executeModel(model, input) {
    console.log("=== MODEL EXECUTION ===");
    console.log("Input shape:", input.shape);
    
    try {
        let output;
        
        if (model.executeAsync) {
            console.log("Using executeAsync method");
            output = await model.executeAsync(input);
        } else if (model.predict) {
            console.log("Using predict method");
            output = model.predict(input);
        } else {
            throw new Error("Model has no executeAsync or predict method");
        }
        
        console.log("✓ Model execution successful");
        
        if (Array.isArray(output)) {
            console.log("Output is array with shapes:", output.map(t => t.shape));
        } else {
            console.log("Output shape:", output.shape);
        }
        
        return output;
    } catch (error) {
        console.error("❌ Model execution failed:", error);
        throw error;
    }
}