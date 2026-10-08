import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { homeFor } from './config/navigation';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingState from './components/ui/LoadingState';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import StaffDashboard from './pages/staff/StaffDashboard';
import ReadinessBoard from './pages/staff/ReadinessBoard';
import CaseDetail from './pages/staff/CaseDetail';
import NewCase from './pages/staff/NewCase';
import TriageQueue from './pages/staff/TriageQueue';
import AssessmentQueue from './pages/staff/AssessmentQueue';
import ReadinessTasks from './pages/staff/ReadinessTasks';
import Patients from './pages/staff/Patients';
import PatientDetail from './pages/staff/PatientDetail';
import PatientHome from './pages/patient/PatientHome';
import PatientCheckIn from './pages/patient/PatientCheckIn';
import AdminHome from './pages/admin/AdminHome';
import UsersPage from './pages/admin/UsersPage';
import TemplatesPage from './pages/admin/TemplatesPage';
import RulesPage from './pages/admin/RulesPage';
import AuditPage from './pages/admin/AuditPage';
import Analytics from './pages/common/Analytics';
import Notifications from './pages/common/Notifications';
import NotFound from './pages/common/NotFound';

const STAFF = ['surgeon', 'anaesthetist', 'coordinator'];
const P = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  const { user, checking } = useAuth();
  if (checking) return <LoadingState fullPage label="Checking your session…" />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="*" element={<ProtectedRoute><div /></ProtectedRoute>} />
      </Routes>
    );
  }

  return (
    <StoreProvider>
      <Routes>
        <Route path="/login" element={<Navigate to={homeFor(user.role)} replace />} />
        <Route path="/signup" element={<Navigate to={homeFor(user.role)} replace />} />
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to={homeFor(user.role)} replace />} />
          <Route path="dashboard" element={P(STAFF, <StaffDashboard />)} />
          <Route path="board" element={P(STAFF, <ReadinessBoard />)} />
          <Route path="cases/new" element={P(['surgeon', 'coordinator'], <NewCase />)} />
          <Route path="cases/:id" element={P([...STAFF, 'admin'], <CaseDetail />)} />
          <Route path="patients" element={P(STAFF, <Patients />)} />
          <Route path="patients/:id" element={P(STAFF, <PatientDetail />)} />
          <Route path="triage" element={P(['surgeon'], <TriageQueue />)} />
          <Route path="assessments" element={P(['anaesthetist'], <AssessmentQueue />)} />
          <Route path="tasks" element={P(['coordinator'], <ReadinessTasks />)} />
          <Route path="my" element={P(['patient'], <PatientHome />)} />
          <Route path="my/checkin" element={P(['patient'], <PatientCheckIn />)} />
          <Route path="admin" element={P(['admin'], <AdminHome />)} />
          <Route path="admin/users" element={P(['admin'], <UsersPage />)} />
          <Route path="admin/templates" element={P(['admin'], <TemplatesPage />)} />
          <Route path="admin/rules" element={P(['admin'], <RulesPage />)} />
          <Route path="admin/audit" element={P(['admin'], <AuditPage />)} />
          <Route path="analytics" element={P([...STAFF, 'admin'], <Analytics />)} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
}
