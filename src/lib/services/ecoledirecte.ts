// École Directe API service
// Compatible with BlocksDirecte format (Wapillon)

import type {
  AccountRole,
  ChildInfo,
  StudentInfo,
  TimetableEntry,
  Grade,
  HomeworkEntry,
  HomeworkDocument,
  InvoiceEntry,
  MessageEntry,
  MessageFolder,
  NewsEntry,
  AttendanceEntry,
} from "./types";
import { renderMarkdown, sanitizeMessageHtml } from "../sanitize";

/**
 * Routes a remote image through our own proxy, so opening a message does not
 * disclose the reader's IP to whoever hosts the image.
 */
function proxyImageUrl(src: string): string {
  if (src.startsWith("data:")) return src;
  const full = src.startsWith("http")
    ? src
    : `https://api.ecoledirecte.com${src.startsWith("/") ? "" : "/"}${src}`;
  return `/api/homework/image?url=${encodeURIComponent(full)}`;
}

/**
 * Teachers are served from a different host than families and students. Getting
 * this wrong returns an auth error rather than a helpful message, so the host is
 * always derived from the role instead of being hardcoded.
 */
const HOSTS = {
  default: "https://api.ecoledirecte.com/v3",
  teacher: "https://apip.ecoledirecte.com/v3",
} as const;

const API_VERSION = "7.8.2";
const USER_AGENT = `BlocksDirecte/1.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 EDMOBILE v${API_VERSION}`;

/** `typeCompte` as École Directe reports it on the login response. */
export function roleFromTypeCompte(typeCompte: string): AccountRole {
  if (typeCompte === "P") return "teacher";
  // "1" is a family account; "2" appears for some second-guardian logins.
  if (typeCompte === "1" || typeCompte === "2") return "parent";
  return "student";
}

function baseUrlFor(role: AccountRole): string {
  return role === "teacher" ? HOSTS.teacher : HOSTS.default;
}

function getHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    // ED is lenient about the missing "application/" prefix, but the correct
    // media type is what its own clients send.
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": USER_AGENT,
  };
  if (token) h["X-Token"] = token;
  return h;
}

function makeBody(data: Record<string, unknown> = {}): string {
  return new URLSearchParams({ data: JSON.stringify(data) }).toString();
}

async function edFetch(
  path: string,
  token: string,
  body: Record<string, unknown> = {},
  role: AccountRole = "student"
) {
  let res: Response;
  try {
    res = await fetch(`${baseUrlFor(role)}${path}`, {
      method: "POST",
      headers: getHeaders(token),
      body: makeBody(body),
    });
  } catch (err) {
    // A transport failure is not an auth problem — say so, rather than letting
    // the caller report "identifiants incorrects" for a network outage.
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Impossible de joindre École Directe (${cause})`);
  }

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

/**
 * Parent accounts address each child through their own id, and ED requires the
 * token context to be renewed before querying a child other than the default.
 */
export async function renewEDToken(
  token: string,
  accountId: number
): Promise<{ newToken: string }> {
  const { token: newToken } = await edFetch("/renewtoken.awp?verbe=post", token, {
    idEleve: accountId,
  });
  return { newToken };
}

export interface EDLoginResult {
  student: StudentInfo;
  token: string;
  accountId: number;
  accountType: string;
  role: AccountRole;
  /** Parent accounts only: every child this login can see. */
  children: ChildInfo[];
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

/**
 * Children hang off `profile.eleves` on a family account. Each one carries its
 * own id, which is what every student-scoped call must use — not the parent's.
 */
function extractChildren(account: Record<string, unknown>): ChildInfo[] {
  const profile = account.profile as Record<string, unknown> | undefined;
  const eleves = profile?.eleves;
  if (!Array.isArray(eleves)) return [];

  return (eleves as Record<string, unknown>[]).map((child) => {
    const classe = child.classe as Record<string, string> | undefined;
    return {
      id: String(child.id),
      firstName: (child.prenom as string) || "",
      lastName: (child.nom as string) || "",
      className: classe?.libelle || classe?.code || "",
      school: (child.nomEtablissement as string) || (account.nomEtablissement as string) || "",
    };
  });
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

  // Login always goes through the family/student host: the response is what
  // tells us whether this is a teacher, so the host cannot be chosen earlier.
  const res = await fetch(`${HOSTS.default}/login.awp?v=${API_VERSION}`, {
    method: "POST",
    headers: getHeaders(),
    body: makeBody(loginPayload),
  });

  const twoFAToken = res.headers.get("2fa-token") || "";
  const json = await res.json();

  // Code 250 = 2FA required
  if (json.code === 250) {
    // Fetch the 2FA question using the 2FA-Token header
    const questionRes = await fetch(`${HOSTS.default}/connexion/doubleauth.awp?verbe=get&v=${API_VERSION}`, {
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

  const accountType = account.typeCompte || "E";
  const role = roleFromTypeCompte(accountType);
  const children = role === "parent" ? extractChildren(account) : [];

  // A family account's own name is the parent's; the header should show whose
  // data is on screen, so fall back to the first child when there is one.
  const student =
    role === "parent" && children.length > 0
      ? { ...children[0], id: children[0].id }
      : extractAccount(account);

  return {
    student,
    token: json.token,
    accountId: account.id,
    accountType,
    role,
    children,
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
  const res = await fetch(`${HOSTS.default}/connexion/doubleauth.awp?verbe=post&v=${API_VERSION}`, {
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

/* ── Messaging ────────────────────────────────────────────────────────────── */

/**
 * Mailboxes live under a different segment per role: families and students each
 * read their own, teachers read theirs from the `apip` host.
 */
function messagesPath(role: AccountRole, accountId: number): string {
  if (role === "teacher") return `/enseignants/${accountId}/messages.awp`;
  if (role === "parent") return `/familles/${accountId}/messages.awp`;
  return `/eleves/${accountId}/messages.awp`;
}

export async function getEDMessages(
  token: string,
  accountId: number,
  role: AccountRole = "student",
  folderId?: number
): Promise<{ messages: MessageEntry[]; folders: MessageFolder[]; newToken: string }> {
  const query = new URLSearchParams({ verbe: "get", orderBy: "date", order: "desc" });
  if (folderId != null) query.set("idClasseur", String(folderId));

  let data: unknown;
  let newToken = token;
  try {
    ({ data, token: newToken } = await edFetch(
      `${messagesPath(role, accountId)}?${query.toString()}`,
      token,
      { anneeMessages: "" },
      role
    ));
  } catch {
    // Schools can disable messaging entirely; an empty inbox beats an error page.
    return { messages: [], folders: [], newToken: token };
  }

  const payload = data as Record<string, unknown> | undefined;
  const received = (payload?.messages as Record<string, unknown> | undefined)?.received;

  const folders: MessageFolder[] = Array.isArray(payload?.classeurs)
    ? (payload.classeurs as Record<string, unknown>[]).map((c) => ({
        id: Number(c.id),
        name: String(c.libelle || "Dossier"),
      }))
    : [];

  const messages: MessageEntry[] = Array.isArray(received)
    ? (received as Record<string, unknown>[]).map((m) => {
        const from = m.from as Record<string, unknown> | undefined;
        const files = m.files as Record<string, unknown>[] | undefined;
        return {
          id: String(m.id),
          subject: String(m.subject || "(sans objet)"),
          preview: stripHtml(decodeBase64(String(m.content || ""))).slice(0, 180),
          from: from
            ? `${from.prenom ?? ""} ${from.nom ?? ""}`.trim() || String(from.libelle ?? "")
            : "Expéditeur inconnu",
          date: String(m.date || ""),
          read: Boolean(m.read),
          hasAttachments: Array.isArray(files) && files.length > 0,
        };
      })
    : [];

  return { messages, folders, newToken };
}

/** Fetches one message's body. ED only sends it on the detail call. */
export async function getEDMessage(
  token: string,
  accountId: number,
  messageId: string,
  role: AccountRole = "student"
): Promise<{ message: MessageEntry | null; newToken: string }> {
  const base = messagesPath(role, accountId).replace(/\.awp$/, "");
  const { data, token: newToken } = await edFetch(
    `${base}/${messageId}.awp?verbe=get&mode=destinataire`,
    token,
    {},
    role
  );

  const m = data as Record<string, unknown> | undefined;
  if (!m) return { message: null, newToken };

  const from = m.from as Record<string, unknown> | undefined;
  const rawFiles = m.files as Record<string, unknown>[] | undefined;
  const raw = decodeBase64(String(m.content || ""));

  const files: HomeworkDocument[] | undefined = Array.isArray(rawFiles)
    ? rawFiles.map((f) => ({
        id: Number(f.id),
        name: String(f.libelle || f.name || `Fichier ${f.id}`),
      }))
    : undefined;

  // Senders write either HTML or plain text; plain text gets the small Markdown
  // pass so lists and emphasis survive. Both end up sanitized either way.
  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const body = looksLikeHtml
    ? sanitizeMessageHtml(raw, proxyImageUrl)
    : sanitizeMessageHtml(renderMarkdown(raw), proxyImageUrl);

  return {
    message: {
      id: String(m.id ?? messageId),
      subject: String(m.subject || "(sans objet)"),
      preview: stripHtml(raw).slice(0, 180),
      bodyHtml: body,
      from: from
        ? `${from.prenom ?? ""} ${from.nom ?? ""}`.trim() || String(from.libelle ?? "")
        : "Expéditeur inconnu",
      date: String(m.date || ""),
      read: true,
      hasAttachments: Boolean(files?.length),
      files,
    },
    newToken,
  };
}

/* ── Invoices (parent accounts) ───────────────────────────────────────────── */

export async function getEDInvoices(
  token: string,
  accountId: number
): Promise<{ invoices: InvoiceEntry[]; newToken: string }> {
  let data: unknown;
  let newToken = token;
  try {
    ({ data, token: newToken } = await edFetch(
      `/familles/${accountId}/factures.awp?verbe=get`,
      token,
      {},
      "parent"
    ));
  } catch {
    // Not every school bills through ED.
    return { invoices: [], newToken: token };
  }

  const list = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown> | undefined)?.factures as unknown[] | undefined) ?? [];

  const invoices: InvoiceEntry[] = (list as Record<string, unknown>[]).map((f) => ({
    id: String(f.id ?? f.idFacture ?? Math.random()),
    label: String(f.libelle || f.nom || "Facture"),
    date: String(f.date || f.dateFacture || ""),
    amount: parseFloat(String(f.montant ?? f.montantTTC ?? 0).replace(",", ".")) || 0,
    paid: Boolean(f.solde === 0 || f.paye),
    documentId: f.idDocument != null ? Number(f.idDocument) : undefined,
  }));

  return { invoices, newToken };
}

/* ── Teacher timetable ────────────────────────────────────────────────────── */

/**
 * Teachers read their schedule from `P/{id}` on the apip host.
 *
 * NOTE: written from community API docs and not verified against a real teacher
 * account — the shape of each entry may need adjusting.
 */
export async function getEDTeacherTimetable(
  token: string,
  accountId: number,
  dateStart: string,
  dateEnd: string
): Promise<{ entries: TimetableEntry[]; newToken: string }> {
  const { data, token: newToken } = await edFetch(
    `/P/${accountId}/emploidutemps.awp?verbe=get`,
    token,
    { dateDebut: dateStart, dateFin: dateEnd, avecTrous: false },
    "teacher"
  );

  const entries: TimetableEntry[] = [];
  if (Array.isArray(data)) {
    for (const item of data as Record<string, unknown>[]) {
      entries.push({
        id: String(item.id ?? Math.random()),
        subject: String(item.matiere || item.text || "Cours"),
        // For a teacher the useful "who" is the class, not the teacher.
        teacher: String(item.classe || item.classeLibelle || ""),
        room: String(item.salle || ""),
        start: String(item.start_date || item.debut || ""),
        end: String(item.end_date || item.fin || ""),
        color: String(item.color || "#3b82f6"),
        status: item.isAnnule ? "cancelled" : item.isModifie ? "modified" : "normal",
      });
    }
  }

  return { entries, newToken };
}
