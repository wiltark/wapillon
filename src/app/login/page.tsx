"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Chip,
  InputGroup,
  Label,
  Radio,
  RadioGroup,
  SearchField,
  Separator,
  Spinner,
  Tabs,
  TextField,
  Typography,
} from "@heroui/react";
import { useAuth } from "@/lib/auth-context";
import Icon, { type IconName } from "@/components/Icon";
import { RowItem, Rows } from "@/components/ui";
import type { DirectorySchool, NearbyInstance } from "@/lib/services/pronote-schools";

type Service = "ecoledirecte" | "pronote";

interface TwoFactorState {
  question: string;
  propositions: string[];
  rawPropositions: string[];
  twoFAToken: string;
}

/** The Pronote instance the user signs in to. */
interface PronoteSchool {
  name: string;
  url: string;
}

type FinderMode = "name" | "gps" | "url";

/**
 * One screen at a time: pick a service → (Pronote: find the school) → sign in →
 * answer the security question.
 */
type Step =
  | { name: "service" }
  | { name: "school" }
  | { name: "credentials"; service: Service }
  | { name: "twofa"; service: Service; twoFA: TwoFactorState };

const SERVICES: Record<
  Service,
  { name: string; logo: string; hint: string; features: string[] }
> = {
  ecoledirecte: {
    name: "École Directe",
    logo: "/ecoledirecte.svg",
    hint: "Identifiants de l'établissement",
    features: ["Relevé de notes", "Vie scolaire", "Actualités"],
  },
  pronote: {
    name: "Pronote",
    logo: "/pronote.svg",
    hint: "Espace élève",
    features: ["Emploi du temps", "Cahier de textes", "Compétences"],
  },
};

export default function LoginPage() {
  const [step, setStep] = useState<Step>({ name: "service" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState<PronoteSchool | null>(null);
  // Kept here so "Changer" on the credentials screen comes back to the same search
  const [finderMode, setFinderMode] = useState<FinderMode>("name");
  const [schoolQuery, setSchoolQuery] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [answer, setAnswer] = useState({ display: "", raw: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { refreshSession } = useAuth();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (step.name === "twofa") {
        const res = await fetch("/api/auth/2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            twoFAToken: step.twoFA.twoFAToken,
            answer: answer.raw,
            username,
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Réponse incorrecte");
        await refreshSession();
        router.push("/");
        return;
      }

      if (step.name !== "credentials") return;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: step.service,
          username,
          password,
          ...(step.service === "pronote" ? { pronoteUrl: school?.url } : {}),
        }),
      });
      const data = await res.json();

      if (data.twoFactor) {
        setStep({
          name: "twofa",
          service: step.service,
          twoFA: {
            question: data.question,
            propositions: data.propositions || [],
            rawPropositions: data.rawPropositions || [],
            twoFAToken: data.twoFAToken,
          },
        });
        return;
      }

      if (!res.ok) throw new Error(data.error || "Échec de la connexion");
      await refreshSession();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (step.name === "twofa") {
      setAnswer({ display: "", raw: "" });
      setStep({ name: "credentials", service: step.service });
    } else if (step.name === "credentials" && step.service === "pronote") {
      setStep({ name: "school" });
    } else {
      setUsername("");
      setPassword("");
      setSchool(null);
      setSchoolQuery("");
      setFinderMode("name");
      setStep({ name: "service" });
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* ── Left: the form ───────────────────────────────────────────────── */}
      <div className="flex w-full md:w-[480px] shrink-0 items-center justify-center px-6 py-14 overflow-y-auto">
        {/* key remounts on step change so each screen replays its entrance */}
        <div key={step.name} className="wap-rise w-full max-w-[360px] flex flex-col gap-8">
          <Brand />

          {step.name === "service" && (
            <ServiceStep
              onSelect={(service) => {
                setError(null);
                setStep(service === "pronote" ? { name: "school" } : { name: "credentials", service });
              }}
            />
          )}

          {step.name === "school" && (
            <SchoolStep
              mode={finderMode}
              query={schoolQuery}
              onMode={setFinderMode}
              onQuery={setSchoolQuery}
              onPick={(picked) => {
                setSchool(picked);
                setStep({ name: "credentials", service: "pronote" });
              }}
              onBack={goBack}
            />
          )}

          {step.name === "credentials" && (
            <CredentialsStep
              service={step.service}
              username={username}
              password={password}
              school={school}
              showPassword={showPassword}
              loading={loading}
              error={error}
              onUsername={setUsername}
              onPassword={setPassword}
              onChangeSchool={goBack}
              onTogglePassword={() => setShowPassword((v) => !v)}
              onBack={goBack}
              onSubmit={submit}
            />
          )}

          {step.name === "twofa" && (
            <TwoFactorStep
              twoFA={step.twoFA}
              answer={answer}
              loading={loading}
              error={error}
              onAnswer={setAnswer}
              onBack={goBack}
              onSubmit={submit}
            />
          )}
        </div>
      </div>

      {/* ── Right: the showcase ──────────────────────────────────────────── */}
      <Showcase step={step} />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center"
        style={{ background: "var(--accent)" }}
      >
        <Icon name="Logo" size={18} color="var(--accent-foreground)" />
      </div>
      <Typography type="h4">Scoly</Typography>
    </div>
  );
}

/* ── Screen 1 — choose a service ──────────────────────────────────────────── */

function ServiceStep({ onSelect }: { onSelect: (s: Service) => void }) {
  return (
    <>
      <Heading title="Bienvenue" subtitle="Choisissez votre service pour continuer." />

      <div className="flex flex-col gap-3">
        {(Object.keys(SERVICES) as Service[]).map((key) => (
          <Button
            key={key}
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => onSelect(key)}
            className="wap-service justify-start h-auto py-4"
          >
            <span className="h-8 w-8 shrink-0 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SERVICES[key].logo} alt="" className="h-5 w-5 object-contain" />
            </span>
            <span className="flex-1 flex flex-col items-start gap-0.5 min-w-0">
              <span className="font-semibold">{SERVICES[key].name}</span>
              <span className="text-xs font-normal opacity-60">{SERVICES[key].hint}</span>
            </span>
            <Icon name="ChevronRight" size={14} />
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <Separator />
        <Typography type="body-xs" color="muted">
          Vos identifiants ne sont jamais stockés — seul un jeton sécurisé est conservé.
        </Typography>
      </div>
    </>
  );
}

/* ── Screen 1b — find the Pronote school ──────────────────────────────────── */

function SchoolStep({
  mode,
  query,
  onMode,
  onQuery,
  onPick,
  onBack,
}: {
  mode: FinderMode;
  query: string;
  onMode: (m: FinderMode) => void;
  onQuery: (q: string) => void;
  onPick: (s: PronoteSchool) => void;
  onBack: () => void;
}) {
  return (
    <>
      <Heading
        title="Votre établissement"
        subtitle="Retrouvez votre établissement pour vous connecter à Pronote."
      />

      <Tabs
        selectedKey={mode}
        onSelectionChange={(key) => onMode(key as FinderMode)}
        className="w-full flex flex-col gap-5"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Méthode de recherche" className="w-full">
            <Tabs.Tab id="name" className="flex-1">
              Par nom
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="gps" className="flex-1">
              Autour de moi
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="url" className="flex-1">
              Par URL
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="name">
          <NameFinder query={query} onQuery={onQuery} onPick={onPick} />
        </Tabs.Panel>
        <Tabs.Panel id="gps">
          <NearbyFinder onPick={onPick} />
        </Tabs.Panel>
        <Tabs.Panel id="url">
          <UrlFinder onPick={onPick} />
        </Tabs.Panel>
      </Tabs>

      <BackLink onPress={onBack} />
    </>
  );
}

function NameFinder({
  query,
  onQuery,
  onPick,
}: {
  query: string;
  onQuery: (q: string) => void;
  onPick: (s: PronoteSchool) => void;
}) {
  const [results, setResults] = useState<DirectorySchool[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();
  const active = trimmed.length >= 3;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    // Debounced so typing a name doesn't fire a request per keystroke
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/pronote/schools?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Recherche impossible");
        setResults(data);
        setError(null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Recherche impossible");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, trimmed]);

  const pick = async (s: DirectorySchool) => {
    if (resolving) return;
    setResolving(s.uai);
    setError(null);
    try {
      const res = await fetch(`/api/pronote/resolve?uai=${encodeURIComponent(s.uai)}`);
      const data = await res.json();
      if (res.status === 404) {
        throw new Error(
          "Aucun espace Pronote trouvé pour cet établissement. Essayez « Autour de moi » ou « Par URL »."
        );
      }
      if (!res.ok) throw new Error(data.error || "Recherche impossible");
      onPick({ name: s.name, url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recherche impossible");
      setResolving(null);
    }
  };

  const shown = active ? results : null;

  return (
    <div className="flex flex-col gap-3">
      <SearchField value={query} onChange={onQuery} aria-label="Rechercher un établissement">
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="Ex. Lycée Victor Hugo Nantes" autoFocus />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>

      {error && <ErrorAlert message={error} />}

      {!active ? (
        <Typography type="body-xs" color="muted">
          Collèges et lycées — tapez le nom, la ville ou le code UAI.
        </Typography>
      ) : shown === null ? (
        searching && (
          <div className="flex items-center gap-2" style={{ color: "var(--muted)" }}>
            <Spinner color="current" size="sm" />
            <Typography type="body-xs" color="muted">
              Recherche…
            </Typography>
          </div>
        )
      ) : shown.length === 0 ? (
        <Typography type="body-xs" color="muted">
          {searching ? "Recherche…" : "Aucun établissement trouvé."}
        </Typography>
      ) : (
        <SchoolList>
          {shown.map((s) => (
            <SchoolRow
              key={s.uai}
              title={s.name}
              meta={`${s.city} · ${s.postalCode}`}
              pending={resolving === s.uai}
              dim={resolving !== null && resolving !== s.uai}
              onPress={() => pick(s)}
            />
          ))}
        </SchoolList>
      )}
    </div>
  );
}

type NearbyState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "done"; instances: NearbyInstance[] }
  | { status: "error"; message: string };

function NearbyFinder({ onPick }: { onPick: (s: PronoteSchool) => void }) {
  const [state, setState] = useState<NearbyState>({ status: "idle" });

  const locate = () => {
    // Browsers only expose the position on HTTPS (and localhost)
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      setState({
        status: "error",
        message: "La géolocalisation n'est pas disponible ici. Essayez la recherche par nom.",
      });
      return;
    }

    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/pronote/schools?lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Recherche impossible");
          setState({ status: "done", instances: data });
        } catch (err) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Recherche impossible",
          });
        }
      },
      (err) =>
        setState({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Autorisez l'accès à votre position dans le navigateur pour voir les établissements proches."
              : "Impossible de déterminer votre position. Réessayez ou cherchez par nom.",
        }),
      { timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  if (state.status === "done") {
    return state.instances.length === 0 ? (
      <Typography type="body-xs" color="muted">
        Aucun établissement Pronote à proximité.
      </Typography>
    ) : (
      <SchoolList>
        {state.instances.map((i) => (
          <SchoolRow
            key={i.url}
            title={i.name}
            meta={`${i.postalCode} · ${formatDistance(i.distance)}`}
            onPress={() => onPick({ name: i.name, url: i.url })}
          />
        ))}
      </SchoolList>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="lg"
        fullWidth
        isPending={state.status === "locating"}
        onPress={locate}
      >
        {({ isPending }) => (
          <>
            {isPending ? <Spinner color="current" size="sm" /> : <Icon name="MapPin" size={16} />}
            {isPending ? "Localisation…" : "Utiliser ma position"}
          </>
        )}
      </Button>

      {state.status === "error" && <ErrorAlert message={state.message} />}

      <Typography type="body-xs" color="muted">
        Votre position sert uniquement à lister les établissements proches — elle n&apos;est
        pas conservée.
      </Typography>
    </div>
  );
}

function UrlFinder({ onPick }: { onPick: (s: PronoteSchool) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
      onPick({ name: parsed.host, url: parsed.href });
    } catch {
      setError("Adresse invalide — copiez l'URL de la page de connexion Pronote.");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field
        label="URL Pronote"
        type="url"
        value={url}
        onChange={(v) => {
          setUrl(v);
          setError(null);
        }}
        placeholder="https://0000000a.index-education.net/pronote/"
        autoComplete="url"
        required
        autoFocus
      />
      {error && <ErrorAlert message={error} />}
      <Submit loading={false} label="Continuer" pending="" />
    </form>
  );
}

function SchoolList({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-border">
      <Rows>{children}</Rows>
    </div>
  );
}

function SchoolRow({
  title,
  meta,
  pending = false,
  dim = false,
  onPress,
}: {
  title: string;
  meta: string;
  pending?: boolean;
  dim?: boolean;
  onPress: () => void;
}) {
  return (
    <RowItem onPress={onPress} dim={dim}>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{title}</span>
        <span className="block text-xs truncate" style={{ color: "var(--muted)" }}>
          {meta}
        </span>
      </span>
      {pending ? (
        <Spinner color="current" size="sm" />
      ) : (
        <Icon name="ChevronRight" size={13} color="var(--muted)" />
      )}
    </RowItem>
  );
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(metres / 1000)} km`;
}

/* ── Screen 2 — credentials ───────────────────────────────────────────────── */

function CredentialsStep({
  service,
  username,
  password,
  school,
  showPassword,
  loading,
  error,
  onUsername,
  onPassword,
  onChangeSchool,
  onTogglePassword,
  onBack,
  onSubmit,
}: {
  service: Service;
  username: string;
  password: string;
  school: PronoteSchool | null;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
  onUsername: (v: string) => void;
  onPassword: (v: string) => void;
  onChangeSchool: () => void;
  onTogglePassword: () => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <Heading
        title="Connexion"
        subtitle={`Entrez vos identifiants ${SERVICES[service].name}.`}
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {service === "pronote" && school && (
          <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <span
              className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
              style={{ background: "color-mix(in oklch, var(--accent) 14%, transparent)" }}
            >
              <Icon name="GraduationHat" size={16} color="var(--accent)" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold truncate">{school.name}</span>
              <span className="block text-xs truncate" style={{ color: "var(--muted)" }}>
                {school.url.replace(/^https?:\/\//, "")}
              </span>
            </span>
            <Button variant="ghost" size="sm" onPress={onChangeSchool}>
              Changer
            </Button>
          </div>
        )}

        <Field
          label="Identifiant"
          type="text"
          value={username}
          onChange={onUsername}
          placeholder="Votre identifiant"
          autoComplete="username"
          required
          autoFocus
        />

        <Field
          label="Mot de passe"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={onPassword}
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          required
          suffix={
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              onPress={onTogglePassword}
            >
              <Icon name={showPassword ? "Unlock" : "Lock"} size={15} />
            </Button>
          }
        />

        {error && <ErrorAlert message={error} />}

        <Submit loading={loading} label="Se connecter" pending="Connexion…" />
        <BackLink onPress={onBack} />
      </form>
    </>
  );
}

/* ── Screen 3 — security question ─────────────────────────────────────────── */

function TwoFactorStep({
  twoFA,
  answer,
  loading,
  error,
  onAnswer,
  onBack,
  onSubmit,
}: {
  twoFA: TwoFactorState;
  answer: { display: string; raw: string };
  loading: boolean;
  error: string | null;
  onAnswer: (a: { display: string; raw: string }) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <Heading title="Vérification" subtitle={twoFA.question} />

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {twoFA.propositions.length > 0 ? (
          <RadioGroup
            aria-label="Réponse à la question de sécurité"
            value={answer.display}
            onChange={(value) => {
              const i = twoFA.propositions.indexOf(value);
              onAnswer({ display: value, raw: twoFA.rawPropositions[i] ?? value });
            }}
            className="flex flex-col gap-1 max-h-[320px] overflow-y-auto pr-1"
          >
            {twoFA.propositions.map((proposition, i) => (
              // Radio is only the field; Radio.Content is the part that is
              // actually clickable and selectable.
              <Radio key={i} value={proposition}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Label>{proposition}</Label>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        ) : (
          <Field
            label="Votre réponse"
            type="text"
            value={answer.display}
            onChange={(v) => onAnswer({ display: v, raw: v })}
            placeholder="Tapez votre réponse…"
            required
            autoFocus
          />
        )}

        {error && <ErrorAlert message={error} />}

        <Submit
          loading={loading}
          label="Confirmer"
          pending="Vérification…"
          disabled={!answer.display.trim()}
        />
        <BackLink onPress={onBack} />
      </form>
    </>
  );
}

/* ── Shared pieces ────────────────────────────────────────────────────────── */

function Heading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Typography type="h2">{title}</Typography>
      <Typography type="body-sm" color="muted">
        {subtitle}
      </Typography>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  autoFocus,
  suffix,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  suffix?: React.ReactNode;
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      type={type}
      isRequired={required}
      fullWidth
      className="flex flex-col gap-2"
    >
      <Label>{label}</Label>
      <InputGroup fullWidth>
        <InputGroup.Input
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        {suffix && <InputGroup.Suffix>{suffix}</InputGroup.Suffix>}
      </InputGroup>
    </TextField>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator>
        <Icon name="Cross" size={14} />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function Submit({
  loading,
  label,
  pending,
  disabled,
}: {
  loading: boolean;
  label: string;
  pending: string;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" size="lg" fullWidth isPending={loading} isDisabled={disabled}>
      {({ isPending }) => (
        <>
          {isPending && <Spinner color="current" size="sm" />}
          {isPending ? pending : label}
        </>
      )}
    </Button>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="ghost" size="sm" onPress={onPress} className="self-center">
      <Icon name="ArrowLeft" size={13} />
      Retour
    </Button>
  );
}

/* ── Right panel ──────────────────────────────────────────────────────────── */

interface ShowcaseContent {
  logo: string | null;
  icon: IconName | null;
  label: string | null;
  title: string;
  description: string;
  features: string[];
}

function showcaseContent(step: Step): ShowcaseContent {
  switch (step.name) {
    case "service":
      return {
        logo: null,
        icon: "Logo",
        label: null,
        title: "Votre vie scolaire,\nen mieux.",
        description:
          "Notes, emploi du temps, devoirs et actualités — réunis dans une seule interface, rapide et lisible.",
        features: ["Notes & moyennes", "Emploi du temps", "Devoirs & agenda"],
      };
    case "school":
      return {
        logo: SERVICES.pronote.logo,
        icon: null,
        label: SERVICES.pronote.name,
        title: "Trouvez votre\nétablissement.",
        description:
          "Cherchez-le par son nom ou autour de vous : Scoly retrouve l'adresse de votre espace Pronote.",
        features: ["Recherche par nom ou ville", "Établissements à proximité", "Adresse Pronote directe"],
      };
    case "credentials":
      return {
        logo: SERVICES[step.service].logo,
        icon: null,
        label: SERVICES[step.service].name,
        title: `Connecté à\n${SERVICES[step.service].name}.`,
        description:
          "Vos données restent chez votre établissement. Scoly ne fait que les afficher, plus clairement.",
        features: SERVICES[step.service].features,
      };
    case "twofa":
      return {
        logo: null,
        icon: "Shield",
        label: "Sécurité",
        title: "Double\nauthentification.",
        description:
          "Votre établissement protège votre compte avec une vérification en deux étapes.",
        features: ["Connexion sécurisée", "Protection du compte", "Données chiffrées"],
      };
  }
}

function Showcase({ step }: { step: Step }) {
  const content = showcaseContent(step);

  return (
    <div
      className="hidden md:flex flex-1 relative items-center justify-center p-14 overflow-hidden"
      style={{
        background: "oklch(15% 0.015 265)",
        backgroundImage: `
          radial-gradient(ellipse 55% 45% at 72% 28%, color-mix(in oklch, var(--accent) 22%, transparent) 0%, transparent 70%),
          radial-gradient(ellipse 45% 55% at 18% 82%, color-mix(in oklch, var(--accent) 12%, transparent) 0%, transparent 65%)
        `,
      }}
    >
      <div key={step.name} className="relative z-10 flex flex-col gap-8 max-w-[320px]">
        <div
          className="wap-rise h-[76px] w-[76px] rounded-[24px] flex items-center justify-center overflow-hidden"
          style={{
            background: content.logo
              ? "white"
              : "color-mix(in oklch, var(--accent) 18%, transparent)",
            border: "1px solid color-mix(in oklch, var(--accent) 30%, transparent)",
          }}
        >
          {content.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.logo} alt="" className="h-11 w-11 object-contain" />
          ) : (
            <Icon name={content.icon!} size={34} color="var(--accent)" />
          )}
        </div>

        <div className="wap-rise flex flex-col gap-3" style={{ animationDelay: "0.08s" }}>
          {content.label && (
            <Chip color="accent" size="sm" className="w-fit">
              <Chip.Label>{content.label}</Chip.Label>
            </Chip>
          )}
          <h2
            className="text-[2rem] font-bold leading-[1.15] whitespace-pre-line"
            style={{ color: "oklch(98% 0.005 265)" }}
          >
            {content.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(72% 0.015 265)" }}>
            {content.description}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {content.features.map((feature, i) => (
            <div
              key={feature}
              className="wap-rise flex items-center gap-3"
              style={{ animationDelay: `${0.16 + i * 0.07}s` }}
            >
              <span
                className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in oklch, var(--accent) 25%, transparent)" }}
              >
                <Icon name="Check" size={10} color="var(--accent)" />
              </span>
              <span className="text-sm font-medium" style={{ color: "oklch(85% 0.01 265)" }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
