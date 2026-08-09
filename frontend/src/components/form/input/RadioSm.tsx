import { FC } from "react";

interface RadioSmProps {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const RadioSm: FC<RadioSmProps> = ({
  id,
  name,
  value,
  checked,
  label,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer select-none items-center gap-3 text-sm font-medium ${
        disabled
          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          : "text-gray-700 dark:text-gray-400"
      } ${className}`}
    >
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={() => !disabled && onChange(value)}
        className="sr-only"
        disabled={disabled}
      />
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border-[1.25px] ${
          checked
            ? "border-brand-500 bg-brand-500"
            : "bg-transparent border-gray-300 dark:border-gray-700"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full bg-white ${
            checked ? "block" : "hidden"
          }`}
        ></span>
      </span>
      {label}
    </label>
  );
};

export default RadioSm;
