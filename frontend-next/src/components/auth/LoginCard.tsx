"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Leaf, MapPin, Award, Trophy } from "lucide-react";

type Mode = "login" | "register";

export function LoginCard() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? "bg";

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirm, setConfirm] = useState("");

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError(t("errorRequired"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !email || !password) return setError(t("errorRequired"));
    if (password !== confirm) return setError(t("errorMismatch"));
    if (password.length < 8) return setError(t("errorMinLength"));
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.message ?? t("errorGeneric"));
        return;
      }
      router.push(`/${locale}/reports`);
      router.refresh();
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  const bullets = [
    { icon: MapPin, text: t("brandBullets.report") },
    { icon: Award, text: t("brandBullets.earn") },
    { icon: Trophy, text: t("brandBullets.compete") },
  ];

  return (
    <div className="anim-pop-in grid md:grid-cols-2 rounded-3xl border border-brand-border bg-bg-card backdrop-blur shadow-2xl overflow-hidden">
      {/* Brand pane — desktop only */}
      <div className="relative hidden md:flex flex-col justify-between p-10 border-r border-brand-border overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(circle at 25% 20%, var(--color-accent-pink-glow), transparent 60%)" }}
        />
        <div className="relative flex items-center gap-3">
          <span className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-2.5 text-accent-pink">
            <Leaf size={26} strokeWidth={1.8} />
          </span>
          <div className="flex flex-col leading-none">
            <span className="display-heading text-text-1 text-2xl">CHIST</span>
            <span className="text-text-3 text-[10px] uppercase tracking-[0.3em] mt-1">Sofia · Cleaner City</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="display-heading text-text-1 text-3xl leading-tight mb-6">{t("brandTagline")}</h2>
          <ul className="flex flex-col gap-4">
            {bullets.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-text-2 text-sm">
                <span className="mt-0.5 text-accent-pink shrink-0"><Icon size={18} strokeWidth={1.8} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-text-3 text-[10px] uppercase tracking-[0.3em]">Sofia · Beta</div>
      </div>

      {/* Form pane */}
      <div className="p-8 md:p-12 flex flex-col justify-center">
        <div className="flex md:hidden flex-col items-center gap-2 mb-8">
          <div className="rounded-full bg-accent-pink-dim border border-accent-pink-border p-3 text-accent-pink">
            <Leaf size={28} strokeWidth={1.8} />
          </div>
          <div className="display-heading text-text-1 text-3xl">CHIST</div>
          <div className="text-text-3 text-[10px] uppercase tracking-[0.3em]">Sofia · Cleaner City</div>
        </div>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setError(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">{t("tabs.login")}</TabsTrigger>
            <TabsTrigger value="register">{t("tabs.register")}</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={submitLogin} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")} autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")} autoComplete="current-password" required />
              </div>
              {error && <div className="text-status-red text-sm">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? t("submitting") : t("submitLogin")}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={submitRegister} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-username" className="text-text-2 text-xs uppercase tracking-wider">{t("username")}</Label>
                <Input id="reg-username" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("usernamePlaceholder")} autoComplete="username" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-email" className="text-text-2 text-xs uppercase tracking-wider">{t("email")}</Label>
                <Input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")} autoComplete="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-password" className="text-text-2 text-xs uppercase tracking-wider">{t("password")}</Label>
                <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("minPasswordHint")} autoComplete="new-password" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reg-confirm" className="text-text-2 text-xs uppercase tracking-wider">{t("confirmPassword")}</Label>
                <Input id="reg-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("passwordPlaceholder")} autoComplete="new-password" required />
              </div>
              {error && <div className="text-status-red text-sm">{error}</div>}
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? t("submitting") : t("submitRegister")}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
