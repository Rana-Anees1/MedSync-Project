import {
  LayoutDashboard, ClipboardList, PlusCircle, Siren, Stethoscope, ListChecks, BarChart3,
  Users, FileStack, SlidersHorizontal, ScrollText, Home, HeartPulse, Bell, Contact,
} from 'lucide-react';

export const NAV = {
  surgeon: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/board', label: 'Readiness board', icon: ClipboardList },
    { to: '/cases/new', label: 'List a patient', icon: PlusCircle },
    { to: '/patients', label: 'Patients', icon: Contact },
    { to: '/triage', label: 'Recovery triage', icon: Siren },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
  anaesthetist: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/assessments', label: 'Assessment queue', icon: Stethoscope },
    { to: '/board', label: 'Readiness board', icon: ClipboardList },
    { to: '/patients', label: 'Patients', icon: Contact },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
  coordinator: [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/tasks', label: 'Readiness tasks', icon: ListChecks },
    { to: '/board', label: 'Readiness board', icon: ClipboardList },
    { to: '/cases/new', label: 'List a patient', icon: PlusCircle },
    { to: '/patients', label: 'Patients', icon: Contact },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
  patient: [
    { to: '/my', label: 'My surgery', icon: Home },
    { to: '/my/checkin', label: 'Daily check-in', icon: HeartPulse },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users & roles', icon: Users },
    { to: '/admin/templates', label: 'Procedure templates', icon: FileStack },
    { to: '/admin/rules', label: 'Reminder & alert rules', icon: SlidersHorizontal },
    { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/notifications', label: 'Notifications', icon: Bell },
  ],
};

export const homeFor = (role) => (role === 'patient' ? '/my' : role === 'admin' ? '/admin' : '/dashboard');
