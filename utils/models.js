import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl"; // set backend to webgl

export async function getModels() {
    return new Promise((resolve, reject) => {
        tf.ready().then(async () => {
            const yolov5 = await tf.loadGraphModel(
              `/best_web_model/model.json`,
            ); // load model
      
            const dummyInput = tf.ones(yolov5.inputs[0].shape);
            const warmupResult = await yolov5.executeAsync(dummyInput);
      
            const yolov5oc = await tf.loadGraphModel(
              `/oc2_best_web_model/model.json`
            ); 
      
            tf.dispose(warmupResult);
            tf.dispose(dummyInput);
            resolve({
                model: {
                    net: yolov5,
                    inputShape: yolov5.inputs[0].shape,
                },
                ocModel: {
                    net: yolov5oc,
                    inputShape: yolov5oc.inputs[0].shape,
                }
            })
        });
    })
}