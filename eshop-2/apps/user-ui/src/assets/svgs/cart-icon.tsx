import * as React from "react";

const CartIcon = (props: any) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Handle */}
    <path
      d="M1.5 2.5H3.5L5.5 13.5H15.5L17.5 6.5H5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Wheel left */}
    <circle
      cx="7"
      cy="16.5"
      r="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    {/* Wheel right */}
    <circle
      cx="14"
      cy="16.5"
      r="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

export default CartIcon;