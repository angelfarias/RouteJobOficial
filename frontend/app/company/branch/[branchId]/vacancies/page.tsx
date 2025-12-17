"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import Image from "next/image";
import { getApiUrl } from "@/lib/env";
import CategoryFilter from "@/app/components/CategoryFilter";
import AudioRecorder from "@/app/components/AudioRecorder";
import ContentEnhancer from "@/app/components/ContentEnhancer";
import CompanyVacancyApplications from "@/app/components/CompanyVacancyApplications";

type Vacancy = {
  id: string;
  title: string;
  description: string;
  salaryMin?: number;
  salaryMax?: number;
  jornada: string;
  tipoContrato: string;
  active: boolean;
  categories?: any[];
  createdAt: any;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  comuna?: string;
  ciudad?: string;
  latitude: number;
  longitude: number;
};

export default function BranchVacanciesPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loadingVacancies, setLoadingVacancies] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    salaryMin: "",
    salaryMax: "",
    jornada: "full-time",
    tipoContrato: "permanent",
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savingVacancy, setSavingVacancy] = useState(false);

  // Audio recording state
  const [useAudioInput, setUseAudioInput] = useState(false);
  const [audioRecordings, setAudioRecordings] = useState<{
    title?: { blob: Blob; transcription: string };
    description?: { blob: Blob; transcription: string };
  }>({});
  const [showEnhancer, setShowEnhancer] = useState<{
    field: 'title' | 'description' | null;
    text: string;
  }>({ field: null, text: '' });
  const [recordingInProgress, setRecordingInProgress] = useState<{
    title: boolean;
    description: boolean;
  }>({ title: false, description: false });

  // Application management state
  const [selectedVacancyForApplications, setSelectedVacancyForApplications] = useState<Vacancy | null>(null);
  const [showApplicationsView, setShowApplicationsView] = useState(false);

  const router = useRouter();
  const params = useParams();
  const branchId = params.branchId as string;

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, [router]);

  // Load branch info and vacancies
  useEffect(() => {
    if (!user || !branchId) return;

    const loadData = async () => {
      setLoadingVacancies(true);
      try {
        const API_URL = getApiUrl();
        
        // Load branch info (we'll need to create this endpoint or get it from company data)
        // For now, we'll create a mock branch
        setBranch({
          id: branchId,
          name: "Sucursal Principal",
          address: "Dirección de ejemplo",
          latitude: -33.4489,
          longitude: -70.6693,
        });

        // Load vacancies for this branch
        const vacanciesResp = await fetch(`${API_URL}/vacancies/branch/${branchId}`);
        if (vacanciesResp.ok) {
          const vacanciesData = await vacanciesResp.json();
          
          // Load categories for each vacancy
          const vacanciesWithCategories = await Promise.all(
            vacanciesData.map(async (vacancy: Vacancy) => {
              try {
                const categoriesResp = await fetch(`${API_URL}/vacancies/${vacancy.id}/categories`);
                if (categoriesResp.ok) {
                  const categories = await categoriesResp.json();
                  return { ...vacancy, categories };
                }
              } catch (error) {
                console.error(`Error loading categories for vacancy ${vacancy.id}:`, error);
              }
              return vacancy;
            })
          );
          
          setVacancies(vacanciesWithCategories);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingVacancies(false);
      }
    };

    loadData();
  }, [user, branchId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAudioRecording = (field: 'title' | 'description', audioBlob: Blob, transcription?: string) => {
    if (transcription) {
      setAudioRecordings(prev => ({
        ...prev,
        [field]: { blob: audioBlob, transcription }
      }));
      
      // Update form data with transcription
      setFormData(prev => ({ ...prev, [field]: transcription }));
      
      // Mark recording as complete
      setRecordingInProgress(prev => ({ ...prev, [field]: false }));
    }
  };

  const handleAudioError = (error: string) => {
    console.error('Audio recording error:', error);
    // You could show a toast notification here
  };

  const handleRecordingStart = (field: 'title' | 'description') => {
    setRecordingInProgress(prev => ({ ...prev, [field]: true }));
  };

  const handleEnhanceContent = (field: 'title' | 'description') => {
    const text = formData[field];
    if (text.trim()) {
      setShowEnhancer({ 
        field, 
        text: text.trim() 
      });
    }
  };

  const handleEnhancementAccept = (enhancedText: string) => {
    if (showEnhancer.field) {
      setFormData(prev => ({ 
        ...prev, 
        [showEnhancer.field!]: enhancedText 
      }));
    }
    setShowEnhancer({ field: null, text: '' });
  };

  const handleEnhancementReject = () => {
    setShowEnhancer({ field: null, text: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !branch) return;

    // Validate that required fields are not empty
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Por favor, completa el título y la descripción del puesto antes de guardar.');
      return;
    }

    // If using audio input, check if there are any pending recordings
    if (useAudioInput) {
      const titleEmpty = !formData.title.trim();
      const descriptionEmpty = !formData.description.trim();
      const titleRecording = recordingInProgress.title;
      const descriptionRecording = recordingInProgress.description;
      
      if (titleRecording || descriptionRecording) {
        alert('Hay una grabación en progreso. Por favor, espera a que termine antes de guardar la vacante.');
        return;
      }
      
      if (titleEmpty || descriptionEmpty) {
        alert('Por favor, completa la grabación y transcripción de audio antes de guardar la vacante.');
        return;
      }
    }

    setSavingVacancy(true);
    try {
      const API_URL = getApiUrl();
      
      const vacancyData = {
        ...formData,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        salaryMax: formData.salaryMax ? parseInt(formData.salaryMax) : undefined,
        latitude: branch.latitude,
        longitude: branch.longitude,
        categoryIds: selectedCategories,
        assignedBy: user.uid,
      };

      let vacancy: Vacancy;
      
      if (editingVacancy) {
        // Update existing vacancy
        const resp = await fetch(`${API_URL}/vacancies/${editingVacancy.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': user.uid,
          },
          body: JSON.stringify(vacancyData),
        });
        vacancy = await resp.json();
        
        // Update categories separately
        if (selectedCategories.length > 0) {
          await fetch(`${API_URL}/vacancies/${editingVacancy.id}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: selectedCategories, assignedBy: user.uid }),
          });
        }
        
        setVacancies(prev => prev.map(v => v.id === editingVacancy.id ? { ...vacancy, categories: [] } : v));
      } else {
        // Create new vacancy
        const resp = await fetch(`${API_URL}/vacancies/company-id/${branchId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-uid': user.uid,
          },
          body: JSON.stringify(vacancyData),
        });
        vacancy = await resp.json();
        setVacancies(prev => [...prev, { ...vacancy, categories: [] }]);
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        salaryMin: "",
        salaryMax: "",
        jornada: "full-time",
        tipoContrato: "permanent",
      });
      setSelectedCategories([]);
      setShowForm(false);
      setEditingVacancy(null);
      setAudioRecordings({});
      setUseAudioInput(false);
      setShowEnhancer({ field: null, text: '' });
      setRecordingInProgress({ title: false, description: false });
    } catch (error) {
      console.error("Error saving vacancy:", error);
    } finally {
      setSavingVacancy(false);
    }
  };

  const handleEdit = (vacancy: Vacancy) => {
    setEditingVacancy(vacancy);
    setFormData({
      title: vacancy.title,
      description: vacancy.description,
      salaryMin: vacancy.salaryMin?.toString() || "",
      salaryMax: vacancy.salaryMax?.toString() || "",
      jornada: vacancy.jornada,
      tipoContrato: vacancy.tipoContrato,
    });
    setSelectedCategories(vacancy.categories?.map(c => c.id) || []);
    setShowForm(true);
    setAudioRecordings({});
    setUseAudioInput(false);
    setShowEnhancer({ field: null, text: '' });
    setRecordingInProgress({ title: false, description: false });
  };

  const handleDelete = async (vacancyId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta vacante?")) return;

    try {
      const API_URL = getApiUrl();
      await fetch(`${API_URL}/vacancies/${vacancyId}`, {
        method: 'DELETE',
        headers: { 'x-user-uid': user.uid },
      });
      setVacancies(prev => prev.filter(v => v.id !== vacancyId));
    } catch (error) {
      console.error("Error deleting vacancy:", error);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const handleViewApplications = (vacancy: Vacancy) => {
    setSelectedVacancyForApplications(vacancy);
    setShowApplicationsView(true);
  };

  const handleBackToVacancies = () => {
    setShowApplicationsView(false);
    setSelectedVacancyForApplications(null);
  };

  if (loadingUser) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        Cargando...
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => router.push("/company")}
            className="flex items-center gap-2"
          >
            <div className="relative w-32 h-10">
              <Image
                src="/logo.png"
                alt="RouteJob Empresas"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </button>

          <nav className="flex items-center gap-4 text-xs sm:text-[13px]">
            <button
              type="button"
              onClick={() => router.push("/company")}
              className="text-zinc-600 hover:text-zinc-900"
            >
              ← Volver a empresa
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-semibold border border-emerald-200">
              Gestión de vacantes
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-zinc-500 hover:text-zinc-900"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 pt-24 pb-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            {showApplicationsView && selectedVacancyForApplications ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={handleBackToVacancies}
                    className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a vacantes
                  </button>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  Postulaciones - {selectedVacancyForApplications.title}
                </h1>
                <p className="text-sm text-zinc-600">
                  Gestiona las postulaciones recibidas para esta vacante
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">
                  Vacantes - {branch?.name}
                </h1>
                <p className="text-sm text-zinc-600">
                  Gestiona las vacantes de trabajo para esta sucursal
                </p>
              </div>
            )}
          </div>
          {!showApplicationsView && (
            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                if (showForm) {
                  setEditingVacancy(null);
                  setFormData({
                    title: "",
                    description: "",
                    salaryMin: "",
                    salaryMax: "",
                    jornada: "full-time",
                    tipoContrato: "permanent",
                  });
                  setSelectedCategories([]);
                  setAudioRecordings({});
                  setUseAudioInput(false);
                  setShowEnhancer({ field: null, text: '' });
                  setRecordingInProgress({ title: false, description: false });
                }
              }}
              className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-colors"
            >
              {showForm ? "Cancelar" : "Nueva vacante"}
            </button>
          )}
        </div>

        {/* Applications View */}
        {showApplicationsView && selectedVacancyForApplications ? (
          <CompanyVacancyApplications
            vacancyId={selectedVacancyForApplications.id}
            companyId={branchId} // Using branchId as companyId for now
            vacancyTitle={selectedVacancyForApplications.title}
          />
        ) : (
          <>
            {/* Vacancy Form */}
            {showForm && (
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              {editingVacancy ? "Editar vacante" : "Crear nueva vacante"}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Audio Input Toggle */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-semibold text-purple-900">Entrada por voz</h3>
                  <p className="text-xs text-purple-700">Usa grabación de audio y transcripción automática con IA</p>
                  {(recordingInProgress.title || recordingInProgress.description) && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-red-700 font-medium">
                        Grabación en progreso...
                      </span>
                    </div>
                  )}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAudioInput}
                    onChange={(e) => setUseAudioInput(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Title Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700">
                    Título del puesto *
                  </label>
                  {formData.title && (
                    <button
                      type="button"
                      onClick={() => handleEnhanceContent('title')}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Mejorar con IA
                    </button>
                  )}
                </div>
                
                {useAudioInput ? (
                  <div className="space-y-3">
                    <AudioRecorder
                      onRecordingComplete={(blob, transcription) => 
                        handleAudioRecording('title', blob, transcription)
                      }
                      onError={handleAudioError}
                      onRecordingStart={() => handleRecordingStart('title')}
                      onRecordingStop={() => setRecordingInProgress(prev => ({ ...prev, title: false }))}
                      placeholder="Graba el título del puesto de trabajo"
                      maxDuration={60}
                    />
                    {formData.title && (
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Edita la transcripción si es necesario..."
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ej: Desarrollador Frontend, Vendedor, etc."
                  />
                )}
              </div>

              {/* Description Field */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700">
                    Descripción del puesto *
                  </label>
                  {formData.description && (
                    <button
                      type="button"
                      onClick={() => handleEnhanceContent('description')}
                      className="text-xs text-purple-600 hover:text-purple-800 underline"
                    >
                      Mejorar con IA
                    </button>
                  )}
                </div>
                
                {useAudioInput ? (
                  <div className="space-y-3">
                    <AudioRecorder
                      onRecordingComplete={(blob, transcription) => 
                        handleAudioRecording('description', blob, transcription)
                      }
                      onError={handleAudioError}
                      onRecordingStart={() => handleRecordingStart('description')}
                      onRecordingStop={() => setRecordingInProgress(prev => ({ ...prev, description: false }))}
                      placeholder="Graba la descripción del puesto de trabajo"
                      maxDuration={300}
                    />
                    {formData.description && (
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={6}
                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                        placeholder="Edita la transcripción si es necesario..."
                      />
                    )}
                  </div>
                ) : (
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    placeholder="Describe las responsabilidades, requisitos y beneficios del puesto..."
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Salario mínimo
                  </label>
                  <input
                    type="number"
                    name="salaryMin"
                    value={formData.salaryMin}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ej: 500000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Salario máximo
                  </label>
                  <input
                    type="number"
                    name="salaryMax"
                    value={formData.salaryMax}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ej: 800000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Jornada laboral
                  </label>
                  <select
                    name="jornada"
                    value={formData.jornada}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="full-time">Tiempo completo</option>
                    <option value="part-time">Medio tiempo</option>
                    <option value="flexible">Horario flexible</option>
                    <option value="remote">Remoto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Tipo de contrato
                  </label>
                  <select
                    name="tipoContrato"
                    value={formData.tipoContrato}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="permanent">Indefinido</option>
                    <option value="temporary">Temporal</option>
                    <option value="contract">Por proyecto</option>
                    <option value="internship">Práctica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Categorías del empleo
                </label>
                <CategoryFilter
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  placeholder="Buscar categorías para esta vacante..."
                  maxSelections={5}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Selecciona hasta 5 categorías que mejor describan este puesto de trabajo
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={savingVacancy || recordingInProgress.title || recordingInProgress.description}
                  className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingVacancy ? "Guardando..." : 
                   recordingInProgress.title || recordingInProgress.description ? "Grabación en progreso..." :
                   editingVacancy ? "Actualizar vacante" : "Crear vacante"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingVacancy(null);
                    setSelectedCategories([]);
                    setAudioRecordings({});
                    setUseAudioInput(false);
                    setShowEnhancer({ field: null, text: '' });
                    setRecordingInProgress({ title: false, description: false });
                  }}
                  className="border border-zinc-200 text-zinc-700 px-6 py-2 rounded-lg font-semibold hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {/* Content Enhancer Modal */}
            {showEnhancer.field && (
              <div className="mt-6">
                <ContentEnhancer
                  originalText={showEnhancer.text}
                  context={showEnhancer.field === 'title' ? 'general' : 'job-description'}
                  onEnhancementAccept={handleEnhancementAccept}
                  onEnhancementReject={handleEnhancementReject}
                />
              </div>
            )}
          </div>
        )}

        {/* Vacancies List */}
        <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl shadow-lg shadow-zinc-100">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">
              Vacantes publicadas ({vacancies.length})
            </h2>
          </div>

          {loadingVacancies ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-zinc-500">Cargando vacantes...</p>
            </div>
          ) : vacancies.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {vacancies.map((vacancy) => (
                <div key={vacancy.id} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                        {vacancy.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-zinc-600">
                        <span className="capitalize">{vacancy.jornada?.replace('-', ' ') || 'No especificado'}</span>
                        <span className="capitalize">{vacancy.tipoContrato || 'No especificado'}</span>
                        {(vacancy.salaryMin || vacancy.salaryMax) && (
                          <span>
                            {vacancy.salaryMin && vacancy.salaryMax
                              ? `$${vacancy.salaryMin.toLocaleString()} - $${vacancy.salaryMax.toLocaleString()}`
                              : vacancy.salaryMin
                              ? `Desde $${vacancy.salaryMin.toLocaleString()}`
                              : `Hasta $${vacancy.salaryMax?.toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vacancy.active 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {vacancy.active ? 'Activa' : 'Inactiva'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleViewApplications(vacancy)}
                        className="text-emerald-600 hover:text-emerald-700 p-1 flex items-center gap-1 text-sm"
                        title="Ver postulaciones"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Postulaciones
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(vacancy)}
                        className="text-zinc-500 hover:text-zinc-700 p-1"
                        title="Editar vacante"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(vacancy.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Eliminar vacante"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-700 mb-3 line-clamp-2">
                    {vacancy.description}
                  </p>

                  {/* Categories */}
                  {vacancy.categories && vacancy.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {vacancy.categories.map((category) => (
                        <span
                          key={category.id}
                          className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium border border-emerald-200"
                        >
                          {category.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-zinc-500">
                    Publicado el {new Date(vacancy.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                No hay vacantes publicadas
              </h3>
              <p className="text-zinc-600 mb-4">
                Crea tu primera vacante para que aparezca en el mapa de candidatos
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors"
              >
                Crear primera vacante
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </section>
    </main>
  );
}