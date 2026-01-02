import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const MATERIAL_TYPES = ['PM', 'RM', 'P5', 'FG'];

export default function StockEntry() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [locationId, setLocationId] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [materialType, setMaterialType] = useState('');

  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [rows, setRows] = useState([]);

  /* ===============================
     Load locations (UNCHANGED)
  =============================== */
  useEffect(() => {
    if (!profile?.plant_code) return;

    supabase
      .from('locations')
      .select('location_id, location_code')
      .eq('plant_code', profile.plant_code)
      .eq('is_active', true)
      .then(({ data }) => setLocations(data || []));
  }, [profile]);

  /* ===============================
     Load materials (UNCHANGED)
  =============================== */
  useEffect(() => {
    if (!locationCode || !materialType || !profile?.plant_code) return;

    supabase
      .from('material_location_map')
      .select(`
        materials!inner (
          material_id,
          material_name,
          material_type,
          entry_uom
        )
      `)
      .eq('plant_code', profile.plant_code)
      .eq('location_code', locationCode)
      .eq('materials.material_type', materialType)
      .eq('is_active', true)
      .then(({ data }) => {
        setMaterials((data || []).map(d => d.materials));
      });
  }, [locationCode, materialType, profile]);

  /* ===============================
     Row handlers (UNCHANGED)
  =============================== */
  const addRow = () => {
    setRows(r => [
      ...r,
      {
        tag_no: '',
        material_text: '',
        material: null,
        show_suggest: false,
        qty: '',
        is_zero: false,
        is_cancel: false,
        status: 'NORMAL',
      },
    ]);
  };

  const updateRow = (i, patch) => {
    setRows(r =>
      r.map((row, idx) => (idx === i ? { ...row, ...patch } : row))
    );
  };

  const deleteRow = i => {
    setRows(r => r.filter((_, idx) => idx !== i));
  };

  /* ===============================
     Submit (UNCHANGED)
  =============================== */
  const submit = async () => {
    if (!rows.length) return alert('No rows to submit');
    if (!locationId) return alert('Please select location');

    const payload = rows
      .filter(r => r.material)
      .map(r => ({
        entry_date: entryDate,
        plant_id: profile.plant_id,
        plant_code: profile.plant_code,
        location_id: locationId,
        location_code: locationCode,
        material_id: r.material.material_id,
        material_type: r.material.material_type,
        entry_uom: r.material.entry_uom,
        tag_no: r.tag_no,
        counted_qty: r.is_zero ? 0 : Number(r.qty || 0),
        is_zero: r.is_zero,
        is_cancel: r.is_cancel,
        status: r.status,
        created_by: user.id,
      }));

    if (!payload.length)
      return alert('No valid rows (material not selected)');

    const { error } = await supabase
      .from('stock_entries')
      .insert(payload);

    if (error) return alert(error.message);

    alert('Stock entry submitted');
    navigate('/');
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;

  /* ===============================
     UI (LOOK ONLY)
  =============================== */
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h2 style={styles.title}>Stock Entry</h2>
      </div>

      <div style={styles.card}>
        {/* Header inputs */}
        <div style={styles.grid}>
          <div>
            <label>Plant</label>
            <input style={styles.input} value={profile.plant_code} readOnly />
          </div>

          <div>
            <label>Date</label>
            <input
              type="date"
              style={styles.input}
              value={entryDate}
              onChange={e => setEntryDate(e.target.value)}
            />
          </div>

          <div>
            <label>Location</label>
            <select
              style={styles.input}
              value={locationId}
              onChange={e => {
                const loc = locations.find(
                  l => l.location_id === e.target.value
                );
                setLocationId(loc.location_id);
                setLocationCode(loc.location_code);
              }}
            >
              <option value="">Select</option>
              {locations.map(l => (
                <option key={l.location_id} value={l.location_id}>
                  {l.location_code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Material Type</label>
            <select
              style={styles.input}
              value={materialType}
              onChange={e => setMaterialType(e.target.value)}
            >
              <option value="">Select</option>
              {MATERIAL_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <hr />

        <button style={styles.addBtn} onClick={addRow}>
          ➕ Add Row
        </button>

        <table style={styles.table}>
          <thead>
            <tr>
              <th>Sl</th>
              <th>Tag</th>
              <th>Material</th>
              <th>Type</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Zero</th>
              <th>Cancel</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>

                <td>
                  <input
                    style={styles.input}
                    value={r.tag_no}
                    onChange={e =>
                      updateRow(idx, { tag_no: e.target.value })
                    }
                  />
                </td>

                {/* Material autocomplete */}
                <td style={{ position: 'relative' }}>
                  <input
                    style={styles.input}
                    placeholder="Type material..."
                    value={r.material_text}
                    onChange={e =>
                      updateRow(idx, {
                        material_text: e.target.value,
                        material: null,
                        show_suggest: true,
                      })
                    }
                    onBlur={() =>
                      setTimeout(
                        () => updateRow(idx, { show_suggest: false }),
                        150
                      )
                    }
                  />

                  {r.show_suggest && r.material_text && (
                    <div style={styles.suggest}>
                      {materials
                        .filter(m =>
                          m.material_name
                            .toLowerCase()
                            .includes(r.material_text.toLowerCase())
                        )
                        .map(m => (
                          <div
                            key={m.material_id}
                            style={styles.suggestItem}
                            onMouseDown={() =>
                              updateRow(idx, {
                                material: m,
                                material_text: m.material_name,
                                show_suggest: false,
                              })
                            }
                          >
                            {m.material_name}
                          </div>
                        ))}
                    </div>
                  )}
                </td>

                <td>{r.material?.material_type || ''}</td>
                <td>{r.material?.entry_uom || ''}</td>

                <td>
                  <input
                    type="number"
                    style={styles.input}
                    disabled={r.is_zero || r.is_cancel}
                    value={r.qty}
                    onChange={e =>
                      updateRow(idx, { qty: e.target.value })
                    }
                  />
                </td>

                <td>
                  <select
                    style={styles.input}
                    value={r.status}
                    onChange={e =>
                      updateRow(idx, { status: e.target.value })
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
                    checked={r.is_zero}
                    onChange={e =>
                      updateRow(idx, {
                        is_zero: e.target.checked,
                        qty: e.target.checked ? 0 : '',
                      })
                    }
                  />
                </td>

                <td>
                  <input
                    type="checkbox"
                    checked={r.is_cancel}
                    onChange={e =>
                      updateRow(idx, { is_cancel: e.target.checked })
                    }
                  />
                </td>

                <td>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => deleteRow(idx)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        <button style={styles.submitBtn} onClick={submit}>
          ✅ Submit
        </button>
      </div>
    </div>
  );
}

/* ===============================
   Styles (UI ONLY)
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
    marginBottom: 16,
  },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  backBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 13,
  },
  addBtn: {
    marginBottom: 10,
    padding: '6px 12px',
    borderRadius: 6,
    border: 'none',
    background: '#2c5364',
    color: '#fff',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 10,
  },
  suggest: {
    position: 'absolute',
    background: '#fff',
    border: '1px solid #ccc',
    zIndex: 20,
    width: '100%',
    maxHeight: 150,
    overflowY: 'auto',
  },
  suggestItem: {
    padding: 6,
    cursor: 'pointer',
  },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  submitBtn: {
    marginTop: 12,
    padding: '8px 16px',
    borderRadius: 6,
    border: 'none',
    background: '#2c5364',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
