import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet } from "lucide-react";
import { exportFees } from "@/lib/exportUtils";

const now = new Date();

export default function AccountantExportsPage() {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [isDownloading, setIsDownloading] = useState<"xlsx" | "pdf" | null>(null);

  const handleExport = async (format: "xlsx" | "pdf") => {
    const monthValue = Number(month);
    const yearValue = Number(year);

    setIsDownloading(format);
    try {
      await exportFees({
        format,
        month: Number.isFinite(monthValue) && monthValue >= 1 && monthValue <= 12 ? monthValue : undefined,
        year: Number.isFinite(yearValue) && yearValue >= 2000 ? yearValue : undefined,
      });
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Finance Exports"
        description="Download accountant-safe finance exports only (fees and payment summary)."
      />

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Fee and Payment Report Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                min={2000}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Month and year are optional. If omitted, the backend exports all available fee rows.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => handleExport("xlsx")} disabled={isDownloading !== null}>
              <Download className="h-4 w-4 mr-1" />
              {isDownloading === "xlsx" ? "Downloading..." : "Export XLSX"}
            </Button>
            <Button variant="outline" onClick={() => handleExport("pdf")} disabled={isDownloading !== null}>
              <Download className="h-4 w-4 mr-1" />
              {isDownloading === "pdf" ? "Downloading..." : "Export PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <EmptyState
        title="Role-safe export scope"
        description="This page intentionally exposes only finance exports for accountant users."
        icon={Download}
      />
    </div>
  );
}
