import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import { fetchAllComplaints, updateComplaintStatus } from '../lib/api/cs';
import type { ComplaintRow } from '../lib/types';
import { formatDateTime, statusLabel, getComplaintTransitions } from '../lib/helpers';
import { Search, MoreVertical, Eye, RefreshCw, AlertCircle } from 'lucide-react';

export default function ComplaintsPage() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllComplaints();
      setComplaints(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = async (complaintId: string, newStatus: string) => {
    try {
      await updateComplaintStatus({ p_complaint_id: complaintId, p_new_status: newStatus });
      setSuccess(`Status updated to ${statusLabel(newStatus)}`);
      setOpenMenu(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Filter
  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.complaint_status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (searchTerm.trim()) {
      const name = c.customer?.full_name?.toLowerCase() || '';
      if (!name.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const statuses = ['all', 'open', 'under_review', 'investigating', 'resolved', 'closed', 'rejected'];
  const priorities = ['all', 'urgent', 'high', 'medium', 'low'];

  return (
    <DashboardLayout title="Complaints">
      {error && <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />}
      {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} autoDismissMs={3000} />}

      {/* Filter bar */}
      <div className="filter-bar">
        {statuses.map((s) => (
          <button
            key={s}
            className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All Statuses' : statusLabel(s)}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 4px' }} />
        {priorities.map((p) => (
          <button
            key={p}
            className={`filter-btn ${priorityFilter === p ? 'active' : ''}`}
            onClick={() => setPriorityFilter(p)}
          >
            {p === 'all' ? 'All Priorities' : statusLabel(p)}
          </button>
        ))}
        <div className="inline-search-wrapper" style={{ marginLeft: 'auto' }}>
          <Search />
          <input
            className="inline-search"
            type="text"
            placeholder="Search customer…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => load()}>
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <AlertCircle />
          <h3>No complaints found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Customer</th>
                <th>Plate</th>
                <th>Session</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th style={{ width: 50 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="clickable-row"
                  onClick={() => navigate(`/complaints/${c.id}`)}
                >
                  <td><span className={`badge badge-${c.priority}`}>{c.priority}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.customer?.full_name || '—'}</td>
                  <td>{c.vehicle?.license_plate || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.session?.session_code || '—'}</td>
                  <td>{statusLabel(c.type)}</td>
                  <td><span className={`badge badge-${c.complaint_status}`}>{statusLabel(c.complaint_status)}</span></td>
                  <td>{c.assigned_agent?.full_name || '—'}</td>
                  <td>{formatDateTime(c.created_at)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-menu" ref={openMenu === c.id ? menuRef : null}>
                      <button
                        className="action-menu-trigger"
                        onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openMenu === c.id && (
                        <div className="action-menu-dropdown">
                          <button
                            className="action-menu-item"
                            onClick={() => navigate(`/complaints/${c.id}`)}
                          >
                            <Eye size={14} style={{ marginRight: 8 }} />
                            View Detail
                          </button>
                          {getComplaintTransitions(c.complaint_status, 'customer_service').length > 0 && (
                            <>
                              <div className="action-menu-submenu-label">Change Status</div>
                              {getComplaintTransitions(c.complaint_status, 'customer_service').map((s) => (
                                <button
                                  key={s}
                                  className="action-menu-item"
                                  onClick={() => handleStatusChange(c.id, s)}
                                >
                                  {statusLabel(s)}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
