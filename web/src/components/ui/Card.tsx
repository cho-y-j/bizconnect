import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  highlight?: boolean;
}

export function Card({
  className = "",
  highlight = false,
  children,
  ...props
}: CardProps) {
  const base =
    "rounded-3xl border border-slate-800/80 bg-slate-950/60 backdrop-blur-sm shadow-[0_18px_45px_rgba(0,0,0,0.6)]";
  const highlightStyles =
    "border-accent-500/80 shadow-[0_20px_60px_rgba(244,63,94,0.45)]";

  return (
    <div
      className={`${base} ${highlight ? highlightStyles : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}


