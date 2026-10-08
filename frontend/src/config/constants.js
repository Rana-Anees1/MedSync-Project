export const HOSPITAL = {
  name: 'MedSync Hospital',
  department: 'Department of General Surgery',
};

export const ROLES = {
  SURGEON: 'surgeon',
  ANAESTHETIST: 'anaesthetist',
  COORDINATOR: 'coordinator',
  PATIENT: 'patient',
  ADMIN: 'admin',
};

export const ROLE_LABELS = {
  surgeon: 'Surgeon',
  anaesthetist: 'Anaesthetist',
  coordinator: 'Nurse / Pre-op Coordinator',
  patient: 'Patient',
  admin: 'System Administrator',
};

export const STAFF_ROLES = [ROLES.SURGEON, ROLES.ANAESTHETIST, ROLES.COORDINATOR];

/** Case lifecycle. Allowed transitions live in services/workflow.js */
export const CASE_STATUS = {
  LISTED: { label: 'Listed', tone: 'neutral' },
  PREPARATION: { label: 'Preparation', tone: 'info' },
  READY: { label: 'Ready', tone: 'ok' },
  SCHEDULED: { label: 'Scheduled', tone: 'ok' },
  COMPLETED: { label: 'Completed', tone: 'info' },
  DISCHARGED: { label: 'Discharged', tone: 'info' },
  RECOVERY: { label: 'Recovery', tone: 'info' },
  RECOVERED: { label: 'Recovered', tone: 'ok' },
  DEFERRED: { label: 'Deferred', tone: 'warn' },
  CANCELLED: { label: 'Cancelled', tone: 'bad' },
};

export const LIFECYCLE = ['LISTED', 'PREPARATION', 'READY', 'SCHEDULED', 'COMPLETED', 'DISCHARGED', 'RECOVERY', 'RECOVERED'];
export const RECOVERY_STATES = ['DISCHARGED', 'RECOVERY'];
export const PREOP_STATES = ['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'];

export const ITEM_STATUS = {
  pending: { label: 'Pending', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'warn' },
  completed: { label: 'Completed', tone: 'ok' },
  overdue: { label: 'Overdue', tone: 'bad' },
  not_required: { label: 'Not required', tone: 'neutral' },
};
export const PRIORITY = {
  high: { label: 'High', tone: 'bad' },
  medium: { label: 'Medium', tone: 'warn' },
  low: { label: 'Low', tone: 'neutral' },
};

export const OWNER_LABELS = {
  patient: 'Patient',
  coordinator: 'Pre-op coordinator',
  anaesthetist: 'Anaesthetist',
  surgeon: 'Surgeon',
};

export const CANCELLATION_CATEGORIES = [
  'Patient preparation',
  'Medical condition not optimised',
  'Patient did not arrive',
  'OT time / list overrun',
  'Equipment or resources',
  'Surgeon or staff unavailable',
];

export const ALERT_STATUS = {
  open: { label: 'Needs review', tone: 'bad' },
  advised: { label: 'Advice sent', tone: 'warn' },
  recalled: { label: 'Recalled for review', tone: 'warn' },
  resolved: { label: 'Resolved', tone: 'ok' },
};

export const COMORBIDITIES = [
  'Diabetes',
  'Hypertension',
  'Cardiac disease',
  'Asthma / COPD',
  'Thyroid disorder',
  'Kidney disease',
];
