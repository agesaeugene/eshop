import * as React from "react";

const HeartIcon = (props: any) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M10 16.5C10 16.5 2.5 12 2.5 6.5C2.5 4.5 4 3 6 3C7.5 3 8.8 3.9 10 5.2C11.2 3.9 12.5 3 14 3C16 3 17.5 4.5 17.5 6.5C17.5 12 10 16.5 10 16.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default HeartIcon;