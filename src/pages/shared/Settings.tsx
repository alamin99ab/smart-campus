import { PageHeader } from "@/components/PageHeader";
import { useAuthStore } from "@/stores/authStore";

export default function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" description="School and account settings" />
      <div className="bg-card rounded-xl border p-6 max-w-lg">
        <h3 className="font-semibold mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{user?.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span className="font-medium capitalize">{user?.role?.replace("_", " ")}</span></div>
        </div>
      </div>
    </div>
  );
}
