/* ===== ENAYA CS DASHBOARD — TYPE DEFINITIONS ===== */

// ---------- Auth ----------
export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

// ---------- Queue ----------
export interface QueueItem {
  id: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  complaint_status: string;
  complaint_text: string;
  type: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  license_plate: string;
  session_code: string | null;
  assigned_to_name: string | null;
  pending_on: string | null;
  evidence_lock_enabled: boolean;
  video_status: string | null;
}

// ---------- Client Search ----------
export interface ClientSearchResult {
  id: string;
  full_name: string;
  phone_number: string;
  plates: string[];
}

// ---------- Client Profile ----------
export interface ClientProfile {
  id: string;
  full_name: string;
  phone_number: string;
  created_at: string;
  vehicles: ClientVehicle[];
  subscriptions: ClientSubscription[];
  sessions?: ClientSession[];
  recent_sessions?: ClientSession[];
  complaints: ClientComplaint[];
  tickets: ClientTicket[];
}

export interface ClientVehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  address: string | null;
}

export interface ClientSubscription {
  id: string;
  plan_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  sessions_used: number;
  sessions_total: number;
}

export interface ClientSession {
  id: string;
  session_code: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  wash_type: string | null;
  license_plate: string;
}

export interface ClientComplaint {
  id: string;
  priority: string;
  complaint_status: string;
  complaint_text: string;
  type: string;
  created_at: string;
}

export interface ClientTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
}

// ---------- Complaint Detail ----------
export interface ComplaintDetail {
  id: string;
  priority: string;
  complaint_status: string;
  complaint_text: string;
  type: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_id: string;
  license_plate: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  session_code: string | null;
  assigned_to_name: string | null;
  pending_on: string | null;
  evidence_lock_enabled: boolean;
  video_status: string | null;
  interactions: ComplaintInteraction[];
}

export interface ComplaintInteraction {
  id: string;
  interaction_type: string;
  content: string;
  created_by_name: string;
  created_at: string;
}

// ---------- Complaints List ----------
export interface ComplaintRow {
  id: string;
  priority: string;
  complaint_status: string;
  complaint_text: string;
  type: string;
  created_at: string;
  updated_at: string;
  evidence_lock_enabled: boolean;
  video_status: string | null;
  customer: { full_name: string } | null;
  vehicle: { license_plate: string } | null;
  session: { session_code: string } | null;
  assigned_agent: { full_name: string } | null;
}

// ---------- Tickets ----------
export interface TicketRow {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string;
  channel: string;
  created_at: string;
  resolved_at: string | null;
  customer: { full_name: string; phone_number: string } | null;
  assigned_agent: { full_name: string } | null;
}

// ---------- Operational Requests ----------
export interface OperationalRequest {
  id: string;
  type: 'reschedule' | 'freeze' | 'vehicle_change' | 'other';
  status: string;
  reason: string;
  created_at: string;
  customer_name: string;
}

export interface ClientSessionOption {
  session_id: string;
  session_code: string;
  scheduled_date: string;
  scheduled_time: string | null;
}
