import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Auth from './pages/Auth';
import AdminUsers from './pages/AdminUsers';
import StockEntry from './pages/StockEntry';
import { supabase } from './lib/supabase';
import ManualStockEntry from './pages/ManualStockEntry';
import EditorReview from './pages/EditorReview';
import FGStockEntry from './pages/FGStockEntry';
import FGStockEntryManual from './pages/FGStockEntryManual';
import FGEditorReview from './pages/FGEditorReview';


function Dashboard() {
  const { isAdmin } = useAuth();

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      {isAdmin && (
        <div>
          <Link to="/admin/users">Admin – User Management</Link>
        </div>
      )}

      <div><Link to="/stock-entry">Stock Entry</Link></div>
      <div><Link to="/manual-stock-entry">Manual Stock Entry</Link></div>
      <div><Link to="/fg-stock-entry">FG Stock Entry</Link></div>
      <div><Link to="/fg-stock-entry-manual">FG Stock Entry Manual</Link></div>
      <div><Link to="/editor-review">Editor Review</Link></div>
      <div><Link to="/fg-editor-review">FG Editor Review</Link></div>

      <br />
      <button onClick={logout}>Logout</button>
    </div>
  );
}


export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Auth />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/stock-entry" element={<StockEntry />} />
        <Route path="/manual-stock-entry" element={<ManualStockEntry />} />
        <Route path="/fg-stock-entry" element={<FGStockEntry />} />
        <Route path="/fg-stock-entry-manual" element={<FGStockEntryManual />} />
        <Route path="/editor-review" element={<EditorReview />} />
        <Route path="/fg-editor-review" element={<FGEditorReview />} />
      </Routes>
    </BrowserRouter>
  );
}
