'use client';

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface DeleteDiscountCodeModalProps {
    discount: {
        id: string;
        public_name: string;
        discountCode: string;
    };
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
}

const DeleteDiscountCodeModal = ({
    discount,
    onClose,
    onConfirm,
    isDeleting = false,
}: DeleteDiscountCodeModalProps) => {
    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-[420px] shadow-lg">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={22} />
                        <h3 className="text-xl text-white font-semibold">Delete Discount Code</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                        disabled={isDeleting}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="mt-4">
                    <p className="text-gray-300">
                        Are you sure you want to delete{' '}
                        <span className="font-semibold text-white">
                            "{discount?.public_name}"
                        </span>{' '}
                        (code:{' '}
                        <span className="font-mono text-white">{discount?.discountCode}</span>
                        )? This action cannot be undone.
                    </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteDiscountCodeModal;