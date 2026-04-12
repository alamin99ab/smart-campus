import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Building2, Users, Mail, Phone, MapPin, ChevronLeft, Crown, Calendar, AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/apiResponse";

interface SchoolDetails {
  _id?: string;
  schoolName?: string;
  name?: string;
  schoolCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  isVerified?: boolean;
  studentCount?: number;
  teacherCount?: number;
  principalName?: string;
  principalEmail?: string;
  principalPhone?: string;
  principal?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  plan?: string;
  subscription?: {
    billingCycle?: string;
    plan?: string;
    status?: string;
    startDate?: string;
    expiryDate?: string;
  };
}

export default function SchoolDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: school, isLoading, isError, error } = useQuery<SchoolDetails | null>({
    queryKey: ["school", id],
    queryFn: async () => {
      if (!id) throw new Error("School ID not provided");
      const res = await api.get(`/super-admin/schools/${id}`);
      const responseData = res?.data;

      if (responseData?.data) return responseData.data as SchoolDetails;
      if (responseData?.school) return responseData.school as SchoolDetails;
      if (responseData && typeof responseData === "object" && "_id" in responseData) {
        return responseData as SchoolDetails;
      }

      return null;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner text="Loading school details..." />;

  if (isError || !school) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/schools")}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </div>
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
          <p className="font-medium">Error Loading School</p>
          <p className="text-sm mt-1">{getErrorMessage(error, "School not found")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/schools")}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Schools
        </Button>
      </div>

      <PageHeader
        title={school?.schoolName || school?.name || "School"}
        description={school?.address || ""}
      />

      <div className="mb-6">
        <Badge variant={school?.isActive ? "default" : "secondary"}>
          {school?.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="School Code"
          value={school?.schoolCode || "-"}
          icon={Building2}
          variant="primary"
        />
        <StatCard
          title="Status"
          value={school?.isVerified ? "Verified" : "Pending"}
          icon={Users}
          variant={school?.isVerified ? "success" : "warning"}
        />
        <StatCard
          title="Students"
          value={school?.studentCount || 0}
          icon={Users}
          variant="info"
        />
        <StatCard
          title="Teachers"
          value={school?.teacherCount || 0}
          icon={Users}
          variant="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold mb-4">School Information</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Phone</p>
                <p className="font-medium">{school?.phone || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email</p>
                <p className="font-medium text-sm break-all">{school?.email || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Address</p>
                <p className="font-medium text-sm">{school?.address || "-"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Principal Account</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Name</p>
              <p className="font-medium">{school?.principal?.name || school?.principalName || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="font-medium text-sm break-all">
                {school?.principal?.email || school?.principalEmail || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Phone</p>
              <p className="font-medium">{school?.principal?.phone || school?.principalPhone || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Role</p>
              <Badge variant="outline" className="mt-1">
                {school?.principal?.role || "principal"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {school?.subscription && (
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Subscription
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Plan</p>
              <p className="font-medium capitalize flex items-center gap-1">
                <Crown className="h-4 w-4" />
                {school?.subscription?.billingCycle || school?.subscription?.plan || school?.plan || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              <Badge variant={school?.subscription?.status === "active" ? "default" : "destructive"}>
                {school?.subscription?.status || "unknown"}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Start Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {school?.subscription?.startDate ? new Date(school.subscription.startDate).toLocaleDateString() : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Expiry Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {school?.subscription?.expiryDate ? new Date(school.subscription.expiryDate).toLocaleDateString() : "-"}
              </p>
            </div>
          </div>

          {school?.subscription?.expiryDate && new Date(school.subscription.expiryDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Subscription expires soon. Consider renewing.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
