import type { SVGProps } from "react";

const CheckLineIcon = ({ className = "", ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
    d="M13.4017 4.35986L6.12166 11.6399L2.59833 8.11657"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    />
  </svg>
);

export default CheckLineIcon;
