import React from "react";

const TitleBorder = ({ className }: { className?: string }) => {
    return (
        <svg
            className={className}
            width="100"
            height="10"
            viewBox="0 0 100 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1 5C20 1 40 9 50 5C60 1 80 9 99 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default TitleBorder;