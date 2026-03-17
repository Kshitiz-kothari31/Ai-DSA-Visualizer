window.visualFrames = [];

window.recordState = (name, data, activeIndices = []) => {
    window.visualFrames.push({
        name,
        data: [...data],
        activeIndices,
        timestamp: Date.now()
    });
};

export const clearFrames = () => {
    window.visualFrames = []; 
};

export const getFrames = () => window.visualFrames;