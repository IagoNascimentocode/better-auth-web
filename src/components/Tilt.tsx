import React from "react";

type Props = {
  children: React.ReactNode;
  maxTilt?: number; // graus
  className?: string;
  style?: React.CSSProperties;
};

export default function Tilt({ children, maxTilt = 8, className = "", style }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;  // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    const rx = (py - 0.5) * -2 * maxTilt; // rotX
    const ry = (px - 0.5) *  2 * maxTilt; // rotY
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg)`;
  }

  return (
    <div
      className={`tilt-3d ${className}`}
      style={style}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  );
}
