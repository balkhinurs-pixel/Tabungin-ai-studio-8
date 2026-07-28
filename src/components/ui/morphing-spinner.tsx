'use client';

import { cn } from "@/lib/utils"

interface MorphingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function MorphingSpinner({ size = "md", className }: MorphingSpinnerProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <div className="absolute inset-0 animate-smooth-morph bg-primary" />
    </div>
  )
}