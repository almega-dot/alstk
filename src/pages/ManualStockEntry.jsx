import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const MATERIAL_TYPES = ['PM', 'RM', 'P5', 'FG'];

export default function ManualStockEntry() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [locationId, setLocationId] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [materialType, setMaterialType] = useState('');

  const [locations, setLocations] = useState([]);
  const [uoms, setUoms] = useState([]);
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
     Load UOM master (UNCHANGED)
  =============================== */
  useEffect(() => {
    supabase
      .from('uom_master')
      .select('uom_code')
      .eq('is_active', true)
      .then(({ data }) => setUoms(data || []));
  }, []);

  /* ===============================
     Reset rows on header change
  =============================== */
  useEffect(() => {
    setRows([]);
  }, [locationId, materialType]);

  /* ===============================
     Row handlers (UNCHANGED)
  =============================== */
  const addRow = () => {
    setRows(r => [
      ...r,
      {
        tag_no: '',
        material_name: '',
        entry_uom: uoms[0]?.uom_code || '',
        qty: '',
        status: 'NORMAL',
        is_zero: false,
        is_cancel: false,
        remarks: '',
      },
    ]);
  };

  const updateRow = (i, patch) => {
    setRows(r =>
      r.map((row, idx) => {
        if (idx !== i) return row;
        const next = { ...row, ...patch };
        if (patch.is_zero === true) {
          next.qty = 0;
          next.status = 'NORMAL';
        }
        return next;
      })
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
    if (!locationId || !materialType)
      return alert('Location and Material Type required');

    const payload = rows
      .filter(r => r.material_name.trim() !== '')
      .map(r => ({
        entry_date: entryDate,
        plant_id: profile.plant_id,
        plant_code: profile.plant_code,
        location_id: locationId,
        location_code: locationCode,
        material_name: r.material_name.trim(),
        material_type: materialType,
        entry_uom: r.entry_uom,
        counted_qty: r.is_zero ? 0 : Number(r.qty || 0),
        status: r.status,
        is_zero: r.is_zero,
        is_cancel: r.is_cancel,
        tag_no: r.tag_no,
        remarks: r.remarks,
        created_by: user.id,
      }));

    if (!payload.length) return alert('Material name required');

    const { error } = await supabase
      .from('stock_entries_manual')
      .insert(payload);

    if (error) return alert(error.message);

    alert('Manual stock entry submitted');
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
          ← Back
        </button>
        <h2 style={styles.title}>Manual Stock Entry</h2>
      </div>

      <div style={styles.card}>
        {/* Header */}
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
              <th>Material Name</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Zero</th>
              <th>Cancel</th>
              <th>Remarks</th>
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

                <td>
                  <input
                    style={styles.input}
                    value={r.material_name}
                    onChange={e =>
                      updateRow(idx, { material_name: e.target.value })
                    }
                  />
                </td>

                <td>
                  <select
                    style={styles.input}
                    value={r.entry_uom}
                    onChange={e =>
                      updateRow(idx, { entry_uom: e.target.value })
                    }
                  >
                    {uoms.map(u => (
                      <option key={u.uom_code} value={u.uom_code}>
                        {u.uom_code}
                      </option>
                    ))}
                  </select>
                </td>

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
                    disabled={r.is_zero}
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
                      updateRow(idx, { is_zero: e.target.checked })
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
                  <input
                    style={styles.input}
                    value={r.remarks}
                    onChange={e =>
                      updateRow(idx, { remarks: e.target.value })
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
