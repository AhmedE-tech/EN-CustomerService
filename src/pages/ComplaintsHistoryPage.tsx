import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import { supabase } from '../lib/supabase';
import { formatDateTime, statusLabel } from '../lib/helpers';
import { Archive, FileWarning, Inbox } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryComplaint {
  id: string;
  priority: string;
  complaint_status: string;
  complaint_text: string;
  type: string;
  created_at: string;
  resolved_at: string | null;
  customer: { full_name: string } | null;
  vehicle: { license_plate: string } | null;
  session: { session_code: string } | null;
  assigned_agent: { full_name: string } | null;
}

interface HistoryTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  channel: string;
  created_at: string;
  resolved_at: string | null;
  customer: { full_name: string } | null;
}

type ActiveTab = 'complaints' | 'tickets';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComplaintsHistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('complaints');

  const [complaints, setComplaints] = useState<HistoryComplaint[]>([]);
  const [tickets, setTickets] = useState<HistoryTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const [{ data: cData, error: cErr }, { data: tData, error: tErr }] = await Promise.all([
          supabase
            .from('complaints')
            .select(`
              id, priority, complaint_status, complaint_text, type,
              created_at, resolved_at,
              customer:customer_id(full_name),
              vehicle:vehicle_id(license_plate),
              session:service_job_id(session_code),
              assigned_agent:assigned_to(full_name)
            `)
            .in('complaint_status', ['closed', 'rejected'])
            .order('created_at', { ascending: false }),
          supabase
            .from('support_tickets')
            .select(`
              id, subject, status, priority, category, channel,
              created_at, resolved_at,
              customer:user_id(full_name)
            `)
            .in('status', ['closed', 'resolved'])
            .order('created_at', { ascending: false }),
        ]);

        if (cErr) throw cErr;
        if (tErr) throw tErr;
        setComplaints((cData || []) as unknown as HistoryComplaint[]);
        setTickets((tData || []) as unknown as HistoryTicket[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const closedComplaints = complaints.filter((c) => c.complaint_status === 'closed').length;
  const rejectedComplaints = complaints.filter((c) => c.complaint_status === 'rejected').length;
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved').length;
  const closedTickets = tickets.filter((t) => t.status === 'closed').length;

  const stats = [
    { label: 'Closed Complaints', value: closedComplaints, color: '#555' },
    { label: 'Rejected Complaints', value: rejectedComplaints, color: 'var(--color-danger)' },
    { label: 'Resolved Tickets', value: resolvedTickets, color: '#c9a84c' },
    { label: 'Closed Tickets', value: closedTickets, color: '#555' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="History">
      {error && <Banner type="error" message={error} onDismiss={() => setError(null)} />}

      <div style={{ marginBottom: 24 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
          Closed and resolved complaints and support tickets
        </p>
      </div>

      {/* ── Stats ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            className="info-card"
            style={{ textAlign: 'center', padding: '18px 12px' }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: s.color,
                lineHeight: 1,
                marginBottom: 6,
              }}
            >
              {loading ? '—' : s.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {(['complaints', 'tickets'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'complaints' ? 'Complaints' : 'Support Tickets'}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : activeTab === 'complaints' ? (
        <ComplaintsTable complaints={complaints} onRowClick={(id) => navigate(`/complaints/${id}`)} />
      ) : (
        <TicketsTable tickets={tickets} />
      )}
    </DashboardLayout>
  );
}

// ─── Complaints Table ─────────────────────────────────────────────────────────

function ComplaintsTable({
  complaints,
  onRowClick,
}: {
  complaints: HistoryComplaint[];
  onRowClick: (id: string) => void;
}) {
  if (complaints.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 48 }}>
        <Archive size={36} />
        <p>No closed complaints found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Priority</th>
            <th>Customer</th>
            <th>License Plate</th>
            <th>Session Code</th>
            <th>Type</th>
            <th>Status</th>
            <th>Assigned To</th>
            <th>Created At</th>
            <th>Resolved At</th>
          </tr>
        </thead>
        <tbody>
          {complaints.map((c) => (
            <tr
              key={c.id}
              onClick={() => onRowClick(c.id)}
              style={{ cursor: 'pointer' }}
              className="table-row-clickable"
            >
              <td>
                <span className={`badge badge-${c.priority}`}>{c.priority}</span>
              </td>
              <td>{c.customer?.full_name ?? '—'}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                {c.vehicle?.license_plate ?? '—'}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {c.session?.session_code ?? '—'}
              </td>
              <td>{statusLabel(c.type)}</td>
              <td>
                <span
                  className={`badge`}
                  style={{
                    background: c.complaint_status === 'rejected' ? 'var(--color-danger)' : '#444',
                    color: '#fff',
                    padding: '2px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  {statusLabel(c.complaint_status)}
                </span>
              </td>
              <td>{c.assigned_agent?.full_name ?? '—'}</td>
              <td>{formatDateTime(c.created_at)}</td>
              <td>{formatDateTime(c.resolved_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tickets Table ────────────────────────────────────────────────────────────

function TicketsTable({ tickets }: { tickets: HistoryTicket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="empty-state" style={{ padding: 48 }}>
        <Inbox size={36} />
        <p>No closed tickets found.</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Subject</th>
            <th>Category</th>
            <th>Channel</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Resolved At</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.customer?.full_name ?? '—'}</td>
              <td style={{ maxWidth: 220 }}>
                <span
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    fontSize: 13,
                  }}
                >
                  {t.subject}
                </span>
              </td>
              <td>{statusLabel(t.category)}</td>
              <td>{statusLabel(t.channel)}</td>
              <td>
                <span className={`badge badge-${t.priority}`}>{t.priority}</span>
              </td>
              <td>
                <span
                  className="badge"
                  style={{
                    background: t.status === 'resolved' ? '#c9a84c22' : '#44444422',
                    color: t.status === 'resolved' ? '#c9a84c' : '#aaa',
                    border: `1px solid ${t.status === 'resolved' ? '#c9a84c55' : '#55555555'}`,
                    padding: '2px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                >
                  {statusLabel(t.status)}
                </span>
              </td>
              <td>{formatDateTime(t.created_at)}</td>
              <td>{formatDateTime(t.resolved_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// suppress unused import warning
void FileWarning;
