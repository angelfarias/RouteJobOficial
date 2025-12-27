import { Briefcase, MessageCircle, TrendingUp, Plus, Search } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = ""
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
}

export function NoJobsEmptyState({ onSearchJobs }: { onSearchJobs: () => void }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No hay empleos disponibles"
      description="Aún no hemos encontrado empleos que coincidan con tu perfil. Completa tu información para mejores matches."
      actionText="Buscar empleos"
      onAction={onSearchJobs}
    />
  );
}

export function NoApplicationsEmptyState({ onBrowseJobs }: { onBrowseJobs: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="Sin postulaciones aún"
      description="Cuando te postules a empleos, podrás ver el estado de tus aplicaciones aquí."
      actionText="Explorar empleos"
      onAction={onBrowseJobs}
    />
  );
}

export function NoMessagesEmptyState() {
  return (
    <EmptyState
      icon={MessageCircle}
      title="Sin mensajes"
      description="Los mensajes de empleadores y notificaciones aparecerán aquí."
    />
  );
}

export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{message}</span>
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <TrendingUp className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Error al cargar datos</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}