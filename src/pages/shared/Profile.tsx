import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Phone, Mail, Building2, BadgeCheck } from "lucide-react";
import { getErrorMessage } from "@/lib/apiResponse";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const res = await api.put("/auth/profile", form);
      return res.data;
    },
    onSuccess: (d) => {
      toast.success(d.message || "Profile updated");
      qc.invalidateQueries({ queryKey: ["auth"] });
      setIsEditing(false);
      if (user) {
        setUser({ ...user, ...form });
      }
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update profile")),
  });

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | undefined }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/60 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value || "-"}</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="My Profile" description="Your account information" />
      
      <div className="bg-card rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-primary">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold font-heading">{user?.name}</h2>
              <p className="text-sm text-muted-foreground capitalize flex items-center justify-center sm:justify-start gap-1">
                <BadgeCheck className="h-4 w-4" />
                {user?.role?.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>

        {/* School Info */}
        {user?.schoolName && (
          <div className="p-4 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user.schoolName}</span>
              {user.schoolCode && (
                <span className="text-xs text-muted-foreground ml-auto">({user.schoolCode})</span>
              )}
            </div>
          </div>
        )}

        {/* Details */}
        <div className="p-4 sm:p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name"
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone"
                  type="tel"
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="Your phone number"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false);
                    setForm({ name: user?.name || "", phone: user?.phone || "" });
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateProfile.mutate()} 
                  disabled={updateProfile.isPending}
                  className="w-full sm:w-auto"
                >
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <InfoRow icon={User} label="Name" value={user?.name} />
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Phone} label="Phone" value={user?.phone} />
              {user?.schoolCode && (
                <InfoRow icon={Building2} label="School Code" value={user.schoolCode} />
              )}
              
              <Button 
                onClick={() => setIsEditing(true)} 
                className="mt-6 w-full"
              >
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

