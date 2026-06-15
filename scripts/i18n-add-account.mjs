// Adds the top-level `account.*` namespace (standalone /account "Your profile" page).
// Most strings are identical to settings.account / settings.common — reuse those per-locale for
// consistency; only the 7 account-unique strings are hand-translated here.
import { readFileSync, writeFileSync } from "node:fs";

const UNIQUE = {
  en: {
    title: "Your profile",
    subtitle: "Update your personal details, photo and sign-in security.",
    errImageType: "Please choose an image file.",
    errName: "Please enter your name.",
    emailHint: "Your email is used to sign in and can't be changed here.",
    passwordHint: "At least 8 characters, with an uppercase letter, a lowercase letter and a number.",
    profileUpdated: "Profile updated",
  },
  fr: {
    title: "Votre profil",
    subtitle: "Mettez à jour vos informations personnelles, votre photo et la sécurité de connexion.",
    errImageType: "Veuillez choisir un fichier image.",
    errName: "Veuillez saisir votre nom.",
    emailHint: "Votre e-mail sert à vous connecter et ne peut pas être modifié ici.",
    passwordHint: "Au moins 8 caractères, avec une majuscule, une minuscule et un chiffre.",
    profileUpdated: "Profil mis à jour",
  },
  de: {
    title: "Ihr Profil",
    subtitle: "Aktualisieren Sie Ihre persönlichen Daten, Ihr Foto und die Anmeldesicherheit.",
    errImageType: "Bitte wählen Sie eine Bilddatei.",
    errName: "Bitte geben Sie Ihren Namen ein.",
    emailHint: "Ihre E-Mail wird zur Anmeldung verwendet und kann hier nicht geändert werden.",
    passwordHint: "Mindestens 8 Zeichen, mit einem Großbuchstaben, einem Kleinbuchstaben und einer Zahl.",
    profileUpdated: "Profil aktualisiert",
  },
  es: {
    title: "Tu perfil",
    subtitle: "Actualiza tus datos personales, tu foto y la seguridad de inicio de sesión.",
    errImageType: "Elige un archivo de imagen.",
    errName: "Introduce tu nombre.",
    emailHint: "Tu correo se usa para iniciar sesión y no puede cambiarse aquí.",
    passwordHint: "Al menos 8 caracteres, con una mayúscula, una minúscula y un número.",
    profileUpdated: "Perfil actualizado",
  },
  it: {
    title: "Il tuo profilo",
    subtitle: "Aggiorna i tuoi dati personali, la foto e la sicurezza di accesso.",
    errImageType: "Scegli un file immagine.",
    errName: "Inserisci il tuo nome.",
    emailHint: "La tua email serve per accedere e non può essere modificata qui.",
    passwordHint: "Almeno 8 caratteri, con una maiuscola, una minuscola e un numero.",
    profileUpdated: "Profilo aggiornato",
  },
  ar: {
    title: "ملفك الشخصي",
    subtitle: "حدّث بياناتك الشخصية وصورتك وأمان تسجيل الدخول.",
    errImageType: "يُرجى اختيار ملف صورة.",
    errName: "يُرجى إدخال اسمك.",
    emailHint: "يُستخدم بريدك الإلكتروني لتسجيل الدخول ولا يمكن تغييره من هنا.",
    passwordHint: "8 أحرف على الأقل، مع حرف كبير وحرف صغير ورقم.",
    profileUpdated: "تم تحديث الملف الشخصي",
  },
  he: {
    title: "הפרופיל שלך",
    subtitle: "עדכנו את הפרטים האישיים, התמונה ואבטחת הכניסה שלכם.",
    errImageType: "אנא בחרו קובץ תמונה.",
    errName: "אנא הזינו את שמכם.",
    emailHint: "האימייל שלכם משמש לכניסה ולא ניתן לשנותו כאן.",
    passwordHint: "לפחות 8 תווים, עם אות גדולה, אות קטנה וספרה.",
    profileUpdated: "הפרופיל עודכן",
  },
};

for (const [code, u] of Object.entries(UNIQUE)) {
  const path = `messages/${code}.json`;
  const obj = JSON.parse(readFileSync(path, "utf8"));
  const sa = obj.settings.account;
  const sc = obj.settings.common;
  obj.account = {
    title: u.title,
    subtitle: u.subtitle,
    changePhoto: sa.changePhoto,
    photoHint: sa.photoHint,
    errImageType: u.errImageType,
    errImageSize: sa.photoTooLarge,
    errName: u.errName,
    fullName: sa.fullName,
    email: sa.email,
    emailHint: u.emailHint,
    language: sa.language,
    timezone: sa.timezone,
    save: sc.saveChanges,
    saving: sc.saving,
    profileUpdated: u.profileUpdated,
    changePassword: sa.changePassword,
    current: sa.current,
    new: sa.new,
    confirm: sa.confirm,
    passwordHint: u.passwordHint,
    updatePassword: sa.updatePassword,
    updating: sa.updating,
    passwordUpdated: sa.passwordUpdated,
    socialNoPassword: sa.socialNoPassword,
    deleteTitle: sa.deleteAccount,
    deleteDesc: sa.deleteAccountDesc,
    deleteConfirmTitle: sa.deleteAccountTitle,
    deleteConfirmBody: sa.deleteAccountConfirm,
    cancel: sc.cancel,
  };
  const out = (JSON.stringify(obj, null, 2) + "\n").replace(/\n/g, "\r\n");
  writeFileSync(path, out, "utf8");
  console.log(`${code}: added account (${Object.keys(obj.account).length} keys)`);
}
