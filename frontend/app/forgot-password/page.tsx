"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield, Clock, Mail, CheckCircle2 } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";
import { EmailValidator } from "@/lib/validation";
import { ErrorHandler } from "@/lib/utils/errorHandler";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);

  const isValidEmail = () => {
    const result = EmailValidator.validateFormat(email);
    return result.isValid && email.trim();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail()) {
      setErr("Por favor, ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);
    setErr(null);
    
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess(true);
    } catch (e: any) {
      const errorResult = ErrorHandler.handleAuthError(e);
      const errorMessage = ErrorHandler.formatErrorMessage(errorResult);
      
      setErr(errorMessage);
      setShowRetryButton(ErrorHandler.shouldShowRetryButton(errorResult));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
        {/* BACKGROUND PATTERN */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        </div>

        {/* NAVBAR */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 shadow-sm">
          <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="relative w-32 h-10">
                <Image
                  src="/logo.png"
                  alt="RouteJob Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
            </div>
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100"
            >
              ← Volver al login
            </Link>
          </div>
        </header>

        {/* SUCCESS MESSAGE */}
        <section className="pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-md">
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-zinc-200 shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">
                ¡Correo enviado!
              </h1>
              
              <p className="text-sm text-zinc-600 mb-6">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. 
                Revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
              
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Volver al login
                </Link>
                
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="block w-full py-2.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Enviar a otro correo
                </button>
              </div>
              
              <p className="text-xs text-zinc-400 mt-4">
                ¿No recibiste el correo? Revisa tu carpeta de spam o intenta de nuevo en unos minutos.
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* BACKGROUND PATTERN */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 shadow-sm">
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="relative w-32 h-10">
              <Image
                src="/logo.png"
                alt="RouteJob Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100"
          >
            ← Volver al login
          </Link>
        </div>
      </header>

      {/* FORGOT PASSWORD FORM */}
      <section className="pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md">
          <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-zinc-200 shadow-xl p-6 sm:p-7">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-600 bg-clip-text text-transparent mb-2 leading-tight">
                Recuperar contraseña
              </h1>
              <p className="text-xs text-zinc-500">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/60 backdrop-blur-sm border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/60 transition-all hover:border-zinc-300"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (err) {
                        setErr(null);
                        setShowRetryButton(false);
                      }
                    }}
                    required
                  />
                </div>
              </div>

              {err && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs">
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

              <button
                type="submit"
                disabled={loading || !isValidEmail()}
                className={`group relative w-full py-2.5 text-sm font-bold rounded-xl overflow-hidden flex items-center justify-center gap-2 transition-all ${
                  isValidEmail() && !loading
                    ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] shadow-lg shadow-zinc-900/15 active:scale-95"
                    : "bg-zinc-100 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${
                    isValidEmail() && !loading ? "group-hover:translate-x-full" : ""
                  }`}
                />
                <span className="relative z-10">
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </span>
                {isValidEmail() && !loading && (
                  <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-zinc-100 text-center">
              <p className="text-xs text-zinc-500">
                ¿Recordaste tu contraseña?{" "}
                <Link
                  href="/login"
                  className="text-emerald-600 font-semibold hover:text-emerald-700"
                >
                  Iniciar sesión
                </Link>
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-zinc-500 font-medium">Seguro</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-zinc-500 font-medium">Instantáneo</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}