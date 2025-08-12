async function validateModel() {
    console.log("=== MODEL VALIDATION TEST ===");
    
    try {
        // Load model with detailed logging
        const model = await tf.loadLayersModel('/oc2_best_web_model/model.json');
        
        console.log("✓ Model loaded successfully");
        console.log("Model summary:");
        model.summary();
        
        // Check input shape
        const inputShape = model.inputs[0].shape;
        console.log("Input shape:", inputShape);
        
        // Check output shape  
        const outputShape = model.outputs[0].shape;
        console.log("Output shape:", outputShape);
        
        // Create dummy input to test inference
        console.log("=== TESTING INFERENCE ===");
        const dummyInput = tf.randomNormal([1, 3, 640, 640]); // YOLOv8 standard input
        
        console.log("Dummy input shape:", dummyInput.shape);
        
        // Try prediction
        const prediction = model.predict(dummyInput);
        console.log("Prediction shape:", prediction.shape);
        console.log("Prediction data type:", prediction.dtype);
        
        // Clean up
        dummyInput.dispose();
        prediction.dispose();
        
        console.log("🎉 Model validation successful!");
        
    } catch (error) {
        console.error("❌ Model validation failed:");
        console.error("Error details:", error);
        console.error("Error stack:", error.stack);
        
        // Additional diagnostics
        console.log("=== DIAGNOSTIC INFO ===");
        console.log("TensorFlow.js version:", tf.version.tfjs);
        console.log("Backend:", tf.getBackend());
        console.log("Platform:", tf.env().platform);
    }
}

// Run validation
validateModel();
