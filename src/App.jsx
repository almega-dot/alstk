import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';

import Auth from './pages/Auth';
import AdminUsers from './pages/AdminUsers';
import StockEntry from './pages/StockEntry';
import ManualStockEntry from './pages/ManualStockEntry';
import EditorReview from './pages/EditorReview';
import FGStockEntry from './pages/FGStockEntry';
import FGStockEntryManual from './pages/FGStockEntryManual';
import FGEditorReview from './pages/FGEditorReview';
import Reports from './pages/Reports';
import ReportsAdminFG from './pages/ReportsAdminFG';

/* ===============================
   Simple route guards
=============================== */
function AdminRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Auth />;
  return children;
}

/* ===============================
   Dashboard
=============================== */
function Dashboard() {
  const { isAdmin, profile } = useAuth();

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="dash-page">
      <div className="dash-container">
        <h2 className="dash-title">Dashboard</h2>

        <div className="dash-sub">
          Logged in as <b>{profile?.role_code}</b>
          {profile?.plant_code && (
            <> · Plant: <b>{profile.plant_code}</b></>
          )}
        </div>

        <div className="dash-grid">
          {isAdmin && (
            <Link to="/admin/users" className="dash-card admin">
              <div className="dash-icon">👤</div>
              <div className="dash-text">User Management</div>
            </Link>
          )}

          <Link to="/stock-entry" className="dash-card">
            <div className="dash-icon">📦</div>
            <div className="dash-text">Stock Entry</div>
          </Link>

          <Link to="/manual-stock-entry" className="dash-card">
            <div className="dash-icon">✍</div>
            <div className="dash-text">Manual Stock Entry</div>
          </Link>

          <Link to="/editor-review" className="dash-card">
            <div className="dash-icon">🔍</div>
            <div className="dash-text">Editor Review</div>
          </Link>

          <Link to="/fg-stock-entry" className="dash-card">
            <div className="dash-icon">🏭</div>
            <div className="dash-text">FG Stock Entry</div>
          </Link>

          <Link to="/fg-stock-entry-manual" className="dash-card">
            <div className="dash-icon">✍</div>
            <div className="dash-text">FG Manual Entry</div>
          </Link>

          <Link to="/fg-editor-review" className="dash-card">
            <div className="dash-icon">🔎</div>
            <div className="dash-text">FG Editor Review</div>
          </Link>
        </div>
        <Link to="/reports" className="dash-card">
         <div className="dash-icon">📊</div>
        <div className="dash-text">Reports</div>
        </Link>
        <Link to="/reports/admin-fg" className="dash-card">
        <div className="dash-icon">📊</div>
        <div className="dash-text">ADMIX FG REPORT</div>
        </Link>

        <div className="dash-footer">
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}



/* ===============================
   App Root
=============================== */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/auth" element={<Auth />} />

        {/* PROTECTED */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        <Route
          path="/stock-entry"
          element={
            <ProtectedRoute>
              <StockEntry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manual-stock-entry"
          element={
            <ProtectedRoute>
              <ManualStockEntry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fg-stock-entry"
          element={
            <ProtectedRoute>
              <FGStockEntry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fg-stock-entry-manual"
          element={
            <ProtectedRoute>
              <FGStockEntryManual />
            </ProtectedRoute>
          }
        />

        <Route
          path="/editor-review"
          element={
            <ProtectedRoute>
              <EditorReview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fg-editor-review"
          element={
            <ProtectedRoute>
              <FGEditorReview />
            </ProtectedRoute>
          }
        />
        <Route
  path="/reports"
  element={
    <ProtectedRoute>
      <Reports />
    </ProtectedRoute>
  }
/>
<Route
  path="/reports/admin-fg"
  element={
    <ProtectedRoute>
      <ReportsAdminFG />
    </ProtectedRoute>
  }
/>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
