import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const STATUS = ['NORMAL', 'QA', 'REJECT'];

export default function FGEditorReviewInner({ profile }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('FG'); // FG | FG_MANUAL
  const [plantCode, setPlantCode] = useState('');
  const [plants, setPlants] = useState([]);
  const [locationCode, setLocationCode] = useState('');
  const [locations, setLocations] = useState([]);

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

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
     Fetch FG rows + material name (frontend join)
  =============================== */
  useEffect(() => {
    if (!plantCode) {
      setRows([]);
      return;
    }

    setLoading(true);

    const load = async () => {
      const table =
        activeTab === 'FG'
          ? 'stock_entries_fg'
          : 'stock_entries_fg_manual';

      const idCol =
        activeTab === 'FG'
          ? 'fg_entry_id'
          : 'fg_manual_entry_id';

      const { data, error } = await supabase
        .from(table)
        .select(`
          ${idCol},
          tag_no,
          batch_no,
          po_no,
          material_id,
          entry_uom,
          counted_qty,
          pack_count,
          status,
          is_zero,
          is_cancel,
          entry_date,
          plant_code,
          location_code
        `)
        .eq('plant_code', plantCode)
        .order('created_at', { ascending: false });

      if (error) {
        setLoading(false);
        pushSaveMsg(`Load failed: ${error.message}`, 'error');
        return;
      }

      /* ---- frontend material join ---- */
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

      const finalRows = data.map(r => ({
        ...r,
        material_name: matMap[r.material_id] || '—',
      }));

      setRows(finalRows);
      setLoading(false);
    };

    load();
  }, [activeTab, plantCode]);

  /* ===============================
     Local update
  =============================== */
  const updateRow = (id, patch) => {
    setRows(prev =>
      prev.map(r =>
        r.fg_entry_id === id || r.fg_manual_entry_id === id
          ? { ...r, ...patch }
          : r
      )
    );
  };

  const saveRow = async r => {
    const table =
      activeTab === 'FG'
        ? 'stock_entries_fg'
        : 'stock_entries_fg_manual';

    const idCol =
      activeTab === 'FG'
        ? 'fg_entry_id'
        : 'fg_manual_entry_id';

    const payload = {
      tag_no: r.tag_no,
      counted_qty: r.is_zero ? 0 : Number(r.counted_qty || 0),
      pack_count: r.is_zero ? 0 : Number(r.pack_count || 0),
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
      `Saved: ${r.material_name} | Tag: ${r.tag_no || '-'}`
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
      <button onClick={() => navigate('/')}>⬅ Back</button>

      <h2>FG Editor Review</h2>

      <button onClick={() => setActiveTab('FG')}>FG</button>
      <button onClick={() => setActiveTab('FG_MANUAL')}>
        FG MANUAL
      </button>

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
              <th>Batch</th>
              <th>PO</th>
              <th>Material</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Pack</th>
              <th>Status</th>
              <th>Zero</th>
              <th>Cancel</th>
              <th>Plant</th>
              <th>Location</th>
              <th>Save</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.map(r => {
              const id =
                r.fg_entry_id || r.fg_manual_entry_id;

              return (
                <tr key={id}>
                  <td>
                    <input
                      value={r.tag_no || ''}
                      onChange={e =>
                        updateRow(id, { tag_no: e.target.value })
                      }
                    />
                  </td>
                  <td>{r.batch_no}</td>
                  <td>{r.po_no}</td>
                  <td>{r.material_name}</td>
                  <td>{r.entry_uom}</td>
                  <td>
                    <input
                      type="number"
                      disabled={r.is_zero || r.is_cancel}
                      value={r.counted_qty}
                      onChange={e =>
                        updateRow(id, {
                          counted_qty: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      disabled={r.is_zero || r.is_cancel}
                      value={r.pack_count}
                      onChange={e =>
                        updateRow(id, {
                          pack_count: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={r.status}
                      onChange={e =>
                        updateRow(id, { status: e.target.value })
                      }
                    >
                      {STATUS.map(s => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.is_zero}
                      onChange={e =>
                        updateRow(id, {
                          is_zero: e.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={r.is_cancel}
                      onChange={e =>
                        updateRow(id, {
                          is_cancel: e.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>{r.plant_code}</td>
                  <td>{r.location_code}</td>
                  <td>
                    <button onClick={() => saveRow(r)}>💾</button>
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
