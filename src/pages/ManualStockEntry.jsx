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
     Load locations
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
     Load UOM master
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
     Row handlers
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
     Submit
  =============================== */
  const submit = async () => {
    if (!rows.length) {
      alert('No rows to submit');
      return;
    }

    if (!locationId || !materialType) {
      alert('Location and Material Type required');
      return;
    }

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

    if (!payload.length) {
      alert('Material name required');
      return;
    }

    const { error } = await supabase
      .from('stock_entries_manual')
      .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    alert('Manual stock entry submitted');
    navigate('/');
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Manual Stock Entry</h2>
      <button onClick={() => navigate('/')}>⬅ Back</button>
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
            <th>Tag</th>
            <th>Material Name</th>
            <th>UOM</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Zero</th>
            <th>Cancel</th>
            <th>Remarks</th>
            <th>❌</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
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

              <td>
                <input
                  value={r.material_name}
                  onChange={e =>
                    updateRow(idx, { material_name: e.target.value })
                  }
                />
              </td>

              <td>
                <select
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
                  disabled={r.is_zero}
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
                  value={r.remarks}
                  onChange={e =>
                    updateRow(idx, { remarks: e.target.value })
                  }
                />
              </td>

              <td>
                <button onClick={() => deleteRow(idx)}>🗑</button>
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
