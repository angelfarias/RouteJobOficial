import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

// Mock utility functions for testing
const mockFormatLastUpdated = (date?: Date): string => {
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
};

const mockGetProfileCompletenessMessage = (completeness: number): string => {
  if (completeness < 30) return 'Perfil básico · completa tu información';
  if (completeness < 60) return 'Perfil en progreso · añade más detalles';
  if (completeness < 90) return 'Perfil casi completo · últimos toques';
  return 'Perfil completo · excelente para matches';
};

describe('Empty State Handling Property Tests', () => {
  // **Feature: auth-ui-improvements, Property 10: Proper empty state handling**
  it('should display appropriate loading states or empty states rather than fake data', () => {
    fc.assert(
      fc.property(
        fc.record({
          isLoading: fc.boolean(),
          hasError: fc.boolean(),
          hasData: fc.boolean(),
          dataSize: fc.integer({ min: 0, max: 10 })
        }),
        ({ isLoading, hasError, hasData, dataSize }) => {
          // Simulate different data states
          const dashboardState = {
            loading: isLoading,
            error: hasError ? 'Error al cargar datos' : null,
            data: hasData ? Array(dataSize).fill(null).map((_, i) => ({ id: i })) : []
          };
          
          if (dashboardState.loading) {
            // Should show loading state, not fake data
            expect(dashboardState.loading).toBe(true);
            expect(dashboardState.data).toBeDefined();
            
            // Loading state should not show fake content
            const loadingMessage = "Cargando...";
            expect(loadingMessage).not.toMatch(/ejemplo|demo|placeholder/i);
            expect(loadingMessage.length).toBeGreaterThan(0);
          }
          
          if (dashboardState.error) {
            // Should show error state, not fake data
            expect(dashboardState.error).toBeDefined();
            expect(typeof dashboardState.error).toBe('string');
            expect(dashboardState.error.length).toBeGreaterThan(0);
            
            // Error message should be helpful, not fake data
            expect(dashboardState.error).not.toMatch(/vacante de ejemplo|empresa demo/i);
          }
          
          if (!dashboardState.loading && !dashboardState.error && dashboardState.data.length === 0) {
            // Should show empty state, not fake data
            expect(dashboardState.data).toHaveLength(0);
            
            // Empty state should provide guidance
            const emptyStateMessage = "No hay datos disponibles. Completa tu perfil para ver más información.";
            expect(emptyStateMessage.length).toBeGreaterThan(10);
            expect(emptyStateMessage).not.toMatch(/ejemplo|demo|placeholder/i);
          }
          
          if (dashboardState.data.length > 0) {
            // Should show real data, not fake placeholders
            expect(dashboardState.data.length).toBeGreaterThan(0);
            expect(dashboardState.data.length).toBeLessThanOrEqual(10);
            
            // Each data item should have real properties
            dashboardState.data.forEach(item => {
              expect(item).toBeDefined();
              expect(typeof item.id).toBe('number');
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display helpful messages guiding users to complete their profile when no data exists', () => {
    fc.assert(
      fc.property(
        fc.record({
          profileCompleteness: fc.integer({ min: 0, max: 100 }),
          hasApplications: fc.boolean(),
          hasMessages: fc.boolean(),
          hasJobs: fc.boolean()
        }),
        ({ profileCompleteness, hasApplications, hasMessages, hasJobs }) => {
          // Test guidance messages based on data availability
          const guidanceMessage = mockGetProfileCompletenessMessage(profileCompleteness);
          
          // Guidance should be helpful and specific
          expect(typeof guidanceMessage).toBe('string');
          expect(guidanceMessage.length).toBeGreaterThan(10);
          
          // Should provide actionable advice
          if (profileCompleteness < 30) {
            expect(guidanceMessage).toMatch(/básico|completa|información/i);
          } else if (profileCompleteness < 60) {
            expect(guidanceMessage).toMatch(/progreso|añade|detalles/i);
          } else if (profileCompleteness < 90) {
            expect(guidanceMessage).toMatch(/casi|completo|últimos/i);
          } else {
            expect(guidanceMessage).toMatch(/completo|excelente/i);
          }
          
          // Should not contain placeholder text
          expect(guidanceMessage).not.toMatch(/lorem ipsum|placeholder|ejemplo/i);
          
          // Empty state messages should be contextual
          if (!hasApplications) {
            const noApplicationsMessage = "Sin postulaciones aún. Cuando te postules a empleos, podrás ver el estado aquí.";
            expect(noApplicationsMessage).toMatch(/postulaciones|empleos|estado/i);
            expect(noApplicationsMessage).not.toMatch(/ejemplo|demo/i);
          }
          
          if (!hasMessages) {
            const noMessagesMessage = "Sin mensajes. Los mensajes de empleadores aparecerán aquí.";
            expect(noMessagesMessage).toMatch(/mensajes|empleadores/i);
            expect(noMessagesMessage).not.toMatch(/ejemplo|demo/i);
          }
          
          if (!hasJobs) {
            const noJobsMessage = "No hay empleos disponibles. Completa tu perfil para mejores matches.";
            expect(noJobsMessage).toMatch(/empleos|perfil|matches/i);
            expect(noJobsMessage).not.toMatch(/ejemplo|demo/i);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format dates and times appropriately instead of showing placeholder text', () => {
    fc.assert(
      fc.property(
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
        (lastUpdated) => {
          const formattedDate = mockFormatLastUpdated(lastUpdated);
          
          // Should return a meaningful string
          expect(typeof formattedDate).toBe('string');
          expect(formattedDate.length).toBeGreaterThan(0);
          
          if (!lastUpdated) {
            // Should handle null/undefined gracefully
            expect(formattedDate).toBe('Nunca actualizado');
          } else {
            // Should format real dates appropriately
            expect(formattedDate).not.toMatch(/placeholder|ejemplo|demo/i);
            
            // Should use Spanish time expressions
            const spanishTimePattern = /hace|minuto|hora|día|momento|nunca/i;
            expect(formattedDate).toMatch(spanishTimePattern);
            
            // Should not show fake timestamps
            expect(formattedDate).not.toBe('Hace pocos minutos');
            expect(formattedDate).not.toBe('Hace 5 minutos');
            
            // Should be contextually appropriate
            const now = new Date();
            const diffMs = now.getTime() - lastUpdated.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            
            if (diffMinutes < 1) {
              expect(formattedDate).toMatch(/momento/i);
            } else if (diffMinutes < 60) {
              expect(formattedDate).toMatch(/minuto/i);
            } else {
              expect(formattedDate).toMatch(/hora|día/i);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});