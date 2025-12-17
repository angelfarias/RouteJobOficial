"use client";

import { useState } from "react";
import { User } from "firebase/auth";
import { ProfileType } from "../../lib/types/unified-email.types";
import { useDataIsolation, useProtectedOperation } from "../../lib/hooks/useDataIsolation";
import { useRoleManager } from "../../lib/hooks/useRoleManager";

interface DataIsolationExampleProps {
  user: User;
}

/**
 * Example component demonstrating data isolation and context validation
 * for the unified email system
 */
export default function DataIsolationExample({ user }: DataIsolationExampleProps) {
  const [testData, setTestData] = useState({
    jobApplication: {
      candidateId: user.uid,
      jobId: 'job-123',
      personalInfo: { firstName: 'Test', lastName: 'User' },
      // This should be rejected in candidate context
      companyInfo: { name: 'Test Company' }
    },
    jobPosting: {
      companyId: user.uid,
      companyInfo: { name: 'Test Company', industry: 'Tech' },
      jobDetails: { title: 'Developer', description: 'Great job' },
      // This should be rejected in company context
      personalInfo: { firstName: 'Test', lastName: 'User' }
    }
  });

  const [validationResults, setValidationResults] = useState<any[]>([]);

  const { roleContext } = useRoleManager(user.uid);
  const { currentRole } = roleContext;

  const {
    validateJobApplication,
    validateJobPosting,
    validateProfileUpdate,
    filterDisplayData,
    isOperationAllowed,
    getAllowedOperations,
    contextErrors,
    contextWarnings,
    clearErrors
  } = useDataIsolation(user.uid, currentRole || 'candidate');

  const { executeProtectedOperation, isLoading, lastResult } = useProtectedOperation(
    user.uid,
    currentRole || 'candidate'
  );

  const runValidationTests = () => {
    const results: any[] = [];

    // Test job application validation
    if (currentRole === 'candidate') {
      const appResult = validateJobApplication(testData.jobApplication);
      results.push({
        test: 'Job Application (Candidate Context)',
        result: appResult,
        expected: 'Should reject companyInfo field'
      });
    }

    // Test job posting validation
    if (currentRole === 'company') {
      const postResult = validateJobPosting(testData.jobPosting);
      results.push({
        test: 'Job Posting (Company Context)',
        result: postResult,
        expected: 'Should reject personalInfo field'
      });
    }

    // Test profile update validation
    const profileData = {
      userId: user.uid,
      personalInfo: { firstName: 'Updated', lastName: 'User' },
      companyInfo: { name: 'Updated Company' }
    };

    const profileResult = validateProfileUpdate(profileData);
    results.push({
      test: `Profile Update (${currentRole} Context)`,
      result: profileResult,
      expected: `Should only allow ${currentRole}-specific fields`
    });

    // Test data filtering
    const mixedData = {
      personalInfo: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      companyInfo: { name: 'Test Company', industry: 'Tech' },
      applications: ['app1', 'app2'],
      jobPostings: ['job1', 'job2'],
      privateNotes: 'Secret information'
    };

    const filteredSelf = filterDisplayData(mixedData, 'self');
    const filteredPublic = filterDisplayData(mixedData, 'public');

    results.push({
      test: 'Data Filtering (Self)',
      result: { filteredData: filteredSelf },
      expected: `Should show ${currentRole}-specific data only`
    });

    results.push({
      test: 'Data Filtering (Public)',
      result: { filteredData: filteredPublic },
      expected: 'Should hide private information'
    });

    setValidationResults(results);
  };

  const testProtectedOperation = async () => {
    const operation = {
      name: currentRole === 'candidate' ? 'job-application-create' : 'job-posting-create',
      allowedRoles: [currentRole!],
      validateData: true,
      logAccess: true
    };

    const data = currentRole === 'candidate' ? testData.jobApplication : testData.jobPosting;

    await executeProtectedOperation(
      operation,
      data,
      (result) => {
        console.log('Protected operation succeeded:', result);
      },
      (errors) => {
        console.log('Protected operation failed:', errors);
      }
    );
  };

  if (!currentRole) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-700">
            No hay rol activo. Por favor, selecciona un rol para probar la validación de datos.
          </p>
        </div>
      </div>
    );
  }

  const allowedOperations = getAllowedOperations();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Demostración de Aislamiento de Datos
          </h2>
          <p className="text-zinc-600">
            Prueba la validación de contexto y el aislamiento de datos para el rol activo: 
            <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
              currentRole === 'candidate' 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {currentRole === 'candidate' ? 'Candidato' : 'Empresa'}
            </span>
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Context Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-zinc-50 rounded-lg p-4">
              <h3 className="font-medium text-zinc-900 mb-2">Operaciones Permitidas</h3>
              <div className="space-y-1">
                {allowedOperations.slice(0, 5).map(operation => (
                  <div key={operation} className="text-sm text-zinc-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    {operation}
                  </div>
                ))}
                {allowedOperations.length > 5 && (
                  <div className="text-xs text-zinc-500">
                    +{allowedOperations.length - 5} más...
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 rounded-lg p-4">
              <h3 className="font-medium text-zinc-900 mb-2">Estado de Validación</h3>
              <div className="space-y-2">
                {contextErrors.length > 0 && (
                  <div className="text-sm">
                    <span className="text-red-600 font-medium">Errores: {contextErrors.length}</span>
                  </div>
                )}
                {contextWarnings.length > 0 && (
                  <div className="text-sm">
                    <span className="text-amber-600 font-medium">Advertencias: {contextWarnings.length}</span>
                  </div>
                )}
                {contextErrors.length === 0 && contextWarnings.length === 0 && (
                  <div className="text-sm text-emerald-600 font-medium">
                    Sin errores de validación
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="flex gap-3">
            <button
              onClick={runValidationTests}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Ejecutar Pruebas de Validación
            </button>

            <button
              onClick={testProtectedOperation}
              disabled={isLoading}
              className="px-4 py-2 border border-emerald-600 text-emerald-600 rounded-lg hover:bg-emerald-50 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Ejecutando...' : 'Probar Operación Protegida'}
            </button>

            <button
              onClick={clearErrors}
              className="px-4 py-2 text-zinc-600 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Limpiar Errores
            </button>
          </div>

          {/* Validation Results */}
          {validationResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-900">Resultados de Validación</h3>
              
              {validationResults.map((result, index) => (
                <div key={index} className="border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-zinc-900">{result.test}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      result.result.isValid 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {result.result.isValid ? 'Válido' : 'Inválido'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-zinc-600 mb-3">{result.expected}</p>
                  
                  {result.result.errors && result.result.errors.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-red-700 mb-1">Errores:</p>
                      <ul className="text-sm text-red-600 space-y-1">
                        {result.result.errors.map((error: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500 mt-0.5">•</span>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.result.warnings && result.result.warnings.length > 0 && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-amber-700 mb-1">Advertencias:</p>
                      <ul className="text-sm text-amber-600 space-y-1">
                        {result.result.warnings.map((warning: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.result.filteredData && (
                    <div>
                      <p className="text-sm font-medium text-zinc-700 mb-1">Datos Filtrados:</p>
                      <pre className="text-xs bg-zinc-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.result.filteredData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Protected Operation Result */}
          {lastResult && (
            <div className="border border-zinc-200 rounded-lg p-4">
              <h4 className="font-medium text-zinc-900 mb-2">Resultado de Operación Protegida</h4>
              <div className={`p-3 rounded ${
                lastResult.isValid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                <p className="text-sm">
                  {lastResult.isValid ? 'Operación ejecutada exitosamente' : 'Operación bloqueada'}
                </p>
                {lastResult.errors.length > 0 && (
                  <ul className="text-sm mt-2 space-y-1">
                    {lastResult.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Current Errors/Warnings */}
          {(contextErrors.length > 0 || contextWarnings.length > 0) && (
            <div className="border border-zinc-200 rounded-lg p-4">
              <h4 className="font-medium text-zinc-900 mb-2">Estado Actual de Validación</h4>
              
              {contextErrors.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-700 mb-1">Errores Activos:</p>
                  <ul className="text-sm text-red-600 space-y-1">
                    {contextErrors.map((error, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {contextWarnings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-1">Advertencias Activas:</p>
                  <ul className="text-sm text-amber-600 space-y-1">
                    {contextWarnings.map((warning, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}