import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ROLES } from "./constants/roles";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCoursesPage from "./pages/student/StudentCoursesPage";
import StudentCourseDetailPage from "./pages/student/StudentCourseDetailPage";
import StudentEnrollmentsPage from "./pages/student/StudentEnrollmentsPage";
import StudentJournalPage from "./pages/student/StudentJournalPage";
import StudentProgressPage from "./pages/student/StudentProgressPage";
import LecturerDashboard from "./pages/lecturer/LecturerDashboard";
import LecturerCoursesPage from "./pages/lecturer/LecturerCoursesPage";
import LecturerCreateCoursePage from "./pages/lecturer/LecturerCreateCoursePage";
import LecturerCourseManagePage from "./pages/lecturer/LecturerCourseManagePage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage";
import AdminCreateLecturerPage from "./pages/admin/AdminCreateLecturerPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import ProfilePage from "./pages/ProfilePage";

function HomeRedirect() {
    const { isAuthenticated, homePath } = useAuth();
    return <Navigate to={isAuthenticated ? homePath : "/login"} replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/profile"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT, ROLES.LECTURER, ROLES.ADMIN]}>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/student"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/courses"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentCoursesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/courses/:courseId"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentCourseDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/enrollments"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentEnrollmentsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/journal"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentJournalPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/student/progress"
                element={
                    <ProtectedRoute roles={[ROLES.STUDENT]}>
                        <StudentProgressPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/lecturer"
                element={
                    <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
                        <LecturerDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lecturer/courses"
                element={
                    <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
                        <LecturerCoursesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lecturer/courses/new"
                element={
                    <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
                        <LecturerCreateCoursePage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/lecturer/courses/:courseId"
                element={
                    <ProtectedRoute roles={[ROLES.LECTURER, ROLES.ADMIN]}>
                        <LecturerCourseManagePage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/courses"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <AdminCoursesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/lecturers/new"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <AdminCreateLecturerPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <AdminUsersPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/reports"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <AdminReportsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/courses/:courseId"
                element={
                    <ProtectedRoute roles={[ROLES.ADMIN]}>
                        <LecturerCourseManagePage />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
