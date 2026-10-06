"use client";

import { CircleAlert, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { api, errorMessage } from "@/lib/api-client";
import type { SessionUser } from "@/types/user";

type Mode = "login" | "signup";
type Errors = Partial<Record<"name" | "email" | "password", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(mode: Mode, name: string, email: string, password: string): Errors {
  const e: Errors = {};
  if (mode === "signup" && name.trim().length < 2) e.name = "Enter your name (at least 2 characters).";
  if (!email.trim()) e.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email.trim())) e.email = "That email address doesn't look right. Check for typos.";
  if (!password) e.password = "Enter your password.";
  else if (mode === "signup" && password.length < 8) e.password = "Use at least 8 characters.";
  return e;
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  `block h-12 w-full rounded-control border bg-surface px-3 text-base text-ink outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/30 ${
    invalid ? "border-danger" : "border-line"
  }`;

const DEMO = { email: "buyer@apex.demo", password: "ApexDemo2026!" };
const DEMO_SELLER = { email: "seller@apex.demo", password: "ApexDemo2026!" };

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const { setUser } = useAuth();
  const router = useRouter();
  const uid = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate(mode, name, email, password);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      document.getElementById(`${uid}-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const user = await api<SessionUser>(mode === "login" ? "/auth/login" : "/auth/signup", {
        method: "POST",
        body: mode === "login" ? { email: email.trim(), password } : { name: name.trim(), email: email.trim(), password },
      });
      setUser(user);
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  const describedBy = (field: keyof Errors, hasHint = false) =>
    errors[field] ? `${uid}-${field}-error` : hasHint ? `${uid}-${field}-hint` : undefined;

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-control border border-danger/40 bg-deal-soft p-4 text-sm">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <div>
            <p className="font-bold text-deal">There was a problem</p>
            <p className="mt-0.5 text-ink">{formError}</p>
          </div>
        </div>
      )}

      {mode === "signup" && (
        <Field id={`${uid}-name`} label="Your name" error={errors.name}>
          <input
            id={`${uid}-name`}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={describedBy("name")}
            className={inputClass(!!errors.name)}
            placeholder="First and last name"
          />
        </Field>
      )}

      <Field id={`${uid}-email`} label="Email" error={errors.email}>
        <input
          id={`${uid}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          aria-describedby={describedBy("email")}
          className={inputClass(!!errors.email)}
        />
      </Field>

      <Field
        id={`${uid}-password`}
        label="Password"
        error={errors.password}
        hint={mode === "signup" ? "At least 8 characters." : undefined}
      >
        <div className="relative">
          <input
            id={`${uid}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={describedBy("password", mode === "signup")}
            className={`${inputClass(!!errors.password)} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-muted hover:text-ink"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={busy}>
        {mode === "login" ? "Sign in" : "Create your Apex account"}
      </Button>

      {mode === "login" && (
        <div className="rounded-control bg-surface-tint p-4 text-sm">
          <p className="font-bold">Trying the demo?</p>
          <p className="mt-1 text-ink-muted">Fill in a demo account, then select Sign in.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: "Demo buyer", ...DEMO },
              { label: "Demo seller", ...DEMO_SELLER },
            ].map((d) => (
              <Button
                key={d.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(d.email);
                  setPassword(d.password);
                  setErrors({});
                  setFormError(null);
                }}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <p className="border-t border-line pt-5 text-center text-sm text-ink-muted">
        {mode === "login" ? "New to Apex? " : "Already have an account? "}
        <Link
          href={`${mode === "login" ? "/signup" : "/login"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-bold text-accent-text hover:underline"
        >
          {mode === "login" ? "Create your account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
