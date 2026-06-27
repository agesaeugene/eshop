"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react'
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import type { AxiosError } from "axios";

type FormData = {
  email: string;
  password: string;
};

const Login = () => {
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [rememberMe, setRememberMe] = React.useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const loginMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/login-seller`, data, { withCredentials: true });
      return response.data;
    },
    onSuccess: (data) => {
      setServerError(null);
      router.push("/dashboard");
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as { message?: string })?.message || "Invalid credentials";
      setServerError(errorMessage);
    },
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="w-full py-16 min-h-screen bg-[#f1f1f1] flex flex-col items-center">
      <h1 className="text-4xl font-poppins font-semibold text-black text-center mb-2">Login</h1>
      <p className="text-center text-lg font-medium py-3 text-[#00000099] mb-6">
        Home . Login
      </p>

      <div className="w-full flex justify-center px-4">
        <div className="w-full max-w-md p-8 bg-white shadow-md rounded-xl">
          <h3 className="text-2xl font-semibold text-center mb-2">Login to SokoJamo</h3>
          <p className="text-center text-gray-500 mb-6">
            Don't have an account?{" "}
            <Link href="/signUp" className="text-blue-500 ml-1 hover:underline">Sign Up</Link>
          </p>


          <div className="flex items-center my-5 text-gray-400 text-sm">
            <div className="flex-1 border-t border-gray-300" />
            <span className="px-3">or Sign in with Email</span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
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

            {/* Password */}
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

            {/* Remember Me */}
            <div className="flex items-center justify-between my-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="accent-blue-500"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-sm text-blue-500 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Server Error - Remove duplicate */}
            {serverError && (
              <p className="text-red-500 text-sm mb-3">{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors font-medium"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;