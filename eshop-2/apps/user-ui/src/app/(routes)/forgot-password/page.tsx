"use client";
import GoogleButton from 'apps/user-ui/src/shared/components/google-button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react'
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { AxiosError } from "axios";
import { toast } from 'react-hot-toast';

type FormData = {
  email: string;
  password: string;
};

const ForgotPassword = () => {
  const [step, setStep] = React.useState<"email" | "otp" | "reset">("email");
  const [otp, setOtp] = React.useState(["", "", "", ""]);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [canResend, setCanResend] = React.useState(true);
  const [timer, setTimer] = React.useState(60);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]); // ✅ Fixed typo
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [rememberMe, setRememberMe] = React.useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const startResendTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const requestOtpMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/forgot-password-user`, { email });
      return response.data;
    },
    onSuccess: (_, { email }) => {
      setUserEmail(email);
      setStep("otp"); // ✅ Fixed: was setStep(otp)
      setServerError(null);
      setCanResend(false);
      startResendTimer();
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message?: string })?.message || "Invalid OTP. Try again!";
      setServerError(errorMessage);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!userEmail) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-forgot-password-user`, // ✅ Fixed typo + added comma
        { email: userEmail, otp: otp.join("") }
      );
      return response.data;
    },
    onSuccess: () => {
      setStep("reset");
      setServerError(null);
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message?: string })?.message;
      setServerError(errorMessage || "Invalid OTP. Try again!");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ password }: { password: string }) => {
      if (!password) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/reset-password-user`,
        { email: userEmail, newPassword: password }
      );
      return response.data;
    },
    onSuccess: () => {
      setStep("email");
      toast.success("Password reset successful! Please login with your new password.");
      setServerError(null);
      router.push("/login");
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message?: string })?.message;
      setServerError(errorMessage || "Failed to reset password. Try again!");
    },
  });

  const handleOtpChange = (index: number, value: string) => {
    if (/^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOtp = () => {
    if (userEmail) { // ✅ Fixed: was referencing undefined UserData/signupMutation
      requestOtpMutation.mutate({ email: userEmail });
    }
  };

  const onSubmitEmail = ({ email }: { email: string }) => {
    requestOtpMutation.mutate({ email });
  };

  const onSubmitPassword = ({ password }: { password: string }) => {
    resetPasswordMutation.mutate({ password });
  };

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <div className="w-full py-16 min-h-[85vh] bg-[#f1f1f1] flex flex-col items-center">
      <h1 className="text-4xl font-poppins font-semibold text-black text-center mb-2">Forgot Password</h1>
      <p className="text-center text-lg font-medium py-3 text-[#00000099] mb-6">
        Home . Forgot Password
      </p>

      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-md p-8 bg-white shadow-md rounded-xl">
          {step === "email" && (
            <>
              <h3 className="text-2xl font-semibold text-center mb-2">Forgot password for SokoJamo</h3>
              <p className="text-center text-gray-500 mb-6">
                Go back to?{" "}
                <Link href="/login" className="text-blue-500 ml-1 hover:underline">Login</Link>
              </p>

              <form onSubmit={handleSubmit(onSubmitEmail)}>
                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className={`w-full px-4 py-2 mb-7 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mb-3">{errors.email.message}</p>
                )}

                {errors.password && (
                  <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>
                )}

                {serverError && (
                  <p className="text-red-500 text-sm mb-3">{serverError}</p>
                )}

                <button
                  type="submit"
                  disabled={requestOtpMutation.isPending}
                  className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
                >
                  {requestOtpMutation.isPending ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h3 className='text-xl font-semibold text-center mb-4'>Enter OTP</h3>
              <p className='text-center text-gray-500 mb-6 text-sm'>
                Please enter the 4-digit verification code sent to your email
              </p>
              <div className='flex justify-center gap-4'>
                {otp?.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    ref={(el) => { if (el) inputRefs.current[index] = el; }}
                    maxLength={1}
                    className='w-14 h-14 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300'
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="w-full bg-blue-500 mt-6 text-white py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
                disabled={verifyOtpMutation.isPending}
                onClick={() => { verifyOtpMutation.mutate(); }}
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
              </button>
              <p className='text-center text-sm text-gray-500 mt-4'>
                {canResend ? (
                  <button
                    onClick={resendOtp}
                    className="text-blue-500 hover:underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                ) : (
                  `Resend OTP in ${timer}s`
                )}
              </p>
              {serverError && (
                <p className="text-red-500 text-sm mt-3">{serverError}</p>
              )}
            </>
          )}

          {step === "reset" && (
            <>
              <h3 className='text-xl font-semibold text-center mb-4'>Reset Password</h3>
              <form onSubmit={handleSubmit(onSubmitPassword)}>
                <label className="block text-gray-700 mb-1">New Password</label>
                <input
                  type={passwordVisible ? "text" : "password"} // ✅ Fixed: was missing the false branch
                  placeholder="Enter new password"
                  className={`w-full px-4 py-2 mb-7 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>
                )}

                <button
                  type="submit"
                  className='w-full mt-4 text-lg cursor-pointer bg-black text-white py-2 rounded-lg'
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </button>
                {serverError && (
                  <p className="text-red-500 text-sm mt-3">{serverError}</p>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;