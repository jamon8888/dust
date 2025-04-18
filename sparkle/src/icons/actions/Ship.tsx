import type { SVGProps } from "react";
import * as React from "react";
const SvgShip = (props: SVGProps<SVGSVGElement>) => (
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
      d="M4 10.4V3h6V1h4v2h6v7.4l1.086.326a1 1 0 0 1 .683 1.2l-1.517 6.068a4.99 4.99 0 0 1-1.902-.273l1.25-5.351L12 10l-7.6 2.37 1.25 5.351a4.99 4.99 0 0 1-1.902.273l-1.516-6.068a1 1 0 0 1 .682-1.2L4 10.4Zm2-.6L12 8l6 1.8V5H6v4.8ZM4 20a5.978 5.978 0 0 0 4-1.528A5.978 5.978 0 0 0 12 20a5.978 5.978 0 0 0 4-1.528A5.978 5.978 0 0 0 20 20h2v2h-2a7.963 7.963 0 0 1-4-1.07A7.963 7.963 0 0 1 12 22a7.963 7.963 0 0 1-4-1.07A7.963 7.963 0 0 1 4 22H2v-2h2Z"
    />
  </svg>
);
export default SvgShip;
