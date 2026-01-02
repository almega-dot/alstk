import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';

const TABS = [
  { key: 'A', label: 'Normal · Location × Material', rpc: 'report_non_admin_tab_a' },
  { key: 'B', label: 'Normal · Plant × Material',   rpc: 'report_non_admin_tab_b' },
  { key: 'C', label: 'Manual · Location × Material', rpc: 'report_non_admin_tab_c' },
  { key: 'D', label: 'Manual · Plant × Material',   rpc: 'report_non_admin_tab_d' },
];

export default function ReportsNonAdmin() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('A');
  const [materialType, setMaterialType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // admin only
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState(null);

  /* =========================
     Resolve Plant Context
  ========================= */
  const effectivePlantId = isAdmin
    ? (selectedPlantId || profile?.plant_id)
    : profile?.plant_id;

  const effectivePlantCode = isAdmin
    ? (
        plants.find(p => p.plant_id === (selectedPlantId || profile?.plant_id))
          ?.plant_code || ''
      )
    : profile?.plant_code;

  /* =========================
     Load plants for admin
  ========================= */
  useEffect(() => {
    if (!isAdmin) return;

    const loadPlants = async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('plant_id, plant_code')
        .eq('active_flag', true)
        .order('plant_code');

      if (!error) setPlants(data || []);
      if (error) console.error(error);
    };

    loadPlants();
  }, [isAdmin]);

  /* =========================
     Load Report Data
  ========================= */
  useEffect(() => {
    if (!effectivePlantId) return;

    const tab = TABS.find(t => t.key === activeTab);
    if (!tab) return;

    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase.rpc(tab.rpc, {
        p_plant_id: effectivePlantId,
        p_material_type: materialType,
        p_search: search || null,
      });

      setRows(error ? [] : data || []);
      if (error) console.error(error);

      setLoading(false);
    };

    load();
  }, [activeTab, materialType, search, effectivePlantId]);

  const showLocation = activeTab === 'A' || activeTab === 'C';

  /* =========================
     Excel Download
  ========================= */
  const downloadExcel = () => {
    if (!rows || rows.length === 0) {
      alert('No data to export');
      return;
    }

    const sheetData = rows.map(r => {
      if (showLocation) {
        return {
          Plant: r.plant_code,
          Location: r.location_code,
          Material: r.material_name,
          Status: r.status,
          UOM: r.entry_uom,
          'Total Qty': Number(r.total_qty),
        };
      }

      return {
        Plant: r.plant_code,
        Material: r.material_name,
        Status: r.status,
        UOM: r.entry_uom,
        'Total Qty': Number(r.total_qty),
      };
    });

    const tabLabel = TABS.find(t => t.key === activeTab)?.label || 'Report';
    const fileName = `${tabLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${materialType}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, fileName);
  };

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ marginTop: 16 }}>

      {/* ===== Header ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Stock Reports</h3>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={downloadExcel}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #1976d2',
              background: '#1976d2',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            ⬇ Download Excel
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              borderRadius: 6,
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* ===== Filters ===== */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>

        {!isAdmin && (
          <div style={{ fontSize: 13 }}>
            Plant: <b>{effectivePlantCode}</b>
          </div>
        )}

        {isAdmin && (
          <div>
            <label style={{ fontSize: 12 }}>Plant</label><br />
            <select
              value={selectedPlantId || ''}
              onChange={e => setSelectedPlantId(e.target.value)}
            >
              <option value="">Select Plant</option>
              {plants.map(p => (
                <option key={p.plant_id} value={p.plant_id}>
                  {p.plant_code}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ fontSize: 12 }}>Material Type</label><br />
          <select
            value={materialType}
            onChange={e => setMaterialType(e.target.value)}
          >
            <option value="ALL">ALL</option>
            <option value="RM">RM</option>
            <option value="PM">PM</option>
            <option value="P5">P5</option>
            <option value="FG">FG</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 12 }}>Global Search</label><br />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Material / Location / Status"
          />
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{ fontWeight: activeTab === t.key ? 600 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== Table ===== */}
      <table width="100%" border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Plant</th>
            {showLocation && <th>Location</th>}
            <th>Material</th>
            <th>Status</th>
            <th>UOM</th>
            <th>Total Qty</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={showLocation ? 6 : 5}>Loading…</td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={showLocation ? 6 : 5}>No data</td>
            </tr>
          )}

          {!loading && rows.map((r, i) => (
            <tr key={i}>
              <td>{r.plant_code}</td>
              {showLocation && <td>{r.location_code}</td>}
              <td>{r.material_name}</td>
              <td>{r.status}</td>
              <td>{r.entry_uom}</td>
              <td align="right">{Number(r.total_qty).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}
