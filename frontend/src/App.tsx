import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import type { Role } from "./api/types";
import { AdminShell } from "./components/layout/AdminShell";
import { AppShell } from "./components/layout/AppShell";
import { PageLoader } from "./components/ui/spinner";
import { AdminsPage } from "./features/admin/AdminsPage";
import { AuditPage } from "./features/admin/AuditPage";
import { SchoolsPage } from "./features/admin/SchoolsPage";
import { TeachersPage } from "./features/admin/TeachersPage";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { ClassDetailPage } from "./features/classes/ClassDetailPage";
import { ClassesPage } from "./features/classes/ClassesPage";
import { MyClassesPage } from "./features/classes/MyClassesPage";
import { StudentDashboard } from "./features/dashboard/StudentDashboard";
import { TeacherDashboard } from "./features/dashboard/TeacherDashboard";
import { ResultsPage } from "./features/results/ResultsPage";
import { AttemptPage } from "./features/take/AttemptPage";
import { TestEditorPage } from "./features/tests/TestEditorPage";
import { TestsPage } from "./features/tests/TestsPage";
import { useAuth } from "./lib/auth";
import { homeFor } from "./lib/nav";

// дашборд тянет recharts — грузим отдельным чанком, только для админа
const AdminDashboard = lazy(() =>
  import("./features/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);

function Protected({ role, children }: { role?: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(user.role)} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Protected role="admin"><AdminShell /></Protected>}>
        <Route
          path="/admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          }
        />
        <Route path="/admin/schools" element={<SchoolsPage />} />
        <Route path="/admin/teachers" element={<TeachersPage />} />
        <Route path="/admin/admins" element={<AdminsPage />} />
        <Route path="/admin/audit" element={<AuditPage />} />
      </Route>

      <Route element={<Protected role="teacher"><AppShell /></Protected>}>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/classes" element={<ClassesPage />} />
        <Route path="/teacher/classes/:id" element={<ClassDetailPage />} />
        <Route path="/teacher/tests" element={<TestsPage />} />
        <Route path="/teacher/assignments/:id/results" element={<ResultsPage />} />
      </Route>
      <Route
        path="/teacher/tests/:id/edit"
        element={<Protected role="teacher"><TestEditorPage /></Protected>}
      />

      <Route element={<Protected role="student"><AppShell /></Protected>}>
        <Route path="/app" element={<StudentDashboard />} />
        <Route path="/app/classes" element={<MyClassesPage />} />
      </Route>
      <Route
        path="/app/attempt/:id"
        element={<Protected role="student"><AttemptPage /></Protected>}
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
