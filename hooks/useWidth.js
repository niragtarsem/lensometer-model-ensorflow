const useWidth = (distance, model) => {
    let newWidth = 0;
    let correctDistance = false;
    let image = 2;
    if(model === 'glass') {
        if (distance >= 23 && distance <= 28) {
            correctDistance = true;
            newWidth = 58;
            image = 1;
        } else if (distance >= 29) {
            correctDistance = false;
            if (distance >= 40) {
                newWidth = 48 - (distance - 40) * 1.25;
            } else if (distance >= 35) {
                newWidth = 45 - (distance - 35) * 1.25;
            } else {
                newWidth = 38 - (distance - 28) * 1.25;
            }
            image = 2;
        } else if (distance < 23) {
            correctDistance = false;
            if (distance < 10) {
                newWidth = 80 + (10 - distance) * 1.25;
            } else if (distance <= 16) {
                newWidth = 75 + (16 - distance) * 1.25;
            } else {
                newWidth = 65 + (23 - distance) * 1.25;
            }
            image = 0;
        }
        newWidth += 1.45;
    } else if(model === 'triangle') {
        if (distance >= 48 && distance <= 52) {
            correctDistance = true;
            newWidth = 20;
            image = 1;
          } else if (distance > 52) {
            correctDistance = false;
            image = 2;
            if (distance > 90) {
              newWidth = 3 - (distance - 90) * 1.25;
            } else if (distance > 80) {
              newWidth = 4 - (distance - 80) * 1.25;
            } else if (distance > 70) {
              newWidth = 5 - (distance - 70) * 1.25;
            } else if (distance > 60) {
              newWidth = 6 - (distance - 60) * 1.25;
            } else {
              newWidth = 7 - (distance - 52) * 1.25;
            }
          } else if (distance < 48) {
            image = 0;
            correctDistance = false;
            if (distance <= 22) {
              newWidth = 36 + (22 - distance) * 1.25;
            } else if (distance <= 31) {
              newWidth = 32 + (31 - distance) * 1.25;
            } else if (distance <= 34) {
              newWidth = 30 + (34 - distance) * 1.25;
            } else if (distance <= 42) {
              newWidth = 27 + (42 - distance) * 1.25;
            } else if (distance <= 45) {
              newWidth = 25 + (45 - distance) * 1.25;
            } else {
              newWidth = 19 + (48 - distance) * 1.25;
            }
          }
          newWidth += 1.45;
    }
    return { width: newWidth, correctDistance, image }
}

export default useWidth;
