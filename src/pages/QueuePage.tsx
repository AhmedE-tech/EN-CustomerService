import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import { fetchQueue } from '../lib/api/cs';
import type { QueueItem } from '../lib/types';
import { timeAgo, statusLabel } from '../lib/helpers';
import { Clock, AlertTriangle, ArrowRight, Inbox } from 'lucide-react';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function QueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await fetchQueue();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Stats
  const totalOpen = items.length;
  const urgent = items.filter((i) => i.priority === 'urgent').length;
  const high = items.filter((i) => i.priority === 'high').length;
  const awaiting = items.filter(
    (i) => i.pending_on === 'customer' || i.complaint_status === 'waiting_customer'
  ).length;

  // Filter
  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return item.priority === 'urgent';
    if (filter === 'high') return item.priority === 'high';
    if (filter === 'medium') return item.priority === 'medium';
    if (filter === 'low') return item.priority === 'low';
    if (filter === 'investigating') return item.complaint_status === 'investigating';
    if (filter === 'pending_customer') return item.pending_on === 'customer';
    return true;
  });

  // Sort: urgent first, then oldest first
  const sorted = [...filtered].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
    { key: 'investigating', label: 'Investigating' },
    { key: 'pending_customer', label: 'Pending Customer' },
  ];

  return (
    <DashboardLayout title="Queue">
      {error && (
        <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />
      )}

      {/* Stat cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-label">Total Open</span>
          <span className="stat-card-value">{totalOpen}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Urgent</span>
          <span className="stat-card-value urgent">{urgent}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">High Priority</span>
          <span className="stat-card-value warning">{high}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Awaiting Customer</span>
          <span className="stat-card-value gold">{awaiting}</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <div className="empty-state">
          <Inbox />
          <h3>No open complaints</h3>
          <p>All clear! Check back later.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {sorted.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-header">
                <span className={`badge badge-${item.priority}`}>
                  {item.priority === 'urgent' && <AlertTriangle size={12} />}
                  {item.priority}
                </span>
                <span className={`badge badge-${item.complaint_status}`}>
                  {statusLabel(item.complaint_status)}
                </span>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{item.customer_name}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {item.license_plate}
                </div>
              </div>

              <div className="card-body">
                <p>{item.complaint_text}</p>
              </div>

              <div className="card-footer">
                <div className="card-meta">
                  {item.session_code && (
                    <span className="card-meta-item">
                      #{item.session_code}
                    </span>
                  )}
                  <span className="card-meta-item">
                    <Clock size={12} />
                    {timeAgo(item.created_at)}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/complaints/${item.id}`)}
                >
                  Open <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
