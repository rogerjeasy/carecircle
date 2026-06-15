// Adds profile.public.inactiveBody to all 7 message files (public emergency-card inactive state).
import { readFileSync, writeFileSync } from "node:fs";

const BODY = {
  en: "It may have expired or been revoked by the family. Ask a family member to share a fresh link from their Kintwadi emergency card.",
  fr: "Il a peut-être expiré ou été révoqué par la famille. Demandez à un membre de la famille de partager un nouveau lien depuis sa carte d'urgence Kintwadi.",
  de: "Er ist möglicherweise abgelaufen oder wurde von der Familie widerrufen. Bitten Sie ein Familienmitglied, einen neuen Link von seiner Kintwadi-Notfallkarte zu teilen.",
  es: "Es posible que haya caducado o que la familia lo haya revocado. Pide a un familiar que comparta un enlace nuevo desde su tarjeta de emergencia de Kintwadi.",
  it: "Potrebbe essere scaduto o essere stato revocato dalla famiglia. Chiedi a un familiare di condividere un nuovo link dalla sua scheda di emergenza Kintwadi.",
  ar: "ربما انتهت صلاحيته أو ألغته العائلة. اطلب من أحد أفراد العائلة مشاركة رابط جديد من بطاقة الطوارئ الخاصة به في Kintwadi.",
  he: "ייתכן שתוקפו פג או שהמשפחה ביטלה אותו. בקשו מבן משפחה לשתף קישור חדש מכרטיס החירום שלו ב-Kintwadi.",
};

for (const [code, body] of Object.entries(BODY)) {
  const path = `messages/${code}.json`;
  const obj = JSON.parse(readFileSync(path, "utf8"));
  obj.profile.public.inactiveBody = body;
  const out = (JSON.stringify(obj, null, 2) + "\n").replace(/\n/g, "\r\n");
  writeFileSync(path, out, "utf8");
  console.log(`${code}: added profile.public.inactiveBody`);
}
