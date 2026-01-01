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
  
  const [locationId, setLocationId] = useState('');      // UUID
  const [locationCode, setLocationCode] = useState('');  // TEXT
  
  const [materialType, setMaterialType] = useState('');

  const [locations, setLocations] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  /* ===============================
     Load locations (plant-wise)
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
     Load materials
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
      .eq('location_code', locationCode)   // ✅ TEXT
      .eq('materials.material_type', materialType)
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }
        setMaterials(data.map(d => d.materials));
      });
  }, [locationCode, materialType, profile]);
  

  /* ===============================
     Row handlers
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
  .filter(r => r.material)
  .map(r => ({
    entry_date: entryDate,
    plant_id: profile.plant_id,
    plant_code: profile.plant_code,

    location_id: locationId,        // ✅ UUID
    location_code: locationCode,    // ✅ TEXT (optional but good)

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


    if (!payload.length) {
      alert('No valid rows (material not selected)');
      return;
    }

    const { error } = await supabase
      .from('stock_entries')
      .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    alert('Stock entry submitted');
    navigate('/');
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;

  /* ===============================
     Pagination
  =============================== */
  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <div style={{ padding: 20 }}>
      <h2>Stock Entry</h2>

      <button onClick={() => navigate('/')}>⬅ Back to Dashboard</button>

      <hr />

      {/* HEADER */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div>
          <label>Plant</label>
          <input value={profile.plant_code} readOnly />
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
    const loc = locations.find(
      l => l.location_id === e.target.value
    );
    setLocationId(loc.location_id);       // UUID
    setLocationCode(loc.location_code);   // CODE
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

      <button onClick={addRow}>➕ Add Row</button>

      <table border="1" cellPadding="6" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Sl</th>
            <th>Tag No</th>
            <th>Material</th>
            <th>Type</th>
            <th>UOM</th>
            <th>Qty</th>
            <th>Status</th> 
            <th>Zero</th>
            <th>Cancel</th>
            <th>❌</th>
          </tr>
        </thead>

        <tbody>
          {pageRows.map((r, i) => {
            const idx = start + i;
            return (
              <tr key={idx}>
                <td>{idx + 1}</td>

                <td>
                  <input
                    value={r.tag_no}
                    onChange={e =>
                      updateRow(idx, { tag_no: e.target.value })
                    }
                  />
                </td>

                {/* MATERIAL AUTOCOMPLETE */}
                <td style={{ position: 'relative' }}>
                  <input
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
                    disabled={r.is_zero || r.is_cancel}
                    value={r.qty}
                    onChange={e =>
                      updateRow(idx, { qty: e.target.value })
                    }
                  />
                </td>
                <td>
  <select
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
                  <button onClick={() => deleteRow(idx)}>🗑</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr />

      <button onClick={submit}>✅ Submit</button>
    </div>
  );
}
