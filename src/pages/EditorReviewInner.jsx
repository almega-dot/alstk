import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function EditorReviewInner({ profile }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('NORMAL'); // NORMAL | MANUAL
  const [plantCode, setPlantCode] = useState('');
  const [plants, setPlants] = useState([]);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔒 ENTRY = view only
  const isViewOnly = profile.role_code === 'ENTRY';

  /* ===============================
     Save messages
  =============================== */
  const [saveMsgs, setSaveMsgs] = useState([]);

  const pushSaveMsg = (text, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setSaveMsgs(prev => [{ id, text, type }, ...prev].slice(0, 5));
    setTimeout(
      () => setSaveMsgs(prev => prev.filter(m => m.id !== id)),
      4500
    );
  };

  /* ===============================
     Plant logic
     EDITOR + ENTRY → fixed plant
     ADMIN          → selectable
  =============================== */
  useEffect(() => {
    if (profile.role_code === 'EDITOR' || profile.role_code === 'ENTRY') {
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
     Fetch rows (NO DB JOIN)
  =============================== */
  useEffect(() => {
    if (!plantCode) {
      setRows([]);
      return;
    }

    setLoading(true);

    const load = async () => {
      const table =
        activeTab === 'NORMAL'
          ? 'stock_entries'
          : 'stock_entries_manual';

      const idCol =
        activeTab === 'NORMAL'
          ? 'stock_entry_id'
          : 'manual_entry_id';

      const selectCols =
        activeTab === 'NORMAL'
          ? `
              ${idCol},
              tag_no,
              material_id,
              material_type,
              entry_uom,
              counted_qty,
              status,
              is_zero,
              is_cancel,
              entry_date,
              plant_code,
              location_code
            `
          : `
              ${idCol},
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
              location_code
            `;

      const { data, error } = await supabase
        .from(table)
        .select(selectCols)
        .eq('plant_code', plantCode)
        .order('created_at', { ascending: false });

      if (error) {
        setLoading(false);
        pushSaveMsg(`Load failed: ${error.message}`, 'error');
        return;
      }

      /* ---------- FRONTEND MATERIAL JOIN (NORMAL only) ---------- */
      if (activeTab === 'NORMAL') {
        const materialIds = [
          ...new Set(data.map(r => r.material_id).filter(Boolean)),
        ];

        let matMap = {};
        if (materialIds.length) {
          const { data: mats } = await supabase
            .from('materials')
            .select('material_id, material_name')
            .in('material_id', materialIds);

          (mats || []).forEach(m => {
            matMap[m.material_id] = m.material_name;
          });
        }

        setRows(
          data.map(r => ({
            ...r,
            material_name: matMap[r.material_id] || '—',
          }))
        );
      } else {
        // MANUAL already has material_name
        setRows(data);
      }

      setLoading(false);
    };

    load();
  }, [activeTab, plantCode]);

  /* ===============================
     Local update
  =============================== */
  const updateRow = (id, patch) => {
    if (isViewOnly) return;

    setRows(prev =>
      prev.map(r =>
        r.stock_entry_id === id || r.manual_entry_id === id
          ? { ...r, ...patch }
          : r
      )
    );
  };

  const saveRow = async r => {
    if (isViewOnly) return;

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
      pushSaveMsg(`Save failed: ${error.message}`, 'error');
      return;
    }

    pushSaveMsg(
      `Saved: ${r.material_name || '(no material)'} | Tag: ${r.tag_no || '-'}`,
      'success'
    );
  };

  const filteredRows = rows.filter(r =>
    JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );

  /* ===============================
     UI
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

      {saveMsgs.map(m => (
        <div
          key={m.id}
          style={{
            padding: 8,
            marginBottom: 6,
            borderLeft:
              m.type === 'error'
                ? '5px solid #c00'
                : '5px solid #2a8f2a',
            background: '#fff',
          }}
        >
          {m.text}
        </div>
      ))}

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
              <th>Date</th>
              <th>Plant</th>
              <th>Location</th>
              <th>Save</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map(r => {
              const id = r.stock_entry_id || r.manual_entry_id;

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

                  <td>{r.material_name}</td>
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
