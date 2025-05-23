import type { SVGProps } from "react";
import * as React from "react";
const SvgVolumeUp = (props: SVGProps<SVGSVGElement>) => (
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
      d="M6.603 10 10 7.22v9.56L6.603 14H3v-4h3.603ZM1 16h4.889L12 21V3L5.889 8H1v8Zm22-4c0 3.292-1.446 6.246-3.738 8.262l-1.418-1.418A8.98 8.98 0 0 0 21 12a8.98 8.98 0 0 0-3.155-6.844l1.417-1.418A10.974 10.974 0 0 1 23 12Zm-5 0a5.99 5.99 0 0 0-2.287-4.713l-1.429 1.429A3.996 3.996 0 0 1 16 12c0 1.36-.679 2.561-1.716 3.284l1.43 1.43A5.99 5.99 0 0 0 18 12Z"
    />
  </svg>
);
export default SvgVolumeUp;
