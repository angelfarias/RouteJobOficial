"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { auth } from "@/lib/firebaseClient";
import { getApiUrl } from "@/lib/env";

interface Vacante {
  id: string;
  title: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  company: string | null;
  branchName: string | null;
}

export default function VacanteDetalle() {
  const params = useParams() as { vacancyId?: string };
  const vacancyId = params.vacancyId;

  const [vacante, setVacante] = useState<Vacante | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [postulando, setPostulando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // cargar vacante
  useEffect(() => {
    if (!vacancyId) return;

    const fetchVacante = async () => {
      try {
        const API_URL = getApiUrl();
        const url = `${API_URL}/vacancies/${vacancyId}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Vacante no encontrada");
        }
        const data = await res.json();
        setVacante(data);
      } catch (err: any) {
        setError(err.message ?? "Error al cargar la vacante");
      } finally {
        setLoading(false);
      }
    };

    fetchVacante();
  }, [vacancyId]);

  const handlePostular = async () => {
    if (!user || !vacancyId) {
      setMensaje("Debes iniciar sesión para postular.");
      return;
    }
    setPostulando(true);
    setMensaje(null);
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/applications/postular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          vacancyId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setMensaje("Postulación enviada. Te llegará una notificación y un correo.");
      } else {
        setMensaje(data.error || "No se pudo enviar la postulación.");
      }
    } catch {
      setMensaje("Error al postular. Intenta nuevamente.");
    } finally {
      setPostulando(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );

  if (error)
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;

  if (!vacante) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-6 pt-24">
        <Link
          href="/dashboard/mapa"
          className="text-blue-500 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Volver a vacantes
        </Link>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-md dark:shadow-none border border-zinc-200 dark:border-zinc-800 p-8 transition-colors duration-300">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
            {vacante.title}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-zinc-400 mb-6">
            {vacante.company && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full">
                {vacante.company}
              </span>
            )}
            {vacante.branchName && (
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full">
                {vacante.branchName}
              </span>
            )}
            {(vacante.salaryMin || vacante.salaryMax) && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full">
                {vacante.salaryMin ?? ""} - {vacante.salaryMax ?? ""}
              </span>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Descripción</h2>
            <p className="text-gray-700 dark:text-zinc-300 leading-relaxed">
              {vacante.description}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePostular}
            disabled={postulando}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors"
          >
            {postulando ? "Postulando..." : "Postular"}
          </button>

          {mensaje && (
            <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
              {mensaje}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
