// École Directe API service
// Compatible with BlocksDirecte format (Wapillon)

import type {
  StudentInfo,
  TimetableEntry,
  Grade,
  HomeworkEntry,
  NewsEntry,
  AttendanceEntry,
} from "./types";

const BASE_URL = "https://api.ecoledirecte.com/v3";
const API_VERSION = "7.8.2";
const USER_AGENT = `BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v${API_VERSION}`;

function getHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "x-www-form-urlencoded",
    "User-Agent": USER_AGENT,
  };
  if (token) h["X-Token"] = token;
  return h;
}

function makeBody(data: Record<string, unknown> = {}): string {
  return new URLSearchParams({ data: JSON.stringify(data) }).toString();
}

async function edFetch(path: string, token: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: getHeaders(token),
    body: makeBody(body),
  });

  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(`ED API returned empty response for ${path}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ED API returned invalid JSON for ${path}`);
  }

  if (json.code !== 200) {
    throw new Error(json.message || `ED API Error (${json.code})`);
  }
  return { data: json.data, token: json.token || token };
}

export interface EDLoginResult {
  student: StudentInfo;
  token: string;
  accountId: number;
  accountType: string;
}

export interface ED2FAChallenge {
  twoFactor: true;
  twoFAToken: string;
  question: string;
  propositions: string[];
  /** Raw base64 values to send back to ED */
  rawPropositions: string[];
  /** Credentials to re-login after 2FA */
  username: string;
  password: string;
}

function extractAccount(account: Record<string, unknown>): StudentInfo {
  const profile = account.profile as Record<string, unknown> | undefined;
  const classe = profile?.classe as Record<string, string> | undefined;
  return {
    id: String(account.id),
    firstName: (account.prenom as string) || "",
    lastName: (account.nom as string) || "",
    className: classe?.libelle || classe?.code || "",
    school: (account.nomEtablissement as string) || "",
  };
}

export async function loginEcoleDirecte(
  username: string,
  password: string,
  fa?: { cn: string; cv: string }
): Promise<EDLoginResult | ED2FAChallenge> {
  const loginPayload: Record<string, unknown> = {
    identifiant: username,
    motdepasse: password,
  };
  if (fa) {
    loginPayload.fa = [fa];
  }

  const res = await fetch(`${BASE_URL}/login.awp?v=${API_VERSION}`, {
    method: "POST",
    headers: getHeaders(),
    body: makeBody(loginPayload),
  });

  const twoFAToken = res.headers.get("2fa-token") || "";
  const json = await res.json();

  // Code 250 = 2FA required
  if (json.code === 250) {
    // Fetch the 2FA question using the 2FA-Token header
    const questionRes = await fetch(`${BASE_URL}/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`, {
      method: "POST",
      headers: { ...getHeaders(), "2FA-Token": twoFAToken },
      body: makeBody({}),
    });
    const questionJson = await questionRes.json();

    const rawPropositions: string[] = questionJson.data?.propositions || [];
    const question = decodeBase64(questionJson.data?.question || "") || "Question de sécurité";
    const propositions: string[] = rawPropositions.map((p: string) => decodeBase64(p));

    return {
      twoFactor: true,
      twoFAToken,
      question,
      propositions,
      rawPropositions,
      username,
      password,
    };
  }

  if (json.code !== 200) {
    throw new Error(json.message || "Identifiants incorrects");
  }

  const account = json.data.accounts?.[0];
  if (!account) throw new Error("Aucun compte trouvé");

  return {
    student: extractAccount(account),
    token: json.token,
    accountId: account.id,
    accountType: account.typeCompte || "E",
  };
}

/**
 * Validate the 2FA answer, get cn/cv keys, then re-login with them.
 */
export async function validateED2FA(
  twoFAToken: string,
  answer: string,
  username: string,
  password: string
): Promise<EDLoginResult> {
  // POST the chosen answer to the 2FA endpoint
  const res = await fetch(`${BASE_URL}/connexion/doubleauth.awp?verbe=post&v=${API_VERSION}`, {
    method: "POST",
    headers: { ...getHeaders(), "2FA-Token": twoFAToken },
    body: makeBody({ choix: answer }),
  });
  const json = await res.json();

  if (json.code !== 200) {
    throw new Error(json.message || "Réponse incorrecte à la question de sécurité");
  }

  // Extract cn/cv keys from 2FA response
  const cn = json.data?.cn || "";
  const cv = json.data?.cv || "";

  // Re-login with the 2FA keys (cn/cv in the fa field)
  const loginResult = await loginEcoleDirecte(username, password, { cn, cv });

  // Should now return EDLoginResult (not another 2FA challenge)
  if ("twoFactor" in loginResult) {
    throw new Error("Erreur : double authentification demandée à nouveau");
  }

  return loginResult;
}

export async function getEDGrades(
  token: string,
  accountId: number
): Promise<{ grades: Grade[]; newToken: string }> {
  const { data, token: newToken } = await edFetch(
    `/eleves/${accountId}/notes.awp?verbe=get`,
    token
  );

  const grades: Grade[] = [];
  if (data?.notes) {
    for (const note of data.notes) {
      // Skip non-numeric grades
      const value = parseFloat(String(note.valeur).replace(",", "."));
      const outOf = parseFloat(String(note.noteSur).replace(",", "."));
      if (isNaN(value) || isNaN(outOf)) continue;

      grades.push({
        id: String(note.id || `${note.codeMatiere}-${note.dateSaisie}`),
        subject: note.libelleMatiere || note.codeMatiere || "Inconnu",
        title: note.depisteFor || note.typeDevoir || "Évaluation",
        value,
        outOf,
        coefficient: parseFloat(String(note.coef).replace(",", ".")) || 1,
        date: note.date || note.dateSaisie || "",
        classAverage: parseFloat(String(note.moyenneClasse).replace(",", ".")) || undefined,
        classMin: parseFloat(String(note.minClasse).replace(",", ".")) || undefined,
        classMax: parseFloat(String(note.maxClasse).replace(",", ".")) || undefined,
      });
    }
  }

  return { grades, newToken };
}

export async function getEDTimetable(
  token: string,
  accountId: number,
  dateStart: string,
  dateEnd: string
): Promise<{ entries: TimetableEntry[]; newToken: string }> {
  const { data, token: newToken } = await edFetch(
    `/E/${accountId}/emploidutemps.awp?verbe=get`,
    token,
    { dateDebut: dateStart, dateFin: dateEnd, avecTrous: false }
  );

  const entries: TimetableEntry[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      entries.push({
        id: String(item.id || Math.random()),
        subject: item.matiere || "Cours",
        teacher: item.prof || "",
        room: item.salle || "",
        start: item.start_date || item.debut || "",
        end: item.end_date || item.fin || "",
        color: item.color || "#3b82f6",
        status: item.isAnnule ? "cancelled" : item.isModifie ? "modified" : "normal",
      });
    }
  }

  return { entries, newToken };
}

export async function getEDHomework(
  token: string,
  accountId: number
): Promise<{ homework: HomeworkEntry[]; newToken: string }> {
  const { data, token: newToken } = await edFetch(
    `/Eleves/${accountId}/cahierdetexte.awp?verbe=get`,
    token
  );

  if (!data) return { homework: [], newToken };

  // Collect dates that need a detail fetch (aFaire === true → no inline description)
  const datesToFetch = new Set<string>();
  for (const [date, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    for (const item of items as Record<string, unknown>[]) {
      if (item.aFaire === true) datesToFetch.add(date);
    }
  }

  // Fetch all date details in parallel; build maps: idDevoir → description / documents / images
  const descMap: Record<string, string> = {};
  const docsMap: Record<string, { id: number; name: string }[]> = {};
  const imagesMap: Record<string, string> = {}; // idDevoir → sanitized HTML with images
  await Promise.all(
    [...datesToFetch].map(async (date) => {
      try {
        const { data: detail } = await edFetch(
          `/Eleves/${accountId}/cahierdetexte/${date}.awp?verbe=get`,
          newToken
        );
        // detail = { date, matieres: [{ aFaire: { idDevoir, contenu, documents, ... } }] }
        const matieres = (detail as Record<string, unknown>)?.matieres;
        if (!Array.isArray(matieres)) return;
        for (const seance of matieres as Record<string, unknown>[]) {
          const af = seance.aFaire;
          if (typeof af === "object" && af !== null) {
            const afObj = af as Record<string, unknown>;
            const id = afObj.idDevoir ?? afObj.id;
            if (id == null) continue;
            const key = String(id);
            if (afObj.contenu) {
              const html = decodeBase64(String(afObj.contenu));
              if (hasImages(html)) imagesMap[key] = sanitizeHtml(html);
              const raw = stripHtml(html);
              if (raw) descMap[key] = raw;
            }
            if (Array.isArray(afObj.documents)) {
              docsMap[key] = (afObj.documents as Record<string, unknown>[]).map((d) => ({
                id: Number(d.id),
                name: String(d.libelle || d.name || `Document ${d.id}`),
              }));
            }
          }
        }
      } catch {
        // detail fetch is best-effort
      }
    })
  );

  const homework: HomeworkEntry[] = [];
  for (const [date, items] of Object.entries(data)) {
    if (!Array.isArray(items)) continue;
    for (const item of items as Record<string, unknown>[]) {
      const aFaire  = item.aFaire;
      const contenu = item.contenu;
      const subject = String(item.matiere || "Inconnu");
      const devoirId = item.idDevoir != null ? String(item.idDevoir) : "";

      let done = Boolean(item.effectue);
      let description = "";
      let descriptionHtml: string | undefined;

      const processHtml = (html: string) => {
        description = stripHtml(html);
        if (hasImages(html)) descriptionHtml = sanitizeHtml(html);
      };

      if (typeof aFaire === "object" && aFaire !== null) {
        const af = aFaire as Record<string, unknown>;
        processHtml(decodeBase64(String(af.contenu || "")));
        if (af.effectue !== undefined) done = Boolean(af.effectue);
      } else if (typeof aFaire === "string") {
        processHtml(decodeBase64(aFaire));
      } else if (typeof contenu === "string") {
        processHtml(decodeBase64(contenu));
      } else if (aFaire === true && devoirId) {
        description = descMap[devoirId] ?? "";
        descriptionHtml = imagesMap[devoirId];
      }

      if (!aFaire && !contenu) continue;

      const firstLine = description.split("\n").find((l) => l.trim()) || description;
      const title = firstLine.length > 80 ? firstLine.substring(0, 80) + "…" : firstLine || subject;
      const documents = devoirId && docsMap[devoirId] ? docsMap[devoirId] : undefined;

      homework.push({
        id: devoirId || `${date}-${Math.random()}`,
        subject,
        title,
        description,
        descriptionHtml,
        documents,
        dueDate: date,
        done,
      });
    }
  }

  return { homework, newToken };
}

export async function markEDHomeworkDone(
  token: string,
  accountId: number,
  homeworkId: string,
  done: boolean
): Promise<{ newToken: string }> {
  const id = Number(homeworkId);
  const { token: newToken } = await edFetch(
    `/Eleves/${accountId}/cahierdetexte.awp?verbe=put`,
    token,
    {
      idDevoirsEffectues:    done ? [id] : [],
      idDevoirsNonEffectues: done ? [] : [id],
    }
  );
  return { newToken };
}

export async function getEDNews(
  token: string,
  accountId: number
): Promise<{ news: NewsEntry[]; newToken: string }> {
  let data: unknown;
  let newToken = token;
  try {
    ({ data, token: newToken } = await edFetch(
      `/eleves/${accountId}/actualites.awp?verbe=get`,
      token
    ));
  } catch {
    // Endpoint may return empty body when school doesn't use this feature
    return { news: [], newToken: token };
  }

  const newsItems: NewsEntry[] = [];
  if (Array.isArray(data)) {
    for (const item of data) {
      newsItems.push({
        id: String(item.id || Math.random()),
        title: item.titre || "Sans titre",
        content: decodeBase64(item.contenu || ""),
        date: item.date || "",
        author: item.auteur || "Établissement",
        category: "info",
      });
    }
  }

  return { news: newsItems, newToken };
}

export async function getEDAttendance(
  token: string,
  accountId: number
): Promise<{ records: AttendanceEntry[]; newToken: string }> {
  const { data, token: newToken } = await edFetch(
    `/eleves/${accountId}/viescolaire.awp?verbe=get`,
    token
  );

  const records: AttendanceEntry[] = [];

  if (data?.absencesRetards) {
    for (const item of data.absencesRetards) {
      records.push({
        id: String(item.id || Math.random()),
        type: item.typeElement === "Retard" ? "late" : "absence",
        date: item.date || "",
        startTime: item.displayDate || "",
        endTime: item.dateFin || undefined,
        reason: item.motif || undefined,
        justified: Boolean(item.justifie),
        subject: item.matiere || undefined,
      });
    }
  }

  if (data?.sanctionsEncouragements) {
    for (const item of data.sanctionsEncouragements) {
      if (item.typeElement === "Punition") {
        records.push({
          id: String(item.id || Math.random()),
          type: "punishment",
          date: item.date || "",
          startTime: "",
          reason: item.motif || item.libelle || "",
          justified: true,
        });
      }
    }
  }

  return { records, newToken };
}

function sanitizeHtml(html: string): string {
  // Replace HTTP img srcs with our proxy; data: URLs stay as-is
  return html.replace(
    /(<img[^>]+src=["'])(?!data:)([^"']+)(["'])/gi,
    (_, pre, src, quote) => {
      const full = src.startsWith("http")
        ? src
        : `https://api.ecoledirecte.com${src.startsWith("/") ? "" : "/"}${src}`;
      return `${pre}/api/homework/image?url=${encodeURIComponent(full)}${quote}`;
    }
  );
}

function hasImages(html: string): boolean {
  return /<img/i.test(html);
}

function stripHtml(str: string): string {
  return str
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeBase64(str: string): string {
  if (!str) return "";
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return str;
  }
}
