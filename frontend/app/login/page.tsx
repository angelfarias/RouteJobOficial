"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Shield, Mail, Lock, Menu, X } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FormValidator } from "@/lib/validation";
import { ErrorHandler } from "@/lib/utils/errorHandler";
import PasswordInput from "@/app/components/PasswordInput";
import { userSyncService } from "@/lib/services/userSynchronizationService";
import { FirebaseDebugger } from "@/lib/utils/firebaseDebug";
import { LoginDiagnostic } from "@/lib/utils/loginDiagnostic";
import { UserManager } from "@/lib/utils/userManager";

const FadeIn = ({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showRetryButton, setShowRetryButton] = useState(false);
  const router = useRouter();

  // Check for registration success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
      setInfo("¡Registro completado! Ahora puedes iniciar sesión con tu cuenta");
      // Clean up URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  // Real-time validation
  useEffect(() => {
    if (email || password) {
      const validation = FormValidator.validateLoginForm({ email, password });
      setValidationErrors(validation.errors);
    }
  }, [email, password]);

  const isFormComplete = () => {
    const validation = FormValidator.validateLoginForm({ email, password });
    return validation.isValid && email.trim() && password.trim();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    const validation = FormValidator.validateLoginForm({ email, password });
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setLoading(true);
    setErr(null);
    setInfo(null);
    
    try {
      console.log('🔍 Attempting Firebase authentication only...');
      
      // Step 1: Try to login with Firebase Auth only
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        console.log('✅ Login successful:', userCredential.user.uid);
        setInfo('Login exitoso. Redirigiendo...');
      } catch (loginError: any) {
        console.log('❌ Login failed, trying to create account:', loginError.code);
        
        if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
          // User doesn't exist, create account
          const result = await UserManager.loginOrRegister(email.trim(), password);
          if (result.success) {
            setInfo(`${result.message}. Redirigiendo...`);
          } else {
            throw new Error(result.message);
          }
        } else {
          throw loginError;
        }
      }
      
      // Step 2: Skip Firestore sync for now (due to permission issues)
      console.log('⚠️ Skipping Firestore sync due to permission issues');
      
      // Step 3: Redirect to dashboard
      setTimeout(() => {
        router.replace("/dashboard");
      }, 1000);
      
    } catch (e: any) {
      console.error('❌ Authentication error:', e);
      
      // Handle specific Firebase Auth errors
      let errorMessage = 'Error de autenticación';
      if (e.code) {
        switch (e.code) {
          case 'auth/user-not-found':
            errorMessage = 'Usuario no encontrado. ¿Deseas crear una cuenta?';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Contraseña incorrecta';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'Credenciales inválidas. Verifica tu email y contraseña';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Error de conexión. Verifica tu internet';
            break;
          default:
            errorMessage = e.message || 'Error de autenticación';
        }
      } else {
        errorMessage = e.message || 'Error inesperado';
      }
      
      setErr(errorMessage);
      setShowRetryButton(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* BACKGROUND PATTERN */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 shadow-sm">
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
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
            href="/"
            className="hidden sm:inline-flex text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100"
          >
            ← Home
          </Link>

          <button
            className="sm:hidden p-2 text-zinc-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-zinc-100 p-4 flex flex-col gap-3 shadow-xl"
          >
            <Link
              href="/"
              className="text-sm font-medium text-zinc-800 py-2 border-b border-zinc-50"
            >
              Home
            </Link>
            <div className="flex flex-col gap-2 mt-2">
              <Link
                href="/login"
                className="w-full py-2.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-900 text-center"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-sm font-semibold text-white text-center"
              >
                Crear cuenta
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* LOGIN SECTION COMPACTA */}
      <section className="pt-24 pb-16 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md">
          <FadeIn>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl border border-zinc-200 shadow-xl p-6 sm:p-7 max-w-sm mx-auto">
              <div className="text-center mb-5">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-600 bg-clip-text text-transparent mb-1 leading-tight">
                  ¡Bienvenido!
                </h1>
                <p className="text-xs text-zinc-500">
                  Ingresa a tu cuenta en segundos
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-3">
                  {/* Email Field */}
                  <div>
                    <div className="relative group">
                      <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                        validationErrors.email 
                          ? 'text-red-500 group-focus-within:text-red-600' 
                          : 'text-emerald-500 group-focus-within:text-emerald-600'
                      }`} />
                      <input
                        type="email"
                        placeholder="Correo electrónico"
                        className={`w-full pl-9 pr-3 py-2.5 bg-white/60 backdrop-blur-sm border rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all hover:border-zinc-300 ${
                          validationErrors.email 
                            ? 'border-red-300 focus:ring-red-500 focus:border-red-500/60' 
                            : 'border-zinc-200 focus:ring-emerald-500 focus:border-emerald-500/60'
                        }`}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          // Clear errors when user starts typing again
                          if (err) {
                            setErr(null);
                            setShowRetryButton(false);
                          }
                        }}
                        required
                      />
                    </div>
                    {validationErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="relative group">
                      <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors z-10 ${
                        validationErrors.password 
                          ? 'text-red-500 group-focus-within:text-red-600' 
                          : 'text-emerald-500 group-focus-within:text-emerald-600'
                      }`} />
                      <PasswordInput
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          // Clear errors when user starts typing again
                          if (err) {
                            setErr(null);
                            setShowRetryButton(false);
                          }
                        }}
                        hasError={!!validationErrors.password}
                        required
                        size="md"
                        className="pl-9"
                      />
                    </div>
                    {validationErrors.password && (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>
                    )}
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

                {info && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-xs">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !isFormComplete()}
                  className={`group relative w-full py-2.5 text-sm font-bold rounded-xl overflow-hidden flex items-center justify-center gap-2 transition-all ${
                    isFormComplete() && !loading
                      ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] shadow-lg shadow-zinc-900/15 active:scale-95"
                      : "bg-zinc-100 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${
                      isFormComplete() && !loading
                        ? "group-hover:translate-x-full"
                        : ""
                    }`}
                  />
                  <span className="relative z-10">
                    {loading ? "Ingresando..." : "Iniciar sesión"}
                  </span>
                  {isFormComplete() && !loading && (
                    <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  )}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-zinc-400 font-medium">
                    o
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <Link
                  href="/forgot-password"
                  className="block w-full text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-all py-2 px-3 border border-emerald-200/60 rounded-xl hover:border-emerald-300 hover:bg-emerald-50"
                >
                  ¿Olvidaste tu contraseña?
                </Link>

                <Link
                  href="/register"
                  className="block w-full text-xs font-semibold text-zinc-700 hover:text-zinc-900 transition-all py-2 px-3 border-2 border-zinc-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50"
                >
                  Crear nueva cuenta
                </Link>
                
              
              </div>

              <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-zinc-500 font-medium">Seguro</span>
                </div>

              </div>
            </div>
          </FadeIn>
        </div>
      </section>
                  {/* FOOTER SIMPLE */}
      <footer className="border-t border-zinc-100 pt-16 pb-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-zinc-400">
            <p>© {new Date().getFullYear()} RouteJob Inc. Santiago, Chile.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
