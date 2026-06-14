import React from 'react';
import { motion } from 'motion/react';

interface ThreeDTextProps {
  text: string;
  className?: string;
  hoverColor?: string;
  gradient?: boolean;
}

export function ThreeDText({ text, className = "", hoverColor = "#F9D976", gradient = true }: ThreeDTextProps) {
  // Transform title to the premium brand "SAI NIRVANA PLAZA" in elegant uppercase
  const displayVal = text.toUpperCase().replace("SRI ", "SAI ");

  // Luxury Fade-In + Smooth Rise (1.2 seconds duration, playing once upon mount)
  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 15,
      filter: "drop-shadow(0 0 0px rgba(249,217,118,0)) blur(4px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "drop-shadow(0 0 10px rgba(212,175,55,0.25)) blur(0px)",
      transition: {
        duration: 1.3,
        ease: [0.16, 1, 0.3, 1] // Custom refined cubic-bezier layout curve
      }
    }
  };

  return (
    <motion.span
      id="three_d_text_refinement"
      className={`inline-block select-none tracking-wider font-heading font-black ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover={{
        scale: 1.02,
        filter: "drop-shadow(0 0 14px rgba(212,175,55,0.55)) brightness(1.08)",
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      style={{
        display: "inline-block",
        cursor: "pointer"
      }}
    >
      <span className="title-luxury-gradient-dark-bg">
        {displayVal}
      </span>
    </motion.span>
  );
}
