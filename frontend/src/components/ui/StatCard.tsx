import React from "react";
import Badge from "./badge/Badge";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  iconClassName?: string;
  badge?: {
    text: string;
    color: "success" | "error" | "warning" | "primary" | "info" | "light" | "dark";
  };
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  iconClassName = "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white/90",
  badge,
}) => {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      {icon && (
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconClassName}`}
        >
          {icon}
        </div>
      )}

      <div className="flex items-end justify-between mt-5">
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {value}
          </h4>
        </div>
        {badge && <Badge color={badge.color}>{badge.text}</Badge>}
      </div>
    </div>
  );
};

export default StatCard;
