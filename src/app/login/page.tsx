"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Chip,
  InputGroup,
  Label,
  Radio,
  RadioGroup,
  Separator,
  Spinner,
  TextField,
  Typography,
} from "@heroui/react";
import { useAuth } from "@/lib/auth-context";
import Papicon from "@/components/Papicon";

type Service = "ecoledirecte" | "pronote";

interface TwoFactorState {
  question: string;
  propositions: string[];
  rawPropositions: string[];
  twoFAToken: string;
}

/** The login flow is a small state machine: pick a service → enter credentials → maybe answer 2FA. */
type Step =
  | { name: "service" }
  | { name: "credentials"; service: Service }
  | { name: "twofa"; service: Service; twoFA: TwoFactorState };

const SERVICES: Record<
  Service,
  { name: string; logo: string; tagline: string; features: string[] }
> = {
  ecoledirecte: {
    name: "École Directe",
    logo: "/ecoledirecte.svg",
    tagline: "Identifiants de l'établissement",
    features: ["Relevé de notes", "Vie scolaire", "Actualités"],
  },
  pronote: {
    name: "Pronote",
    logo: "/pronote.svg",
    tagline: "Espace élève",
    features: ["Emploi du temps", "Cahier de textes", "Compétences"],
  },
};

export default function LoginPage() {
  const [step, setStep] = useState<Step>({ name: "service" });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pronoteUrl, setPronoteUrl] = useState("");
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
          ...(step.service === "pronote" ? { pronoteUrl } : {}),
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
    } else {
      setUsername("");
      setPassword("");
      setStep({ name: "service" });
    }
  };

  const heading =
    step.name === "twofa"
      ? { title: "Vérification", sub: "Votre établissement demande une confirmation supplémentaire." }
      : step.name === "credentials"
        ? { title: "Connexion", sub: `Entrez vos identifiants ${SERVICES[step.service].name}.` }
        : { title: "Bienvenue", sub: "Choisissez votre service pour continuer." };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 md:flex-none md:w-[460px] shrink-0 items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-[360px] flex flex-col gap-7">
          <Brand />

          <div className="flex flex-col gap-1.5">
            <Typography type="h2">{heading.title}</Typography>
            <Typography type="body-sm" color="muted">
              {heading.sub}
            </Typography>
          </div>

          {/* key remounts the panel on step change, replaying the entry animation */}
          <div key={step.name} className="wap-rise flex flex-col gap-5">
            {step.name === "service" && (
              <ServicePicker
                onSelect={(service) => {
                  setError(null);
                  setStep({ name: "credentials", service });
                }}
              />
            )}

            {step.name === "credentials" && (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <BackButton onPress={goBack} />

                <div className="flex flex-col gap-4">
                  {step.service === "pronote" && (
                    <Field
                      label="URL de l'établissement"
                      type="url"
                      value={pronoteUrl}
                      onChange={setPronoteUrl}
                      placeholder="https://0000000a.index-education.net/pronote/"
                      autoComplete="url"
                      required
                    />
                  )}

                  <Field
                    label="Identifiant"
                    type="text"
                    value={username}
                    onChange={setUsername}
                    placeholder="Votre identifiant"
                    autoComplete="username"
                    required
                  />

                  <Field
                    label="Mot de passe"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="Votre mot de passe"
                    autoComplete="current-password"
                    required
                    suffix={
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label={
                          showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                        }
                        onPress={() => setShowPassword((v) => !v)}
                      >
                        <Papicon name={showPassword ? "Unlock" : "Lock"} size={15} />
                      </Button>
                    }
                  />
                </div>

                {error && <ErrorAlert message={error} />}

                <SubmitButton loading={loading} label="Se connecter" pending="Connexion…" />
              </form>
            )}

            {step.name === "twofa" && (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <BackButton onPress={goBack} />

                <Card variant="secondary">
                  <Card.Content className="flex items-start gap-3 py-4">
                    <Papicon name="Shield" size={18} color="var(--accent)" />
                    <Typography type="body-sm" className="leading-relaxed">
                      {step.twoFA.question}
                    </Typography>
                  </Card.Content>
                </Card>

                {step.twoFA.propositions.length > 0 ? (
                  <RadioGroup
                    aria-label="Réponse à la question de sécurité"
                    value={answer.display}
                    onChange={(value) => {
                      const i = step.twoFA.propositions.indexOf(value);
                      setAnswer({ display: value, raw: step.twoFA.rawPropositions[i] ?? value });
                    }}
                    className="flex flex-col gap-2 max-h-[280px] overflow-y-auto"
                  >
                    {step.twoFA.propositions.map((proposition, i) => (
                      <Radio key={i} value={proposition}>
                        {proposition}
                      </Radio>
                    ))}
                  </RadioGroup>
                ) : (
                  <Field
                    label="Votre réponse"
                    type="text"
                    value={answer.display}
                    onChange={(v) => setAnswer({ display: v, raw: v })}
                    placeholder="Tapez votre réponse…"
                    required
                    autoFocus
                  />
                )}

                {error && <ErrorAlert message={error} />}

                <SubmitButton
                  loading={loading}
                  label="Confirmer"
                  pending="Vérification…"
                  disabled={!answer.display.trim()}
                />
              </form>
            )}
          </div>

          {step.name === "service" && (
            <>
              <Separator />
              <Typography type="body-xs" color="muted">
                Vos identifiants ne sont jamais stockés — seul un jeton sécurisé est conservé.
              </Typography>
            </>
          )}
        </div>
      </div>

      {/* ── Brand panel ──────────────────────────────────────────────────── */}
      <ShowcasePanel step={step} />
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
        <Papicon name="Butterfly" size={18} color="var(--accent-foreground)" />
      </div>
      <Typography type="h4">Wapillon</Typography>
    </div>
  );
}

function ServicePicker({ onSelect }: { onSelect: (s: Service) => void }) {
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(SERVICES) as Service[]).map((key) => {
        const service = SERVICES[key];
        return (
          <Card
            key={key}
            variant="default"
            className="wap-card cursor-pointer transition-all"
            onClick={() => onSelect(key)}
          >
            <Card.Content className="flex items-center gap-4 py-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={service.logo} alt="" className="h-7 w-7 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <Typography type="body" className="font-semibold">
                  {service.name}
                </Typography>
                <Typography type="body-xs" color="muted">
                  {service.tagline}
                </Typography>
              </div>
              <Papicon name="ChevronRight" size={15} color="var(--muted)" />
            </Card.Content>
          </Card>
        );
      })}
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

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="ghost" size="sm" onPress={onPress} className="w-fit gap-1.5">
      <Papicon name="ArrowLeft" size={13} />
      Retour
    </Button>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert status="danger">
      <Alert.Indicator>
        <Papicon name="Cross" size={14} />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

function SubmitButton({
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
    <Button
      type="submit"
      variant="primary"
      size="lg"
      fullWidth
      isDisabled={loading || disabled}
      className="gap-2"
    >
      {loading && <Spinner size="sm" color="current" />}
      {loading ? pending : label}
    </Button>
  );
}

/** Right-hand panel: mirrors the current step so the two halves stay in sync. */
function ShowcasePanel({ step }: { step: Step }) {
  const content =
    step.name === "service"
      ? {
          logo: null,
          icon: "Butterfly",
          label: null,
          title: "Votre vie scolaire,\nen mieux.",
          description:
            "Notes, emploi du temps, devoirs et actualités — réunis dans une seule interface, rapide et lisible.",
          features: ["Notes & moyennes", "Emploi du temps", "Devoirs & agenda"],
        }
      : step.name === "credentials"
        ? {
            logo: SERVICES[step.service].logo,
            icon: null,
            label: SERVICES[step.service].name,
            title: `Connecté à\n${SERVICES[step.service].name}.`,
            description:
              "Vos données restent chez votre établissement. Wapillon ne fait que les afficher, plus clairement.",
            features: SERVICES[step.service].features,
          }
        : {
            logo: null,
            icon: "Shield",
            label: "Sécurité",
            title: "Double\nauthentification.",
            description:
              "Votre établissement protège votre compte avec une vérification en deux étapes.",
            features: ["Connexion sécurisée", "Protection du compte", "Données chiffrées"],
          };

  return (
    <div
      className="hidden md:flex flex-1 relative items-center justify-center p-14 overflow-hidden"
      style={{
        background: "oklch(13% 0.01 144)",
        backgroundImage: `
          radial-gradient(ellipse 55% 45% at 72% 28%, oklch(76% 0.21 144 / 0.14) 0%, transparent 70%),
          radial-gradient(ellipse 45% 55% at 18% 82%, oklch(76% 0.21 144 / 0.08) 0%, transparent 65%)
        `,
      }}
    >
      <div className="wap-orb absolute -top-24 -right-16 h-[420px] w-[420px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(76% 0.21 144 / 0.16) 0%, transparent 70%)" }}
      />
      <div className="wap-orb-alt absolute -bottom-28 -left-20 h-[360px] w-[360px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, oklch(76% 0.21 144 / 0.10) 0%, transparent 70%)" }}
      />

      <div key={step.name} className="relative z-10 flex flex-col gap-8 max-w-[320px]">
        <div
          className="wap-rise h-[76px] w-[76px] rounded-[24px] flex items-center justify-center overflow-hidden"
          style={{
            background: content.logo ? "white" : "oklch(76% 0.21 144 / 0.14)",
            border: "1px solid oklch(76% 0.21 144 / 0.25)",
            boxShadow: "0 0 40px oklch(76% 0.21 144 / 0.18)",
          }}
        >
          {content.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.logo} alt="" className="h-11 w-11 object-contain" />
          ) : (
            <Papicon name={content.icon!} size={34} color="oklch(76% 0.21 144)" />
          )}
        </div>

        <div className="wap-rise flex flex-col gap-3" style={{ animationDelay: "0.08s" }}>
          {content.label && (
            <Chip color="accent" variant="secondary" size="sm" className="w-fit">
              <Chip.Label>{content.label}</Chip.Label>
            </Chip>
          )}
          <h2
            className="text-[2rem] font-bold leading-[1.15] whitespace-pre-line"
            style={{ color: "oklch(97% 0.005 144)" }}
          >
            {content.title}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(68% 0.01 144)" }}>
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
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "oklch(76% 0.21 144 / 0.2)" }}
              >
                <Papicon name="Check" size={10} color="oklch(76% 0.21 144)" />
              </div>
              <span className="text-sm font-medium" style={{ color: "oklch(82% 0.006 144)" }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
