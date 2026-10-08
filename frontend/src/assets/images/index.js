/** Image assets supplied for MedSync, named by what they show. */
import hospitalExterior from './hospital-exterior.webp';
import hospitalBuilding from './hospital-building.webp';
import surgicalTeam from './surgical-team.webp';
import operatingTheatre from './operating-theatre.webp';
import laboratoryAnalysis from './laboratory-analysis.webp';
import analyticsScreen from './analytics-screen.webp';
import doctor from './doctor.webp';
import careTeam from './care-team.webp';
import recoveryRoom from './recovery-room.webp';
import wardCorridor from './ward-corridor.webp';
import reception from './reception.webp';
import patientConsultation from './patient-consultation.webp';
import pharmacy from './pharmacy.webp';

export const IMAGES = { hospitalExterior, hospitalBuilding, surgicalTeam, operatingTheatre, laboratoryAnalysis, analyticsScreen, doctor, careTeam, recoveryRoom, wardCorridor, reception, patientConsultation, pharmacy };

export const WELCOME_SLIDES = [
  { src: hospitalExterior, alt: 'Hospital building', eyebrow: 'Hospital surgical care', title: 'One place for every elective surgical patient', text: 'MedSync follows each patient from the decision to operate until recovery at home, using only your hospital’s own data.' },
  { src: surgicalTeam, alt: 'Surgical team operating', eyebrow: 'Procedure readiness', title: 'Ready before the day of surgery', text: 'Every test, assessment, consent and instruction has an owner and a deadline, so gaps are fixed days before the operation.' },
  { src: laboratoryAnalysis, alt: 'Laboratory analysis of samples', eyebrow: 'Monitoring and analysis', title: 'See risk early, watch recovery closely', text: 'Readiness risk estimates, recovery check-ins and red-flag alerts help your team act in time.' },
];
