"use client";

import Link from "next/link";
import React from "react";

const Page = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="bg-white rounded-2xl shadow-md p-10 max-w-md w-full text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-6">
                    <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    You're all set!
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                    Your seller account and shop have been created successfully.
                    Your M-Pesa number has been linked for withdrawals.
                </p>

                <Link href="/dashboard">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition-colors">
                        Go to Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default Page;