// chat-assistant.service.ts
import { Inject, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { CategoriesService } from '../categories/categories.service';

@Injectable()
export class ChatAssistantService {
  private db: FirebaseFirestore.Firestore;
  private storage: admin.storage.Storage;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly app: admin.app.App,
    private readonly categoriesService: CategoriesService,
  ) {
    this.db = this.app.firestore();
    this.storage = this.app.storage();
  }

  async guardarRespuesta(params: {
    userId: string;
    paso: number;
    pregunta: string;
    respuesta: string;
  }) {
    const { userId, paso, pregunta, respuesta } = params;

    const docRef = this.db.collection('assistant_sessions').doc(userId);

    await docRef.set(
      {
        userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        respuestas: {
          [paso]: {
            pregunta,
            respuesta,
          },
        },
      },
      { merge: true },
    );
  }

  async obtenerPerfil(userId: string) {
    const doc = await this.db.collection('assistant_sessions').doc(userId).get();
    if (!doc.exists) return null;
    const data = doc.data() as any;
    const respuestas = data.respuestas || {};

    let nivelPsico: 'bajo' | 'medio' | 'alto' | null = null;
    const motivacion = respuestas[5]?.respuesta;
    if (motivacion) {
      const num = parseInt(motivacion.trim(), 10);
      if (!isNaN(num)) {
        if (num <= 2) nivelPsico = 'bajo';
        else if (num === 3) nivelPsico = 'medio';
        else nivelPsico = 'alto';
      }
    }

    return { ...data, nivelPsico };
  }

  async sincronizarPerfilDesdeSession(userId: string) {
    const doc = await this.db.collection('assistant_sessions').doc(userId).get();
    if (!doc.exists) return;

    const session = doc.data() as any;
    const respuestas = session.respuestas || {};

    const experience = Object.keys(respuestas)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (respuestas[k]?.respuesta || '').trim())
      .filter((txt) => txt.length > 0);

    const profileCompleted = experience.length > 0; // criterio sencillo

    await this.db.collection('candidates').doc(userId).set(
      {
        experience,
        profileCompleted,
      },
      { merge: true },
    );
  }
  // NUEVO: guardar audio asociado a un paso
  // chat-assistant.service.ts
  async guardarAudio(params: {
    userId: string;
    paso: number;
    file: any;
  }) {
    const { userId, paso, file } = params;

    const bucket = this.storage.bucket();

    const docRef = this.db.collection('assistant_sessions').doc(userId);
    const doc = await docRef.get();
    const data = (doc.exists ? (doc.data() as any) : {}) || {};
    const audios = data.audios || {};

    // 1) si ya hay un audio para este paso, eliminarlo del bucket
    const previous = audios[paso];
    if (previous?.storagePath) {
      await bucket.file(previous.storagePath).delete({ ignoreNotFound: true });
    }

    // 2) subir el nuevo audio
    const filename = `assistant-audio/${userId}/paso-${paso}-${Date.now()}.webm`;
    const fileRef = bucket.file(filename);

    await fileRef.save(file.buffer, {
      contentType: file.mimetype || 'audio/webm',
      resumable: false,
    });

    const [url] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '2100-01-01',
    });

    // 3) guardar nuevo storagePath + url en Firestore
    await docRef.set(
      {
        userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        audios: {
          [paso]: {
            storagePath: filename,
            url,
          },
        },
      },
      { merge: true },
    );

    // opcional: devolver la url al frontend
    return { url };
  }

  /**
   * Analyze user responses to extract structured profile data
   */
  async analyzeProfileData(userId: string) {
    const session = await this.obtenerPerfil(userId);
    if (!session?.respuestas) return null;

    const responses = session.respuestas;

    // Extract structured data from responses
    const profileData = {
      // Basic info
      objective: responses[0]?.respuesta || '',

      // Experience extraction
      experience: this.extractExperience(responses),

      // Skills extraction
      skills: this.extractSkills(responses),

      // Education
      education: this.extractEducation(responses),

      // Suggested categories based on responses
      suggestedCategories: await this.suggestCategories(responses),

      // Profile completeness score
      completenessScore: this.calculateCompleteness(responses, session.audios || {}),
    };

    return profileData;
  }

  /**
   * Extract structured experience data
   */
  private extractExperience(responses: any): Array<{
    title: string;
    company: string;
    period: string;
    description: string;
    skills: string[];
  }> {
    const experiences: Array<{
      title: string;
      company: string;
      period: string;
      description: string;
      skills: string[];
    }> = [];

    // Recent experience (response 1)
    if (responses[1]?.respuesta) {
      const recent = this.parseExperienceText(responses[1].respuesta);
      if (recent) experiences.push(recent);
    }

    // Other experiences (response 2)
    if (responses[2]?.respuesta) {
      const others = this.parseMultipleExperiences(responses[2].respuesta);
      experiences.push(...others);
    }

    return experiences;
  }

  /**
   * Parse experience text into structured data - Extract only essential information
   */
  private parseExperienceText(text: string): {
    title: string;
    company: string;
    period: string;
    description: string;
    skills: string[];
  } | null {
    // Clean text by removing common connectors and unnecessary phrases
    const cleanedText = text
      .replace(/trabajé como|trabajo como|soy|fui|he sido|me desempeñé como/gi, '')
      .replace(/^(en|de|como|durante)\s+/gi, '')
      .trim();

    const lines = cleanedText.split(/[,\n]/).map(l => l.trim()).filter(l => l);

    let title = '';
    let company = '';
    let period = '';
    let description = '';

    // Look for patterns
    for (const line of lines) {
      if (line.match(/\d{4}/)) {
        period = line;
      } else if (line.toLowerCase().includes('empresa') || line.toLowerCase().includes('compañía')) {
        company = line.replace(/en la empresa|en empresa|empresa|compañía/gi, '').trim();
      } else if (!title && line.length > 2) {
        // Clean job title from connectors
        title = line
          .replace(/^(como|de|en)\s+/gi, '')
          .trim();
      } else if (line.length > 5) {
        description += (description ? ', ' : '') + line;
      }
    }

    return title ? { title, company, period, description, skills: [] } : null;
  }

  /**
   * Parse multiple experiences from text
   */
  private parseMultipleExperiences(text: string): Array<{
    title: string;
    company: string;
    period: string;
    description: string;
    skills: string[];
  }> {
    // Split by common separators and parse each
    const sections = text.split(/\n\n|\.\s+(?=[A-Z])/);
    return sections
      .map(section => this.parseExperienceText(section))
      .filter((exp): exp is NonNullable<typeof exp> => exp !== null);
  }

  /**
   * Extract skills from responses
   */
  private extractSkills(responses: any): {
    technical: string[];
    soft: string[];
    languages: string[];
  } {
    const technical: string[] = [];
    const soft: string[] = [];
    const languages: string[] = [];

    // Technical skills (response 3)
    if (responses[3]?.respuesta) {
      const techSkills = responses[3].respuesta
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 1);
      technical.push(...techSkills);
    }

    // Soft skills (response 4)
    if (responses[4]?.respuesta) {
      const softSkills = responses[4].respuesta
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 1);
      soft.push(...softSkills);
    }

    // Extract languages from all responses
    const allText = Object.values(responses).map((r: any) => r.respuesta || '').join(' ');
    const languagePatterns = ['inglés', 'english', 'francés', 'french', 'alemán', 'german', 'portugués', 'portuguese'];
    languagePatterns.forEach(lang => {
      if (allText.toLowerCase().includes(lang)) {
        languages.push(lang);
      }
    });

    return { technical, soft, languages };
  }

  /**
   * Extract education data
   */
  private extractEducation(responses: any): Array<{
    degree: string;
    institution: string;
    period: string;
    status: 'completed' | 'in_progress' | 'incomplete';
  }> {
    const education: Array<{
      degree: string;
      institution: string;
      period: string;
      status: 'completed' | 'in_progress' | 'incomplete';
    }> = [];

    // Main education (response 5)
    if (responses[5]?.respuesta) {
      const edu = this.parseEducationText(responses[5].respuesta);
      if (edu) education.push(edu);
    }

    // Additional training (response 6)
    if (responses[6]?.respuesta) {
      const additional = this.parseAdditionalTraining(responses[6].respuesta);
      education.push(...additional);
    }

    return education;
  }

  /**
   * Parse education text
   */
  private parseEducationText(text: string): {
    degree: string;
    institution: string;
    period: string;
    status: 'completed' | 'in_progress' | 'incomplete';
  } | null {
    const lines = text.split(/[,\n]/).map(l => l.trim()).filter(l => l);

    let degree = '';
    let institution = '';
    let period = '';
    let status: 'completed' | 'in_progress' | 'incomplete' = 'completed';

    for (const line of lines) {
      if (line.match(/\d{4}/)) {
        period = line;
      } else if (line.toLowerCase().includes('universidad') || line.toLowerCase().includes('instituto')) {
        institution = line;
      } else if (line.toLowerCase().includes('curso') || line.toLowerCase().includes('en curso')) {
        status = 'in_progress';
      } else if (!degree && line.length > 3) {
        degree = line;
      }
    }

    return degree ? { degree, institution, period, status } : null;
  }

  /**
   * Parse additional training - Extract only essential information
   */
  private parseAdditionalTraining(text: string): Array<{
    degree: string;
    institution: string;
    period: string;
    status: 'completed' | 'in_progress' | 'incomplete';
  }> {
    // Clean text by removing common connectors and unnecessary phrases
    const cleanedText = text
      .replace(/tengo un curso en|tengo curso de|hice un curso de|curso en|certificado en|certificación en/gi, '')
      .replace(/^(un|una|el|la|de|en)\s+/gi, '')
      .trim();

    const courses = cleanedText
      .split(/[,\n]/)
      .map(c => c.trim())
      .filter(c => c.length > 2)
      .map(course => {
        // Extract only the certificate/course name, remove connectors
        const cleanCourse = course
          .replace(/^(tengo|hice|completé|terminé|obtuve)\s+/gi, '')
          .replace(/^(un|una|el|la|de|en)\s+/gi, '')
          .trim();

        return cleanCourse;
      })
      .filter(course => course.length > 0);

    return courses.map(course => ({
      degree: course,
      institution: 'Certificación',
      period: '',
      status: 'completed' as const,
    }));
  }

  /**
   * Suggest job categories based on profile responses
   */
  private async suggestCategories(responses: any): Promise<string[]> {
    const allText = Object.values(responses)
      .map((r: any) => r.respuesta || '')
      .join(' ')
      .toLowerCase();

    // Get all categories
    const result = await this.categoriesService.searchCategoriesAdvanced({
      includeInactive: false,
      limit: 100
    });
    const categories = result?.categories || [];

    // If no categories found, return empty array
    if (!Array.isArray(categories) || categories.length === 0) {
      return [];
    }

    // Score categories based on keyword matches
    const categoryScores = categories.map(category => {
      let score = 0;
      const keywords = this.getCategoryKeywords(category.name.toLowerCase());

      keywords.forEach(keyword => {
        if (allText.includes(keyword)) {
          score += 1;
        }
      });

      return { category: category.id, name: category.name, score };
    });

    // Return top 5 categories
    return categoryScores
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(c => c.category);
  }

  /**
   * Get keywords for category matching
   */
  private getCategoryKeywords(categoryName: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'tecnología': ['programación', 'desarrollo', 'software', 'código', 'javascript', 'python', 'java'],
      'ventas': ['venta', 'vendedor', 'comercial', 'cliente', 'negociación'],
      'administración': ['administración', 'oficina', 'gestión', 'excel', 'documentos'],
      'educación': ['profesor', 'enseñanza', 'educación', 'clases', 'estudiantes'],
      'salud': ['enfermería', 'medicina', 'hospital', 'paciente', 'salud'],
      'construcción': ['construcción', 'obra', 'albañil', 'arquitectura'],
      'gastronomía': ['cocina', 'restaurante', 'chef', 'comida', 'mesero'],
      'transporte': ['conductor', 'transporte', 'logística', 'delivery'],
    };

    return keywordMap[categoryName] || [categoryName];
  }

  /**
   * Calculate profile completeness score
   */
  private calculateCompleteness(responses: any, audios: any = {}): number {
    const totalQuestions = 7;
    const answeredQuestions = new Set([
      ...Object.keys(responses),
      ...Object.keys(audios)
    ]).size;

    let qualityScore = 0;
    Object.values(responses).forEach((response: any) => {
      const text = response.respuesta || '';
      if (text.length > 20) qualityScore += 1; // Detailed response
      else if (text.length > 5) qualityScore += 0.5; // Basic response
    });

    // Score audio responses (bonus for audio)
    Object.keys(audios).forEach(() => {
      qualityScore += 0.5;
    });

    const completenessRatio = answeredQuestions / totalQuestions;
    const qualityRatio = qualityScore / totalQuestions;

    return Math.round((completenessRatio * 0.6 + qualityRatio * 0.4) * 100);
  }

  /**
   * Generate precise Smart CV questions with clear instructions
   */
  async generateSmartQuestions(userId: string): Promise<string[]> {
    const profileData = await this.analyzeProfileData(userId);
    if (!profileData) {
      // Return initial Smart CV questions with precise instructions
      return [
        "Objetivo profesional: Responde solo con tu objetivo laboral principal. Ejemplo: 'Desarrollador Full Stack' o 'Gerente de Ventas'",
        "Experiencia reciente: Menciona solo tu último trabajo. Formato: Cargo - Empresa - Período. Ejemplo: 'Desarrollador - TechCorp - 2022-2024'",
        "Habilidades técnicas: Lista solo las herramientas y tecnologías que dominas. Separa con comas. Ejemplo: 'JavaScript, React, Node.js'",
        "Habilidades blandas: Menciona solo 3-5 competencias personales clave. Ejemplo: 'Liderazgo, Comunicación, Trabajo en equipo'",
        "Educación principal: Indica solo tu título más relevante. Formato: Título - Institución. Ejemplo: 'Ingeniería en Sistemas - Universidad XYZ'",
        "Certificaciones: Lista solo nombres de cursos o certificados completados. Separa con comas. Ejemplo: 'AWS Cloud Practitioner, Scrum Master'",
        "Área de interés: Responde solo con el sector donde quieres trabajar. Ejemplo: 'Tecnología' o 'Marketing Digital'"
      ];
    }

    const questions: string[] = [];

    // Generate follow-up questions based on missing or incomplete data
    if (!profileData.objective || profileData.objective.length < 10) {
      questions.push("Objetivo profesional: Responde solo con tu objetivo laboral principal en una frase corta.");
    }

    if (profileData.experience.length === 0) {
      questions.push("Experiencia laboral: Menciona solo tu trabajo más reciente. Formato: Cargo - Empresa - Período.");
    }

    if (profileData.skills.technical.length < 3) {
      questions.push("Habilidades técnicas: Lista solo las herramientas que dominas. Separa con comas, sin explicaciones.");
    }

    if (profileData.skills.soft.length < 3) {
      questions.push("Competencias personales: Menciona solo 3-5 habilidades blandas clave. Separa con comas.");
    }

    if (profileData.education.length === 0) {
      questions.push("Formación académica: Indica solo tu título principal. Formato: Título - Institución.");
    }

    if (profileData.suggestedCategories.length === 0) {
      questions.push("Sector de interés: Responde solo con el área donde quieres trabajar. Una o dos palabras máximo.");
    }

    return questions.slice(0, 3); // Limit to 3 questions at a time
  }

  /**
   * Get audio responses for a user's profile session
   */
  async getAudioResponses(userId: string): Promise<Array<{
    stepNumber: number;
    questionText: string;
    audioUrl: string;
    createdAt: any;
  }>> {
    const doc = await this.db.collection('assistant_sessions').doc(userId).get();
    if (!doc.exists) return [];

    const data = doc.data() as any;
    const audios = data.audios || {};
    const respuestas = data.respuestas || {};

    const audioResponses: Array<{
      stepNumber: number;
      questionText: string;
      audioUrl: string;
      createdAt: any;
    }> = [];

    // Combine audio data with question text
    Object.keys(audios).forEach(stepKey => {
      const stepNumber = parseInt(stepKey, 10);
      const audioData = audios[stepKey];
      const questionData = respuestas[stepKey];

      // Allow audio even if text answer is missing
      if (audioData?.url) {
        audioResponses.push({
          stepNumber,
          questionText: questionData?.pregunta || `Pregunta ${stepNumber + 1}`,
          audioUrl: audioData.url,
          createdAt: data.updatedAt || null,
        });
      }
    });

    // Sort by step number
    return audioResponses.sort((a, b) => a.stepNumber - b.stepNumber);
  }

  /**
   * Check if audio exists for a specific step
   */
  async hasAudioForStep(userId: string, stepNumber: number): Promise<boolean> {
    const doc = await this.db.collection('assistant_sessions').doc(userId).get();
    if (!doc.exists) return false;

    const data = doc.data() as any;
    const audios = data.audios || {};

    return !!(audios[stepNumber]?.url);
  }

  /**
   * Delete audio for a specific step
   */
  async deleteAudioForStep(userId: string, stepNumber: number): Promise<void> {
    const docRef = this.db.collection('assistant_sessions').doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) return;

    const data = doc.data() as any;
    const audios = data.audios || {};
    const audioData = audios[stepNumber];

    if (audioData?.storagePath) {
      // Delete from Firebase Storage
      const bucket = this.storage.bucket();
      await bucket.file(audioData.storagePath).delete({ ignoreNotFound: true });

      // Remove from Firestore
      delete audios[stepNumber];
      await docRef.update({ audios });
    }
  }

  /**
   * Get enhanced profile data with audio information
   */
  async getEnhancedProfileData(userId: string) {
    const [profileData, audioResponses] = await Promise.all([
      this.analyzeProfileData(userId),
      this.getAudioResponses(userId),
    ]);

    // Fetch candidate profile to get name
    const candidateDoc = await this.db.collection('candidates').doc(userId).get();
    const candidateData = candidateDoc.exists ? candidateDoc.data() : {};
    const name = candidateData?.displayName || candidateData?.name || '';

    return {
      ...profileData,
      audioResponses,
      hasAudioContent: audioResponses.length > 0,
      name,
    };
  }
}
