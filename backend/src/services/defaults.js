/** Default hospital rules, created on first start / seed. Editable by the administrator. */
export const DEFAULT_RULES = {
  reminderDaysBefore: [3, 1],
  escalateToSurgeonAfterDays: 1,
  confirmWithinDays: 2,
  risk: { high: 0.55, medium: 0.3 },
  recovery: {
    high: { threshold: 3, everyDays: 1, days: 14 },
    medium: { threshold: 4, everyDays: 1, days: 10 },
    low: { threshold: 5, everyDays: 2, days: 7 },
  },
  conditionalItems: [
    { when: 'Diabetes', item: { key: 'hba1c', title: 'Fasting blood sugar / HbA1c', titleUr: 'خالی پیٹ شوگر / ایچ بی اے ون سی', description: 'Blood test to check diabetes control before surgery.', owner: 'patient', offsetDays: 4, mandatory: true, patientTask: true, dayOf: false, category: 'investigation', priority: 'high' } },
    { when: 'Hypertension', item: { key: 'cardio', title: 'Cardiology fitness review', titleUr: 'دل کے ڈاکٹر سے فٹنس', description: 'Book and record a cardiology fitness opinion.', owner: 'coordinator', offsetDays: 3, mandatory: true, patientTask: false, dayOf: false, category: 'referral', priority: 'high' } },
    { when: 'Cardiac disease', item: { key: 'echo', title: 'Echocardiography', titleUr: 'ایکو کارڈیوگرافی', description: 'Echocardiography report required for anaesthesia.', owner: 'patient', offsetDays: 4, mandatory: true, patientTask: true, dayOf: false, category: 'investigation', priority: 'high' } },
  ],
};
