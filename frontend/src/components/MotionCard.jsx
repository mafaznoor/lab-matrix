import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

function MotionCard({ children, className }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);
  const springConfig = { damping: 15, stiffness: 150 };
  
  return (
    <motion.div
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX: useSpring(rotateX, springConfig), rotateY: useSpring(rotateY, springConfig), perspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
export default MotionCard;