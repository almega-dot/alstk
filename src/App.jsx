import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
          <a href="/admin/users">Admin – User Management</a>
        </div>
      )}

      <div>
        <a href="/stock-entry">Stock Entry</a>
      </div>
      <div>
      <a href="/manual-stock-entry">Manual Stock Entry</a>
</div>
<div>
  <a href="/fg-stock-entry">FG Stock Entry</a>
</div>
<div>
  <a href="/fg-stock-entry-manual">FG Stock Entry Manual</a>
</div>


<div>
  <a href="/editor-review">Editor Review</a>
</div>
<div>
  <a href="/fg-editor-review">FG Editor Review</a>
</div>

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
