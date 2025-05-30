import type { SVGProps } from "react";
import * as React from "react";
const SvgCalendar = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M9 1v2h6V1h2v2h5v18H2V3h5V1h2Zm11 10H4v8h16v-8ZM7 5H4v4h16V5h-3v2h-2V5H9v2H7V5Z"
    />
  </svg>
);
export default SvgCalendar;
