import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const STATUS = ['NORMAL', 'QA', 'REJECT'];

export default function FGStockEntry() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  /* ===============================
     Plant
  =============================== */
  const [plantId, setPlantId] = useState('');
  const [plantCode, setPlantCode] = useState('');
  const [plants, setPlants] = useState([]);

  /* ===============================
     Location
  =============================== */
  const [locationId, setLocationId] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [locations, setLocations] = useState([]);

  /* ===============================
     FG Materials
  =============================== */
  const [materials, setMaterials] = useState([]);

  /* ===============================
     Rows
  =============================== */
  const [rows, setRows] = useState([]);

  /* ===============================
     Plant logic
  =============================== */
  useEffect(() => {
    if (!profile) return;

    if (profile.role_code === 'EDITOR') {
      setPlantId(profile.plant_id);
      setPlantCode(profile.plant_code);
    } else {
      supabase
        .from('plants')
        .select('plant_id, plant_code')
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
      .select('location_id, location_code')
      .eq('plant_code', plantCode)
      .eq('is_active', true)
      .then(({ data }) => setLocations(data || []));
  }, [plantCode]);

  /* ===============================
     FG Materials (ADMIN_FG only)
  =============================== */
  useEffect(() => {
    if (!plantCode || !locationCode) return;

    supabase
      .from('material_location_map')
      .select(`
        materials!inner (
          material_id,
          material_name,
          entry_uom
        )
      `)
      .eq('plant_code', plantCode)
      .eq('location_code', locationCode)
      .eq('materials.material_type', 'ADMIN_FG')
      .eq('is_active', true)
      .then(({ data }) => {
        setMaterials(data?.map(d => d.materials) || []);
      });
  }, [plantCode, locationCode]);

  /* ===============================
     Row handlers (IDENTICAL UX)
  =============================== */
  const addRow = () => {
    setRows(r => [
      ...r,
      {
        tag_no: '',
        batch_no: '',
        po_no: '',
        material_text: '',
        material: null,
        show_suggest: false,
        qty: '',
        pack_count: '',
        status: 'NORMAL',
        is_zero: false,
        is_cancel: false,
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
          next.pack_count = 0;
        }

        return next;
      })
    );
  };

  const deleteRow = i => {
    setRows(r => r.filter((_, idx) => idx !== i));
  };

  /* ===============================
     Submit
  =============================== */
  const submit = async () => {
    if (!rows.length) {
      alert('No rows to submit');
      return;
    }

    if (!locationId) {
      alert('Please select location');
      return;
    }

    const payload = rows
      .filter(r => r.material && r.batch_no)
      .map(r => ({
        entry_date: entryDate,
        plant_id: plantId,
        plant_code: plantCode,

        location_id: locationId,
        location_code: locationCode,

        material_id: r.material.material_id,
        material_type: 'ADMIN_FG',
        entry_uom: r.material.entry_uom,

        tag_no: r.tag_no,
        batch_no: r.batch_no,
        po_no: r.po_no || null,

        counted_qty: r.is_zero || r.is_cancel ? 0 : Number(r.qty || 0),
        pack_count: r.is_zero || r.is_cancel ? 0 : Number(r.pack_count || 0),

        status: r.status,
        is_zero: r.is_zero,
        is_cancel: r.is_cancel,

        created_by: user.id,
      }));

    if (!payload.length) {
      alert('Material + Batch No required');
      return;
    }

    const { error } = await supabase
      .from('stock_entries_fg')
      .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    alert('FG Stock Entry Saved');
    setRows([]); // stay on page
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;

  /* ===============================
     UI
  =============================== */
  return (
    <div style={{ padding: 20 }}>
      <h2>FG Stock Entry</h2>
      <button onClick={() => navigate('/')}>⬅ Back to Dashboard</button>

      <hr />

      {/* HEADER */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <label>Plant</label>
          {profile.role_code === 'ADMIN' ? (
            <select
              value={plantCode}
              onChange={e => {
                const p = plants.find(x => x.plant_code === e.target.value);
                setPlantCode(p.plant_code);
                setPlantId(p.plant_id);
              }}
            >
              <option value="">Select</option>
              {plants.map(p => (
                <option key={p.plant_id} value={p.plant_code}>
                  {p.plant_code}
                </option>
              ))}
            </select>
          ) : (
            <input value={plantCode} readOnly />
          )}
        </div>

        <div>
          <label>Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
          />
        </div>

        <div>
          <label>Location</label>
          <select
            value={locationId}
            onChange={e => {
              const l = locations.find(x => x.location_id === e.target.value);
              setLocationId(l.location_id);
              setLocationCode(l.location_code);
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
      </div>

      <hr />

      <button onClick={addRow}>➕ Add Row</button>

      <table border="1" cellPadding="6" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Tag No</th>
            <th>Batch No</th>
            <th>PO No</th>
            <th>Material</th>
            <th>UOM</th>
            <th>Qty</th>
            <th>Pack</th>
            <th>Status</th>
            <th>Zero</th>
            <th>Cancel</th>
            <th>❌</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <input
                  value={r.tag_no}
                  onChange={e => updateRow(i, { tag_no: e.target.value })}
                />
              </td>

              <td>
                <input
                  value={r.batch_no}
                  onChange={e => updateRow(i, { batch_no: e.target.value })}
                />
              </td>

              <td>
                <input
                  value={r.po_no}
                  onChange={e => updateRow(i, { po_no: e.target.value })}
                />
              </td>

              {/* MATERIAL AUTOSUGGEST */}
              <td style={{ position: 'relative' }}>
                <input
                  placeholder="Type material..."
                  value={r.material_text}
                  onChange={e =>
                    updateRow(i, {
                      material_text: e.target.value,
                      material: null,
                      show_suggest: true,
                    })
                  }
                  onBlur={() =>
                    setTimeout(
                      () => updateRow(i, { show_suggest: false }),
                      150
                    )
                  }
                />

                {r.show_suggest && r.material_text && (
                  <div
                    style={{
                      position: 'absolute',
                      background: '#fff',
                      border: '1px solid #ccc',
                      zIndex: 20,
                      width: '100%',
                      maxHeight: 150,
                      overflowY: 'auto',
                    }}
                  >
                    {materials
                      .filter(m =>
                        m.material_name
                          .toLowerCase()
                          .includes(r.material_text.toLowerCase())
                      )
                      .map(m => (
                        <div
                          key={m.material_id}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onMouseDown={() =>
                            updateRow(i, {
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

              <td>{r.material?.entry_uom || ''}</td>

              <td>
                <input
                  type="number"
                  disabled={r.is_zero || r.is_cancel}
                  value={r.qty}
                  onChange={e => updateRow(i, { qty: e.target.value })}
                />
              </td>

              <td>
                <input
                  type="number"
                  disabled={r.is_zero || r.is_cancel}
                  value={r.pack_count}
                  onChange={e =>
                    updateRow(i, { pack_count: e.target.value })
                  }
                />
              </td>

              <td>
                <select
                  value={r.status}
                  onChange={e => updateRow(i, { status: e.target.value })}
                >
                  {STATUS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>

              <td>
                <input
                  type="checkbox"
                  checked={r.is_zero}
                  onChange={e =>
                    updateRow(i, { is_zero: e.target.checked })
                  }
                />
              </td>

              <td>
                <input
                  type="checkbox"
                  checked={r.is_cancel}
                  onChange={e =>
                    updateRow(i, { is_cancel: e.target.checked })
                  }
                />
              </td>

              <td>
                <button onClick={() => deleteRow(i)}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />
      <button onClick={submit}>✅ Submit</button>
    </div>
  );
}
