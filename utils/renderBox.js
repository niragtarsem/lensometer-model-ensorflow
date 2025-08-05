import labels from "./labels.json";

const focalLengthFinder = (knownDistance, knownWidth, widthInImage) => {
  return (widthInImage * knownDistance) / knownWidth;
};
 
const distanceFinder = (focalLength, knownWidth, widthInImage) => {
  if (widthInImage && knownWidth) {
    return (knownWidth * focalLength) / widthInImage;
  } else {
    return 0;
  }
};

const dimensions = {
  'triangle': {
    knownDistance: 50,
    knownWidth: 0.9,
    widthInPx: 25
  },
  'glass': {
    knownDistance: 25,
    knownWidth: 15,
    widthInPx: 288
  }
}

let imageCaptured = {
  with_glass_image: false,
  with_glass_image: false
};
let klassCoardinates = {};
export const renderBoxes = (
  canvasRef,
  classThreshold,
  boxes_data,
  scores_data,
  classes_data,
  ratios,
  captureImage,
  setDistance
) => {
  const ctx = canvasRef.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  console.log(ctx.canvas.width,'width>>>>>>>>>>>>',ctx.canvas.height,'height>>>>>>>>>>')

 
  for(let i = 0; i < scores_data.length; ++i) {
    const score_data = scores_data[i].slice(0, 4);
    for(let j = 0; j < score_data.length; ++j) {
      if (score_data[j] > classThreshold) {
        const klass = labels[i == 0 ? (classes_data[i][j] + 4) : classes_data[i][j]];

        let [x1, y1, x2, y2] = boxes_data[i].slice(j * 4, (j + 1) * 4);
        x1 *= canvasRef.width * ratios[0];
        x2 *= canvasRef.width * ratios[0];
        y1 *= canvasRef.height * ratios[1];
        y2 *= canvasRef.height * ratios[1];
        klassCoardinates[klass] = {x1, y1, x2, y2};

        // Calculate the distance using the focal length and the current box width
        const width = x2 - x1;
        console.log(width,'sharan phone width>>>>>>>>>>')
        const focalLength = focalLengthFinder(dimensions[klass]?.knownDistance, dimensions[klass]?.knownWidth, dimensions[klass]?.widthInPx);

        const distance = distanceFinder(focalLength, dimensions[klass]?.knownWidth, width).toFixed(2);
        console.log(klass, distance, width, '====================rendor box')
        if(klass === 'glass') {
          setDistance({
            model: 'glass',
            distance: distance
          })
        } else if(klass === 'triangle' && !klassCoardinates['glass']?.x1) {
          setDistance({
            model: 'triangle',
            distance: distance
          })
        }
        console.log(klassCoardinates['left'], klassCoardinates['right'], klass, "===============")
        if(klassCoardinates['left'] && klassCoardinates['right'] && klass === 'glass' && distance > 24 && distance < 28) {
          let lineColor = ['red', 'blue'];
          const coordinates = [klassCoardinates['left'], klassCoardinates['right']];
          for(let i = 0; i < coordinates.length; ++i) {
            x1 = coordinates[i].x1;
            x2 = coordinates[i].x2;
            y1 = coordinates[i].y1;
            y2 = coordinates[i].y2;
            const centerX = (x1 + x2) / 2;
            const centerY = (y1 + y2) / 2;
              // Calculate the dimensions of the + sign
              const lineLength = Math.min(x2 - x1, y2 - y1) / 2; // Half the length of the smallest dimension
              const halfLineLength = lineLength / 2;
              // Draw the horizontal line of the +
              ctx.strokeStyle = lineColor[i];
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(centerX - (halfLineLength + 15), centerY);
              ctx.lineTo(centerX + (halfLineLength + 15), centerY);
              ctx.stroke();
  
              // Draw the vertical line of the +
              ctx.beginPath();
              ctx.moveTo(centerX, centerY - (halfLineLength + 15));
              ctx.lineTo(centerX, centerY + (halfLineLength + 15));
              ctx.stroke();
          }
          console.log(klassCoardinates['star'] && klassCoardinates['star'].x1 && Math.abs(klassCoardinates['star'].x1 - klassCoardinates['left'].x1),'cordinate - 1 left here>>>>>>>>>>>>>>>>>>>>>>>>>')
          console.log(klassCoardinates['won'] && klassCoardinates['won'].x1 && Math.abs(klassCoardinates['won'].x1 - klassCoardinates['right'].x1),'cordinnate-2 right >>>>>>>>>>>>>>>>>>>>>>')
          if(imageCaptured['without_glass_image'] && !imageCaptured['with_glass_image'] && ((klassCoardinates['star'] && klassCoardinates['star'].x1 && Math.abs(klassCoardinates['star'].x1 - klassCoardinates['left'].x1) <= 8) && (klassCoardinates['won'] && klassCoardinates['won'].x1 && Math.abs(klassCoardinates['won'].x1 - klassCoardinates['right'].x1) <= 8))) {
            captureImage('with_glass_image');
            imageCaptured['with_glass_image'] = true;
            break;
          }
        } else if(klass === 'triangle' && distance > 48 && distance < 52 && !imageCaptured['without_glass_image']) {
          captureImage('without_glass_image')
          imageCaptured['without_glass_image'] = true;
        }
      }
    }
  }
};

 