'use client';

import React from 'react';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';

interface DeleteConfirmationModalProps {
    product: {
        id: string;
        title: string;
        isDeleted?: boolean;
    };
    onClose: () => void;
    onConfirm: () => void;
    onRestore: () => void;
    isLoading?: boolean;
}

const DeleteConfirmationModal = ({
    product,
    onClose,
    onConfirm,
    onRestore,
    isLoading = false,
}: DeleteConfirmationModalProps) => {
    const isDeleted = Boolean(product?.isDeleted);

    const handleAction = () => {
        if (isDeleted) {
            onRestore();
        } else {
            onConfirm();
        }
    };

    return (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg md:w-[450px] shadow-lg">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                    <div className="flex items-center gap-2">
                        {isDeleted ? (
                            <RotateCcw className="text-green-500" size={22} />
                        ) : (
                            <AlertTriangle className="text-red-500" size={22} />
                        )}
                        <h3 className="text-xl text-white font-semibold">
                            {isDeleted ? 'Restore Product' : 'Delete Product'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                        disabled={isLoading}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="mt-4">
                    <p className="text-gray-300">
                        Are you sure you want to{' '}
                        {isDeleted ? 'restore' : 'delete'}{' '}
                        <span className="font-semibold text-white">
                            "{product?.title}"
                        </span>
                        ?
                    </p>
                    {!isDeleted && (
                        <p className="text-gray-400 text-sm mt-2">
                            This product will be moved to a deleted state and
                            permanently removed after 24 hours. You can restore
                            it any time before then.
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAction}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            isDeleted
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isLoading
                            ? isDeleted
                                ? 'Restoring...'
                                : 'Deleting...'
                            : isDeleted
                            ? 'Restore'
                            : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;