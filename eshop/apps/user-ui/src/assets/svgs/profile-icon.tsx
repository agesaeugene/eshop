import * as React from "react";

const ProfileIcon = (props: any) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Head */}
    <circle
      cx="10"
      cy="6"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Shoulders - Reconstructed from your "C" curve intent */}
    <path
      d="M3.5 17.5C3.5 14.5 5.5 13 10 13C14.5 13 16.5 14.5 16.5 17.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export default ProfileIcon;