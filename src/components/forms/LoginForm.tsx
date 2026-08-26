"use client";
// src/components/forms/LoginForm.tsx

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(
    urlError === "AccountDisabled"
      ? "Your account has been deactivated. Please contact the admin."
      : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        const errorMap: Record<string, string> = {
          "No account found with this email": "No account found with this email address.",
          "Invalid password": "Incorrect password. Please try again.",
          "Your account has been deactivated. Contact admin.":
            "Your account has been deactivated. Please contact the admin.",
          CredentialsSignin: "Invalid email or password.",
        };
        setAuthError(errorMap[result.error] ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(callbackUrl === "/dashboard" ? "/dashboard" : callbackUrl);
      router.refresh();
    } catch {
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
        <p className="text-sm text-slate-400">Enter your credentials to continue</p>
      </div>

      {authError && (
        <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{authError}</p>
        </div>
      )}

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={cn(
              "w-full pl-10 pr-4 py-3 bg-white/5 border rounded-lg text-white placeholder:text-slate-500 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150",
              errors.email ? "border-red-500/50" : "border-white/10 hover:border-white/20"
            )}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-red-400 mt-1.5">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className={cn(
              "w-full pl-10 pr-11 py-3 bg-white/5 border rounded-lg text-white placeholder:text-slate-500 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150",
              errors.password ? "border-red-500/50" : "border-white/10 hover:border-white/20"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-red-400 mt-1.5">{errors.password.message}</p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full py-3 px-4 rounded-lg text-sm font-semibold text-white",
          "bg-blue-600 hover:bg-blue-500 active:bg-blue-700",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent",
          "transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </button>

      <div className="pt-1 border-t border-white/10">
        <p className="text-xs text-slate-500 text-center">
          Demo:{" "}
          <span className="text-slate-400 font-mono">superadmin@marketingcrm.com</span>
          {" / "}
          <span className="text-slate-400 font-mono">SuperAdmin@123</span>
        </p>
      </div>
    </form>
  );
}
