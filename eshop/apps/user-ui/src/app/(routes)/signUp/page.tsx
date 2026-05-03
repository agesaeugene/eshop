"use client";
import GoogleButton from 'apps/user-ui/src/shared/components/google-button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { use } from 'react'
import { set, useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

type FormData = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// Create a client
const queryClient = new QueryClient();

const SignupContent = () => {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = React.useState(false);
  const [canResend, setCanResend] = React.useState(true);
  const [timer, setTimer] = React.useState(60);
  const [showOtp, setShowOtp] = React.useState(false);
  const [otp, setOtp] = React.useState(["", "", "", ""]); 
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [userData, setUserData] = React.useState<FormData | null>(null);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();
  

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
    mutationFn: async (data: FormData) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/user-registration`, data);
      return response.data;
    },
    onSuccess: (_, formdata) => {
      setUserData(formdata);
      setShowOtp(true);
      setCanResend(false);
      setTimer(60);
      startResendTimer();
    },
    onError: (error: AxiosError) => {
      setServerError(error.message);
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async() => {
      if(!userData) return;
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/verify-user`, 
        {
        ... userData,
        otp: otp.join(""),
      }
    );
      return response.data;
    },
    onSuccess: () => {
      router.push("/login");
    }
  })

  const onSubmit = (data: FormData) => {
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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const resendOtp = () => {

  }

  return (
    <div className="w-full py-16 min-h-[85vh] bg-[#f1f1f1] flex flex-col items-center">
      <h1 className="text-4xl font-poppins font-semibold text-black text-center mb-2">Signup</h1>
      <p className="text-center text-lg font-medium py-3 text-[#00000099] mb-6">
        Home . Signup
      </p>

      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-md p-8 bg-white shadow-md rounded-xl">
          <h3 className="text-2xl font-semibold text-center mb-2">Signup to SokoJamo</h3>
          <p className="text-center text-gray-500 mb-6">
            Already have an account?{" "}
            <Link href={"/login"} className="text-blue-500 ml-1 hover:underline">login</Link>
          </p>

          <GoogleButton />

          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3">or Sign in with Email</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {!showOtp ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <label className="block text-gray-700 mb-1">Name</label>
              <input
                type="text"
                placeholder="Username"
                className={`w-full px-4 py-2 mb-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                {...register("name", {
                  required: "Name is required",
                  minLength: { value: 3, message: "Name must be at least 3 characters" },
                })}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mb-3">{errors.name.message}</p>
              )}

              <label className="block text-gray-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="name@gmail.com"
                className={`w-full px-4 py-2 mb-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
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

              <label className="block text-gray-700 mb-1 mt-2">Password</label>
              <div className="relative mb-1">
                <input
                  type={passwordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
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
                <p className="text-red-500 text-sm mb-3">{errors.password.message}</p>
              )}

              <label className="block text-gray-700 mb-1 mt-2">Confirm Password</label>
              <div className="relative mb-1">
                <input
                  type={confirmPasswordVisible ? "text" : "password"}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
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
                <p className="text-red-500 text-sm mb-3">{errors.confirmPassword.message}</p>
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
            </form>
          ) : (
            <div>
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
                onClick={() => {
                  verifyOtpMutation.mutate();
                }}
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
              {
                verifyOtpMutation?.isError &&
                verifyOtpMutation.error instanceof AxiosError && (
                  <p className='text-red-500 text-sm mt-2'>
                    {verifyOtpMutation.error.response?.data?.message || verifyOtpMutation.error.message}

                  </p>
                )
              }
            </div>
          )}
        </div>
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