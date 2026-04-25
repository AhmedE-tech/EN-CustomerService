import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import Modal from '../components/ui/Modal';
import { fetchClientProfile, openComplaint, openTicket } from '../lib/api/cs';
import type { ClientProfile } from '../lib/types';
import { formatDate } from '../lib/helpers';
import {
  User,
  Phone,
  Calendar,
  Car,
  CreditCard,
  ClipboardList,
  AlertCircle,
  MessageSquare,
  Plus,
  MapPin,
} from 'lucide-react';

type Tab = 'vehicles' | 'subscriptions' | 'sessions' | 'complaints_tickets';

export default function ClientProfilePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('vehicles');

  // Complaint modal
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [cText, setCText] = useState('');
  const [cType, setCType] = useState('service');
  const [cPriority, setCPriority] = useState('medium');
  const [cVehicle, setCVehicle] = useState('');
  const [cSession, setCSession] = useState('');
  const [cSubmitting, setCSubmitting] = useState(false);

  // Ticket modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [tSubject, setTSubject] = useState('');
  const [tMessage, setTMessage] = useState('');
  const [tPriority, setTPriority] = useState('medium');
  const [tCategory, setTCategory] = useState('general');
  const [tChannel, setTChannel] = useState('manual');
  const [tSubmitting, setTSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const data = await fetchClientProfile(customerId);
      setProfile(data);
      setError(null);
      // Default vehicle selection for complaint modal
      if (data?.vehicles?.length > 0) {
        setCVehicle(data.vehicles[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Submit Complaint ───
  const handleComplaintSubmit = async () => {
    if (!customerId || !cText.trim() || !cVehicle) return;
    try {
      setCSubmitting(true);
      const newId = await openComplaint({
        p_customer_id: customerId,
        p_complaint_text: cText,
        p_type: cType,
        p_priority: cPriority,
        p_vehicle_id: cVehicle,
        p_service_job_id: cSession || null,
      });
      setShowComplaintModal(false);
      setCText('');
      navigate(`/complaints/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create complaint');
      setCSubmitting(false);
    }
  };

  // ─── Submit Ticket ───
  const handleTicketSubmit = async () => {
    if (!customerId || !tSubject.trim() || !tMessage.trim()) return;
    try {
      setTSubmitting(true);
      await openTicket({
        p_customer_id: customerId,
        p_subject: tSubject,
        p_message: tMessage,
        p_priority: tPriority,
        p_category: tCategory,
        p_channel: tChannel,
      });
      setShowTicketModal(false);
      setTSubject('');
      setTMessage('');
      setSuccess('Ticket created successfully!');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setTSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Client Profile">
        <Spinner />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout title="Client Profile">
        {error && <Banner type="error" message={error} onDismiss={() => setError(null)} />}
        <div className="empty-state">
          <User />
          <h3>Client not found</h3>
        </div>
      </DashboardLayout>
    );
  }

  const vehicles = profile.vehicles || [];
  const subscriptions = profile.subscriptions || [];
  const complaints = profile.complaints || [];
  const tickets = profile.tickets || [];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'vehicles', label: `Vehicles (${vehicles.length})` },
    { key: 'subscriptions', label: `Subscriptions (${subscriptions.length})` },
    { key: 'sessions', label: `Sessions (${(profile?.recent_sessions || []).length})` },
    { key: 'complaints_tickets', label: 'Complaints & Tickets' },
  ];

  return (
    <DashboardLayout title="Client Profile">
      {error && <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />}
      {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} autoDismissMs={3000} />}

      {/* Top section: Info + Actions */}
      <div className="two-col" style={{ marginBottom: 28 }}>
        <div className="info-card">
          <div className="info-card-header">Client Information</div>
          <div className="info-card-body">
            <div className="info-row">
              <span className="info-label"><User size={14} style={{ marginRight: 6 }} />Name</span>
              <span className="info-value">{profile.full_name}</span>
            </div>
            <div className="info-row">
              <span className="info-label"><Phone size={14} style={{ marginRight: 6 }} />Phone</span>
              <span className="info-value">{profile.phone_number || '—'}</span>
            </div>
            <div className="info-row">
              <span className="info-label"><Calendar size={14} style={{ marginRight: 6 }} />Customer Since</span>
              <span className="info-value">{formatDate(profile.created_at)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary"
            style={{ height: 48 }}
            onClick={() => setShowComplaintModal(true)}
          >
            <AlertCircle size={18} />
            Open New Complaint
          </button>
          <button
            className="btn btn-secondary"
            style={{ height: 48 }}
            onClick={() => setShowTicketModal(true)}
          >
            <MessageSquare size={18} />
            Open New Ticket
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'vehicles' && (
        <div className="cards-grid">
          {vehicles.length === 0 ? (
            <div className="empty-state"><Car /><h3>No vehicles</h3></div>
          ) : (
            vehicles.map((v) => (
              <div className="card" key={v.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <Car size={20} color="var(--color-gold)" />
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{v.license_plate}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                  {v.make} {v.model}
                </div>
                {v.address && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> {v.address}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="cards-grid">
          {subscriptions.length === 0 ? (
            <div className="empty-state"><CreditCard /><h3>No subscriptions</h3></div>
          ) : (
            subscriptions.map((s) => (
              <div className="card" key={s.id}>
                <div className="card-header">
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.plan_name}</span>
                  <span className={`badge badge-${s.status}`}>{s.status}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  {formatDate(s.start_date)} → {formatDate(s.end_date)}
                </div>
                <div style={{ fontSize: 14 }}>
                  <strong>{s.sessions_used}</strong> / {s.sessions_total} sessions used
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="data-table-wrapper">
          {(profile?.recent_sessions || []).length === 0 ? (
            <div className="empty-state"><ClipboardList /><h3>No sessions</h3></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Wash Type</th>
                  <th>Plate</th>
                  <th>Code</th>
                </tr>
              </thead>
              <tbody>
                {(profile?.recent_sessions || []).slice(0, 20).map((session) => (
                  <tr key={session.id}>
                    <td>{formatDate(session.scheduled_date)}</td>
                    <td>{session.scheduled_time || '—'}</td>
                    <td><span className={`badge badge-${session.status}`}>{session.status}</span></td>
                    <td>{session.wash_type}</td>
                    <td>{session.license_plate}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{session.session_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'complaints_tickets' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="section-header">
              <h3 className="section-title">Open Complaints ({complaints.length})</h3>
            </div>
            {complaints.length === 0 ? (
              <div className="empty-state"><AlertCircle /><p>No complaints</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/complaints/${c.id}`)}
                  >
                    <div className="card-header">
                      <span className={`badge badge-${c.priority}`}>{c.priority}</span>
                      <span className={`badge badge-${c.complaint_status}`}>{c.complaint_status}</span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {c.complaint_text?.substring(0, 80)}…
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="section-header">
              <h3 className="section-title">Open Tickets ({tickets.length})</h3>
            </div>
            {tickets.length === 0 ? (
              <div className="empty-state"><MessageSquare /><p>No tickets</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tickets.map((t) => (
                  <div key={t.id} className="card">
                    <div className="card-header">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{t.subject}</span>
                      <span className={`badge badge-${t.status}`}>{t.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <span className={`badge badge-${t.priority}`}>{t.priority}</span>
                      <span>{t.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Complaint Modal ─── */}
      {showComplaintModal && (
        <Modal
          title="Open New Complaint"
          onClose={() => setShowComplaintModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowComplaintModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleComplaintSubmit}
                disabled={cSubmitting || !cText.trim() || !cVehicle}
              >
                <Plus size={16} />
                {cSubmitting ? 'Creating…' : 'Create Complaint'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label htmlFor="complaint-text">Complaint Description</label>
            <textarea
              id="complaint-text"
              value={cText}
              onChange={(e) => setCText(e.target.value)}
              placeholder="Describe the complaint…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="complaint-type">Type</label>
            <select id="complaint-type" value={cType} onChange={(e) => setCType(e.target.value)}>
              <option value="service">Service</option>
              <option value="subscription">Subscription</option>
              <option value="performance">Performance</option>
              <option value="management">Management</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="complaint-priority">Priority</label>
            <select id="complaint-priority" value={cPriority} onChange={(e) => setCPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="complaint-vehicle">Vehicle</label>
            <select id="complaint-vehicle" value={cVehicle} onChange={(e) => setCVehicle(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.license_plate} — {v.make} {v.model}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="complaint-session">Session (optional)</label>
            <select id="complaint-session" value={cSession} onChange={(e) => setCSession(e.target.value)}>
              <option value="">None</option>
              {(profile?.recent_sessions || []).map((session) => (
                <option key={session.id} value={session.id}>
                  {session.session_code} — {formatDate(session.scheduled_date)}
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* ─── Ticket Modal ─── */}
      {showTicketModal && (
        <Modal
          title="Open New Ticket"
          onClose={() => setShowTicketModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleTicketSubmit}
                disabled={tSubmitting || !tSubject.trim() || !tMessage.trim()}
              >
                <Plus size={16} />
                {tSubmitting ? 'Creating…' : 'Create Ticket'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label htmlFor="ticket-subject">Subject</label>
            <input
              id="ticket-subject"
              type="text"
              value={tSubject}
              onChange={(e) => setTSubject(e.target.value)}
              placeholder="Brief subject…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ticket-message">Message</label>
            <textarea
              id="ticket-message"
              value={tMessage}
              onChange={(e) => setTMessage(e.target.value)}
              placeholder="Detailed message…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ticket-priority">Priority</label>
            <select id="ticket-priority" value={tPriority} onChange={(e) => setTPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="ticket-category">Category</label>
            <select id="ticket-category" value={tCategory} onChange={(e) => setTCategory(e.target.value)}>
              <option value="general">General</option>
              <option value="billing">Billing</option>
              <option value="scheduling">Scheduling</option>
              <option value="technical">Technical</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="ticket-channel">Channel</label>
            <select id="ticket-channel" value={tChannel} onChange={(e) => setTChannel(e.target.value)}>
              <option value="manual">Manual</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
              <option value="app">App</option>
            </select>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
