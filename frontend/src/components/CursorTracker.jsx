import React, { useEffect, useState } from 'react';

function CursorTracker() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="custom-cursor"
      style={{
        left: `${position.x - 12}px`,
        top: `${position.y - 12}px`
      }}
    />
  );
}

export default CursorTracker;