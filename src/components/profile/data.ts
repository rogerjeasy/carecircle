// Demo data for Antonio's profile + emergency card.

export const PROFILE = {
  name: "Antonio",
  fullName: "Antonio Rodriguez",
  age: 78,
  dob: "12 March 1948",
  language: "English",
  timezone: "Europe/Lisbon (WEST)",
  bloodType: "O+",
  mobility: "Walks with a frame · steady indoors, needs an arm outdoors",
  dietary: ["Low salt", "Diabetic-friendly", "Soft foods in the evening"],
  conditions: ["Hypertension", "Type 2 diabetes", "Mild cognitive impairment", "Osteoarthritis"],
  allergies: ["Penicillin", "Shellfish"],
  advanceDirective: "DNR on file",
};

export interface Med {
  name: string;
  strength: string;
  schedule: string;
}

export const CURRENT_MEDS: Med[] = [
  { name: "Lisinopril", strength: "10mg", schedule: "Once daily · morning" },
  { name: "Metformin", strength: "500mg", schedule: "Twice daily" },
  { name: "Atorvastatin", strength: "20mg", schedule: "Once daily · evening" },
  { name: "Aspirin", strength: "81mg", schedule: "Once daily" },
  { name: "Donepezil", strength: "10mg", schedule: "Once daily · night" },
];

export const PREFERENCES = {
  likes: ["Strong coffee in the morning", "Opera, especially Verdi", "Sitting by the window", "Football on Sundays"],
  dislikes: ["Being rushed", "Cold rooms", "Loud television"],
  routines: [
    "Wakes around 7am, likes breakfast before any medication.",
    "Afternoon nap after lunch (1–2pm).",
    "Enjoys a short garden walk before dinner.",
  ],
  comfort: "Responds best to a calm, unhurried voice. Calling him “Tonio” (as family do) puts him at ease. Keep his reading glasses and a glass of water within reach.",
};

export interface Contact {
  name: string;
  role: string;
  phone: string;
}

export const CONTACTS = {
  doctors: [
    { name: "Dr. Chen", role: "Cardiologist · City Heart Clinic", phone: "+1 (555) 010-2030" },
    { name: "Dr. Okafor", role: "GP · Maple Family Practice", phone: "+1 (555) 010-7788" },
  ] as Contact[],
  pharmacy: { name: "Maple Pharmacy", role: "Pharmacy · 22 Maple St", phone: "+1 (555) 332-1100" } as Contact,
  nextOfKin: [
    { name: "Maria Rodriguez", role: "Daughter · primary contact", phone: "+1 (555) 204-1180" },
    { name: "Carlos Rodriguez", role: "Son", phone: "+1 (555) 204-2290" },
  ] as Contact[],
};

export const INSURANCE = {
  provider: "BlueCare Health",
  plan: "Senior Advantage PPO",
  memberId: "BC-4471-9920",
  group: "GRP-5567",
  documents: [
    { title: "Health insurance card", date: "Valid to Aug 2026" },
    { title: "Supplemental policy", date: "Renewed Apr 2026" },
  ],
};

export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];
export const TIMEZONES = ["Europe/Lisbon (WEST)", "Europe/Madrid", "America/New_York", "America/Los_Angeles", "UTC"];

// --- Emergency Card: server-projected data (recipient profile + active meds + contacts) ---
export interface EmergencyContact {
  name: string;
  role: string;
  /** May be "" when no number is on file (the Call button is then hidden). */
  phone: string;
}

export interface EmergencyMed {
  name: string;
  strength: string;
}

export interface EmergencyCardData {
  fullName: string;
  initials: string;
  /** Ready-to-use recipient photo URL (presigned for S3 keys), or null to use initials. */
  avatarUrl: string | null;
  age: number | null;
  /** Formatted date of birth, e.g. "12 March 1948", or null. */
  dob: string | null;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  /** e.g. "On file", or null when none recorded. */
  advanceDirective: string | null;
  meds: EmergencyMed[];
  /** Next-of-kin / emergency contacts. */
  contacts: EmergencyContact[];
  /** Primary doctor (a clinician member), or null. */
  doctor: EmergencyContact | null;
}

// --- Emergency Card translations (key labels only; data stays as-is) ---
export type ECLang = "en" | "es" | "pt" | "fr";

export const EC_LANGS: { value: ECLang; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
  { value: "pt", label: "PT" },
  { value: "fr", label: "FR" },
];

export const EC_STRINGS: Record<ECLang, Record<string, string>> = {
  en: {
    emergencyCard: "Emergency Card",
    years: "years",
    bloodType: "Blood type",
    allergies: "ALLERGIES",
    noAllergies: "No known allergies",
    medications: "Active medications",
    conditions: "Key conditions",
    advanceDirective: "Advance directive",
    primaryDoctor: "Primary doctor",
    emergencyContacts: "Emergency contacts",
    call: "Call",
    scanToOpen: "Scan to open this card",
  },
  es: {
    emergencyCard: "Tarjeta de emergencia",
    years: "años",
    bloodType: "Grupo sanguíneo",
    allergies: "ALERGIAS",
    noAllergies: "Sin alergias conocidas",
    medications: "Medicación activa",
    conditions: "Afecciones principales",
    advanceDirective: "Instrucciones anticipadas",
    primaryDoctor: "Médico de cabecera",
    emergencyContacts: "Contactos de emergencia",
    call: "Llamar",
    scanToOpen: "Escanee para abrir esta tarjeta",
  },
  pt: {
    emergencyCard: "Cartão de emergência",
    years: "anos",
    bloodType: "Tipo sanguíneo",
    allergies: "ALERGIAS",
    noAllergies: "Sem alergias conhecidas",
    medications: "Medicação ativa",
    conditions: "Principais condições",
    advanceDirective: "Diretiva antecipada",
    primaryDoctor: "Médico principal",
    emergencyContacts: "Contactos de emergência",
    call: "Ligar",
    scanToOpen: "Digitalize para abrir este cartão",
  },
  fr: {
    emergencyCard: "Carte d'urgence",
    years: "ans",
    bloodType: "Groupe sanguin",
    allergies: "ALLERGIES",
    noAllergies: "Aucune allergie connue",
    medications: "Médicaments actifs",
    conditions: "Principales pathologies",
    advanceDirective: "Directives anticipées",
    primaryDoctor: "Médecin traitant",
    emergencyContacts: "Contacts d'urgence",
    call: "Appeler",
    scanToOpen: "Scannez pour ouvrir cette carte",
  },
};
