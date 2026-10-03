import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-2">
      <p className="mb-3 text-xs text-white">
        <Link to="/">Início</Link>
        <span className="px-2">/</span>
        {title}
      </p>
      {children}
    </div>
  );
}
