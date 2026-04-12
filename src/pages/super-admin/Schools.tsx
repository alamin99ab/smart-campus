import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, MapPin, Users, Eye, EyeOff, Loader2, Building2, Crown, School, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/apiResponse";

const fallbackPlans = [
  { name: "Trial", value: "trial", price: 0, duration: 14, description: "14 days free trial" },
  { name: "Monthly", value: "monthly", price: 49.99, duration: 30, description: "$49.99/month" },
  { name: "Yearly", value: "yearly", price: 499.99, duration: 365, description: "$499.99/year" },
];

interface SchoolRow {
  _id: string;
  schoolName: string;
  schoolCode: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  principal?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  principalName?: string;
  principalEmail?: string;
  subscription?: {
    plan?: string;
    billingCycle?: string;
    status?: string;
  };
}

interface PaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function SchoolsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    plan: "all",
    page: 1,
    limit: 10
  });
  const [form, setForm] = useState({
    schoolName: "",
    schoolCode: "",
    address: "",
    phone: "",
    email: "",
    principalName: "",
    principalEmail: "",
    principalPhone: "",
    principalPassword: "",
    confirmPrincipalPassword: "",
    plan: "trial"
  });
  const [editForm, setEditForm] = useState({
    schoolName: "",
    address: "",
    phone: "",
    email: "",
    isActive: true,
    plan: "trial"
  });
  const queryClient = useQueryClient();

  // Fetch available subscription plans
  const { data: plans = [] } = useQuery<SubscriptionPlan[]>({
    queryKey: ["subscriptionPlans"],
    queryFn: async () => {
      const res = await api.get("/subscriptions/plans");
      const responseData = res?.data;
      const rawPlans = Array.isArray(responseData?.data?.plans)
        ? responseData.data.plans
        : Array.isArray(responseData?.data)
          ? responseData.data
          : Array.isArray(responseData?.plans)
            ? responseData.plans
            : null;

      if (!rawPlans) {
        return fallbackPlans;
      }

      return rawPlans
        .map((plan) => {
          const candidate = typeof plan === "object" && plan !== null ? (plan as Record<string, unknown>) : {};
          const price = typeof candidate.price === "number" ? candidate.price : 0;
          const duration = typeof candidate.duration === "number" ? candidate.duration : 0;
          return {
            name: String(candidate.name || candidate.label || candidate.id || candidate.value || "Plan"),
            value: String(candidate.value || candidate.id || ""),
            price,
            duration,
            description:
              (typeof candidate.description === "string" && candidate.description) ||
              (price && duration ? `$${price}/${duration} days` : "Subscription plan"),
          };
        })
        .filter((plan: { value?: string }) => Boolean(plan.value));
    },
    staleTime: 60_000,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schools", filters],
    queryFn: async () => {
      const res = await api.get("/super-admin/schools", {
        params: {
          page: filters.page,
          limit: filters.limit,
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          ...(filters.status !== "all" ? { status: filters.status } : {}),
          ...(filters.plan !== "all" ? { plan: filters.plan } : {})
        }
      });
      const responseData = res?.data;

      let schoolsArray: SchoolRow[] = [];
      let pagination: PaginationPayload | null = null;

      if (Array.isArray(responseData)) {
        schoolsArray = responseData as SchoolRow[];
      } else if (responseData?.data) {
        const innerData = responseData.data;
        if (Array.isArray(innerData)) {
          schoolsArray = innerData as SchoolRow[];
        } else if (innerData?.schools && Array.isArray(innerData.schools)) {
          schoolsArray = innerData.schools as SchoolRow[];
          pagination = innerData.pagination || null;
        }
      } else if (responseData?.schools && Array.isArray(responseData.schools)) {
        schoolsArray = responseData.schools as SchoolRow[];
      }

      if (!pagination && responseData?.pagination) {
        pagination = responseData.pagination as PaginationPayload;
      }

      if (!Array.isArray(schoolsArray)) {
        schoolsArray = [];
      }

      return {
        schools: schoolsArray,
        pagination: pagination || {
          page: filters.page,
          limit: filters.limit,
          total: schoolsArray.length,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    },
  });

  const handleCreateSchool = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.schoolName || !form.schoolCode || !form.principalName || !form.principalEmail || !form.principalPassword) {
      toast.error("Please fill all required fields");
      return;
    }

    if (form.principalPassword.length < 8) {
      toast.error("Principal password must be at least 8 characters");
      return;
    }

    if (form.principalPassword !== form.confirmPrincipalPassword) {
      toast.error("Principal password and confirmation do not match");
      return;
    }

    createMutation.mutate();
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/super-admin/schools", {
        schoolName: form.schoolName,
        schoolCode: form.schoolCode,
        address: form.address,
        phone: form.phone,
        email: form.email,
        principalName: form.principalName,
        principalEmail: form.principalEmail,
        principalPhone: form.principalPhone,
        principalPassword: form.principalPassword,
        plan: form.plan,
      });
      // Backend returns { success, message, data: {...} }
      // Axios wraps in .data, so res.data = { success, message, ... }
      return res.data;
    },
    onSuccess: (data) => {
      const message = data?.message || data?.data?.message || "School created";
      const createdSchoolCode = data?.data?.school?.schoolCode || data?.data?.schoolCode || form.schoolCode;
      const principalEmail = data?.data?.principal?.email || data?.data?.principalEmail || form.principalEmail;
      toast.success(`${message} Principal login: ${principalEmail}. School Code: ${createdSchoolCode}. Password: ${form.principalPassword}`);
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      setShowCreate(false);
      setForm({
        schoolName: "",
        schoolCode: "",
        address: "",
        phone: "",
        email: "",
        principalName: "",
        principalEmail: "",
        principalPhone: "",
        principalPassword: "",
        confirmPrincipalPassword: "",
        plan: "trial"
      });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to create school"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchool?._id) throw new Error("Select a school first");

      const res = await api.put(`/super-admin/schools/${selectedSchool._id}`, {
        schoolName: editForm.schoolName,
        address: editForm.address,
        phone: editForm.phone,
        email: editForm.email,
        isActive: editForm.isActive,
        plan: editForm.plan
      });
      return res.data;
    },
    onSuccess: (payload) => {
      toast.success(payload?.message || "School updated successfully");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-analytics"] });
      setShowEdit(false);
      setSelectedSchool(null);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to update school"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      const res = await api.delete(`/super-admin/schools/${schoolId}`);
      return res.data;
    },
    onSuccess: (payload) => {
      toast.success(payload?.message || "School deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["schools"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-analytics"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Failed to delete school"));
    }
  });

  const openEditDialog = (school: SchoolRow) => {
    setSelectedSchool(school);
    setEditForm({
      schoolName: school.schoolName || "",
      address: school.address || "",
      phone: school.phone || "",
      email: school.email || "",
      isActive: school.isActive !== false,
      plan: school.subscription?.plan || school.subscription?.billingCycle || "trial"
    });
    setShowEdit(true);
  };

  const handleDeleteSchool = (school: SchoolRow) => {
    const confirmed = window.confirm(`Delete school "${school.schoolName}"? This permanently removes school users and subscriptions.`);
    if (!confirmed) return;
    deleteMutation.mutate(school._id);
  };

  if (isLoading) return <LoadingSpinner text="Loading schools..." />;

  if (isError) {
    const description = getErrorMessage(error, "Unable to fetch schools right now. Please try again.");

    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Schools"
          description="Manage all schools on the platform"
          actions={
            <Button onClick={() => setShowCreate(true)}>
              Create School
            </Button>
          }
        />
        <EmptyState
          variant="error"
          title="Failed to load schools"
          description={description}
          action={{
            label: "Retry",
            onClick: () => queryClient.invalidateQueries({ queryKey: ["schools"] })
          }}
        />
      </div>
    );
  }

  const displaySchools = Array.isArray(data?.schools) ? data.schools : [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Schools"
        description="Manage all schools on the platform"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            Create School
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by school name, code, email, phone"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
          />
        </div>
        <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.plan} onValueChange={(value) => setFilters((prev) => ({ ...prev, plan: value, page: 1 }))}>
          <SelectTrigger>
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={`filter-plan-${plan.value}`} value={plan.value}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {displaySchools.length === 0 ? (
        <EmptyState
          title="No schools yet"
          description="Create your first school to get started"
          icon={School}
          action={{ label: "Create School", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySchools.map((s: SchoolRow) => (
                <TableRow key={s._id}>
                  <TableCell className="font-medium">{s.schoolName || "?"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.address || "?"}</TableCell>
                  <TableCell>{s.principal?.name || s.principalName || "?"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      <Crown className="h-3 w-3 mr-1" />
                      {s.subscription?.plan || s.subscription?.billingCycle || "trial"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.isActive ? "default" : "secondary"}>
                      {s.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/super-admin/schools/${s._id}`)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(s)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSchool(s)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing page {pagination?.page || 1} of {pagination?.totalPages || 1}
          {typeof pagination?.total === "number" ? ` (${pagination.total} schools)` : ""}
        </span>
        <div className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination?.hasPrevPage}
            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!pagination?.hasNextPage}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Create School</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the school and principal details below</p>
          </DialogHeader>
          <form onSubmit={handleCreateSchool} className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* School Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                School Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input 
                    id="schoolName"
                    value={form.schoolName} 
                    onChange={(e) => setForm({ ...form, schoolName: e.target.value })} 
                    placeholder="Enter school name"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolCode">School Code *</Label>
                  <Input 
                    id="schoolCode"
                    value={form.schoolCode} 
                    onChange={(e) => setForm({ ...form, schoolCode: e.target.value })} 
                    placeholder="e.g., SCH001"
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address"
                    value={form.address} 
                    onChange={(e) => setForm({ ...form, address: e.target.value })} 
                    placeholder="Enter address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">School Phone</Label>
                  <Input 
                    id="phone"
                    type="tel" 
                    value={form.phone} 
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">School Email</Label>
                  <Input 
                    id="email"
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                    placeholder="school@example.com"
                  />
                </div>
              </div>
            </div>

            {/* Subscription Plan Selection */}
            <div className="space-y-2">
              <Label>Subscription Plan *</Label>
              <Select value={form.plan} onValueChange={(value) => setForm({ ...form, plan: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        {plan.name} - {plan.description || `${plan.price}`}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose a subscription plan for this school
              </p>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Principal Account Details
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principalName">Principal Name *</Label>
                <Input 
                  id="principalName"
                  value={form.principalName} 
                  onChange={(e) => setForm({ ...form, principalName: e.target.value })} 
                  placeholder="Full name"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalEmail">Principal Email *</Label>
                <Input 
                  id="principalEmail"
                  type="email" 
                  value={form.principalEmail} 
                  onChange={(e) => setForm({ ...form, principalEmail: e.target.value })} 
                  placeholder="email@example.com"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalPhone">Principal Phone</Label>
                <Input 
                  id="principalPhone"
                  type="tel" 
                  value={form.principalPhone} 
                  onChange={(e) => setForm({ ...form, principalPhone: e.target.value })} 
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalPassword">Principal Password *</Label>
                <div className="relative">
                  <Input 
                    id="principalPassword"
                    type={showPassword ? "text" : "password"} 
                    value={form.principalPassword} 
                    onChange={(e) => setForm({ ...form, principalPassword: e.target.value })} 
                    placeholder="Min 8 characters"
                    required 
                    className="pr-10"
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
              <div className="space-y-2 sm:col-span-2 sm:max-w-[calc(50%-8px)]">
                <Label htmlFor="confirmPrincipalPassword">Confirm Principal Password *</Label>
                <div className="relative">
                  <Input 
                    id="confirmPrincipalPassword"
                    type={showPassword ? "text" : "password"} 
                    value={form.confirmPrincipalPassword} 
                    onChange={(e) => setForm({ ...form, confirmPrincipalPassword: e.target.value })} 
                    placeholder="Confirm password"
                    required 
                    className="pr-10"
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
            </div>
            <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create School"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <p className="text-sm text-muted-foreground">Update school details and status.</p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input
                value={editForm.schoolName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, schoolName: e.target.value }))}
                placeholder="School name"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={editForm.plan} onValueChange={(value) => setEditForm((prev) => ({ ...prev, plan: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={`edit-plan-${plan.value}`} value={plan.value}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.isActive ? "active" : "inactive"}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, isActive: value === "active" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !selectedSchool}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SubscriptionPlan {
  name: string;
  value: string;
  price?: number;
  duration?: number;
  description?: string;
}

