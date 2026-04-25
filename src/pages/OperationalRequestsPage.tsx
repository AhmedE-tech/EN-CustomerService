import { useEffect, useState, useCallback, useRef } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import {
  searchClients,
  fetchClientSessions,
  submitRescheduleRequest,
  submitFreezeRequest,
  submitVehicleChangeRequest,
  fetchOperationalRequests,
} from '../lib/api/cs';
import type { ClientSearchResult, ClientSessionOption, OperationalRequest } from '../lib/types';
import { formatDateTime, statusLabel } from '../lib/helpers';
import { Send, Search, Clock, User, CheckCircle, XCircle, Loader } from 'lucide-react';

type RequestType = 'reschedule' | 'freeze_subscription' | 'vehicle_change';

const today = () => new Date().toISOString().split('T')[0];
const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

export default function OperationalRequestsPage() {
  // ── Form core ──────────────────────────────────────────────────────────────
  const [requestType, setRequestType] = useState<RequestType>('reschedule');
  const [reason, setReason] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState<ClientSearchResult[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // ── Reschedule fields ──────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ClientSessionOption[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  // ── Freeze fields ──────────────────────────────────────────────────────────
  const [freezeStart, setFreezeStart] = useState(today());
  const [freezeEnd, setFreezeEnd] = useState(inDays(30));

  // ── Vehicle change fields ──────────────────────────────────────────────────
  const [vehicleChangeType, setVehicleChangeType] = useState('update');
  const [vPlate, setVPlate] = useState('');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vColor, setVColor] = useState('');
  const [vYear, setVYear] = useState('');
  const [vNewOwner, setVNewOwner] = useState('');

  // ── History ────────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<OperationalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── Banners ────────────────────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── History loader ─────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      setRequests(await fetchOperationalRequests());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Client search ──────────────────────────────────────────────────────────
  const doClientSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setClientResults([]); setShowDropdown(false); return; }
    try {
      setClientSearching(true);
      setClientResults(await searchClients(q.trim()));
      setShowDropdown(true);
    } catch { /* silent */ } finally { setClientSearching(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doClientSearch(clientQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [clientQuery, doClientSearch]);

  const selectClient = (client: ClientSearchResult) => {
    setSelectedClient(client);
    setClientQuery(client.full_name);
    setShowDropdown(false);
    setSelectedSessionId('');
    setSessions([]);
  };

  const clearClient = () => {
    setSelectedClient(null);
    setClientQuery('');
    setSessions([]);
    setSelectedSessionId('');
  };

  // ── Load sessions when client selected + type = reschedule ─────────────────
  useEffect(() => {
    if (!selectedClient || requestType !== 'reschedule') { setSessions([]); return; }
    setSessionsLoading(true);
    fetchClientSessions(selectedClient.id)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [selectedClient, requestType]);

  // ── Reset type-specific fields on type change ──────────────────────────────
  const handleTypeChange = (t: RequestType) => {
    setRequestType(t);
    setSelectedSessionId('');
    setNewDate('');
    setNewTime('');
    setFreezeStart(today());
    setFreezeEnd(inDays(30));
    setVehicleChangeType('update');
    setVPlate(''); setVMake(''); setVModel(''); setVColor(''); setVYear(''); setVNewOwner('');
    setReason('');
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const isValid = () => {
    if (!selectedClient || !reason.trim()) return false;
    if (requestType === 'reschedule') return !!selectedSessionId && !!newDate;
    if (requestType === 'freeze_subscription') return !!freezeStart && !!freezeEnd && freezeEnd > freezeStart;
    if (requestType === 'vehicle_change') {
      if (vehicleChangeType === 'update') return !!(vPlate || vMake || vModel || vColor || vYear);
      if (vehicleChangeType === 'transfer') return !!vNewOwner.trim();
      return true; // remove just needs reason
    }
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedClient || !isValid()) return;
    try {
      setSubmitting(true);
      setError(null);

      if (requestType === 'reschedule') {
        await submitRescheduleRequest({
          session_id: selectedSessionId,
          new_date: newDate,
          new_time: newTime || undefined,
          reason: reason.trim(),
        });
      } else if (requestType === 'freeze_subscription') {
        await submitFreezeRequest({
          customer_id: selectedClient.id,
          start_date: freezeStart,
          end_date: freezeEnd,
          reason: reason.trim(),
        });
      } else if (requestType === 'vehicle_change') {
        const changes: Record<string, string> = {};
        if (vehicleChangeType === 'update') {
          if (vPlate)  changes.license_plate = vPlate;
          if (vMake)   changes.make = vMake;
          if (vModel)  changes.model = vModel;
          if (vColor)  changes.color = vColor;
          if (vYear)   changes.year = vYear;
        } else if (vehicleChangeType === 'transfer') {
          changes.new_owner_note = vNewOwner;
        } else {
          changes.remove_confirmed = 'true';
        }
        await submitVehicleChangeRequest({
          customer_id: selectedClient.id,
          change_type: vehicleChangeType,
          requested_changes: changes,
          reason: reason.trim(),
        });
      }

      setSuccess('Request submitted. The operations team will review it shortly.');
      setReason('');
      clearClient();
      setNewDate(''); setNewTime('');
      setFreezeStart(today()); setFreezeEnd(inDays(30));
      setVPlate(''); setVMake(''); setVModel(''); setVColor(''); setVYear(''); setVNewOwner('');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle size={14} color="var(--color-success)" />;
    if (status === 'rejected') return <XCircle size={14} color="var(--color-danger)" />;
    return <Loader size={14} color="var(--color-warning)" />;
  };

  // ── Selected session label for display ─────────────────────────────────────
  const selectedSession = sessions.find(s => s.session_id === selectedSessionId);

  return (
    <DashboardLayout title="Operational Requests">
      {error   && <Banner type="error"   message={error}   onDismiss={() => setError(null)}   autoDismissMs={5000} />}
      {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} autoDismissMs={3000} />}

      {/* ── Form card ── */}
      <div className="request-form-card">
        <div className="section-header">
          <h3 className="section-title">Submit New Request</h3>
        </div>

        {/* Row 1: type + client */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Request type */}
          <div className="form-group">
            <label htmlFor="req-type">Request Type</label>
            <select id="req-type" value={requestType} onChange={e => handleTypeChange(e.target.value as RequestType)}>
              <option value="reschedule">Reschedule Session</option>
              <option value="freeze_subscription">Freeze Subscription</option>
              <option value="vehicle_change">Vehicle Change</option>
            </select>
          </div>

          {/* Client search */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="req-client">Client</label>
            {selectedClient ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', background: 'var(--color-gold-light)',
                borderRadius: 'var(--radius)', fontSize: 14,
              }}>
                <User size={16} color="var(--color-gold)" />
                <span style={{ fontWeight: 600, flex: 1 }}>{selectedClient.full_name}</span>
                <button onClick={clearClient} style={{ color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1 }}>×</button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                  <input id="req-client" type="text" value={clientQuery} onChange={e => setClientQuery(e.target.value)}
                    placeholder="Search client…" style={{ paddingLeft: 36 }} autoComplete="off" />
                </div>
                {showDropdown && clientResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 100,
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {clientResults.map(c => (
                      <button key={c.id} onClick={() => selectClient(c)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 14px', fontSize: 14,
                        borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                      }}>
                        <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          {c.phone_number} · {(c.plates || []).join(', ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {clientSearching && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>Searching…</div>}
              </>
            )}
          </div>
        </div>

        {/* ── Reschedule-specific fields ── */}
        {requestType === 'reschedule' && (
          <>
            <div className="form-group">
              <label htmlFor="req-session">Session to Reschedule</label>
              {sessionsLoading ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Loading sessions…</div>
              ) : !selectedClient ? (
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Select a client first.</div>
              ) : sessions.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>No upcoming scheduled sessions found for this client.</div>
              ) : (
                <select id="req-session" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
                  <option value="">— Select session —</option>
                  {sessions.map(s => (
                    <option key={s.session_id} value={s.session_id}>
                      #{s.session_code} · {s.scheduled_date}{s.scheduled_time ? ' @ ' + s.scheduled_time : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedSession && (
              <div style={{
                padding: '10px 14px', background: 'var(--color-surface-raised, #1a1a1a)',
                borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 4,
                borderLeft: '3px solid var(--color-gold)',
              }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Current date: </span>
                <strong>{selectedSession.scheduled_date}</strong>
                {selectedSession.scheduled_time && (
                  <> <span style={{ color: 'var(--color-text-secondary)' }}>at</span> <strong>{selectedSession.scheduled_time}</strong></>
                )}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label htmlFor="req-new-date">New Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input id="req-new-date" type="date" value={newDate} min={today()} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="req-new-time">New Time <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(optional)</span></label>
                <input id="req-new-time" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {/* ── Freeze-specific fields ── */}
        {requestType === 'freeze_subscription' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label htmlFor="req-freeze-start">Freeze Start Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input id="req-freeze-start" type="date" value={freezeStart} min={today()} onChange={e => setFreezeStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="req-freeze-end">Freeze End Date <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input id="req-freeze-end" type="date" value={freezeEnd} min={freezeStart || today()} onChange={e => setFreezeEnd(e.target.value)} />
            </div>
            {freezeStart && freezeEnd && freezeEnd <= freezeStart && (
              <div style={{ gridColumn: '1/-1', fontSize: 12, color: 'var(--color-danger)' }}>
                End date must be after start date.
              </div>
            )}
          </div>
        )}

        {/* ── Vehicle change-specific fields ── */}
        {requestType === 'vehicle_change' && (
          <>
            <div className="form-group">
              <label htmlFor="req-vc-type">Change Type <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <select id="req-vc-type" value={vehicleChangeType} onChange={e => { setVehicleChangeType(e.target.value); setVPlate(''); setVMake(''); setVModel(''); setVColor(''); setVYear(''); setVNewOwner(''); }}>
                <option value="update">Update Vehicle Details</option>
                <option value="transfer">Transfer Ownership</option>
                <option value="remove">Remove Vehicle</option>
              </select>
            </div>

            {vehicleChangeType === 'update' && (
              <>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  Fill in only the fields that need to be changed.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label>New License Plate</label>
                    <input type="text" value={vPlate} onChange={e => setVPlate(e.target.value)} placeholder="e.g. ABC-1234" />
                  </div>
                  <div className="form-group">
                    <label>Make</label>
                    <input type="text" value={vMake} onChange={e => setVMake(e.target.value)} placeholder="e.g. Toyota" />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input type="text" value={vModel} onChange={e => setVModel(e.target.value)} placeholder="e.g. Camry" />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input type="text" value={vColor} onChange={e => setVColor(e.target.value)} placeholder="e.g. White" />
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input type="number" value={vYear} onChange={e => setVYear(e.target.value)} placeholder="e.g. 2022" min="1990" max="2030" />
                  </div>
                </div>
                {!(vPlate || vMake || vModel || vColor || vYear) && (
                  <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>At least one field must be filled to update.</div>
                )}
              </>
            )}

            {vehicleChangeType === 'transfer' && (
              <div className="form-group">
                <label htmlFor="req-new-owner">New Owner Name / Phone <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input id="req-new-owner" type="text" value={vNewOwner} onChange={e => setVNewOwner(e.target.value)}
                  placeholder="Full name or phone number of the new owner" />
              </div>
            )}

            {vehicleChangeType === 'remove' && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.08)',
                borderRadius: 'var(--radius)', fontSize: 13,
                borderLeft: '3px solid var(--color-danger)',
              }}>
                This will request removal of the customer's active vehicle. Explain the reason below.
              </div>
            )}
          </>
        )}

        {/* Reason (all types) */}
        <div className="form-group">
          <label htmlFor="req-reason">Reason <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <textarea id="req-reason" value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Explain the reason for this request…" rows={3} />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !isValid()}>
          <Send size={16} />
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </div>

      {/* ── History ── */}
      <div className="section-header" style={{ marginTop: 32 }}>
        <h3 className="section-title">My Submitted Requests (Last 30 Days)</h3>
      </div>

      {loadingHistory ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Clock />
          <h3>No requests yet</h3>
          <p>Requests you submit will appear here.</p>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Customer</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={`${r.type}-${r.id}`}>
                  <td><span className="badge badge-medium">{statusLabel(r.type)}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.customer_name}</td>
                  <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {getStatusIcon(r.status)}
                      <span className={`badge badge-${r.status}`}>{statusLabel(r.status)}</span>
                    </span>
                  </td>
                  <td>{formatDateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
