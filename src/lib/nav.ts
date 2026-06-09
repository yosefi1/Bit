import { he } from "./i18n/he";

export const ADMIN_NAV = [
  { href: "/admin", label: he.nav.overview },
  { href: "/admin/apartments", label: he.nav.apartments },
  { href: "/admin/cycles", label: he.nav.cycles },
  { href: "/admin/submissions", label: he.nav.submissions },
  { href: "/admin/reports", label: he.nav.reports },
  { href: "/admin/settings", label: he.nav.settings },
  { href: "/admin/audit", label: he.nav.audit },
];

export const TENANT_NAV = [
  { href: "/dashboard", label: he.nav.myApartment },
  { href: "/dashboard/submit", label: he.nav.submitReading },
  { href: "/dashboard/history", label: he.nav.history },
];
