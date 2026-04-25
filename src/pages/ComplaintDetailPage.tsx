import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Spinner from '../components/ui/Spinner';
import Banner from '../components/ui/Banner';
import Modal from '../components/ui/Modal';
import {
  fetchComplaintDetail,
  addComplaintInteraction,
  updateComplaintStatus,
  updateComplaintVideoStatus,
} from '../lib/api/cs';
import type { ComplaintDetail } from '../lib/types';
import { formatDateTime, statusLabel, getComplaintTransitions } from '../lib/helpers';
import {
  User,
  Car,
  Hash,
  Clock,
  Shield,
  Video,
  AlertCircle,
  AlertTriangle,
  Send,
  ChevronDown,
} from 'lucide-react';

export default function ComplaintDetailPage() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const [detail, setDetail] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add note form
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [submitting, setSubmitting] = useState(false);

  // Status management
  const [showStatusSelect, setShowStatusSelect] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [mutationLoading, setMutationLoading] = useState(false);

  // Confirmation modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Pending on
  const [pendingOn, setPendingOn] = useState('');

  // Video status
  const [showVideoSelect, setShowVideoSelect] = useState(false);

  const { role } = useAuth();
  const isManagement = role === 'ceo' || role === 'admin' || role === 'leader';

  const load = useCallback(async (silent = false) => {
    if (!complaintId) return;
    try {
      if (!silent) setLoading(true);
      const data = await fetchComplaintDetail(complaintId);
      setDetail(data);
      setPendingOn(data?.pending_on || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, [load]);

  // ─── Add interaction ───
  const handleAddNote = async () => {
    if (!complaintId || !noteContent.trim()) return;
    try {
      setSubmitting(true);
      await addComplaintInteraction({
        p_complaint_id: complaintId,
        p_interaction_type: noteType,
        p_content: noteContent,
      });
      setNoteContent('');
      setSuccess('Interaction added.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add interaction');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Update status ───
  const handleStatusUpdate = async (newStatus: string) => {
    if (!complaintId) return;
    try {
      setStatusUpdating(true);
      await updateComplaintStatus({
        p_complaint_id: complaintId,
        p_new_status: newStatus,
        p_pending_on: pendingOn || null,
      });
      setShowStatusSelect(false);
      setSuccess(`Status updated to ${statusLabel(newStatus)}`);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // ─── Escalate to management ───
  const handleEscalate = async () => {
    if (!complaintId) return;
    try {
      setStatusUpdating(true);
      await updateComplaintStatus({
        p_complaint_id: complaintId,
        p_new_status: detail?.complaint_status || 'open',
        p_pending_on: 'management',
      });
      setSuccess('Escalated to management.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to escalate');
    } finally {
      setStatusUpdating(false);
    }
  };

  // ─── Direct RPC Actions (Management Only) ───
  const handleCloseComplaint = async () => {
    if (!complaintId) return;
    try {
      setMutationLoading(true);
      const { error: rpcError } = await supabase.rpc('cs_update_complaint_status', {
        p_complaint_id: complaintId,
        p_new_status: 'closed',
      });
      if (rpcError) throw rpcError;
      setShowCloseModal(false);
      setShowStatusSelect(false);
      setSuccess('Complaint has been closed.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close complaint');
    } finally {
      setMutationLoading(false);
    }
  };

  const handleRejectComplaint = async () => {
    if (!complaintId) return;
    try {
      setMutationLoading(true);
      const { error: rpcError } = await supabase.rpc('cs_update_complaint_status', {
        p_complaint_id: complaintId,
        p_new_status: 'rejected',
      });
      if (rpcError) throw rpcError;
      setShowRejectModal(false);
      setShowStatusSelect(false);
      setSuccess('Complaint has been rejected.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject complaint');
    } finally {
      setMutationLoading(false);
    }
  };

  // ─── Update video status ───
  const handleVideoStatusUpdate = async (newVideoStatus: string) => {
    if (!complaintId) return;
    try {
      await updateComplaintVideoStatus({
        p_complaint_id: complaintId,
        p_video_status: newVideoStatus,
      });
      setShowVideoSelect(false);
      setSuccess('Video status updated.');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update video status');
    }
  };

  if (loading) {
    return <DashboardLayout title="Complaint Detail"><Spinner /></DashboardLayout>;
  }

  if (!detail) {
    return (
      <DashboardLayout title="Complaint Detail">
        {error && <Banner type="error" message={error} onDismiss={() => setError(null)} />}
        <div className="empty-state">
          <AlertCircle />
          <h3>Complaint not found</h3>
        </div>
      </DashboardLayout>
    );
  }

  const interactions = detail.interactions || [];
  const transitions = getComplaintTransitions(detail.complaint_status, 'customer_service');
  // Filter out closed/rejected for CS agents
  const csTransitions = transitions.filter((t) => t !== 'closed' && t !== 'rejected');

  const pendingOptions = ['cs', 'operations', 'contracts', 'customer', 'management'];
  const videoStatuses = ['none', 'on_hold', 'released', 'archived'];

  return (
    <DashboardLayout title="Complaint Detail">
      {error && <Banner type="error" message={error} onDismiss={() => setError(null)} autoDismissMs={4000} />}
      {success && <Banner type="success" message={success} onDismiss={() => setSuccess(null)} autoDismissMs={3000} />}

      {/* ─── Close Complaint Modal ─── */}
      {showCloseModal && (
        <Modal
          title="Close Complaint"
          onClose={() => setShowCloseModal(false)}
          footer={
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCloseModal(false)}
                disabled={mutationLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#1a7a4a', color: '#fff' }}
                onClick={handleCloseComplaint}
                disabled={mutationLoading}
              >
                {mutationLoading ? 'Closing…' : 'Confirm Close'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#c9a84c" />
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
              This complaint will be <strong>permanently closed</strong>. This action cannot be undone.
              All evidence locks will be preserved for records.
            </p>
          </div>
        </Modal>
      )}

      {/* ─── Reject Complaint Modal ─── */}
      {showRejectModal && (
        <Modal
          title="Reject Complaint"
          onClose={() => setShowRejectModal(false)}
          footer={
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowRejectModal(false)}
                disabled={mutationLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--color-danger)', color: '#fff' }}
                onClick={handleRejectComplaint}
                disabled={mutationLoading}
              >
                {mutationLoading ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '8px 0', textAlign: 'center' }}>
            <AlertTriangle size={36} color="var(--color-danger)" />
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
              This complaint will be marked as <strong>rejected</strong>. Please ensure you have reviewed
              all evidence before rejecting.
            </p>
          </div>
        </Modal>
      )}

      <div className="two-col-wide">
        {/* ─── LEFT: Timeline ─── */}
        <div>
          {/* Complaint Text */}
          <div className="info-card" style={{ marginBottom: 24 }}>
            <div className="info-card-header">Complaint</div>
            <div className="info-card-body">
              <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {detail.complaint_text}
              </p>
            </div>
          </div>

          {/* Interaction Timeline */}
          <div className="section-header">
            <h3 className="section-title">Timeline ({interactions.length})</h3>
          </div>

          {interactions.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <Clock />
              <p>No interactions yet.</p>
            </div>
          ) : (
            <div className="timeline">
              {interactions.map((ix) => (
                <div className="timeline-item" key={ix.id}>
                  <div className={`timeline-dot ${ix.interaction_type}`} />
                  <div className="timeline-content">
                    <div className="timeline-meta">
                      <span className="timeline-author">{ix.created_by_name}</span>
                      <span className="timeline-date">{formatDateTime(ix.created_at)}</span>
                    </div>
                    <div className="timeline-type">{statusLabel(ix.interaction_type)}</div>
                    <div className="timeline-text">{ix.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Note Form */}
          <div className="info-card" style={{ marginTop: 24 }}>
            <div className="info-card-header">Add Interaction</div>
            <div className="info-card-body">
              <div className="form-group">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write your note…"
                  style={{ minHeight: 80 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                    background: 'var(--color-bg)',
                  }}
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="escalation">Escalation</option>
                </select>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddNote}
                  disabled={submitting || !noteContent.trim()}
                >
                  <Send size={14} />
                  {submitting ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Info Panel ─── */}
        <div>
          {/* Complaint Info */}
          <div className="info-card" style={{ marginBottom: 16 }}>
            <div className="info-card-header">Details</div>
            <div className="info-card-body">
              <div className="info-row">
                <span className="info-label"><User size={14} style={{ marginRight: 4 }} />Customer</span>
                <span className="info-value">{detail.customer_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label"><Car size={14} style={{ marginRight: 4 }} />Vehicle</span>
                <span className="info-value">{detail.license_plate}</span>
              </div>
              {detail.session_code && (
                <div className="info-row">
                  <span className="info-label"><Hash size={14} style={{ marginRight: 4 }} />Session</span>
                  <span className="info-value" style={{ fontFamily: 'monospace' }}>{detail.session_code}</span>
                </div>
              )}
              <div className="info-row">
                <span className="info-label">Priority</span>
                <span className={`badge badge-${detail.priority}`}>{detail.priority}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Type</span>
                <span className="info-value">{statusLabel(detail.type)}</span>
              </div>
              <div className="info-row">
                <span className="info-label"><Clock size={14} style={{ marginRight: 4 }} />Created</span>
                <span className="info-value">{formatDateTime(detail.created_at)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Updated</span>
                <span className="info-value">{formatDateTime(detail.updated_at)}</span>
              </div>

              {/* Evidence Lock */}
              <div className="info-row">
                <span className="info-label"><Shield size={14} style={{ marginRight: 4 }} />Evidence Lock</span>
                <span className={`badge ${detail.evidence_lock_enabled ? 'badge-urgent' : 'badge-low'}`}>
                  {detail.evidence_lock_enabled ? 'Locked' : 'Unlocked'}
                </span>
              </div>

              {/* Video Status */}
              <div className="info-row">
                <span className="info-label"><Video size={14} style={{ marginRight: 4 }} />Video Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge badge-${detail.video_status || 'low'}`}>
                    {statusLabel(detail.video_status || 'none')}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: '2px 8px', fontSize: 11 }}
                    onClick={() => setShowVideoSelect(!showVideoSelect)}
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>
              {showVideoSelect && (
                <div className="status-select-group" style={{ marginTop: 8 }}>
                  {videoStatuses.map((vs) => (
                    <button
                      key={vs}
                      className="status-option"
                      onClick={() => handleVideoStatusUpdate(vs)}
                    >
                      {statusLabel(vs)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Management */}
          <div className="info-card" style={{ marginBottom: 16 }}>
            <div className="info-card-header">Status Management</div>
            <div className="info-card-body">
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Current Status</span>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge badge-${detail.complaint_status}`} style={{ fontSize: 13, padding: '5px 14px' }}>
                    {statusLabel(detail.complaint_status)}
                  </span>
                </div>
              </div>

              {detail.complaint_status === 'closed' ? (
                <div style={{ marginTop: 16 }}>
                  <span className="badge badge-closed" style={{ filter: 'grayscale(100%)', display: 'block', textAlign: 'center', padding: '8px', opacity: 0.8, background: '#333', color: '#fff', borderRadius: '4px', border: '1px solid #555' }}>
                    CLOSED
                  </span>
                </div>
              ) : (
                <>
                  {/* Pending On */}
                  <div className="form-group">
                    <label>Pending On</label>
                    <select
                      value={pendingOn}
                      onChange={(e) => setPendingOn(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius)',
                        fontSize: 13,
                        background: 'var(--color-bg)',
                        width: '100%',
                      }}
                    >
                      <option value="">None</option>
                      {pendingOptions.map((p) => (
                        <option key={p} value={p}>{statusLabel(p)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Update Status */}
                  {csTransitions.length > 0 && (
                    <>
                      <button
                        className="btn btn-primary btn-sm btn-full"
                        onClick={() => setShowStatusSelect(!showStatusSelect)}
                        style={{ marginBottom: 8 }}
                      >
                        Update Status <ChevronDown size={14} />
                      </button>
                      {showStatusSelect && (
                        <div className="status-select-group">
                          {csTransitions.map((s) => (
                            <button
                              key={s}
                              className="status-option"
                              onClick={() => handleStatusUpdate(s)}
                              disabled={statusUpdating}
                            >
                              <span className={`badge badge-${s}`}>{statusLabel(s)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Escalate button — Non-Management only */}
                  {!isManagement && detail.complaint_status === 'resolved' && (
                    <button
                      className="btn btn-danger btn-sm btn-full"
                      onClick={handleEscalate}
                      disabled={statusUpdating}
                      style={{ marginTop: 12 }}
                    >
                      Escalate to Manager
                    </button>
                  )}

                  {/* Management Direct Actions */}
                  {isManagement && detail.complaint_status === 'resolved' && (
                    <button
                      className="btn btn-sm btn-full"
                      onClick={() => setShowCloseModal(true)}
                      disabled={statusUpdating || mutationLoading}
                      style={{ marginTop: 12, background: '#1a7a4a', color: '#fff' }}
                    >
                      Close Complaint
                    </button>
                  )}

                  {isManagement && (detail.complaint_status === 'resolved' || detail.complaint_status === 'investigating') && (
                    <button
                      className="btn btn-danger btn-sm btn-full"
                      onClick={() => setShowRejectModal(true)}
                      disabled={statusUpdating || mutationLoading}
                      style={{ marginTop: 12 }}
                    >
                      Reject Complaint
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
