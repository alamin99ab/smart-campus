import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, extractApiObject, getErrorMessage } from "@/lib/apiResponse";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DollarSign, User, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Child {
  _id: string;
  name: string;
}

interface ParentFeeRow {
  _id: string;
  month: number;
  year: number;
  amountDue: number;
  amountPaid: number;
  status: "Paid" | "Partial" | "Unpaid";
}

interface ParentFeesPayload {
  fees: ParentFeeRow[];
  summary: {
    totalFees: number;
    totalPaid: number;
    totalDue: number;
    unpaidCount: number;
  };
}

export default function ParentFeesPage() {
  const [selectedChild, setSelectedChild] = useState<string>("");

  const {
    data: children = [],
    isLoading: loadingChildren,
    isError: childrenError,
    error: childrenQueryError,
    isFetching: childrenFetching,
    refetch: refetchChildren,
  } = useQuery<Child[]>({
    queryKey: ["parent-children"],
    queryFn: async () => {
      const res = await api.get("/parent/children");
      return extractApiArray<Child>(res.data, ["children"]);
    },
  });

  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]._id);
    }
  }, [selectedChild, children]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ParentFeesPayload>({
    queryKey: ["parent-fees", selectedChild],
    queryFn: async () => {
      if (!selectedChild) {
        return { fees: [], summary: { totalFees: 0, totalPaid: 0, totalDue: 0, unpaidCount: 0 } };
      }
      const res = await api.get(`/parent/fees/${selectedChild}`);
      const payload = extractApiObject<ParentFeesPayload & { feeDetails?: ParentFeeRow[] }>(res.data);
      return {
        fees: Array.isArray(payload.fees)
          ? payload.fees
          : Array.isArray(payload.feeDetails)
            ? payload.feeDetails
            : [],
        summary: payload.summary || { totalFees: 0, totalPaid: 0, totalDue: 0, unpaidCount: 0 },
      };
    },
    enabled: !!selectedChild,
  });

  const fees = data?.fees || [];
  const summary = data?.summary || { totalFees: 0, totalPaid: 0, totalDue: 0, unpaidCount: 0 };

  if (loadingChildren) return <LoadingSpinner text="Loading children..." />;

  if (childrenError) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Child Fees" description="Your child's fee records" />
        <EmptyState
          title="Failed to load children"
          description={getErrorMessage(childrenQueryError, "Please try again.")}
          icon={User}
          variant="error"
          action={{ label: childrenFetching ? "Retrying..." : "Retry", onClick: () => refetchChildren() }}
        />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Child Fees" description="Your child's fee records" />
        <EmptyState
          title="No children linked"
          description="Contact your school to link your children to your account"
          icon={User}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Child Fees" description="Your child's fee records" />

      <div className="w-full sm:max-w-xs">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <SelectValue placeholder="Select child" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {children.map((child: Child) => (
              <SelectItem key={child._id} value={child._id}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading fees..." />
      ) : isError ? (
        <EmptyState
          title="Fees unavailable"
          description={getErrorMessage(error, "Please try again later.")}
          icon={DollarSign}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      ) : fees.length === 0 ? (
        <EmptyState
          title="No fee records"
          description="Fee records will appear here"
          icon={DollarSign}
        />
      ) : (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border p-4 grid grid-cols-1 sm:grid-cols-4 gap-2 text-sm">
            <p>Total: <span className="font-semibold">{formatCurrency(summary.totalFees)}</span></p>
            <p>Paid: <span className="font-semibold">{formatCurrency(summary.totalPaid)}</span></p>
            <p>Due: <span className="font-semibold">{formatCurrency(summary.totalDue)}</span></p>
            <p>Unpaid: <span className="font-semibold">{summary.unpaidCount || 0}</span></p>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Period</TableHead>
                    <TableHead className="whitespace-nowrap">Amount</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Paid</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee: ParentFeeRow) => (
                    <TableRow key={fee._id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{fee.month}/{fee.year}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(fee.amountDue)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{formatCurrency(fee.amountPaid)}</TableCell>
                      <TableCell>
                        <Badge variant={fee.status === "Paid" ? "default" : fee.status === "Unpaid" ? "destructive" : "secondary"}>
                          {fee.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
