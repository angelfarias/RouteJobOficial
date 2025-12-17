"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import RoleAwareDashboard from "./RoleAwareDashboard";
import RoleGuard from "./RoleGuard";
import { UserProfileService, ProfileUpdateData } from "@/lib/services/userProfileService";

/**
 * Enhanced Dashboard Example showing how to integrate role-based routing
 * This replaces the existing dashboard page with role-aware functionality
 */
export default function EnhancedDashboardExample() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const handleProfileUpdate = async (data: ProfileUpdateData) => {
    if (!user) return;
    
    try {
      await UserProfileService.updateProfile(user, data);
      await user.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleAccountDelete = async () => {
    if (!user) return;
    
    try {
      await UserProfileService.deleteAccount(user);
      router.push("/");
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <RoleGuard user={user}>
      <RoleAwareDashboard
        user={user}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleAccountDelete}
      >
        {/* Your existing dashboard content goes here */}
        <DashboardContent user={user} />
      </RoleAwareDashboard>
    </RoleGuard>
  );
}

// Example dashboard content that adapts to roles
function DashboardContent({ user }: { user: User }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Role-specific content will be rendered here */}
      <div className="grid gap-6">
        {/* This content will be filtered based on the current role */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            Bienvenido, {user.displayName || user.email}
          </h2>
          <p className="text-zinc-600">
            El contenido de este dashboard se adapta automáticamente según tu rol activo.
          </p>
        </div>

        {/* Candidate-specific content */}
        <div className="candidate-only bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">
            Funciones de Candidato
          </h3>
          <ul className="text-emerald-700 space-y-1">
            <li>• Buscar empleos</li>
            <li>• Crear Smart CV</li>
            <li>• Usar Smart Match</li>
            <li>• Gestionar aplicaciones</li>
          </ul>
        </div>

        {/* Company-specific content */}
        <div className="company-only bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Funciones de Empresa
          </h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Publicar empleos</li>
            <li>• Gestionar candidatos</li>
            <li>• Administrar sucursales</li>
            <li>• Ver analytics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// CSS that can be added to globals.css for role-based hiding
/*
[data-role="candidate"] .company-only {
  display: none;
}

[data-role="company"] .candidate-only {
  display: none;
}
*/