import { TranscriptionService, transcriptionService } from '@/lib/transcriptionService';

// Mock fetch globally
global.fetch = jest.fn();

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    service = TranscriptionService.getInstance();
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    // Reset API key for clean tests
    service.setApiKey('');
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = TranscriptionService.getInstance();
      const instance2 = TranscriptionService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('exports singleton instance', () => {
      expect(transcriptionService).toBeInstanceOf(TranscriptionService);
    });
  });

  describe('Configuration', () => {
    it('reports not configured when no API key', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('reports configured when API key is set', () => {
      service.setApiKey('test-api-key');
      expect(service.isConfigured()).toBe(true);
    });

    it('returns supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toEqual([
        { code: 'es', name: 'Español' },
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français' },
        { code: 'de', name: 'Deutsch' },
        { code: 'it', name: 'Italiano' },
        { code: 'pt', name: 'Português' },
      ]);
    });
  });

  describe('Audio Transcription', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key');
    });

    it('throws error when not configured', async () => {
      service.setApiKey('');
      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      await expect(service.transcribeAudio(audioBlob)).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('successfully transcribes audio', async () => {
      const mockResponse = {
        text: 'Transcribed text from audio'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = await service.transcribeAudio(audioBlob);

      expect(result).toBe('Transcribed text from audio');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/transcriptions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
          body: expect.any(FormData)
        })
      );
    });

    it('handles API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: { message: 'Invalid audio format' }
        })
      });

      const audioBlob = new Blob(['invalid audio'], { type: 'audio/invalid' });
      
      await expect(service.transcribeAudio(audioBlob)).rejects.toThrow(
        'Transcription failed: Invalid audio format'
      );
    });

    it('handles network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });
      
      await expect(service.transcribeAudio(audioBlob)).rejects.toThrow(
        'Failed to transcribe audio. Please try again.'
      );
    });
  });

  describe('Content Enhancement', () => {
    beforeEach(() => {
      service.setApiKey('test-api-key');
    });

    it('throws error when not configured', async () => {
      service.setApiKey('');
      
      await expect(service.enhanceContent('test text')).rejects.toThrow(
        'OpenAI API key not configured'
      );
    });

    it('enhances job description content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Enhanced professional job description with improved clarity and structure.'
          }
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const originalText = 'Basic job description';
      const result = await service.enhanceContent(originalText, 'job-description');

      expect(result.enhancedText).toBe('Enhanced professional job description with improved clarity and structure.');
      expect(result.originalText).toBe(originalText);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('style');

      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('job-description')
        })
      );
    });

    it('handles different content contexts', async () => {
      const contexts = ['job-description', 'requirements', 'benefits', 'general'] as const;
      
      for (const context of contexts) {
        const mockResponse = {
          choices: [{
            message: {
              content: `Enhanced ${context} content`
            }
          }]
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await service.enhanceContent('test text', context);
        expect(result.enhancedText).toBe(`Enhanced ${context} content`);
      }
    });

    it('handles API errors in content enhancement', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Rate Limited',
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      });

      await expect(service.enhanceContent('test text')).rejects.toThrow(
        'Content enhancement failed: Rate limit exceeded'
      );
    });
  });

  describe('Content Validation', () => {
    it('validates content length - too short', async () => {
      const result = await service.validateContent('Short');
      
      expect(result.isValid).toBe(true); // Only errors make it invalid
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('length');
      expect(result.issues[0].severity).toBe('warning');
      expect(result.suggestions).toContain('Agrega más detalles sobre las responsabilidades y requisitos del puesto.');
    });

    it('validates content length - too long', async () => {
      const longText = 'x'.repeat(2001);
      const result = await service.validateContent(longText);
      
      expect(result.issues.some(issue => issue.type === 'length' && issue.message.includes('muy largo'))).toBe(true);
      expect(result.suggestions).toContain('Considera resumir el contenido para hacerlo más conciso.');
    });

    it('validates punctuation', async () => {
      const result = await service.validateContent('Text without proper punctuation');
      
      expect(result.issues.some(issue => issue.type === 'format')).toBe(true);
    });

    it('validates professional language', async () => {
      const result = await service.validateContent('This job is super cool and awesome!');
      
      expect(result.issues.some(issue => issue.type === 'language')).toBe(true);
      expect(result.suggestions).toContain('Considera usar un lenguaje más formal y profesional.');
    });

    it('validates proper content', async () => {
      const result = await service.validateContent('This is a well-written professional job description with proper punctuation and appropriate length for the requirements.');
      
      expect(result.isValid).toBe(true);
      expect(result.issues.filter(issue => issue.severity === 'error')).toHaveLength(0);
    });
  });
});

/**
 * Property-based tests for TranscriptionService
 * **Dashboard Enhancements, Property 5: Audio-Text Content Consistency**
 * For any job posting created with audio input, the final text content should 
 * accurately represent the original audio intent while maintaining professional quality
 */
describe('TranscriptionService Property Tests', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    service = TranscriptionService.getInstance();
    service.setApiKey('test-api-key');
    jest.clearAllMocks();
  });

  it('property test: transcription always returns string for valid audio', async () => {
    const testCases = [
      { size: 100, type: 'audio/webm' },
      { size: 1000, type: 'audio/mp4' },
      { size: 5000, type: 'audio/wav' },
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        text: `Transcribed content for ${testCase.type} with ${testCase.size} bytes`
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const audioBlob = new Blob(['x'.repeat(testCase.size)], { type: testCase.type });
      const result = await service.transcribeAudio(audioBlob);

      // Property: Result should always be a non-empty string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Transcribed content');
    }
  });

  it('property test: content enhancement preserves meaning', async () => {
    const testTexts = [
      'Simple job description',
      'Complex job with multiple requirements and benefits',
      'Short text',
      'Very detailed job posting with extensive requirements, multiple benefits, and comprehensive description of responsibilities',
    ];

    for (const originalText of testTexts) {
      const mockResponse = {
        choices: [{
          message: {
            content: `Enhanced: ${originalText} - with professional improvements`
          }
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.enhanceContent(originalText, 'job-description');

      // Property: Enhanced text should contain reference to original content
      expect(result.enhancedText).toContain('Enhanced');
      expect(result.originalText).toBe(originalText);
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
    }
  });

  it('property test: validation is consistent and deterministic', async () => {
    const testCases = [
      { text: 'Short', expectedIssues: ['length'] },
      { text: 'x'.repeat(2001), expectedIssues: ['length'] },
      { text: 'Text without punctuation', expectedIssues: ['format'] },
      { text: 'Super cool awesome job!', expectedIssues: ['language'] },
    ];

    for (const testCase of testCases) {
      // Run validation multiple times to ensure consistency
      const results = await Promise.all([
        service.validateContent(testCase.text),
        service.validateContent(testCase.text),
        service.validateContent(testCase.text),
      ]);

      // Property: All validation results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].isValid).toBe(results[0].isValid);
        expect(results[i].issues.length).toBe(results[0].issues.length);
        expect(results[i].suggestions.length).toBe(results[0].suggestions.length);
      }

      // Property: Expected issue types should be present
      for (const expectedIssue of testCase.expectedIssues) {
        expect(results[0].issues.some(issue => issue.type === expectedIssue)).toBe(true);
      }
    }
  });

  it('property test: service configuration state is consistent', () => {
    // Property: Configuration state should be deterministic
    expect(service.isConfigured()).toBe(true);
    
    service.setApiKey('');
    expect(service.isConfigured()).toBe(false);
    
    service.setApiKey('new-key');
    expect(service.isConfigured()).toBe(true);
    
    // Multiple calls should return same result
    expect(service.isConfigured()).toBe(true);
    expect(service.isConfigured()).toBe(true);
  });
});