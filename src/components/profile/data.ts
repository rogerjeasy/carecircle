// Profile + Emergency Card display constants. The recipient's profile, meds, and contacts are real
// data loaded from the server (see src/lib/profile/* and src/lib/emergency-card/*).

/** Languages offered in the recipient profile edit form. */
export const LANGUAGES = ["English", "Español", "Português", "Français", "Italiano"];

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
