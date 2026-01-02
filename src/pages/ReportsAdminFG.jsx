// src/pages/ReportsAdminFG.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import * as XLSX from 'xlsx';

const TABS = [
  { key: 'A', label: 'Normal · Location × Material', rpc: 'report_admin_fg_tab_a' },
  { key: 'B', label: 'Normal · Plant × Material',   rpc: 'report_admin_fg_tab_b' },
  { key: 'C', label: 'Manual · Location × Material', rpc: 'report_admin_fg_tab_c' },
  { key: 'D', label: 'Manual · Plant × Material',   rpc: 'report_admin_fg_tab_d' },
];

export default function ReportsAdminFG() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('A');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // admin only
  const [plants, setPlants] = useState([]);
  const [selectedPlantId, setSelectedPlantId] = useState('');

 /* =========================
   Resolve Plant Context
========================= */
const effectivePlantId = isAdmin
? (selectedPlantId || profile?.plant_id)
: profile?.plant_id;

const effectivePlantCode = useMemo(() => {
if (!isAdmin) return profile?.plant_code || '';
const p =
  plants.find(x => x.plant_id === selectedPlantId) ||
  plants.find(x => x.plant_id === profile?.plant_id);
return p?.plant_code || '';
}, [isAdmin, profile, plants, selectedPlantId]);

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
        p_search: search || null,
      });

      setRows(error ? [] : data || []);
      if (error) console.error(error);

      setLoading(false);
    };

    load();
  }, [activeTab, search, effectivePlantId]);

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
      // Expected fields from RPC:
      // plant_code, (location_code optional), material_name, entry_uom, total_qty, total_pack
      if (showLocation) {
        return {
          Plant: r.plant_code,
          Location: r.location_code,
          Material: r.material_name,
          UOM: r.entry_uom,
          'Total Qty': Number(r.total_qty),
          'Total Pack': Number(r.total_pack),
        };
      }
      return {
        Plant: r.plant_code,
        Material: r.material_name,
        UOM: r.entry_uom,
        'Total Qty': Number(r.total_qty),
        'Total Pack': Number(r.total_pack),
      };
    });

    const tabLabel = TABS.find(t => t.key === activeTab)?.key || 'X';
    const safePlant = effectivePlantCode || 'PLANT';
    const fileName = `ADMIN_FG_Tab_${tabLabel}_${safePlant}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, fileName);
  };

  /* =========================
     UI
  ========================= */
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ margin: 0 }}>FG Reports (ADMIX_FG)</h2>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={downloadExcel}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid #1976d2',
              background: '#1976d2',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Download Excel
          </button>

          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              borderRadius: 8,
              border: '1px solid #ccc',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        border: '1px solid #e6e6e6',
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        display: 'flex',
        gap: 14,
        alignItems: 'end',
        flexWrap: 'wrap',
        background: '#fafafa',
      }}>
        {/* Plant */}
        {!isAdmin && (
          <div style={{ fontSize: 13 }}>
            Plant: <b>{effectivePlantCode || '—'}</b>
          </div>
        )}

        {isAdmin && (
          <div>
            <label style={{ fontSize: 12 }}>Plant</label><br />
            <select
              value={selectedPlantId}
              onChange={e => setSelectedPlantId(e.target.value)}
              style={{ padding: 8, minWidth: 160 }}
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

        {/* Search */}
        <div>
          <label style={{ fontSize: 12 }}>Global Search</label><br />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Material / Location / Plant"
            style={{ padding: 8, minWidth: 280 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: activeTab === t.key ? '1px solid #1976d2' : '1px solid #e0e0e0',
              background: activeTab === t.key ? '#eef5ff' : '#fff',
              cursor: 'pointer',
              fontWeight: activeTab === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #e6e6e6', borderRadius: 10, overflowX: 'auto' }}>
        <table width="100%" cellPadding="10" style={{ borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f5f7fb' }}>
            <tr>
              <th align="left">Plant</th>
              {showLocation && <th align="left">Location</th>}
              <th align="left">Material</th>
              <th align="left">UOM</th>
              <th align="right">Total Qty</th>
              <th align="right">Total Pack</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={showLocation ? 6 : 5} align="center">Loading…</td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={showLocation ? 6 : 5} align="center">No data</td>
              </tr>
            )}

            {!loading && rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                <td>{r.plant_code}</td>
                {showLocation && <td>{r.location_code}</td>}
                <td>{r.material_name}</td>
                <td>{r.entry_uom}</td>
                <td align="right">{Number(r.total_qty).toLocaleString()}</td>
                <td align="right">{Number(r.total_pack).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
