import "@/App.css";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AuthCallback from "@/pages/AuthCallback";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentQuiz from "@/pages/student/StudentQuiz";
import AITutor from "@/pages/student/AITutor";
import StudentProfile from "@/pages/student/StudentProfile";
import AdaptiveTest from "@/pages/student/AdaptiveTest";
import TeacherDashboard from "@/pages/TeacherDashboard";
import ParentDashboard from "@/pages/ParentDashboard";
import SchoolAdminDashboard from "@/pages/SchoolAdminDashboard";
import CompanyAdminDashboard from "@/pages/CompanyAdminDashboard";
import GovernmentDashboard from "@/pages/GovernmentDashboard";
import SplashScreen from "@/SplashScreen";

import { loadSession } from "@/lib/api";


function RequireRole({ role, children }) {
  const s = loadSession();

  if (!s) {
    return <Navigate to="/login" replace />;
  }

  if (
    Array.isArray(role)
      ? !role.includes(s.user.role)
      : s.user.role !== role
  ) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function AppRouter() {
  const loc = useLocation();

  // Handle Emergent Google authentication callback
  if (loc.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />


      {/* STUDENT ROUTES */}

      <Route
        path="/student"
        element={
          <RequireRole role="student">
            <StudentDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/student/quiz/:topicId"
        element={
          <RequireRole role="student">
            <StudentQuiz />
          </RequireRole>
        }
      />

      <Route
        path="/student/tutor/:topicId?"
        element={
          <RequireRole role="student">
            <AITutor />
          </RequireRole>
        }
      />

      <Route
        path="/student/profile"
        element={
          <RequireRole role="student">
            <StudentProfile />
          </RequireRole>
        }
      />

      <Route
        path="/student/adaptive-test"
        element={
          <RequireRole role="student">
            <AdaptiveTest />
          </RequireRole>
        }
      />


      {/* TEACHER ROUTES */}

      <Route
        path="/teacher"
        element={
          <RequireRole role="teacher">
            <TeacherDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/teacher/student/:studentId"
        element={
          <RequireRole role="teacher">
            <StudentProfile />
          </RequireRole>
        }
      />


      {/* OTHER USER ROUTES */}

      <Route
        path="/parent"
        element={
          <RequireRole role="parent">
            <ParentDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/school"
        element={
          <RequireRole role="school_admin">
            <SchoolAdminDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/company"
        element={
          <RequireRole role="company_admin">
            <CompanyAdminDashboard />
          </RequireRole>
        }
      />

      <Route
        path="/government"
        element={
          <RequireRole role="government">
            <GovernmentDashboard />
          </RequireRole>
        }
      />


      {/* UNKNOWN ROUTES */}

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}


function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsSplashExiting(true);
    }, 6500);

    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 7000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <BrowserRouter>

      <Toaster
        richColors
        position="top-right"
      />

      <AppRouter />

      {showSplash && (
        <SplashScreen
          isExiting={isSplashExiting}
        />
      )}

    </BrowserRouter>
  );
}


export default App;