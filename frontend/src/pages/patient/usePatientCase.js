import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';
import { PT } from '../../config/patientText';

const PRIORITY = ['RECOVERY', 'DISCHARGED', 'COMPLETED', 'SCHEDULED', 'READY', 'PREPARATION', 'LISTED', 'DEFERRED', 'CANCELLED', 'RECOVERED'];

/** The signed-in patient's current case plus language preference. */
export function usePatientCase() {
  const { state } = useStore();
  const { user } = useAuth();
  const patient = state.patients.find((p) => p.id === user.patientId);
  const c = state.cases
    .filter((x) => x.patientId === user.patientId)
    .sort((a, b) => PRIORITY.indexOf(a.status) - PRIORITY.indexOf(b.status))[0];

  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('medsync-patient-lang') || patient?.language || 'en';
    } catch {
      return patient?.language || 'en';
    }
  });
  const setLang = (l) => {
    setLangState(l);
    try {
      localStorage.setItem('medsync-patient-lang', l);
    } catch {
      /* ignore */
    }
  };

  return { patient, c, today: state.sim.today, users: state.users, lang, setLang, t: PT[lang] };
}
