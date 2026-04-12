import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Shield, CheckCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/apiResponse";

export default function ChangePasswordPage() {
  const { user } = useAuthStore();
  const isEnvSuperAdmin = user?.role === "super_admin" && user?.isEnvBased;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await api.put("/auth/change-password", form);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Password changed successfully");
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to change password"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (form.newPassword.length > 128) {
      toast.error("Password must be less than 128 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    changePassword.mutate();
  };

  if (isEnvSuperAdmin) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Change Password"
          description="Platform Super Admin credentials"
        />
        <div className="max-w-xl rounded-xl border bg-card p-6 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-2">Managed in the hosting environment</p>
          <p>
            This account is authenticated with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPER_ADMIN_EMAIL</code> and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">SUPER_ADMIN_PASSWORD</code> (for
            example on Render). Update those variables there to rotate the password; it cannot be
            changed from this application.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Change Password" 
        description="Update your account password" 
      />

      <div className="max-w-xl">
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Password Security</h2>
                <p className="text-sm text-muted-foreground">
                  Keep your account secure with a strong password
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be at least 6 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm your new password"
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Security Tips */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Password Security Tips
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Use a mix of letters, numbers, and symbols</li>
                <li>Avoid using personal information</li>
                <li>Don't reuse passwords from other accounts</li>
                <li>Change your password regularly</li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? (
                <>
                  <span className="animate-spin mr-2">...</span>
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Account Info */}
        <div className="mt-6 bg-card rounded-xl border p-4">
          <h3 className="text-sm font-medium mb-3">Account Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium capitalize">{user?.role?.replace("_", " ")}</span>
            </div>
            {user?.schoolName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">School</span>
                <span className="font-medium">{user.schoolName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

