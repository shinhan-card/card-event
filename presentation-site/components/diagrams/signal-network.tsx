"use client";

import { motion, useReducedMotion } from "framer-motion";
import { architectureContent } from "@/content/architecture-content";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.08 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
  }
} as const;

export default function SignalNetwork() {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return (
    <motion.section
      className="signal-network"
      aria-label="Signal network diagram"
      initial={prefersReducedMotion ? false : "hidden"}
      animate="show"
      variants={containerVariants}
    >
      <motion.div className="signal-network-header" variants={itemVariants}>
        <p className="section-shell-eyebrow">Signal network</p>
        <p className="signal-network-copy">
          Separate lanes keep event and product intelligence legible before
          delivery.
        </p>
      </motion.div>

      <div className="signal-network-grid">
        {architectureContent.axes.map((axis, index) => (
          <motion.article
            className={`signal-network-axis signal-network-axis--${index === 0 ? "signal" : "warm"}`}
            key={axis.key}
            variants={itemVariants}
          >
            <span className="signal-network-axis-key">{axis.key}</span>
            <h3>{axis.title}</h3>
            <p>{axis.question}</p>
            <div className="signal-network-pulse" aria-hidden="true" />
          </motion.article>
        ))}
      </div>

      <motion.div className="signal-network-bridge" variants={itemVariants}>
        <span className="signal-network-bridge-label">Shared delivery</span>
        <div className="signal-network-bridge-track" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </motion.div>
    </motion.section>
  );
}
