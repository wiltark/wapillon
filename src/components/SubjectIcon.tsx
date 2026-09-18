"use client";

import { getSubjectIconName } from "@/lib/icons";
import { getSubjectColor } from "@/lib/services/types";
import Papicon from "./Papicon";

interface SubjectIconProps {
  subject: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const iconSizeMap = { sm: 14, md: 16, lg: 20 };

export default function SubjectIcon({ subject, size = "md", className = "" }: SubjectIconProps) {
  const iconName = getSubjectIconName(subject);
  const color = getSubjectColor(subject);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color + "18", color }}
    >
      <Papicon name={iconName} size={iconSizeMap[size]} />
    </div>
  );
}
