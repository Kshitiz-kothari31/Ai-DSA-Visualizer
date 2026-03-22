let frames = [];
let currentFrameIndex = 0;

/**
 * @param {number} line
 * @param {Object} variables
 * @param {Array} activeIndices
 */

export const recordFrame = (line, variables, activeIndices = []) => {
    frames.push({
        line,
        variables: JSON.parse(JSON.stringify(variables)),
        activeIndices,
        timestamp: Date.now()
        
    });
};

export const clearFrames = () => {
    frames = [];
    currentFrameIndex = 0;
};

export const getFrames = () => frames;

export const setFrameIndex = (index) => {
    if( index >= 0 && index < frames.length ){
        currentFrameIndex = index;
    }
};

export const getCurrentFrame = () => frames[currentFrameIndex] || null;

export const getTotalFrames = () => frames.length;