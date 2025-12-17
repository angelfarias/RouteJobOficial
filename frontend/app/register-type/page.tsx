"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Users, Building2, ArrowRight } from "lucide-react";

export default function RegisterTypePage() {
  const [selectedType, setSelectedType] = useState<'candidate' | 'company' | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (selectedType === 'candidate') {
      router.push('/register?type=candidate');
    } else if (selectedType === 'company') {
      router.push('/register?type=company');
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* NAVBAR */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 shadow-sm">
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
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
            className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 transition-colors px-4 py-2 rounded-xl hover:bg-zinc-100"
          >
            ← Home
          </Link>
        </div>
      </header>

      {/* BACKGROUND PATTERN */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* SELECTION SECTION */}
      <section className="pt-28 pb-20 flex items-center justify-center px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4 leading-tight">
              ¿Cómo quieres usar RouteJob?
            </h1>
            <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
              Selecciona el tipo de cuenta que mejor se adapte a tus necesidades
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Candidate Option */}
            <div
              onClick={() => setSelectedType('candidate')}
              className={`relative cursor-pointer rounded-3xl border-2 p-8 transition-all hover:scale-[1.02] ${
                selectedType === 'candidate'
                  ? 'border-emerald-500 bg-emerald-50 shadow-xl shadow-emerald-100'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-lg'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                  selectedType === 'candidate' ? 'bg-emerald-500' : 'bg-zinc-100'
                }`}>
                  <Users className={`w-8 h-8 ${selectedType === 'candidate' ? 'text-white' : 'text-zinc-600'}`} />
                </div>
                
                <h3 className="text-xl font-bold text-zinc-900 mb-3">
                  Busco Empleo
                </h3>
                
                <p className="text-zinc-600 mb-6 leading-relaxed">
                  Encuentra oportunidades laborales cerca de ti. Crea tu perfil, postula a vacantes y conecta con empresas.
                </p>
                
                <ul className="text-sm text-zinc-500 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Búsqueda inteligente de empleos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Postulación rápida en 1 click
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    Empleos cerca de tu ubicación
                  </li>
                </ul>
              </div>
              
              {selectedType === 'candidate' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </div>

            {/* Company Option */}
            <div
              onClick={() => setSelectedType('company')}
              className={`relative cursor-pointer rounded-3xl border-2 p-8 transition-all hover:scale-[1.02] ${
                selectedType === 'company'
                  ? 'border-blue-500 bg-blue-50 shadow-xl shadow-blue-100'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-lg'
              }`}
            >
              <div className="text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                  selectedType === 'company' ? 'bg-blue-500' : 'bg-zinc-100'
                }`}>
                  <Building2 className={`w-8 h-8 ${selectedType === 'company' ? 'text-white' : 'text-zinc-600'}`} />
                </div>
                
                <h3 className="text-xl font-bold text-zinc-900 mb-3">
                  Soy Empresa
                </h3>
                
                <p className="text-zinc-600 mb-6 leading-relaxed">
                  Publica vacantes, gestiona sucursales y encuentra el talento ideal para tu empresa.
                </p>
                
                <ul className="text-sm text-zinc-500 space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Gestión de múltiples sucursales
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Publicación de vacantes geolocalizada
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Acceso a base de candidatos
                  </li>
                </ul>
              </div>
              
              {selectedType === 'company' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white"></div>
                </div>
              )}
            </div>
          </div>

          {/* Continue Button */}
          <div className="text-center">
            <button
              onClick={handleContinue}
              disabled={!selectedType}
              className={`group relative px-8 py-4 text-base font-bold rounded-2xl overflow-hidden flex items-center justify-center gap-2 mx-auto transition-all ${
                selectedType
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-[1.02] shadow-xl shadow-zinc-900/15 active:scale-95"
                  : "bg-zinc-100 text-zinc-500 cursor-not-allowed"
              }`}
            >
              <div
                className={`absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${
                  selectedType ? "group-hover:translate-x-full" : ""
                }`}
              />
              <span className="relative z-10">
                Continuar
              </span>
              {selectedType && (
                <ArrowRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
            </button>
            
            <p className="mt-4 text-sm text-zinc-500">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Inicia sesión
              </Link>
            </p>
          </div>
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