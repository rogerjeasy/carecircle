// Lightweight, local drug-safety knowledge base for the "Safety check" panel.
// NOTE: illustrative demo data only — a real system would call a clinical interactions service.

export type SafetySeverity = "high" | "moderate";

export interface SafetyWarning {
  id: string;
  kind: "interaction" | "allergy";
  severity: SafetySeverity;
  title: string;
  detail: string;
}

interface InteractionRule {
  drugs: [string, string]; // lowercase substrings to match against med names
  severity: SafetySeverity;
  note: string;
}

const INTERACTIONS: InteractionRule[] = [
  { drugs: ["warfarin", "aspirin"], severity: "high", note: "Both thin the blood — combined use raises the risk of serious bleeding." },
  { drugs: ["warfarin", "ibuprofen"], severity: "high", note: "NSAIDs increase bleeding risk when taken with anticoagulants." },
  { drugs: ["warfarin", "clarithromycin"], severity: "high", note: "Can sharply raise warfarin levels and bleeding risk." },
  { drugs: ["aspirin", "ibuprofen"], severity: "moderate", note: "Two NSAIDs together increase the risk of stomach bleeding." },
  { drugs: ["lisinopril", "ibuprofen"], severity: "moderate", note: "NSAIDs can reduce blood-pressure control and affect the kidneys." },
  { drugs: ["lisinopril", "spironolactone"], severity: "high", note: "Combined use can raise potassium to dangerous levels." },
  { drugs: ["lisinopril", "potassium"], severity: "high", note: "Risk of high potassium (hyperkalemia)." },
  { drugs: ["atorvastatin", "clarithromycin"], severity: "high", note: "Raises statin levels — increased risk of muscle injury." },
  { drugs: ["simvastatin", "clarithromycin"], severity: "high", note: "Raises statin levels — increased risk of muscle injury." },
  { drugs: ["atorvastatin", "gemfibrozil"], severity: "high", note: "Increased risk of muscle breakdown (rhabdomyolysis)." },
  { drugs: ["metformin", "furosemide"], severity: "moderate", note: "May affect blood-sugar and kidney function — monitor." },
  { drugs: ["sertraline", "ibuprofen"], severity: "moderate", note: "SSRIs with NSAIDs can increase bleeding risk." },
];

/** Maps a medication (lowercased) to an allergen class for allergy-conflict checks. */
const ALLERGEN_OF: Record<string, string> = {
  amoxicillin: "penicillin",
  ampicillin: "penicillin",
  penicillin: "penicillin",
  "co-amoxiclav": "penicillin",
  flucloxacillin: "penicillin",
  sulfamethoxazole: "sulfa",
  "trimethoprim-sulfamethoxazole": "sulfa",
  bactrim: "sulfa",
  sulfasalazine: "sulfa",
  codeine: "opioid",
  morphine: "opioid",
};

/** The care recipient's recorded allergies (demo). */
export const RECIPIENT_ALLERGIES = ["penicillin", "sulfa"];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface SafetyContext {
  /** Names of the medications the recipient is currently taking (active, not discontinued). */
  currentMedNames: string[];
  /** The recipient's recorded allergen classes. */
  allergies: string[];
}

/**
 * Surface any drug–drug interactions (against current meds) or allergy conflicts for a proposed
 * medication name. Returns an empty array when nothing is flagged.
 */
export function checkMedicationSafety(name: string, ctx: SafetyContext): SafetyWarning[] {
  const n = name.trim().toLowerCase();
  if (!n) return [];

  const current = ctx.currentMedNames.map((m) => m.toLowerCase());
  const warnings: SafetyWarning[] = [];

  for (const rule of INTERACTIONS) {
    const [a, b] = rule.drugs;
    let other: string | null = null;
    if (n.includes(a)) other = b;
    else if (n.includes(b)) other = a;
    if (!other) continue;

    const taken = current.find((m) => m.includes(other!));
    if (taken) {
      warnings.push({
        id: `interaction-${a}-${b}`,
        kind: "interaction",
        severity: rule.severity,
        title: `May interact with ${titleCase(taken)}`,
        detail: rule.note,
      });
    }
  }

  const allergen =
    ALLERGEN_OF[n] ?? Object.entries(ALLERGEN_OF).find(([drug]) => n.includes(drug))?.[1];
  if (allergen && ctx.allergies.map((a) => a.toLowerCase()).includes(allergen)) {
    warnings.push({
      id: `allergy-${allergen}`,
      kind: "allergy",
      severity: "high",
      title: `Possible ${allergen} allergy conflict`,
      detail: `The care recipient has a recorded ${allergen} allergy. Confirm with the prescriber before giving.`,
    });
  }

  // De-dupe by id (a med can match the same rule once).
  return warnings.filter((w, i) => warnings.findIndex((x) => x.id === w.id) === i);
}
