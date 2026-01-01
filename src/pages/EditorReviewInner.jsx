import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function EditorReviewInner({ profile }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('NORMAL');
  const [plantCode, setPlantCode] = useState('');
  const [plants, setPlants] = useState([]);
  const [locationCode, setLocationCode] = useState('');
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔒 ENTRY = view only (single source of truth)
  const isViewOnly = profile.role_code === 'ENTRY';

  // Save feedback messages
  const [saveMsgs, setSaveMsgs] = useState([]);

  const pushSaveMsg = (text, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setSaveMsgs(prev => [{ id, type, text }, ...prev].slice(0, 5));
    setTimeout(() => {
      setSaveMsgs(prev => prev.filter(m => m.id !== id));
    }, 4500);
  };

  /* ===============================
     Plant logic
  =============================== */
  useEffect(() => {
    if (profile.role_code === 'EDITOR') {
      setPlantCode(profile.plant_code);
    } else {
      supabase
        .from('plants')
        .select('plant_code')
        .eq('active_flag', true)
        .then(({ data }) => setPlants(data || []));
    }
  }, [profile]);

  /* ===============================
     Locations
  =============================== */
  useEffect(() => {
    if (!plantCode) return;

    supabase
      .from('locations')
      .select('location_code')
      .eq('plant_code', plantCode)
      .eq('is_active', true)
      .then(({ data }) => setLocations(data || []));
  }, [plantCode]);

  /* ===============================
     Fetch rows
  =============================== */
  useEffect(() => {
    if (!plantCode) {
      setRows([]);
      return;
    }

    setLoading(true);

    const query =
      activeTab === 'NORMAL'
        ? supabase
            .from('stock_entries')
            .select(`
              stock_entry_id,
              tag_no,
              material_type,
              entry_uom,
              counted_qty,
              status,
              is_zero,
              is_cancel,
              entry_date,
              plant_code,
              location_code,
              created_by,
              created_at,
              updated_by,
              updated_at,
              materials (
                material_name
              )
            `)
        : supabase
            .from('stock_entries_manual')
            .select(`
              manual_entry_id,
              tag_no,
              material_name,
              material_type,
              entry_uom,
              counted_qty,
              status,
              is_zero,
              is_cancel,
              remarks,
              entry_date,
              plant_code,
              location_code,
              created_by,
              created_at,
              updated_by,
              updated_at
            `);

    query
      .eq('plant_code', plantCode)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          console.error(error);
          pushSaveMsg(`Load failed: ${error.message}`, 'error');
          return;
        }
        setRows(data || []);
      });
  }, [activeTab, plantCode]);

  /* ===============================
     Local update (unchanged)
  =============================== */
  const updateRow = (id, patch) => {
    setRows(prev =>
      prev.map(r =>
        (r.stock_entry_id === id || r.manual_entry_id === id)
          ? { ...r, ...patch }
          : r
      )
    );
  };

  const saveRow = async r => {
    const table =
      activeTab === 'NORMAL'
        ? 'stock_entries'
        : 'stock_entries_manual';

    const idCol =
      activeTab === 'NORMAL'
        ? 'stock_entry_id'
        : 'manual_entry_id';

    const payload = {
      tag_no: r.tag_no,
      counted_qty: r.is_zero ? 0 : Number(r.counted_qty || 0),
      status: r.status,
      is_zero: r.is_zero,
      is_cancel: r.is_cancel,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from(table)
      .update(payload)
      .eq(idCol, r[idCol]);

    if (error) {
      console.error(error);
      pushSaveMsg(`Save failed: ${error.message}`, 'error');
      return;
    }

    const material =
      activeTab === 'NORMAL'
        ? r.materials?.material_name
        : r.material_name;

    const tag = (r.tag_no || '').trim() || '-';
    const when = new Date().toLocaleTimeString();

    pushSaveMsg(
      `Saved: ${material || '(no material)'} | Tag: ${tag} | ${when}`,
      'success'
    );
  };

  const filteredRows = rows.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );

  /* ===============================
     RENDER
  =============================== */
  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate('/')}>⬅ Back to Dashboard</button>

      <h2>Editor Review</h2>

      {isViewOnly && (
        <div style={{ marginBottom: 10, color: '#555' }}>
          View only access (ENTRY role)
        </div>
      )}

      <button onClick={() => setActiveTab('NORMAL')}>NORMAL</button>
      <button onClick={() => setActiveTab('MANUAL')}>MANUAL</button>

      <br /><br />

      {saveMsgs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {saveMsgs.map(m => (
            <div
              key={m.id}
              style={{
                padding: '8px 10px',
                marginBottom: 6,
                border: '1px solid #ccc',
                borderLeft:
                  m.type === 'error'
                    ? '6px solid #c00'
                    : '6px solid #2a8f2a',
                background: '#fff',
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      <input
        placeholder="Search…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <br /><br />

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Material</th>
              <th>Type</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Zero</th>
              <th>Cancel</th>
              <th>Entry Date</th>
              <th>Plant</th>
              <th>Location</th>
              <th>Save</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map(r => {
              const id = r.stock_entry_id || r.manual_entry_id;
              const material =
                activeTab === 'NORMAL'
                  ? r.materials?.material_name
                  : r.material_name;

              return (
                <tr key={id}>
                  <td>
                    <input
                      value={r.tag_no || ''}
                      disabled={isViewOnly}
                      onChange={e =>
                        updateRow(id, { tag_no: e.target.value })
                      }
                    />
                  </td>

                  <td>{material}</td>
                  <td>{r.material_type}</td>
                  <td>{r.entry_uom}</td>

                  <td>
                    <input
                      type="number"
                      disabled={isViewOnly || r.is_zero || r.is_cancel}
                      value={r.counted_qty}
                      onChange={e =>
                        updateRow(id, { counted_qty: e.target.value })
                      }
                    />
                  </td>

                  <td>
                    <select
                      value={r.status}
                      disabled={isViewOnly}
                      onChange={e =>
                        updateRow(id, { status: e.target.value })
                      }
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="QA">QA</option>
                      <option value="REJECT">REJECT</option>
                    </select>
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={isViewOnly}
                      checked={r.is_zero}
                      onChange={e =>
                        updateRow(id, { is_zero: e.target.checked })
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="checkbox"
                      disabled={isViewOnly}
                      checked={r.is_cancel}
                      onChange={e =>
                        updateRow(id, { is_cancel: e.target.checked })
                      }
                    />
                  </td>

                  <td>{r.entry_date}</td>
                  <td>{r.plant_code}</td>
                  <td>{r.location_code}</td>

                  <td>
                    {!isViewOnly && (
                      <button onClick={() => saveRow(r)}>💾</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
