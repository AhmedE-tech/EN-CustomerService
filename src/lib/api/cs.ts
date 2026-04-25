/* ===== ENAYA CS — API LAYER ===== */
import { supabase } from '../supabase';
import type {
  QueueItem,
  ClientSearchResult,
  ClientProfile,
  ComplaintDetail,
  ComplaintRow,
  TicketRow,
  OperationalRequest,
  ClientSessionOption,
} from '../types';

// ────────────────────────────────────────
// Queue
// ────────────────────────────────────────
export async function fetchQueue(): Promise<QueueItem[]> {
  const { data, error } = await supabase.rpc('get_cs_queue');
  if (error) throw error;
  return (data || []) as QueueItem[];
}

// ────────────────────────────────────────
// Client Search
// ────────────────────────────────────────
export async function searchClients(query: string): Promise<ClientSearchResult[]> {
  const { data, error } = await supabase.rpc('cs_search_clients', { p_query: query });
  if (error) throw error;
  return (data || []) as ClientSearchResult[];
}

// ────────────────────────────────────────
// Client Profile
// ────────────────────────────────────────
export async function fetchClientProfile(customerId: string): Promise<ClientProfile> {
  const { data, error } = await supabase.rpc('get_cs_client_profile', { p_customer_id: customerId });
  if (error) throw error;
  return data as ClientProfile;
}

// ────────────────────────────────────────
// Complaints — full list
// ────────────────────────────────────────
export async function fetchAllComplaints(): Promise<ComplaintRow[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select(`
      id, priority, complaint_status, complaint_text, type,
      created_at, updated_at, evidence_lock_enabled, video_status,
      customer:customer_id(full_name),
      vehicle:vehicle_id(license_plate),
      session:service_job_id(session_code),
      assigned_agent:assigned_to(full_name)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ComplaintRow[];
}

// ────────────────────────────────────────
// Complaint Detail
// ────────────────────────────────────────
export async function fetchComplaintDetail(complaintId: string): Promise<ComplaintDetail> {
  const { data, error } = await supabase.rpc('get_complaint_detail', { p_complaint_id: complaintId });
  if (error) throw error;
  return data as ComplaintDetail;
}

// ────────────────────────────────────────
// Complaint actions
// ────────────────────────────────────────
export async function addComplaintInteraction(params: {
  p_complaint_id: string;
  p_interaction_type: string;
  p_content: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_add_complaint_interaction', params);
  if (error) throw error;
}

export async function updateComplaintStatus(params: {
  p_complaint_id: string;
  p_new_status: string;
  p_pending_on?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_update_complaint_status', params);
  if (error) throw error;
}

export async function updateComplaintVideoStatus(params: {
  p_complaint_id: string;
  p_video_status: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_update_complaint_video_status', params);
  if (error) throw error;
}

// ────────────────────────────────────────
// Open new complaint from client profile
// ────────────────────────────────────────
export async function openComplaint(params: {
  p_customer_id: string;
  p_complaint_text: string;
  p_type: string;
  p_priority: string;
  p_vehicle_id: string;
  p_service_job_id?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('cs_open_complaint', params);
  if (error) throw error;
  return data as string;
}

// ────────────────────────────────────────
// Tickets
// ────────────────────────────────────────
export async function fetchAllTickets(): Promise<TicketRow[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      id, subject, message, status, priority, category,
      channel, created_at, resolved_at,
      customer:user_id(full_name, phone_number),
      assigned_agent:assigned_to(full_name)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as TicketRow[];
}

export async function openTicket(params: {
  p_customer_id: string;
  p_subject: string;
  p_message: string;
  p_priority: string;
  p_category: string;
  p_channel: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_open_ticket', params);
  if (error) throw error;
}

export async function updateTicketStatus(params: {
  p_ticket_id: string;
  p_new_status: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_update_ticket_status', params);
  if (error) throw error;
}

// ────────────────────────────────────────
// Operational Requests
// ────────────────────────────────────────

export async function fetchClientSessions(customerId: string): Promise<ClientSessionOption[]> {
  const { data, error } = await supabase.rpc('cs_get_client_sessions', { p_customer_id: customerId });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as ClientSessionOption[];
}

export async function submitRescheduleRequest(params: {
  session_id: string;
  new_date: string;
  new_time?: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_submit_reschedule_request', {
    p_session_id: params.session_id,
    p_new_date: params.new_date,
    p_new_time: params.new_time || null,
    p_reason: params.reason,
  });
  if (error) throw new Error(
    error.message === 'session_not_found_or_not_scheduled'
      ? 'Selected session is no longer available for rescheduling.'
      : error.message
  );
}

export async function submitFreezeRequest(params: {
  customer_id: string;
  start_date: string;
  end_date: string;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_submit_freeze_request', {
    p_customer_id: params.customer_id,
    p_start_date: params.start_date,
    p_end_date: params.end_date,
    p_reason: params.reason,
  });
  if (error) throw new Error(
    error.message === 'no_active_subscription_found_for_customer'
      ? 'This customer has no active subscription to freeze.'
      : error.message
  );
}

export async function submitVehicleChangeRequest(params: {
  customer_id: string;
  change_type: string;
  requested_changes: Record<string, string>;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.rpc('cs_submit_vehicle_change_request', {
    p_customer_id: params.customer_id,
    p_change_type: params.change_type,
    p_requested_changes: params.requested_changes,
    p_reason: params.reason,
  });
  if (error) throw new Error(
    error.message === 'no_active_vehicle_found_for_customer'
      ? 'This customer has no active vehicle on record.'
      : error.message
  );
}

export async function fetchOperationalRequests(): Promise<OperationalRequest[]> {
  const { data, error } = await supabase.rpc('cs_get_operational_requests');
  if (error) throw error;

  const rows: OperationalRequest[] = (Array.isArray(data) ? data : []).map((r: any) => ({
    id: r.id as string,
    type: r.type as string,
    status: r.status as string,
    reason: (r.reason as string) || '',
    created_at: r.created_at as string,
    customer_name: (r.customer_name as string) || 'Unknown',
  }));

  return rows;
}
