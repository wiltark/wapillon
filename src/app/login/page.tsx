"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
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

/** Three screens, one at a time: pick a service → sign in → answer the security question. */
type Step =
  | { name: "service" }
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
      setPronoteUrl("");
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
                setStep({ name: "credentials", service });
              }}
            />
          )}

          {step.name === "credentials" && (
            <CredentialsStep
              service={step.service}
              username={username}
              password={password}
              pronoteUrl={pronoteUrl}
              showPassword={showPassword}
              loading={loading}
              error={error}
              onUsername={setUsername}
              onPassword={setPassword}
              onPronoteUrl={setPronoteUrl}
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
        <Papicon name="Butterfly" size={18} color="var(--accent-foreground)" />
      </div>
      <Typography type="h4">Wapillon</Typography>
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
            <Papicon name="ChevronRight" size={14} />
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

/* ── Screen 2 — credentials ───────────────────────────────────────────────── */

function CredentialsStep({
  service,
  username,
  password,
  pronoteUrl,
  showPassword,
  loading,
  error,
  onUsername,
  onPassword,
  onPronoteUrl,
  onTogglePassword,
  onBack,
  onSubmit,
}: {
  service: Service;
  username: string;
  password: string;
  pronoteUrl: string;
  showPassword: boolean;
  loading: boolean;
  error: string | null;
  onUsername: (v: string) => void;
  onPassword: (v: string) => void;
  onPronoteUrl: (v: string) => void;
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
        {service === "pronote" && (
          <Field
            label="URL de l'établissement"
            type="url"
            value={pronoteUrl}
            onChange={onPronoteUrl}
            placeholder="https://0000000a.index-education.net/pronote/"
            autoComplete="url"
            required
          />
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
              <Papicon name={showPassword ? "Unlock" : "Lock"} size={15} />
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
        <Papicon name="Cross" size={14} />
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
      <Papicon name="ArrowLeft" size={13} />
      Retour
    </Button>
  );
}

/* ── Right panel ──────────────────────────────────────────────────────────── */

function Showcase({ step }: { step: Step }) {
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
            <Papicon name={content.icon!} size={34} color="var(--accent)" />
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
                <Papicon name="Check" size={10} color="var(--accent)" />
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
