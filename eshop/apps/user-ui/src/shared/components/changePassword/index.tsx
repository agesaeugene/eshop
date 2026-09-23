'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type FormData = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

const ChangePasswordSection = () => {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormData>();

    const newPassword = watch("newPassword");

    const { mutate: changePassword, isPending } = useMutation({
        mutationFn: async (data: FormData) => {
            const res = await axiosInstance.put("/api/change-password", data);
            return res.data;
        },
        onSuccess: () => {
            setServerError(null);
            setSuccess(true);
            reset();
            setTimeout(() => setSuccess(false), 4000);
        },
        onError: (error: any) => {
            setSuccess(false);
            setServerError(
                error?.response?.data?.message || "Something went wrong. Please try again."
            );
        },
    });

    const onSubmit = (data: FormData) => {
        setServerError(null);
        changePassword(data);
    };

    return (
        <div className="max-w-md space-y-4">
            {success && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-md p-3">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Password changed successfully.
                </div>
            )}
            {serverError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                    {serverError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Current Password
                    </label>
                    <div className="relative">
                        <input
                            type={showCurrent ? "text" : "password"}
                            {...register("currentPassword", {
                                required: "Current password is required",
                            })}
                            className="form-input pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.currentPassword && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.currentPassword.message}
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showNew ? "text" : "password"}
                            {...register("newPassword", {
                                required: "New password is required",
                                minLength: {
                                    value: 8,
                                    message: "Must be at least 8 characters",
                                },
                            })}
                            className="form-input pr-10"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {errors.newPassword && (
                        <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
                    )}
                </div>

                <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Confirm New Password
                    </label>
                    <input
                        type={showNew ? "text" : "password"}
                        {...register("confirmPassword", {
                            required: "Please confirm your new password",
                            validate: (value) =>
                                value === newPassword || "Passwords do not match",
                        })}
                        className="form-input"
                    />
                    {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">
                            {errors.confirmPassword.message}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {isPending ? "Updating..." : "Update Password"}
                </button>
            </form>
        </div>
    );
};

export default ChangePasswordSection;