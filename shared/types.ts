export interface Service { name: string; priceCents: number }
export interface Brief {
  customerName: string; businessName: string; whatsapp: string; email: string;
  location: string; tagline: string; brandColor: string; services: Service[];
  featured: string; notes: string; acceptedTerms: boolean;
}
export interface Payment {
  providerTransactionId: string; reference: string; currency: 'USD'; grossCents: number;
  feeCents: number; netCents: number; status: string; verifiedAt: string;
  settledCents: number; settledAt: string | null;
}
export interface Order {
  reference: string; brief: Brief; approvedBrief: Brief | null; createdAt: string; updatedAt: string;
  packageVersion: string; priceCents: number; currency: 'USD'; isTest: boolean;
  scopeConfirmedAt: string | null; timing: string;
  paymentStatus: 'pending' | 'verified'; payment: Payment | null;
  productionStatus: 'not_started' | 'generated' | 'approved'; contentVersion: number;
  generatedVersion: number | null; reviewedVersion: number | null; generatedAt: string | null;
  reviewedAt: string | null; deliveredAt: string | null; deliveryChannel: string;
  revisionUsed: boolean; operatorNotes: string; preset: 'botanical' | 'editorial';
  logoSha256: string | null;
  events: { at: string; action: string; detail: string }[];
}
export interface PublicConfig {
  ordersOpen: boolean; supportEmail: string; supportWhatsapp: string; responseHours: string;
  retentionDays: number; turnstileSiteKey: string; local: boolean;
}
export interface Metrics { submitted: number; paid: number; grossCents: number; feeCents: number; netCents: number; settledCents: number; delivered: number }
