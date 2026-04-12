type MetricsRecord = Record<string, unknown>;
type MetricsArray = Array<Record<string, unknown>>;

export interface SuperAdminMetrics {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalUsers: number;
  activeUsers: number;
  totalPrincipals: number;
  totalTeachers: number;
  totalStudents: number;
  activeStudents: number;
  activeSubscriptions: number;
  newStudentsThisMonth: number;
  totalRevenue: number;
  monthlyIncome: number;
  recentActivity: {
    newSchoolsThisMonth: number;
    newStudentsThisMonth: number;
    newTeachersThisMonth: number;
  };
  monthlyRevenue: number[];
  monthlyStudents: number[];
  monthlyNewSchools: number[];
}

function isRecord(value: unknown): value is MetricsRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toNumber(item, 0));
}

function extractPayload(source: unknown): MetricsRecord {
    if (!isRecord(source)) return {};
    if (isRecord(source.data)) return source.data;
    return source;
}

function extractArrayPayload(source: unknown): MetricsArray {
  if (Array.isArray(source)) {
    return source.filter((item): item is Record<string, unknown> => isRecord(item));
  }

  if (!isRecord(source)) {
    return [];
  }

  if (Array.isArray(source.data)) {
    return source.data.filter((item): item is Record<string, unknown> => isRecord(item));
  }

  return [];
}

function deriveMetricsFromCollections(sources: unknown[]) {
  const schools = sources.flatMap((source) => extractArrayPayload(source)).filter((item) => (
    "schoolCode" in item || "schoolName" in item || "principal" in item
  ));

  const users = sources.flatMap((source) => extractArrayPayload(source)).filter((item) => (
    typeof item.role === "string" || typeof item.email === "string"
  ));

  const totalSchools = schools.length;
  const activeSchools = schools.filter((school) => {
    if (typeof school.isActive === "boolean") {
      return school.isActive;
    }

    if (isRecord(school.subscription) && typeof school.subscription.status === "string") {
      return school.subscription.status === "active";
    }

    if (typeof school.status === "string") {
      return school.status === "active";
    }

    return true;
  }).length;

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.isActive !== false && user.isBlocked !== true).length;
  const totalPrincipals = users.filter((user) => user.role === "principal").length;
  const totalTeachers = users.filter((user) => user.role === "teacher").length;
  const totalStudents = users.filter((user) => user.role === "student").length;
  const activeStudents = users.filter((user) => user.role === "student" && user.isActive !== false && user.isBlocked !== true).length;

  return {
    totalSchools,
    activeSchools,
    inactiveSchools: Math.max(totalSchools - activeSchools, 0),
    totalUsers,
    activeUsers,
    totalPrincipals,
    totalTeachers,
    totalStudents,
    activeStudents,
  };
}

export function normalizeSuperAdminMetrics(...sources: unknown[]): SuperAdminMetrics {
  const merged = sources.reduce<MetricsRecord>((acc, source) => {
    const payload = extractPayload(source);
    return { ...acc, ...payload };
  }, {});

  const derivedMetrics = deriveMetricsFromCollections(sources);

  const totalSchools = toNumber(merged.totalSchools ?? merged.schools, derivedMetrics.totalSchools);
  const activeSchools = toNumber(merged.activeSchools, derivedMetrics.activeSchools || totalSchools);
  const inactiveSchools = toNumber(
    merged.inactiveSchools,
    derivedMetrics.inactiveSchools || Math.max(totalSchools - activeSchools, 0)
  );
  const totalUsers = toNumber(merged.totalUsers ?? merged.users, derivedMetrics.totalUsers);
  const totalPrincipals = toNumber(merged.totalPrincipals, derivedMetrics.totalPrincipals);
  const totalTeachers = toNumber(merged.totalTeachers, derivedMetrics.totalTeachers);
  const totalStudents = toNumber(merged.totalStudents, derivedMetrics.totalStudents);
  const activeUsers = toNumber(merged.activeUsers, derivedMetrics.activeUsers || totalUsers);
  const activeStudents = toNumber(merged.activeStudents, derivedMetrics.activeStudents || totalStudents);
  const activeSubscriptions = toNumber(merged.activeSubscriptions);
  const newStudentsThisMonth = toNumber(merged.newStudentsThisMonth);
  const totalRevenue = toNumber(merged.totalRevenue);
  const monthlyIncome = toNumber(merged.monthlyIncome);
  const recentActivity = isRecord(merged.recentActivity) ? merged.recentActivity : {};

  return {
    totalSchools,
    activeSchools,
    inactiveSchools,
    totalUsers,
    activeUsers,
    totalPrincipals,
    totalTeachers,
    totalStudents,
    activeStudents,
    activeSubscriptions,
    newStudentsThisMonth,
    totalRevenue,
    monthlyIncome,
    recentActivity: {
      newSchoolsThisMonth: toNumber(recentActivity.newSchoolsThisMonth),
      newStudentsThisMonth: toNumber(
        recentActivity.newStudentsThisMonth,
        newStudentsThisMonth
      ),
      newTeachersThisMonth: toNumber(recentActivity.newTeachersThisMonth),
    },
    monthlyRevenue: toNumberArray(merged.monthlyRevenue),
    monthlyStudents: toNumberArray(merged.monthlyStudents),
    monthlyNewSchools: toNumberArray(merged.monthlyNewSchools),
  };
}
