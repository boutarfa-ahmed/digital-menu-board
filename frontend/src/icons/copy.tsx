import type { SVGProps } from "react";

const CopyIcon = ({ className = "", ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={["fill-current", className].filter(Boolean).join(" ")}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.25 2.5C5.14543 2.5 4.25 3.39543 4.25 4.5V11.5C4.25 12.6046 5.14543 13.5 6.25 13.5H9.5V15.5C9.5 16.6046 10.3954 17.5 11.5 17.5H15.5C16.6046 17.5 17.5 16.6046 17.5 15.5V8.5C17.5 7.39543 16.6046 6.5 15.5 6.5H12.25V4.5C12.25 3.39543 11.3546 2.5 10.25 2.5H6.25ZM12.25 8H15.5V15.5H11.5V11.5C11.5 10.3954 10.6046 9.5 9.5 9.5H6.25V4.5H10.25C10.6046 4.5 11.25 4.89543 11.25 4.5H10.25V8H12.25ZM9.5 11H15.5V15.5H11.5V11.5H9.5V11Z"
      fill=""
    />
  </svg>
);

export default CopyIcon;
