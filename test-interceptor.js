import fs from 'fs';
import { instrumentCode, executeInstrumented } from './src/utils/interceptor.js';

const code = `
function bubbleSort(arr) {
  let n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
let myArray = [50, 20, 80, 10];
bubbleSort(myArray);
`;

try {
    const { instrumented, varsToTrack } = instrumentCode(code);
    const frames = executeInstrumented({ instrumented });
    
    fs.writeFileSync('test-out.json', JSON.stringify({
        varsToTrack,
        instrumented,
        frameCount: frames.length,
        firstFrame: frames[0],
        lastFrame: frames[frames.length - 1]
    }, null, 2));
} catch (e) {
    fs.writeFileSync('test-out.json', JSON.stringify({ error: e.stack }));
}
