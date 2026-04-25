import { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import { fetchAllTickets, updateTicketStatus } from '../lib/api/cs';
import type { TicketRow } from '../lib/types';
import { formatDateTime, statusLabel, getTicketTransitions } from '../lib/helpers';
import { Search, MoreVertical, ChevronDown, ChevronUp, MessageSquare, RefreshCw, Info } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllTickets();
      setTickets(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicketStatus({ p_ticket_id: ticketId, p_new_status: newStatus });
      setSuccess(`Ticket status updated to ${statusLabel(newStatus)}`);
      setOpenMenu(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchTerm.trim()) {
      const name = t.customer?.full_name?.toLowerCase() || '';
      const subj = t.subject?.toLowerCase() || '';
      const q = searchTerm.toLowerCase();
      if (!name.includes(q) && !subj.includes(q)) return false;
    }
    return true;
  });

  const statuses = ['all', 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'escalated_to_complaint'];
  const priorities = ['all', 'urgent', 'high', 'medium', 'low'];

  return (
    <DashboardLayout title="Support Tickets">
      {error && <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />}
      {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} autoDismissMs={3000} />}

      <div className="filter-bar">
        {statuses.map((s) => (
          <button
            key={s}
            className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : statusLabel(s)}
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
            placeholder="Search…"
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
          <MessageSquare />
          <h3>No tickets found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Channel</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Created</th>
                <th style={{ width: 50 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <>
                  <tr key={t.id}>
                    <td>
                      <button
                        onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                      >
                        {expandedRow === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.customer?.full_name || '—'}</td>
                    <td>{t.subject}</td>
                    <td>{statusLabel(t.category)}</td>
                    <td>{statusLabel(t.channel)}</td>
                    <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                    <td><span className={`badge badge-${t.status}`}>{statusLabel(t.status)}</span></td>
                    <td>{t.assigned_agent?.full_name || '—'}</td>
                    <td>{formatDateTime(t.created_at)}</td>
                    <td>
                      <div className="action-menu" ref={openMenu === t.id ? menuRef : null}>
                        <button
                          className="action-menu-trigger"
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openMenu === t.id && (
                          <div className="action-menu-dropdown">
                            {getTicketTransitions(t.status).length > 0 && (
                              <>
                                <div className="action-menu-submenu-label">Update Status</div>
                                {getTicketTransitions(t.status).map((s) => (
                                  <button
                                    key={s}
                                    className="action-menu-item"
                                    onClick={() => handleStatusChange(t.id, s)}
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
                  {expandedRow === t.id && (
                    <tr key={`${t.id}-expanded`}>
                      <td colSpan={10} style={{ padding: 0 }}>
                        <div className="expanded-row">
                          <div className="message-text">{t.message}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            {getTicketTransitions(t.status).map((s) => (
                              <button
                                key={s}
                                className={`btn btn-sm ${s === 'escalated_to_complaint' ? 'btn-danger' : 'btn-outline'}`}
                                onClick={() => handleStatusChange(t.id, s)}
                              >
                                {statusLabel(s)}
                              </button>
                            ))}
                          </div>
                          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            <Info size={12} />
                            To escalate to a complaint, use the Client Profile page.
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
