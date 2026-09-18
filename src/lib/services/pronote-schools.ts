// Finding a school's Pronote instance before login — by name through the
// French school directory, or by position through Index Education's geolocation.
import * as pawnote from "pawnote";

const DIRECTORY_URL =
  "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records";

const UAI_PATTERN = /^\d{7}[A-Z]$/;

/** A school from the national directory; its Pronote URL is resolved on pick. */
export interface DirectorySchool {
  uai: string;
  name: string;
  city: string;
  postalCode: string;
}

/** A Pronote instance near a position, URL already known. */
export interface NearbyInstance {
  name: string;
  url: string;
  postalCode: string;
  /** Metres from the searched position. */
  distance: number;
}

interface DirectoryRecord {
  identifiant_de_l_etablissement: string;
  nom_etablissement: string;
  nom_commune: string;
  code_postal: string;
  latitude: number;
  longitude: number;
}

async function queryDirectory(where: string, limit: number): Promise<DirectoryRecord[]> {
  const url = new URL(DIRECTORY_URL);
  url.searchParams.set(
    "select",
    "identifiant_de_l_etablissement,nom_etablissement,nom_commune,code_postal,latitude,longitude"
  );
  url.searchParams.set("where", where);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("Annuaire des établissements indisponible");
  const data = (await res.json()) as { results: DirectoryRecord[] };
  return data.results;
}

/**
 * Every word of the query must appear in the school name, its town, its postal
 * code (a department number works too) or its UAI. Only open collèges and lycées
 * are kept — that's where Pronote lives.
 */
export async function searchSchools(query: string): Promise<DirectorySchool[]> {
  // Splitting on anything that isn't a letter or digit also keeps quotes out of the ODSQL string
  const words = query
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2)
    .slice(0, 6);
  if (words.length === 0) return [];

  const where = [
    ...words.map((w) => {
      const clauses = [`search(nom_etablissement, "${w}")`, `search(nom_commune, "${w}")`];
      if (/^\d+$/.test(w)) clauses.push(`startswith(code_postal, "${w}")`);
      if (UAI_PATTERN.test(w.toUpperCase()))
        clauses.push(`identifiant_de_l_etablissement = "${w.toUpperCase()}"`);
      return `(${clauses.join(" or ")})`;
    }),
    `type_etablissement in ("Collège", "Lycée", "EREA")`,
    `etat = "OUVERT"`,
    `latitude is not null`,
  ].join(" and ");

  const records = await queryDirectory(where, 12);
  return records.map((r) => ({
    uai: r.identifiant_de_l_etablissement,
    name: r.nom_etablissement,
    city: r.nom_commune,
    postalCode: r.code_postal,
  }));
}

export async function nearbyInstances(
  latitude: number,
  longitude: number,
  limit = 25
): Promise<NearbyInstance[]> {
  const instances = await pawnote.geolocation({ latitude, longitude });
  return [...instances]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((i) => ({
      name: i.name,
      url: i.url,
      postalCode: String(i.postalCode),
      distance: Math.round(i.distance),
    }));
}

/**
 * Pronote instances hosted by Index Education carry the school's UAI in their
 * URL, so geolocating at the school's own coordinates and matching on it is exact.
 * Returns null when the school isn't in Index Education's registry.
 */
export async function resolvePronoteUrl(uai: string): Promise<string | null> {
  const code = uai.toUpperCase();
  if (!UAI_PATTERN.test(code)) return null;

  const [school] = await queryDirectory(`identifiant_de_l_etablissement = "${code}"`, 1);
  if (!school) return null;

  const instances = await pawnote.geolocation({
    latitude: school.latitude,
    longitude: school.longitude,
  });
  const match = instances.find((i) => i.url.toLowerCase().includes(code.toLowerCase()));
  return match?.url ?? null;
}
