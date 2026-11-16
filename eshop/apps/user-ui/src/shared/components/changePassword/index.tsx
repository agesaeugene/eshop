'use client';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import axiosInstance from 'apps/user-ui/src/utils/axiosInstance';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type FormData = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    otp?: string;
};

const ChangePasswordSection = () => {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm<FormData>();

    const newPassword = watch("newPassword");

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const getErrorMessage = (error: any) =>
        error?.response?.data?.message || "Something went wrong. Please try again.";

    // Step 1: validate passwords + email the OTP
    const { mutate: requestOtp, isPending: sendingOtp } = useMutation({
        mutationFn: async (data: FormData) => {
            const { currentPassword, newPassword, confirmPassword } = data;
            const res = await axiosInstance.post("/api/change-password/send-otp", {
                currentPassword,
                newPassword,
                confirmPassword,
            });
            return res.data;
        },
        onSuccess: () => {
            setServerError(null);
            setOtpSent(true);
            setCooldown(60);
        },
        onError: (error: any) => setServerError(getErrorMessage(error)),
    });

    // Step 2: submit with the OTP
    const { mutate: changePassword, isPending } = useMutation({
        mutationFn: async (data: FormData) => {
            const res = await axiosInstance.put("/api/change-password", data);
            return res.data;
        },
        onSuccess: () => {
            setServerError(null);
            setSuccess(true);
            setOtpSent(false);
            setCooldown(0);
            reset();
            setTimeout(() => setSuccess(false), 4000);
        },
        onError: (error: any) => {
            setSuccess(false);
            setServerError(getErrorMessage(error));
        },
    });

    const onSubmit = (data: FormData) => {
        setServerError(null);
        if (!otpSent) requestOtp(data);
        else changePassword(data);
    };

    const onResend = (data: FormData) => {
        setServerError(null);
        requestOtp(data);
    };

    const busy = isPending || sendingOtp;

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

                {otpSent && (
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                            Verification Code
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="4-digit code sent to your email"
                            {...register("otp", {
                                validate: (v) =>
                                    !otpSent || /^\d{4}$/.test(v || "") || "Enter the 4-digit code",
                            })}
                            className="form-input"
                        />
                        {errors.otp && (
                            <p className="text-red-500 text-xs mt-1">{errors.otp.message}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                            {cooldown > 0 ? (
                                `Resend code in ${cooldown}s`
                            ) : (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={handleSubmit(onResend)}
                                    className="text-blue-500 hover:underline"
                                >
                                    Resend code
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className="w-full bg-blue-600 text-white text-sm py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {sendingOtp
                        ? "Sending code..."
                        : isPending
                        ? "Updating..."
                        : otpSent
                        ? "Verify & Update Password"
                        : "Send Verification Code"}
                </button>
            </form>
        </div>
    );
};

export default ChangePasswordSection;