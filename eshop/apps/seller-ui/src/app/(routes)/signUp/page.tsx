"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { countries } from 'apps/seller-ui/src/utils/countries';
import CreateShop from 'apps/seller-ui/src/shared/modules/auth/create-shop';
import MpesaLogo from 'apps/seller-ui/src/assets/svgs/mpesa-logo';

// Create a client
const queryClient = new QueryClient();

interface SignupFormData {
  name: string;
  email: string;
  phone_number: string;
  country: string;
  password: string;
  confirmPassword: string;
}

const SignupContent = () => {
  const [activeStep, setActiveStep] = useState(1);
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = React.useState(false);
  const [canResend, setCanResend] = React.useState(true);
  const [timer, setTimer] = React.useState(60);
  const [showOtp, setShowOtp] = React.useState(false);
  const [otp, setOtp] = React.useState(["", "", "", ""]);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [sellerData, setSellerData] = React.useState<SignupFormData | null>(null);
  const [sellerId, setSellerId] = React.useState("");
  const [mpesaError, setMpesaError] = React.useState<string | null>(null);
  const [mpesaLoading, setMpesaLoading] = React.useState(false);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>();

  const password = watch("password");

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

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/seller-registration`,
        data
      );
      return response.data;
    },
    onSuccess: (_, formData) => {
      setSellerData(formData);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
    onError: (error: AxiosError) => {
      const message =
        (error.response?.data as { message?: string })?.message || error.message;
      setServerError(message);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      if (!sellerData) return;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-seller`,
        {
          ...sellerData,
          otp: otp.join(""),
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setSellerId(data?.seller?.id);
      setActiveStep(2);
    },
  });

  const onSubmit = (data: SignupFormData) => {
    setServerError(null);
    signupMutation.mutate(data);
  };

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

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOtp = () => {
    if (!sellerData) return;
    setServerError(null);
    setCanResend(false);
    setTimer(60);
    startResendTimer();
    signupMutation.mutate(sellerData);
  };

  // Saves the M-Pesa number directly and redirects to /success — no OTP needed
  const connectMpesa = async () => {
    setMpesaError(null);
    setMpesaLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/connect-mpesa`,
        { sellerId, phone_number: sellerData?.phone_number }
      );
      router.push("/success");
    } catch (error: any) {
      const message =
        (error.response?.data as { message?: string })?.message || error.message;
      setMpesaError(message);
    } finally {
      setMpesaLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center pt-10 min-h-screen">
      {/* Stepper */}
      <div className="relative flex items-center justify-between w-full max-w-2xl mx-auto mb-12">
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full -z-10" />
        <div
          className="absolute top-5 left-0 h-1 bg-blue-600 rounded-full transition-all duration-300 -z-10"
          style={{ width: `${((activeStep - 1) / 2) * 100}%` }}
        />

        {[
          { step: 1, label: "Create Account" },
          { step: 2, label: "Setup Shop" },
          { step: 3, label: "Connect Bank" },
        ].map((item) => (
          <div key={item.step} className="flex flex-col items-center relative">
            <div
              className={`
                w-10 h-10 flex items-center justify-center rounded-full font-bold text-sm
                transition-all duration-200 shadow-md
                ${item.step <= activeStep
                  ? "bg-blue-600 text-white ring-4 ring-blue-100"
                  : "bg-gray-300 text-gray-600"
                }
              `}
            >
              {item.step <= activeStep ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                item.step
              )}
            </div>

            <span
              className={`
                absolute top-12 whitespace-nowrap text-sm font-medium
                ${item.step <= activeStep ? "text-blue-700" : "text-gray-500"}
                hidden sm:block
              `}
            >
              {item.label}
            </span>

            <span
              className={`
                absolute top-12 text-xs font-medium
                ${item.step <= activeStep ? "text-blue-700" : "text-gray-500"}
                block sm:hidden
              `}
            >
              {item.step === 1 ? "Account" : item.step === 2 ? "Shop" : "Bank"}
            </span>
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="md:w-[480px] p-8 bg-white shadow rounded-lg">
        {activeStep === 1 && (
          <>
            {!showOtp ? (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h3 className="text-2xl font-semibold text-center mb-4">
                  Create Account
                </h3>

                <label className="block text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Username"
                  className={`w-full px-4 py-2 mb-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-500" : "border-gray-300"}`}
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 3, message: "Name must be at least 3 characters" },
                  })}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mb-3">{String(errors.name.message)}</p>
                )}

                <label className="block text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className={`w-full px-4 py-2 mb-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-500" : "border-gray-300"}`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                      message: "Invalid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mb-3">{String(errors.email.message)}</p>
                )}

                <label className="block text-gray-700 mb-1 mt-2">Phone Number (+254)</label>
                <input
                  type="tel"
                  placeholder="7*******"
                  className="w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1"
                  {...register("phone_number", {
                    required: "Phone number is required",
                    pattern: { value: /^\+?[1-9]\d{1,14}$/, message: "Invalid phone number format" },
                    minLength: { value: 10, message: "Phone number must be at least 10 digits" },
                    maxLength: { value: 15, message: "Phone number cannot exceed 15 digits" },
                  })}
                />
                {errors.phone_number && (
                  <p className="text-red-500 text-sm mb-3">{String(errors.phone_number.message)}</p>
                )}

                <label className="block text-gray-700 mb-1 mt-2">Country</label>
                <select
                  className="w-full p-2 border border-gray-300 outline-0 rounded-[4px] mb-1"
                  {...register("country", { required: "Country is required" })}
                >
                  <option value="">Select Your Country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.country && (
                  <p className="text-red-500 text-sm">{String(errors.country.message)}</p>
                )}

                <label className="block text-gray-700 mb-1 mt-2">Password</label>
                <div className="relative mb-1">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${errors.password ? "border-red-500" : "border-gray-300"}`}
                    {...register("password", {
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible(!passwordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mb-3">{String(errors.password.message)}</p>
                )}

                <label className="block text-gray-700 mb-1 mt-2">Confirm Password</label>
                <div className="relative mb-1">
                  <input
                    type={confirmPasswordVisible ? "text" : "password"}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${errors.confirmPassword ? "border-red-500" : "border-gray-300"}`}
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) => value === password || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mb-3">{String(errors.confirmPassword.message)}</p>
                )}

                {serverError && (
                  <p className="text-red-500 text-sm mb-3">{serverError}</p>
                )}

                <button
                  type="submit"
                  disabled={signupMutation.isPending}
                  className="w-full bg-blue-500 mt-4 text-white py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
                >
                  {signupMutation.isPending ? "Signing up..." : "Signup"}
                </button>

                {signupMutation.isError && signupMutation.error instanceof AxiosError && (
                  <p className="text-red-500 text-sm mt-2">
                    {(signupMutation.error.response?.data as { message?: string })?.message ||
                      signupMutation.error.message}
                  </p>
                )}

                <p className="text-center text-gray-500 mt-4 mb-2">
                  Already have an account?{" "}
                  <Link href="/login">
                    <span className="text-blue-500 ml-1 hover:underline cursor-pointer">Login</span>
                  </Link>
                </p>
              </form>
            ) : (
              <div>
                <h3 className="text-xl font-semibold text-center mb-4">Enter OTP</h3>
                <p className="text-center text-gray-500 mb-6 text-sm">
                  Please enter the 4-digit verification code sent to your email
                </p>
                <div className="flex justify-center gap-4">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      ref={(el) => { if (el) inputRefs.current[index] = el; }}
                      maxLength={1}
                      className="w-14 h-14 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
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
                  onClick={() => verifyOtpMutation.mutate()}
                >
                  {verifyOtpMutation.isPending ? "Verifying..." : "Verify OTP"}
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
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
                {verifyOtpMutation.isError && verifyOtpMutation.error instanceof AxiosError && (
                  <p className="text-red-500 text-sm mt-2">
                    {(verifyOtpMutation.error.response?.data as { message?: string })?.message ||
                      verifyOtpMutation.error.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {activeStep === 2 && (
          <CreateShop sellerId={sellerId} setActiveStep={setActiveStep} />
        )}

        {activeStep === 3 && (
          <div className="text-center">
            <h3 className="text-2xl font-semibold mb-2">Connect M-Pesa</h3>
            <p className="text-gray-500 text-sm mb-6">
              We'll link your registered phone number{" "}
              <span className="font-medium text-gray-700">
                {sellerData?.phone_number}
              </span>{" "}
              to your seller account for withdrawals.
            </p>

            <button
              className="w-full flex items-center justify-center gap-3 text-lg font-medium bg-[#49B848] hover:bg-[#3ca23b] text-white py-3 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
              onClick={connectMpesa}
              disabled={mpesaLoading}
            >
              {mpesaLoading ? "Connecting..." : "Connect M-Pesa"}
              {!mpesaLoading && (
                <MpesaLogo style={{ width: 60, height: 30 }} className="opacity-90" />
              )}
            </button>

            {mpesaError && (
              <p className="text-red-500 text-sm mt-3">{mpesaError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Signup = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SignupContent />
    </QueryClientProvider>
  );
};

export default Signup;