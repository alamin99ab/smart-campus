import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  User, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Search
} from "lucide-react";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  schoolCode?: string;
}

export default function ResetUserPasswordPage() {
  const { user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
    forceChangeOnNextLogin: false,
  });

  // Determine which users this admin can reset
  const isSuperAdmin = user?.role === "super_admin";
  const isPrincipal = user?.role === "principal";

  // Fetch users based on role
  const { data: usersData, isLoading: usersLoading, isError: usersError, error: usersQueryError, refetch, isFetching } = useQuery({
    queryKey: ["users", user?.role, user?.schoolCode],
    queryFn: async () => {
      if (isSuperAdmin) {
        // Super Admin can see all principals
        const res = await api.get("/super-admin/users", {
          params: { role: "principal", page: 1, limit: 500 }
        });
        return extractApiArray<UserData>(res.data, ["users"]);
      } else if (isPrincipal) {
        // Principal can see teachers, students, parents, accountants in their school
        const res = await api.get("/principal/users", {
          params: { schoolCode: user?.schoolCode }
        });
        return extractApiArray<UserData>(res.data, ["users"]);
      }
      return [];
    },
    enabled: isSuperAdmin || isPrincipal,
  });

  // Filter users based on search
  const filteredUsers = usersData?.filter((u: UserData) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Super Admin can only reset Principal passwords
    if (isSuperAdmin) {
      return u.role === "principal" && matchesSearch;
    }
    
    // Principal can reset Teacher, Student, Parent, Accountant passwords
    if (isPrincipal) {
      const allowedRoles = ["teacher", "student", "parent", "accountant"];
      return allowedRoles.includes(u.role) && matchesSearch;
    }
    
    return false;
  }) || [];

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!selectedUser) throw new Error("No user selected");
      
      const endpoint = isSuperAdmin 
        ? `/super-admin/users/${selectedUser._id}/reset-password`
        : `/principal/users/${selectedUser._id}/reset-password`;
      
      const res = await api.post(endpoint, {
        newPassword: form.newPassword,
        forceChangeOnNextLogin: form.forceChangeOnNextLogin,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Password reset successfully");
      setForm({
        newPassword: "",
        confirmPassword: "",
        forceChangeOnNextLogin: false,
      });
      setSelectedUser(null);
      setSearchQuery("");
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to reset password"));
    }
  });

  if (usersError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Reset User Password"
          description={isSuperAdmin ? "Reset Principal passwords" : "Reset passwords for school users"}
        />
        <EmptyState
          title="Failed to load users"
          description={getErrorMessage(usersQueryError, "Please try again.")}
          icon={AlertTriangle}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    if (!form.newPassword || !form.confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (form.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (form.newPassword.length > 128) {
      toast.error("Password must be less than 128 characters");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Password and confirmation do not match");
      return;
    }

    resetPassword.mutate();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      principal: "bg-purple-100 text-purple-800",
      teacher: "bg-blue-100 text-blue-800",
      student: "bg-green-100 text-green-800",
      parent: "bg-orange-100 text-orange-800",
      accountant: "bg-yellow-100 text-yellow-800",
    };
    return colors[role] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Reset User Password" 
        description={
          isSuperAdmin 
            ? "Reset Principal passwords" 
            : "Reset passwords for school users"
        } 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Select User
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin 
                ? "Choose a Principal to reset their password"
                : "Choose a user to reset their password"}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {usersLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                filteredUsers.map((u: UserData) => (
                  <div
                    key={u._id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedUser?._id === u._id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Reset Form */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <h3 className="font-semibold flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Reset Password
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set a new password for the selected user
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Selected User Info */}
            {selectedUser ? (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-8 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a user from the list to reset their password</p>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                  className="pr-10"
                  disabled={!selectedUser}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="pr-10"
                  disabled={!selectedUser}
                  autoComplete="new-password"
                />
              </div>
            </div>

            {/* Force Change Option */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="forceChange"
                checked={form.forceChangeOnNextLogin}
                onChange={(e) => setForm({ ...form, forceChangeOnNextLogin: e.target.checked })}
                className="rounded border-gray-300"
                disabled={!selectedUser}
              />
              <Label htmlFor="forceChange" className="text-sm cursor-pointer">
                Force password change on next login
              </Label>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Important</p>
                  <p className="mt-1">
                    This action will immediately invalidate the user's current password 
                    and all active sessions. The user will need to use the new password 
                    to log in.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!selectedUser || resetPassword.isPending}
            >
              {resetPassword.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Permission Info */}
      <div className="bg-card rounded-xl border p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Password Reset Permissions
        </h3>
        <div className="text-sm text-muted-foreground space-y-2">
          {isSuperAdmin && (
            <>
              <p>- You can reset <strong>Principal</strong> passwords</p>
              <p>- You cannot reset other Super Admin passwords</p>
              <p>- All resets are logged in the audit trail</p>
            </>
          )}
          {isPrincipal && (
            <>
              <p>- You can reset passwords for: <strong>Teacher, Student, Parent, Accountant</strong></p>
              <p>- You can only manage users in your own school</p>
              <p>- You cannot reset Principal or Super Admin passwords</p>
              <p>- All resets are logged in the audit trail</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


