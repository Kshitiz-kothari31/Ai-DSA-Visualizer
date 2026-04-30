import React from 'react';

/**
 * A reusable Resizer handle component.
 * @param {string} direction - 'horizontal' or 'vertical'
 * @param {function} onMouseDown - mouse down event handler
 */
const Resizer = ({ direction, onMouseDown, className = "" }) => {
  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={onMouseDown}
      className={`
        ${isHorizontal ? 'w-2 cursor-col-resize h-full' : 'h-2 cursor-row-resize w-full'}
        bg-transparent hover:bg-blue-500/20 transition-colors
        flex items-center justify-center group z-[100]
        ${className}
      `}
    >
      <div className={`
        ${isHorizontal ? 'w-px h-8' : 'h-px w-8'}
        bg-gray-700 group-hover:bg-blue-400 transition-colors
      `} />
    </div>
  );
};

export default Resizer;
