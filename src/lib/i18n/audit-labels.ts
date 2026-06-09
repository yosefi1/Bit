const ACTION_LABELS: Record<string, string> = {
  "user.login": "התחברות",
  "submission.create": "דיווח חדש",
  "submission.approve": "אישור דיווח",
  "submission.reject": "דחיית דיווח",
  "submission.update": "עדכון דיווח",
  "submission.delete": "מחיקת דיווח",
  "apartment.create": "יצירת דירה",
  "apartment.update": "עדכון דירה",
  "tenant.update": "עדכון דייר",
  "tenant.assign": "שיוך דייר",
  "settings.bit.update": "עדכון הגדרות ביט",
  "settings.electricity.update": "עדכון מחיר חשמל",
  "cycle.create": "מחזור חיוב חדש",
  "cycle.update": "עדכון מחזור",
  "payment.update": "עדכון תשלום",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
