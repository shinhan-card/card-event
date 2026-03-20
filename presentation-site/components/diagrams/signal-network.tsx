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
  const getAxisLabel = (index: number) => (index === 0 ? "이벤트 축" : "상품 / 공시 축");

  if (prefersReducedMotion) {
    return (
      <section className="signal-network" aria-label="신호 구조 다이어그램">
        <div className="signal-network-header">
          <p className="section-shell-eyebrow">신호 구조</p>
          <p className="signal-network-copy">
            두 축을 초반부터 나눠 보여주면 전달면에서 다시 합쳐질 때도 책임선이 흐려지지 않습니다.
          </p>
        </div>

        <div className="signal-network-grid">
          {architectureContent.axes.map((axis, index) => (
            <article
              className={`signal-network-axis signal-network-axis--${index === 0 ? "signal" : "warm"}`}
              key={axis.key}
            >
              <span className="signal-network-axis-key">{getAxisLabel(index)}</span>
              <h3>{axis.title}</h3>
              <p>{axis.question}</p>
              <div className="signal-network-pulse" aria-hidden="true" />
            </article>
          ))}
        </div>

        <div className="signal-network-bridge">
          <span className="signal-network-bridge-label">공유 전달면</span>
          <div className="signal-network-bridge-track" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    );
  }

  return (
    <motion.section
      className="signal-network"
      aria-label="신호 구조 다이어그램"
      initial="hidden"
      animate="show"
      variants={containerVariants}
    >
      <motion.div className="signal-network-header" variants={itemVariants}>
        <p className="section-shell-eyebrow">신호 구조</p>
        <p className="signal-network-copy">
          두 축을 초반부터 나눠 보여주면 전달면에서 다시 합쳐질 때도 책임선이 흐려지지 않습니다.
        </p>
      </motion.div>

      <div className="signal-network-grid">
        {architectureContent.axes.map((axis, index) => (
          <motion.article
            className={`signal-network-axis signal-network-axis--${index === 0 ? "signal" : "warm"}`}
            key={axis.key}
            variants={itemVariants}
          >
            <span className="signal-network-axis-key">{getAxisLabel(index)}</span>
            <h3>{axis.title}</h3>
            <p>{axis.question}</p>
            <div className="signal-network-pulse" aria-hidden="true" />
          </motion.article>
        ))}
      </div>

      <motion.div className="signal-network-bridge" variants={itemVariants}>
        <span className="signal-network-bridge-label">공유 전달면</span>
        <div className="signal-network-bridge-track" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </motion.div>
    </motion.section>
  );
}
