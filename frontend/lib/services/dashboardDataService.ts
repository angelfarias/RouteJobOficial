import { User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { db } from '@/lib/firebaseClient';
import { LocationFormatterService } from './locationFormatter';
import { userDataService } from './userDataService';

export interface UserProfile {
  displayName?: string;
  email: string;
  phoneNumber?: string;
  profileCompleteness: number;
  lastUpdated?: Date;
  isAvailableForOpportunities: boolean;
  location?: string;
  experience?: string[];
  skills?: string[];
}

export interface UserActivity {
  applications: number;
  messages: number;
  profileViews: number;
  lastLogin?: Date;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Presencial' | 'Remoto' | 'Híbrido';
  publishedDays: number;
  matchPercentage?: number | null; // Optional for incomplete profiles
  description?: string;
}

export interface DashboardData {
  profile: UserProfile | null;
  activity: UserActivity;
  recentJobs: JobListing[];
  loading: boolean;
  error: string | null;
}

export class DashboardDataService {
  // Helper function to format location for display
  private static formatLocationForDisplay(location: any): string | undefined {
    const formatter = new LocationFormatterService();
    const formatted = formatter.formatLocation(location);
    return formatted === 'Ubicación no especificada' ? undefined : formatted;
  }

  static async getUserProfile(user: User): Promise<UserProfile | null> {
    try {
      // Try candidates collection first (new structure)
      let userDoc = await getDoc(doc(db, 'candidates', user.uid));

      // Fallback to users collection (legacy)
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      }

      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          displayName: data.displayName || user.displayName || undefined,
          email: data.email || user.email,
          phoneNumber: data.phoneNumber || user.phoneNumber || undefined,
          profileCompleteness: data.profileCompleted ? 80 : (data.profileCompleteness || 0),
          lastUpdated: data.lastUpdatedAt?.toDate() || data.lastUpdated?.toDate() || undefined,
          isAvailableForOpportunities: data.isAvailableForOpportunities ?? true,
          location: this.formatLocationForDisplay(data.location),
          experience: data.experience || [],
          skills: data.skills || []
        };
      }

      // Return basic profile from Firebase Auth if no Firestore document
      return {
        displayName: user.displayName || undefined,
        email: user.email || '',
        profileCompleteness: 20, // Basic auth info only
        isAvailableForOpportunities: true,
        experience: [],
        skills: []
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);

      // Handle Firebase permission errors
      if (error instanceof FirebaseError && userDataService.isPermissionError(error)) {
        await userDataService.handlePermissionError(error);
      }

      return null;
    }
  }

  static async getUserActivity(user: User): Promise<UserActivity> {
    try {
      // Fetch applications count
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid)
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);

      // Fetch messages count
      const messagesQuery = query(
        collection(db, 'messages'),
        where('userId', '==', user.uid)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      // Fetch profile views (if tracked)
      const profileViewsQuery = query(
        collection(db, 'profileViews'),
        where('profileUserId', '==', user.uid)
      );
      const profileViewsSnapshot = await getDocs(profileViewsQuery);

      return {
        applications: applicationsSnapshot.size,
        messages: messagesSnapshot.size,
        profileViews: profileViewsSnapshot.size,
        lastLogin: new Date() // Current session
      };
    } catch (error) {
      console.error('Error fetching user activity:', error);

      // Handle Firebase permission errors
      if (error instanceof FirebaseError && userDataService.isPermissionError(error)) {
        await userDataService.handlePermissionError(error);
      }

      return {
        applications: 0,
        messages: 0,
        profileViews: 0
      };
    }
  }

  static async getRecentJobs(user: User, limitCount: number = 5, profile?: UserProfile | null): Promise<JobListing[]> {
    try {
      // Fetch recent job postings
      const jobsQuery = query(
        collection(db, 'vacancies'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const jobsSnapshot = await getDocs(jobsQuery);

      const jobs: JobListing[] = [];

      jobsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date();
        const daysDiff = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        jobs.push({
          id: doc.id,
          title: data.title || 'Posición disponible',
          company: data.companyName || 'Empresa',
          location: LocationFormatterService.safeFormatForReact(data.location),
          type: data.workType || 'Presencial',
          publishedDays: daysDiff,

          // Only show match percentage if profile is sufficiently complete (> 50%)
          matchPercentage: (profile?.profileCompleteness || 0) > 50
            ? this.calculateMatchPercentage(data, user)
            : null,
          description: data.description
        });
      });

      return jobs;
    } catch (error) {
      console.error('Error fetching recent jobs:', error);
      return [];
    }
  }

  private static calculateMatchPercentage(jobData: any, user: User): number {
    // Simple matching algorithm - in real app this would be more sophisticated
    let score = 50; // Base score

    // Add points for location match (if user has location set)
    // Add points for skills match
    // Add points for experience match

    // For now, return a random-ish but consistent score based on job ID
    const hash = jobData.title?.length || 0;
    return Math.min(95, Math.max(60, 70 + (hash % 25)));
  }

  // Cache management
  private static getCacheKey(userId: string): string {
    return `dashboard_data_${userId}`;
  }

  static getCachedData(userId: string): DashboardData | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.getCacheKey(userId));
      if (!cached) return null;

      const parsed = JSON.parse(cached);

      // Rehydrate dates
      if (parsed.profile?.lastUpdated) {
        parsed.profile.lastUpdated = new Date(parsed.profile.lastUpdated);
      }
      if (parsed.activity?.lastLogin) {
        parsed.activity.lastLogin = new Date(parsed.activity.lastLogin);
      }

      return parsed;
    } catch (e) {
      console.error('Error reading cache:', e);
      return null;
    }
  }

  static cacheData(userId: string, data: DashboardData): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.getCacheKey(userId), JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to cache:', e);
    }
  }

  static async getDashboardData(user: User): Promise<DashboardData> {
    try {
      // Fetch profile first to determine if we should show matches
      const profile = await this.getUserProfile(user);

      const [activity, recentJobs] = await Promise.all([
        this.getUserActivity(user),
        // Pass profile to getRecentJobs to determine match visibility
        this.getRecentJobs(user, 5, profile)
      ]);

      const data: DashboardData = {
        profile,
        activity,
        recentJobs,
        loading: false,
        error: null
      };

      // Save to cache
      this.cacheData(user.uid, data);

      return data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      return {
        profile: null,
        activity: { applications: 0, messages: 0, profileViews: 0 },
        recentJobs: [],
        loading: false,
        error: 'Error al cargar los datos del dashboard'
      };
    }
  }

  static formatLastUpdated(date?: Date): string {
    if (!date) return 'Nunca actualizado';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Hace unos momentos';
    if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  static getProfileCompletenessMessage(completeness: number): string {
    if (completeness < 30) return 'Perfil básico · completa tu información';
    if (completeness < 60) return 'Perfil en progreso · añade más detalles';
    if (completeness < 90) return 'Perfil casi completo · últimos toques';
    return 'Perfil completo · excelente para matches';
  }
}