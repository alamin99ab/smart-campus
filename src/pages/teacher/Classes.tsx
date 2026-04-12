import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { extractApiArray, getErrorMessage } from "@/lib/apiResponse";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Layers, BookOpen, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Subject {
  subjectId: string;
  subjectName: string;
}

interface ClassInfo {
  classId: string;
  className: string;
  section: string;
  subjects: Subject[];
  assignments: string[];
}

export default function TeacherClassesPage() {
  const { data: classes = [], isLoading, isError, error, refetch, isFetching } = useQuery<ClassInfo[]>({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      const res = await api.get("/teacher/my-classes");
      return extractApiArray<ClassInfo>(res.data, ["classes"]);
    },
  });

  if (isLoading) return <LoadingSpinner text="Loading your classes..." />;
  if (isError) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader title="My Classes" description="Your assigned classes and subjects" />
        <EmptyState
          title="Failed to load classes"
          description={getErrorMessage(error, "Please try again.")}
          icon={Layers}
          variant="error"
          action={{ label: isFetching ? "Retrying..." : "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="My Classes"
        description="Your assigned classes and subjects"
      />
      {classes.length === 0 ? (
        <EmptyState
          title="No classes assigned"
          description="Contact your principal to assign classes"
          icon={Layers}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((classInfo: ClassInfo, index: number) => (
            <div
              key={classInfo.classId || index}
              className="bg-card rounded-xl border p-5 hover:shadow-lg transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  {classInfo.section || "N/A"}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-3">
                {classInfo.className || "Class"}
              </h3>
              <div className="space-y-3">
                {classInfo.subjects && classInfo.subjects.length > 0 ? (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">
                      Subjects ({classInfo.subjects.length}):
                    </div>
                    <div className="space-y-2">
                      {classInfo.subjects.map((subject: Subject) => (
                        <div
                          key={subject.subjectId}
                          className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                        >
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span>{subject.subjectName}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>No subjects assigned</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
