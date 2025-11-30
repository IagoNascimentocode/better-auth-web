import React from "react";

type CardProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
};

export function Card({ title, icon, children }: CardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
          {title}
        </h2>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </div>
      {children}
    </div>
  );
}

type ProgressBarProps = {
  value: number;
  labelLeft: string;
  labelRight: string;
};

export function ProgressBar({ value, labelLeft, labelRight }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
