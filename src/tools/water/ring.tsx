"use client";

import { motion } from "motion/react";

/**
 * Progress ring. The arc animates on change, so a tap visibly moves it —
 * that motion is most of why logging feels satisfying.
 */
export function Ring({
  value,
  goal,
  size = 132,
  stroke = 12,
  color = "var(--tool-water)",
  children,
}: {
  value: number;
  goal: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0;
  const complete = pct >= 1;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-[color:var(--surface-sunk)]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={complete ? "var(--sage)" : color}
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
