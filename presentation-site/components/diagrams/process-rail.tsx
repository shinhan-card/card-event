"use client";

import { motion } from "framer-motion";
import { architectureContent } from "@/content/architecture-content";

const railVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.04 }
  }
} as const;

const stageVariants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
  }
} as const;

export default function ProcessRail() {
  return (
    <motion.div
      className="process-rail"
      aria-label="Signal processing rail"
      initial="hidden"
      animate="show"
      variants={railVariants}
    >
      <motion.div className="process-rail-track" variants={stageVariants} aria-hidden="true" />

      <div className="process-rail-stages">
        {architectureContent.stages.map((stage, index) => (
          <motion.article className="process-rail-stage" key={stage.key} variants={stageVariants}>
            <span className="process-rail-index">{String(index + 1).padStart(2, "0")}</span>
            <h3>{stage.title}</h3>
            <p className="process-rail-technology">{stage.technology}</p>
            <p>{stage.description}</p>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );
}
