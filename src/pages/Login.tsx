import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/authStore";
import { roleRedirects } from "@/components/ProtectedRoute";
import { loginSchema, type LoginForm } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Loader2, Building2 } from "lucide-react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      clearErrors();
      // School login requires school code
      if (!data.schoolCode?.trim()) {
        setError("schoolCode", { message: "School code is required" });
        return;
      }

      await login(data.email, data.password, data.schoolCode);

      const user = useAuthStore.getState().user;
      if (user) {
        if (user.role === "super_admin") {
          setError("root", { message: "Super Admin must login through /super-admin-login." });
          return;
        }
        const redirectPath = roleRedirects[user.role] || "/";
        navigate(redirectPath, { replace: true });
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || "Login failed";

      // Handle specific error cases for school users
      if (errorMessage.includes("Account pending")) {
        setError("root", { message: "Your account is pending approval by the school administrator. Please wait or contact your school." });
      } else if (errorMessage.includes("subscription")) {
        setError("root", { message: "Your school's subscription has expired. Please contact your administrator." });
      } else if (errorMessage.includes("School account is inactive")) {
        setError("root", { message: "Your school account is temporarily inactive. Please contact your administrator." });
      } else if (errorMessage.includes("blocked")) {
        setError("root", { message: "Your account has been blocked. Please contact your administrator." });
      } else if (errorMessage.includes("Super Admin")) {
        setError("root", { message: "Super Admin must use the dedicated portal: /super-admin-login" });
      } else if (errorMessage.includes("Invalid email or password")) {
        setError("root", { message: "Email or password is incorrect. Please try again." });
      } else {
        setError("root", { message: errorMessage });
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-heading text-primary-foreground">Smart Campus</span>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold font-heading text-primary-foreground leading-tight">
            Empowering Education<br />Through Technology
          </h2>
          <p className="mt-4 text-primary-foreground/80 text-lg max-w-md">
            A complete school management platform for administrators, teachers, students, and parents.
          </p>
        </div>
        <div className="flex gap-8 text-primary-foreground/60 text-sm">
          <div><span className="text-2xl font-bold text-primary-foreground block">500+</span>Schools</div>
          <div><span className="text-2xl font-bold text-primary-foreground block">50K+</span>Students</div>
          <div><span className="text-2xl font-bold text-primary-foreground block">10K+</span>Teachers</div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-heading">Smart Campus</span>
          </div>

          <h1 className="text-2xl font-bold font-heading">Welcome back</h1>
          <p className="text-muted-foreground mt-1 mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.edu"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolCode">School Code</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="schoolCode"
                  placeholder="e.g., SCMHS"
                  className="pl-10"
                  {...register("schoolCode")}
                />
              </div>
              {errors.schoolCode && (
                <p className="text-sm text-destructive">{errors.schoolCode.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Contact your school administrator if you don't have an account.
          </p>
        </div>
      </div>
    </div>
  );
}
