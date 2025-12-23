"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import {
  MapPin,
  Briefcase,
  Clock,
  Mail,
  Phone,
  Search,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  ArrowRight,
  Star,
  Building2,
  Zap,
  Award,
  Shield,
  Menu,
  X,
  ChevronRight,
  Quote
} from "lucide-react"

// Utility simple para unir clases (opcional, pero buena práctica)
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ")

// Componente para animar secciones al entrar en vista
const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Parallax para el Hero
  const { scrollY: scrollYProgress } = useScroll()
  const yHero = useTransform(scrollYProgress, [0, 500], [0, 150])

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const stats = [
    { number: "126k+", label: "Empleos Activos", icon: Briefcase },
    { number: "50k+", label: "Usuarios Felices", icon: Users },
    { number: "99%", label: "Tasa de Éxito", icon: Target },
    { number: "110+", label: "Partners", icon: Building2 },
  ]

  const features = [
    {
      icon: Search,
      title: "Búsqueda IA",
      description: "Algoritmo que entiende lo que buscas, no solo palabras clave.",
      color: "bg-emerald-500",
      colSpan: "md:col-span-2",
    },
    {
      icon: MapPin,
      title: "Geo-Localización",
      description: "Trabajos a < 15 min de tu casa.",
      color: "bg-blue-500",
      colSpan: "md:col-span-1",
    },
    {
      icon: TrendingUp,
      title: "Career Path",
      description: "Proyectamos tu crecimiento salarial.",
      color: "bg-purple-500",
      colSpan: "md:col-span-1",
    },
    {
      icon: Clock,
      title: "Speed Apply",
      description: "Postula en 1 click. Sin formularios eternos.",
      color: "bg-orange-500",
      colSpan: "md:col-span-2",
    },
  ]

  const testimonials = [
    {
      name: "María González",
      role: "Administración",
      text: "Encontré trabajo a 3 cuadras de mi casa. La calidad de vida que gané no tiene precio.",
      rating: 5,
    },
    {
      name: "Carlos Ramírez",
      role: "Técnico Senior",
      text: "La plataforma es increíblemente rápida. Las empresas realmente responden.",
      rating: 5,
    },
    {
      name: "Andrea Silva",
      role: "Ventas",
      text: "El sistema de match es asombroso. Me sugirió puestos que no sabía que existían.",
      rating: 5,
    },
  ]

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">

      {/* BACKGROUND PATTERN GLOBAL */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
      </div>

      {/* NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
          ? "h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/50 shadow-sm"
          : "h-20 bg-transparent"
          }`}
      >
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            {/* Logo Placeholder si no carga la imagen */}
            <div className="relative w-40 h-24"> {/* <-- CAMBIO 1: Logo más grande y a la izquierda */}
              <Image
                src="/logo.png"
                alt="RouteJob Logo"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-8">
            {["Cómo funciona", "Características", "Testimonios", "Contacto"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(" ", "-")}`}
                className="text-sm font-medium text-zinc-600 hover:text-emerald-600 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* AUTH BUTTONS */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => window.location.href = "/login"}
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => window.location.href = "/register"}
              className="group relative px-5 py-2 text-sm font-semibold text-white bg-zinc-900 rounded-full overflow-hidden transition-all hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20 active:scale-95"
            >
              <span className="relative z-10">Comenzar</span>
              <div className="absolute inset-0 h-full w-full bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </button>
          </div>

          {/* MOBILE TOGGLE */}
          <button
            className="md:hidden p-2 text-zinc-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-zinc-100 p-6 flex flex-col gap-4 shadow-xl md:hidden"
          >
            {["Cómo funciona", "Características", "Testimonios"].map((item) => (
              <a key={item} href="#" className="text-lg font-medium text-zinc-800 py-2 border-b border-zinc-50">{item}</a>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <button className="w-full py-3 rounded-xl bg-zinc-100 font-semibold text-zinc-900">Iniciar Sesión</button>
              <button className="w-full py-3 rounded-xl bg-emerald-600 font-semibold text-white">Crear Cuenta</button>
            </div>
          </motion.div>
        )}
      </header>

      {/* HERO SECTION - AJUSTADA (Más compacta arriba) */}
      <section className="relative pt-20 pb-12 lg:pt-24 lg:pb-24 overflow-hidden"> {/* <-- CAMBIO 2a: Reducción del padding superior */}
        <div className="mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* LEFT CONTENT */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-start"
            >
              {/* Badge más pegado al título */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">La plataforma #1 en Chile</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-zinc-900 mb-4 leading-[1.1]">
                Tu próximo empleo <br />
                <span className="relative inline-block text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-500">
                  está a la vuelta.
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-emerald-400 opacity-40" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-zinc-500 mb-6 max-w-lg leading-relaxed">
                Conectamos talento con oportunidades locales reales. Sin estafas, sin esperas interminables, con respuestas en 24 horas.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={() => window.location.href = "/register?type=candidate"}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-zinc-900/10"
                >
                  Buscar Empleo Ahora
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.location.href = "/register?type=company"}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-zinc-900 border border-zinc-200 rounded-2xl font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                >
                  Soy Empresa
                </button>
              </div>

              <div className="mt-8 flex items-center gap-4 text-sm text-zinc-500">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200 overflow-hidden relative">
                      {/* Nota: Asegúrate de haber arreglado el next.config.mjs para las imágenes */}
                      <Image
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                        alt="user"
                        fill
                        unoptimized // Add this
                      />

                    </div>
                  ))}
                </div>
                <p>Unete a <span className="font-bold text-zinc-900">500+</span> profesionales.</p>
              </div>
            </motion.div>

            {/* RIGHT IMAGE - Updated to square format without phone frame */}
            <motion.div
              style={{ y: yHero }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative mx-auto lg:ml-auto w-full max-w-[480px] lg:max-w-[520px] mt-8 lg:mt-0"
            >
              <div className="relative aspect-square w-full">
                {/* Decorative blobs behind */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-emerald-300/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-5 -left-5 w-64 h-64 bg-blue-300/30 rounded-full blur-3xl" />

                {/* Main Featured Image Container - Square format without phone frame */}
                <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl shadow-zinc-900/20 border border-zinc-200/50 bg-gradient-to-br from-emerald-50 to-blue-50">
                  <Image
                    src="/destacada.png"
                    alt="RouteJob Platform Preview"
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Enhanced floating UI elements */}
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/30"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-zinc-500 font-medium leading-none mb-1">Estado de postulación</p>
                        <p className="text-base font-bold text-zinc-900 leading-none">¡Entrevista Agendada! 🎉</p>
                      </div>
                    </div>
                  </motion.div>
                  
            
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* STATS TICKER */}
      <section className="py-10 border-y border-zinc-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1} className="flex flex-col items-center justify-center text-center">
                <div className="text-3xl md:text-4xl font-bold text-zinc-900 mb-1 tracking-tight">{stat.number}</div>
                <div className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                  <stat.icon className="w-4 h-4 text-emerald-500" />
                  {stat.label}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section id="caracteristicas" className="py-24 relative bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 mb-4">Todo lo que necesitas para <span className="text-emerald-600">brillar</span></h2>
            <p className="text-zinc-500 text-lg">Hemos optimizado cada paso del proceso de búsqueda para que tú solo te preocupes de elegir.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FadeIn key={i} delay={i * 0.1} className={`${feature.colSpan} group relative overflow-hidden bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300`}>
                <div className={`absolute top-0 right-0 p-32 opacity-5 rounded-full blur-3xl ${feature.color} group-hover:opacity-10 transition-opacity`} />

                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 ${feature.color} shadow-lg shadow-emerald-900/5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-bold text-zinc-900 mb-2">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{feature.description}</p>

                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                  <div className="p-2 rounded-full bg-zinc-100 text-zinc-900">
                    <ArrowRight size={16} />
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* DARK MODE STEPS SECTION */}
      <section id="como-funciona" className="py-24 bg-zinc-900 text-white relative overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                Consigue empleo en <br />
                <span className="text-emerald-400">3 simples pasos.</span>
              </h2>
              <p className="text-zinc-400 text-lg mb-8">Olvídate de imprimir currículums o caminar bajo el sol buscando carteles.</p>

              <div className="space-y-8">
                {[
                  { title: "Crea tu perfil", desc: "Sube tu CV o completa tus datos en 2 minutos.", icon: Users },
                  { title: "Aplica inteligente", desc: "El sistema filtra lo que mejor se adapta a ti.", icon: Zap },
                  { title: "Comienza a trabajar", desc: "Coordina la entrevista directamente por chat.", icon: Briefcase },
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="shrink-0 w-12 h-12 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center font-bold text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">{step.title}</h4>
                      <p className="text-zinc-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Visual representation of steps - simplified abstract cards */}
              <div className="relative z-10 bg-zinc-800/50 backdrop-blur-xl border border-zinc-700 rounded-3xl p-8 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-8 border-b border-zinc-700 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-zinc-500 text-xs font-mono">dashboard.tsx</div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-zinc-700 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-zinc-700 rounded w-1/2 animate-pulse" />
                  <div className="h-32 bg-zinc-700/50 rounded-xl mt-4 border border-zinc-600/50 flex items-center justify-center">
                    <span className="text-emerald-400 font-mono text-sm">Uploading CV... 100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonios" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">Historias reales</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.1} className="bg-zinc-50 p-8 rounded-3xl relative group hover:bg-emerald-50/30 transition-colors duration-300">
                <Quote className="absolute top-8 right-8 text-zinc-200 group-hover:text-emerald-200 transition-colors w-10 h-10" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-600 mb-6 relative z-10">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 relative overflow-hidden">
                    <Image
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${t.name}`}
                      alt={t.name}
                      fill
                      unoptimized // Add this
                    />

                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 text-sm">{t.name}</div>
                    <div className="text-xs text-zinc-500">{t.role}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-linear-to-b from-emerald-900/20 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-40" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">¿Listo para cambiar tu futuro?</h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto">Únete a la comunidad de empleo de mayor crecimiento en la región. <br></br>Gratis para postulantes, siempre.</p>

            <button
              onClick={() => window.location.href = "/register-type"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-lg shadow-emerald-500/25"
            >
              Crear Cuenta Gratis
              <ChevronRight className="w-5 h-5" />
            </button>

          </div>
        </div>
      </section>

      {/* FOOTER SIMPLE */}
      <footer id="contacto" className="bg-white border-t border-zinc-100 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              {/* LOGO AGRANDADO AQUÍ: width={180} height={90} */}
              <Image src="/logo.png" alt="Logo" width={180} height={90} className="mb-4" />
              <p className="text-zinc-500 text-sm max-w-sm">
                Facilitando la conexión entre el talento local y las mejores empresas de servicios y retail.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#" className="hover:text-emerald-600">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-emerald-600">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-600">Prensa</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#" className="hover:text-emerald-600">Términos</a></li>
                <li><a href="#" className="hover:text-emerald-600">Privacidad</a></li>
                <li><a href="#" className="hover:text-emerald-600">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-zinc-100 text-sm text-zinc-400">
            <p>© {new Date().getFullYear()} RouteJob Inc. Santiago, Chile.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              {/* Social icons placeholders */}
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
              <div className="w-5 h-5 bg-zinc-200 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}