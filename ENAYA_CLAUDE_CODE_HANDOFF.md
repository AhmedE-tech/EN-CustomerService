# ENAYA DASHBOARDS — CLAUDE CODE HANDOFF
**Last Updated:** April 2026 | **For:** Claude Code (MCP + Supabase access)

---

## WHAT YOU ARE WORKING WITH

Two separate React dashboards backed by a single Supabase project.

| Dashboard | Folder | URL | Port |
|-----------|--------|-----|------|
| Admin Dashboard | `g:/Programing/AdminDashboard/` | enaya-dashboard.vercel.app | 5173 |
| CS Dashboard | `g:/Programing/CSDashboard/` | (separate Vercel deploy) | 5174 |

**Supabase project:** `mheqnihymtlyljqhxmro` (carwash-app)

---

## TECH STACK (BOTH PROJECTS)

- React 19 + TypeScript + Vite + React Router v7
- **Pure vanilla CSS — NO Tailwind.** Branding: ivory background, dark navy sidebar (`#1E2235`), gold accents (`#8B6914`)
- Supabase JS client (`src/lib/supabase.ts`)
- All DB access via **SECURITY DEFINER RPCs** — never direct table queries for sensitive data
- Icons: `lucide-react` only
- No other UI libraries

---

## ROLES — READ THIS CAREFULLY

The `user_role_enum` in Supabase has exactly these values:
```
client | agent | supervisor | ceo | leader | customer_service | accounting
```

| DB Enum Value | Display Label | Dashboard Access |
|---------------|---------------|-----------------|
| `ceo` | CEO | Admin Dashboard (full) + CS Dashboard |
| `leader` | Operational Admin | Admin Dashboard (limited — no financials) |
| `supervisor` | Supervisor | Supervisor mobile app only |
| `agent` | Agent | Agent mobile app only |
| `customer_service` | Customer Service | CS Dashboard only |
| `accounting` | Accounting | Admin Dashboard (limited) |
| `client` | Client | Client mobile app only |

**CRITICAL:** `leader` ≠ `supervisor`. They are completely separate roles. Never merge them.
**CRITICAL:** In UI, always display `leader` as "Operational Admin". The enum value `leader` never changes.

---

## SUPABASE KEY FACTS

### PostgREST Cache Issue (happens often during dev)
**Symptom:** "Could not find function X in schema cache"
**Fix:** Go to Supabase → Settings → API → Reload schema cache
**OR run:** `NOTIFY pgrst, 'reload schema';`
**Prevention:** Always `DROP FUNCTION IF EXISTS` before recreating with changed parameters. Never just `CREATE OR REPLACE` when the parameter list changes.

### Auth Pattern
```typescript
// Get current user in frontend
const { data: { user } } = await supabase.auth.getUser();

// RLS: all sensitive RPCs check auth.uid() internally
// Never pass user ID as a parameter you get from localStorage — always from supabase.auth
```

### RPC Call Pattern
```typescript
const { data, error } = await supabase.rpc('function_name', {
  p_param1: value1,
  p_param2: value2,
});
if (error) throw error;
```

---

## DATABASE — KEY TABLES

### Core Tables (built by original developer "Shajib")
| Table | Purpose |
|-------|---------|
| `users` | All system users — role stored here |
| `customers` | Client profiles |
| `service_units` | Vehicles — `status`: pending_approval / active / inactive |
| `subscriptions` | Client plans — `status`: pending / active / expired / cancelled |
| `sessions` | Individual wash sessions — linked via `session_groups.agent_id` for agent |
| `session_groups` | Groups of sessions assigned to an agent per day |
| `agents` | Agent profiles — code format: `ENY-AG-001` |
| `supervisors` | Supervisor profiles — code format: `ENY-SUP-001` |
| `complaints` | Formal complaints |
| `support_tickets` | CS support tickets |
| `collections` | Payment collection records |
| `service_unit_qr_codes` | QR sticker inventory |
| `service_unit_qr_scan_logs` | QR scan audit trail |
| `admin_service_unit_qr_codes` | Pre-built admin view (join with client info) |

### Tables Built During This Project
| Table | Purpose |
|-------|---------|
| `session_addons` | Extra services linked to `session_id` (NOT subscription) |
| `supervisor_requests` | Field exception requests from supervisors |
| `subscription_freezes` | Account freeze requests |
| `session_ratings` | Client ratings 1–5 stars |
| `service_catalog` | Add-on service types (SRV-TRUNK, SRV-ENGINE, etc.) |
| `complaint_interactions` | CS action log on complaints |
| `activity_logs` | Admin activity feed |
| `reschedule_requests` | Session reschedule requests from clients |
| `service_unit_change_requests` | Vehicle add/edit/remove requests |

### Important Column Notes
- `sessions`: agent linked via `session_groups.agent_id` — NOT `completed_by_agent_id` (often null)
- `subscriptions`: has `status` column — no `payment_status` column
- `reschedule_requests`: uses `requested_at` not `created_at`
- `service_unit_change_requests`: `change_type` values: `new_vehicle` / `update` / `remove` / `transfer`

---

## KEY RPCs — ADMIN DASHBOARD

| RPC | Purpose | Auth Required |
|-----|---------|--------------|
| `get_pending_approvals()` | All pending: reschedules, vehicle changes, addons, supervisor requests | ceo / leader |
| `admin_review_vehicle_change(p_request_id, p_decision, p_admin_id)` | Approve/reject vehicle change | ceo / leader |
| `process_reschedule_request(p_request_id, p_decision)` | Approve/reject reschedule | ceo / leader |
| `process_addon_request(p_request_id, p_decision)` | Approve/reject add-on | ceo / leader |
| `process_supervisor_request(p_request_id, p_decision)` | Approve/reject supervisor req | ceo / leader |
| `process_freeze_request(p_freeze_id, p_decision)` | Approve/reject freeze | ceo / leader |
| `admin_create_user(p_email, p_password, p_full_name, p_phone, p_role)` | Create any staff user | ceo only |
| `get_all_users()` | All staff users list | ceo / leader |
| `get_pending_approvals()` | Approvals inbox | ceo / leader |
| `get_qr_inventory()` | QR sticker list | ceo / leader |
| `get_qr_scan_logs()` | QR scan history | ceo / leader |
| `get_qr_eligible_vehicles()` | Vehicles that can get QR | ceo |
| `get_collections()` | Financial collections | ceo only |
| `get_session_ratings()` | All session ratings | ceo / leader |
| `get_complaints_overview()` | Complaints summary | ceo only |
| `flag_session_rating(p_rating_id)` | Flag a rating | ceo |
| `get_export_subscriptions()` | ERP export data | ceo only |
| `get_export_additional_services()` | ERP export data | ceo only |
| `get_export_collections()` | ERP export data | ceo only |
| `get_activity_feed()` | Activity center feed | ceo / leader |
| `fetch_leader_today_operations()` | Today's ops for leader | leader / ceo |
| `fetch_leader_live_monitoring()` | Live monitoring for leader | leader / ceo |
| `fetch_leader_agent_roster()` | Agent list for leader | leader / ceo |

### QR Functions (call originals directly — bypass wrapper cache issue)
```typescript
create_service_unit_qr_code(...)
activate_service_unit_qr_code({ p_qr_code_id: id })
suspend_service_unit_qr_code({ p_qr_code_id: id, p_notes: null })
revoke_service_unit_qr_code({ p_qr_code_id: id, p_notes: null })
replace_service_unit_qr_code({ p_old_qr_code_id: id, p_new_public_qr_id: null, p_notes: null })
```

---

## KEY RPCs — CS DASHBOARD

| RPC | Purpose |
|-----|---------|
| `get_cs_queue()` | Open complaints queue for CS |
| `cs_search_clients(p_query)` | Search clients by name/phone/plate |
| `get_cs_client_profile(p_customer_id)` | Full client profile with vehicles, subs, sessions, complaints |
| `cs_open_complaint(...)` | Open new complaint from CS |
| `cs_open_ticket(...)` | Open new support ticket from CS |
| `cs_update_ticket_status(p_ticket_id, p_status)` | Update ticket status |
| `get_cs_complaint_detail(p_complaint_id)` | Full complaint detail |
| `cs_add_complaint_interaction(...)` | Add note/action to complaint |
| `cs_escalate_complaint(p_complaint_id)` | Escalate complaint |
| `cs_resolve_complaint(p_complaint_id, p_resolution)` | Resolve complaint |

---

## ADMIN DASHBOARD — PAGES & ROUTES

| Route | Page | Access |
|-------|------|--------|
| `/admin` | Overview | ceo / leader |
| `/admin/users` | User Management | ceo only |
| `/admin/customers` | Customers | ceo / leader |
| `/admin/vehicles` | Vehicles | ceo / leader |
| `/admin/subscriptions` | Subscriptions | ceo / leader |
| `/admin/sessions` | Sessions | ceo / leader |
| `/admin/activity` | Activity Center | ceo / leader |
| `/admin/agents` | Agent Management | ceo / leader |
| `/admin/supervisor` | Supervisors | ceo / leader |
| `/admin/grouping` | Next-Day Grouping | ceo / leader |
| `/admin/operations` | Today Operations | ceo / leader |
| `/admin/live` | Live Monitoring | ceo / leader |
| `/admin/supervisors-today` | Today's Supervisors | ceo / leader |
| `/admin/approvals` | Approvals Inbox | ceo / leader |
| `/admin/addons` | Add-on Services | ceo / leader |
| `/admin/schedule-changes` | Schedule Changes | ceo / leader |
| `/admin/collections` | Collections | **ceo only** |
| `/admin/agent-progress` | Agent Progress | ceo / leader |
| `/admin/qr-inventory` | QR Inventory | ceo / leader |
| `/admin/qr-logs` | QR Scan Logs | ceo / leader |
| `/admin/ratings` | Ratings | ceo / leader |
| `/admin/complaints` | Complaints Overview | **ceo only** |
| `/admin/exports` | ERP Exports | **ceo only** |

### Leader Sidebar (limited — no financials)
Sessions, Today Operations, Live Monitoring, Agent Progress, Next-Day Grouping, Agent Management, Supervisor, Today's Supervisors, QR Scan Logs, Ratings, Activity Center

---

## CS DASHBOARD — PAGES & ROUTES

| Route | Page |
|-------|------|
| `/queue` | Complaints Queue (default after login) |
| `/clients` | Client Search |
| `/clients/:customerId` | Client Profile |
| `/complaints` | Complaints List |
| `/complaints/:complaintId` | Complaint Detail |
| `/tickets` | Support Tickets |
| `/operational-requests` | Operational Requests |

**CS Login rule:** Only `customer_service` role can log in. `ceo` can also log in for oversight.

---

## USER MANAGEMENT — CODE FORMATS

When `admin_create_user` creates a user:
- Agent code: `ENY-AG-001`, `ENY-AG-002`... (sequential, padded to 3 digits)
- Supervisor code: `ENY-SUP-001`, `ENY-SUP-002`... (sequential, padded to 3 digits)
- Leader/CEO/CS/Accounting: no code assigned

---

## APPROVALS FLOW

Every client action that changes operational state creates TWO records:
1. The entity record (vehicle, subscription etc.) with `status = 'pending'`
2. A request record in the corresponding requests table

| Client Action | Request Table | Dashboard Location |
|---------------|--------------|-------------------|
| New/edit/remove vehicle | `service_unit_change_requests` | Approvals > Vehicle Changes |
| Reschedule session | `reschedule_requests` | Approvals > Reschedule Requests |
| Freeze subscription | `subscription_freezes` | Schedule Changes page |
| Add-on service | `session_addons` | Approvals > Add-on Requests |
| Support ticket | `support_tickets` | CS Dashboard |
| Complaint | `complaints` | CS Dashboard |

`get_pending_approvals()` returns JSON with keys: `reschedules`, `vehicle_changes`, `addons`, `supervisor_requests`
Each item has `request_id` (not `id`) — already mapped in the RPC.

---

## KNOWN ISSUES / WATCH OUT

1. **`is_admin()` function** — checks `ceo` and `leader` roles. If you see "not_authorized" from an RPC, check if it calls `is_admin()` and whether the role check includes both `ceo` and `leader`.

2. **PostgREST cache** — if you create a new function and get "not found in schema cache", reload the schema cache from Supabase Settings → API.

3. **Session agent link** — always join via `session_groups.agent_id`, never use `sessions.completed_by_agent_id` (often null).

4. **`reschedule_requests`** — uses `requested_at` not `created_at`.

5. **Freeze approval flow** — between CS and Admin is not fully closed. Known low-priority issue.

6. **Financials** — NEVER show financial amounts (EGP, prices, amounts) to `leader` role. Collections and Exports pages are CEO only.

7. **Africa/Cairo timezone** — all operational dates must use this timezone. Function `get_business_date_cairo()` exists for this.

---

## BUSINESS RULES

- Sessions are only generated AFTER a subscription is activated by admin
- Dispatching only works for CONFIRMED sessions
- 12-hour rule: clients cannot reschedule within 12 hours of session
- 7-step session flow: En Route → QR Scan → GPS Lock → Before Photos → Live Wash → After Photos → Completed
- Live streaming uses Agora SDK
- Add-ons MUST link to `session_id` — never to subscription or plan
- QR sticker format: `EN-[numeric]-[random letters]` e.g. `EN-10245-QXM`
