import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function AdminUsers() {
  const { loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [plants, setPlants] = useState([]);
  const [savingId, setSavingId] = useState(null);

  // -----------------------------
  // Load users + plants
  // -----------------------------
  useEffect(() => {
    if (!loading && isAdmin) {
      loadAll();
    }
  }, [loading, isAdmin]);

  const loadAll = async () => {
    // 1️⃣ Users (auth + profile combined)
    const { data: users, error: uErr } = await supabase
      .rpc('admin_list_users_with_profile');

    if (uErr) {
      alert(uErr.message);
      return;
    }

    setRows(users || []);

    // 2️⃣ Plants
    const { data: plantData, error: pErr } = await supabase
      .from('plants')
      .select('plant_id, plant_name')
      .eq('active_flag', true)
      .order('plant_name');

    if (pErr) {
      alert(pErr.message);
      return;
    }

    setPlants(plantData || []);
  };

  // -----------------------------
  // Guards
  // -----------------------------
  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  // -----------------------------
  // Save (UPSERT profile)
  // -----------------------------
  const saveRow = async (r) => {
    setSavingId(r.user_id);

    const { error } = await supabase
      .from('user_profile')
      .upsert(
        {
          user_id: r.user_id,
          role_code: r.role_code,
          plant_id: r.plant_id || null,
          is_active: r.is_active ?? true,
        },
        { onConflict: 'user_id' }
      );

    setSavingId(null);

    if (error) {
      alert(error.message);
    } else {
      alert('Saved successfully');
      loadAll(); // refresh
    }
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ padding: 20 }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{ padding: '6px 12px', cursor: 'pointer' }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <h2>Admin – User Management</h2>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Plant</th>
            <th>Active</th>
            <th>Save</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id}>
              {/* Email */}
              <td>{r.email}</td>

              {/* Role */}
              <td>
                <select
                  value={r.role_code || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((s) =>
                      s.map((x) =>
                        x.user_id === r.user_id
                          ? { ...x, role_code: v }
                          : x
                      )
                    );
                  }}
                >
                  <option value="">Select</option>
                  <option value="ENTRY">ENTRY</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>

              {/* Plant */}
              <td>
                <select
                  value={r.plant_id || ''}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    setRows((s) =>
                      s.map((x) =>
                        x.user_id === r.user_id
                          ? { ...x, plant_id: v }
                          : x
                      )
                    );
                  }}
                >
                  <option value="">Select</option>
                  {plants.map((p) => (
                    <option key={p.plant_id} value={p.plant_id}>
                      {p.plant_name}
                    </option>
                  ))}
                </select>
              </td>

              {/* Active */}
              <td style={{ textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={!!r.is_active}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setRows((s) =>
                      s.map((x) =>
                        x.user_id === r.user_id
                          ? { ...x, is_active: v }
                          : x
                      )
                    );
                  }}
                />
              </td>

              {/* Save */}
              <td>
                <button
                  onClick={() => saveRow(r)}
                  disabled={savingId === r.user_id}
                >
                  {savingId === r.user_id ? 'Saving…' : 'Save'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
