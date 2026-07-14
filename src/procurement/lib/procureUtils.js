// ═══════════════════════════════════════════════════════════════════
// procureUtils.js — constants & pure helpers for the Procure module
// ═══════════════════════════════════════════════════════════════════
// No React, no Supabase imports — pure functions only.
// Consumers: ProcureHub, RequisitionsTab, ApprovalQueueTab, AuditLogTab

// ─── Role constants (mirror DB enum procure.role_kind) ────────────
export const ROLES = {
  OPERATOR:            'operator',
  DEPT_HEAD:           'dept_head',
  PROCUREMENT_OFFICER: 'procurement_officer',
  DEPUTY_OFFICER:      'deputy_officer',
  APPROVER_MID:        'approver_mid',
  APPROVER_HIGH:       'approver_high',
  WAREHOUSE_KEEPER:    'warehouse_keeper',
  FINANCE_OFFICER:     'finance_officer',
  AUDITOR:             'auditor',
  OWNER:               'owner',
};

// ─── Status meta ───────────────────────────────────────────────────
export const REQ_STATUS = {
  draft:             { label: 'Draft',             color: '#8892b0' },
  submitted:         { label: 'Submitted',         color: '#3b82f6' },
  dept_approved:     { label: 'Dept approved',     color: '#a78bfa' },
  in_procurement:    { label: 'In procurement',    color: '#22d3ee' },
  pending_approval:  { label: 'Pending approval',  color: '#f59e0b' },
  approved:          { label: 'Approved',          color: '#10b981' },
  rejected:          { label: 'Rejected',          color: '#ef4444' },
  cancelled:         { label: 'Cancelled',         color: '#6b7280' },
  fulfilled:         { label: 'Fulfilled',         color: '#34d399' },
};

// ─── Role groups for tab visibility ────────────────────────────────
export function canSeeRequisitions(roles) {
  // Anyone with any procurement role can see requisitions (filtered by RLS)
  return roles && roles.length > 0;
}
export function canSeeApprovalQueue(roles) {
  return hasAnyRole(roles, [
    ROLES.DEPT_HEAD, ROLES.APPROVER_MID, ROLES.APPROVER_HIGH,
    ROLES.OWNER, ROLES.AUDITOR,
  ]);
}
export function canSeeVendors(roles) {
  return hasAnyRole(roles, [
    ROLES.PROCUREMENT_OFFICER, ROLES.DEPUTY_OFFICER,
    ROLES.FINANCE_OFFICER, ROLES.OWNER, ROLES.AUDITOR,
  ]);
}
export function canSeeAuditLog(roles) {
  return hasAnyRole(roles, [ROLES.OWNER, ROLES.AUDITOR]);
}
export function canCreateRequisition(roles) {
  return hasAnyRole(roles, [
    ROLES.OPERATOR, ROLES.DEPT_HEAD,
    ROLES.OWNER,
  ]);
}
export function isApprover(roles) {
  return hasAnyRole(roles, [ROLES.DEPT_HEAD, ROLES.APPROVER_MID, ROLES.APPROVER_HIGH]);
}

function hasAnyRole(roles, needed) {
  if (!roles || !roles.length) return false;
  return roles.some(r => needed.includes(r.role));
}

// ─── Format helpers ────────────────────────────────────────────────
export function formatEUR(n) {
  const v = Number(n) || 0;
  return '€' + v.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatDate(s) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Generate human-readable req_no ────────────────────────────────
// Format: REQ-YYYY-NNNN (zero-padded sequence per year)
// Returns: Promise<string>
export async function nextRequisitionNumber(supabase) {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const { data, error } = await supabase
    .schema('procure')
    .from('requisitions')
    .select('req_no')
    .like('req_no', `${prefix}%`)
    .order('req_no', { ascending: false })
    .limit(1);
  if (error) throw error;
  let next = 1;
  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].req_no.slice(prefix.length), 10);
    if (!isNaN(lastNum)) next = lastNum + 1;
  }
  return prefix + String(next).padStart(4, '0');
}

// ─── Resolve which approval chain applies to a given req ───────────
// Picks chain matching property + department + amount band.
// Falls back to property=null OR department=null (defaults).
export async function resolveApprovalChain(supabase, { propertyId, departmentId, amount }) {
  const { data, error } = await supabase
    .schema('procure')
    .from('approval_chains')
    .select(`
      id, property_id, department_id, amount_min, amount_max,
      approval_chain_steps ( step_order, approver_role, approver_user_id, sla_hours )
    `)
    .lte('amount_min', amount)
    .eq('is_active', true);
  if (error) throw error;
  if (!data) return null;

  // Filter by amount band (amount_max NULL = no upper)
  const candidates = data.filter(c =>
    c.amount_max == null || amount < Number(c.amount_max)
  );

  // Prefer most specific: matching both property + dept, then property, then dept, then global
  const score = c => (
    (c.property_id === propertyId ? 2 : (c.property_id == null ? 0 : -10)) +
    (c.department_id === departmentId ? 2 : (c.department_id == null ? 0 : -10))
  );
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0] || null;
}
