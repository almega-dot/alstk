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

  /* ===============================
     Load users + plants (UNCHANGED)
  =============================== */
  useEffect(() => {
    if (!loading && isAdmin) {
      loadAll();
    }
  }, [loading, isAdmin]);

  const loadAll = async () => {
    const { data: users, error: uErr } = await supabase
      .rpc('admin_list_users_with_profile');

    if (uErr) {
      alert(uErr.message);
      return;
    }
    setRows(users || []);

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

  /* ===============================
     Guards (UNCHANGED)
  =============================== */
  if (loading) return <div>Loading...</div>;
  if (!isAdmin) return <div>Access denied</div>;

  /* ===============================
     Save (UNCHANGED)
  =============================== */
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
      loadAll();
    }
  };

  /* ===============================
     UI (LOOK ONLY)
  =============================== */
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h2 style={styles.title}>Admin – User Management</h2>
      </div>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Plant</th>
              <th style={{ textAlign: 'center' }}>Active</th>
              <th>Action</th>
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
                    style={styles.select}
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
                    style={styles.select}
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
                    style={{
                      ...styles.saveBtn,
                      ...(savingId === r.user_id
                        ? styles.disabledBtn
                        : {}),
                    }}
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
    </div>
  );
}

/* ===============================
   Styles (ONLY UI)
=============================== */
const styles = {
  page: {
    padding: 24,
    fontFamily: 'Inter, system-ui, Arial, sans-serif',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },

  backBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
  },

  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
  },

  card: {
    background: '#fff',
    borderRadius: 10,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },

  select: {
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 13,
  },

  saveBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: '#2c5364',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },

  disabledBtn: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
