import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Loader2, Crown } from "lucide-react";

// Super Admin specific validation schema
const superAdminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SuperAdminLoginForm = z.infer<typeof superAdminLoginSchema>;

export default function SuperAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<SuperAdminLoginForm>({
    resolver: zodResolver(superAdminLoginSchema),
  });

  const onSubmit = async (data: SuperAdminLoginForm) => {
    try {
      clearErrors();
      // Super Admin login - no schoolCode required, use dedicated endpoint
      await login(data.email, data.password, undefined, { superAdmin: true });
      
      const user = useAuthStore.getState().user;
      if (user && user.role === "super_admin") {
        navigate("/super-admin", { replace: true });
      } else {
        setError("root", { message: "Invalid super admin credentials" });
      }
    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || "Login failed";
      setError("root", { message: errorMessage });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel with branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/80 relative flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold font-heading text-white">Smart Campus</span>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-bold font-heading text-white leading-tight">
            Platform Administration<br />Control Center
          </h2>
          <p className="mt-6 text-white/90 text-lg max-w-md leading-relaxed">
            Manage schools, subscriptions, analytics, and platform-wide settings for the Smart Campus SaaS system.
          </p>
          <div className="mt-12 space-y-3 text-white/80">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center mt-1 flex-shrink-0">
                <span className="text-xs font-bold text-white">OK</span>
              </div>
              <span>Multi-school management and monitoring</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center mt-1 flex-shrink-0">
                <span className="text-xs font-bold text-white">OK</span>
              </div>
              <span>Subscription and billing management</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center mt-1 flex-shrink-0">
                <span className="text-xs font-bold text-white">OK</span>
              </div>
              <span>Platform-wide analytics and reports</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center mt-1 flex-shrink-0">
                <span className="text-xs font-bold text-white">OK</span>
              </div>
              <span>System configuration and security</span>
            </div>
          </div>
        </div>
        <div className="text-white/60 text-sm">
          <p>Smart Campus Super Admin Portal</p>
          <p className="mt-1">Secure access only</p>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">Smart Campus</p>
              <p className="text-xs text-muted-foreground">Platform Control</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold font-heading">Super Admin Login</h1>
            <p className="text-muted-foreground mt-2">Enter your administrative credentials</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errors.root && (
              <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg border border-destructive/20">
                <p className="font-medium">Login Failed</p>
                <p className="mt-1">{errors.root.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@smartcampus.com"
                className="bg-muted/50"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>!</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="--------"
                  className="bg-muted/50 pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <span>!</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                "Login as Super Admin"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              This is a restricted interface for platform administrators only.
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Need help? Contact the platform support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

