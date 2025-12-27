"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Shield, CheckCircle2, Clock } from "lucide-react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { getApiUrl } from "@/lib/env";
import { FormValidator } from "@/lib/validation";
import PasswordStrengthIndicator from "@/app/components/PasswordStrengthIndicator";
import PasswordInput from "@/app/components/PasswordInput";
import { ErrorHandler } from "@/lib/utils/errorHandler";
import { userSyncService } from "@/lib/services/userSynchronizationService";
import { companySyncService } from "@/lib/services/companySynchronizationService";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [userType, setUserType] = useState<'candidate' | 'company'>('candidate');
  const router = useRouter();

  // Check URL params for user type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    if (type === 'company') {
      setUserType('company');
    }
  }, []);

  // Real-time validation
  useEffect(() => {
    if (form.name || form.email || form.password) {
      const validation = FormValidator.validateRegistrationForm(form);
      setValidationErrors(validation.errors);
    }
  }, [form]);

  const isFormComplete = () => {
    const validation = FormValidator.validateRegistrationForm(form);
    return validation.isValid && form.name.trim() && form.email.trim() && form.password;
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear errors when user starts typing again
    if (err) {
      setErr(null);
      setShowRetryButton(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    const validation = FormValidator.validateRegistrationForm(form);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErr(null);
    setInfo(null);
    const API_URL = getApiUrl();

    try {
      // 1) Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      // Update Auth profile with name
      await import('firebase/auth').then(m => m.updateProfile(cred.user, { displayName: form.name }));

      // 2) Create Firestore profile document based on user type
      if (userType === 'company') {
        await companySyncService.syncCompanyOnRegistration(cred.user);
      } else {
        await userSyncService.syncUserOnRegistration(cred.user, { displayName: form.name });
      }

      // 3) Send email verification
      await sendEmailVerification(cred.user);

      // 4) Try to register in backend (optional, don't fail if it doesn't work)
      try {
        const backendRes = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!backendRes.ok) {
          console.warn("Backend registration failed, but Firebase registration succeeded");
        }
      } catch (backendError) {
        console.warn("Backend registration failed:", backendError);
        // Don't throw here, Firebase registration already succeeded
      }

      if (userType === 'company') {
        setInfo(
          "¡Cuenta de empresa creada exitosamente! 🎉 Tu perfil empresarial ha sido configurado. Revisa tu correo y valida tu email. Serás redirigido al panel de empresa en unos segundos..."
        );

        // Redirect to company panel after successful registration
        setTimeout(() => {
          router.replace("/company");
        }, 4000);
      } else {
        setInfo(
          "¡Cuenta creada exitosamente! 🎉 Tu perfil ha sido configurado. Revisa tu correo y valida tu email. Serás redirigido al login en unos segundos..."
        );

        // Redirect to login after successful registration
        setTimeout(() => {
          router.replace("/login?registered=true");
        }, 4000);
      }

    } catch (e: any) {
      console.error('Registration error:', e);

      // Handle specific permission errors
      if (e.message && e.message.includes('Permisos insuficientes')) {
        setErr("Error de configuración: No se pueden crear perfiles de usuario. El administrador debe configurar las reglas de Firestore. Contacta al soporte técnico.");
        setShowRetryButton(true);
      } else {
        // Use enhanced error handling for other errors
        const errorResult = ErrorHandler.handleAuthError(e);
        const errorMessage = ErrorHandler.formatErrorMessage(errorResult);

        setErr(errorMessage);
        setShowRetryButton(ErrorHandler.shouldShowRetryButton(errorResult));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* NAVBAR (mismo estilo que home/login) */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            <div className="relative w-32 h-10">
              <Image
                src="/logo.png"
                alt="RouteJob Logo"
                fill
                className="object-contain object-left dark:invert dark:hue-rotate-180"
                priority
              />
            </div>
          </div>

          <Link
            href="/"
            className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* BACKGROUND PATTERN */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* REGISTER SECTION (solo card, sin imagen lateral) */}
      <section className="pt-28 pb-20 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-5rem)]">
        <div className="max-w-md w-full">
          <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-8 sm:p-9">
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-zinc-900 via-zinc-900 to-emerald-600 dark:from-zinc-100 dark:via-zinc-100 dark:to-emerald-400 bg-clip-text text-transparent mb-2 leading-tight">
                {userType === 'company' ? 'Crea tu cuenta empresarial' : 'Crea tu cuenta'}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {userType === 'company'
                  ? 'Únete a cientos de empresas que ya usan RouteJob para encontrar talento.'
                  : 'Únete a cientos de personas que ya usan RouteJob.'
                }
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Name Field */}
                <div>
                  <input
                    name="name"
                    placeholder="Nombre completo *"
                    className={`w-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm border rounded-2xl px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 ${validationErrors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500/60'
                      : 'border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500/60'
                      }`}
                    value={form.name}
                    onChange={onChange}
                    required
                  />
                  {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Correo electrónico *"
                    className={`w-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-sm border rounded-2xl px-4 py-3 text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 ${validationErrors.email
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500/60'
                      : 'border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500/60'
                      }`}
                    value={form.email}
                    onChange={onChange}
                    required
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <PasswordInput
                    name="password"
                    placeholder="Contraseña segura *"
                    value={form.password}
                    onChange={onChange}
                    onFocus={() => setShowPasswordStrength(true)}
                    hasError={!!validationErrors.password}
                    required
                    size="lg"
                    className="rounded-2xl"
                  />
                  {validationErrors.password && (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
                  )}

                  {/* Password Strength Indicator */}
                  {showPasswordStrength && form.password && (
                    <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <PasswordStrengthIndicator
                        password={form.password}
                        showRequirements={true}
                      />
                    </div>
                  )}
                </div>
              </div>

              {err && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-3 text-red-700 dark:text-red-400 text-sm">
                  <p>{err}</p>
                  {showRetryButton && (
                    <button
                      type="button"
                      onClick={() => {
                        setErr(null);
                        setShowRetryButton(false);
                      }}
                      className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800 underline"
                    >
                      Intentar de nuevo
                    </button>
                  )}
                </div>
              )}

              {info && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-2xl p-3 text-green-700 dark:text-green-400 text-sm">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isFormComplete()}
                className={`group relative w-full py-3.5 text-base font-bold rounded-2xl overflow-hidden flex items-center justify-center gap-2 transition-all ${isFormComplete() && !loading
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] shadow-xl shadow-zinc-900/15 active:scale-95"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                  }`}
              >
                <div
                  className={`absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${isFormComplete() && !loading
                    ? "group-hover:translate-x-full"
                    : ""
                    }`}
                />
                <span className="relative z-10">
                  {loading ? "Creando..." : "Crear cuenta gratis"}
                </span>
                {isFormComplete() && !loading && (
                  <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/login"
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  Inicia sesión
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Seguro</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Gratis</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">30s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER SIMPLE */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800 pt-16 pb-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-zinc-400">
            <p>© {new Date().getFullYear()} RouteJob Inc. Santiago, Chile.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
