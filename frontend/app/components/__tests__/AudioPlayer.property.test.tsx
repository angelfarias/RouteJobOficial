import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { fc } from 'fast-check';
import AudioPlayer from '../AudioPlayer';

// Mock HTMLAudioElement
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-audio-url');

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Mock HTMLAudioElement constructor
  global.HTMLAudioElement = jest.fn(() => mockAudio) as any;
  
  // Mock audio element properties
  Object.defineProperty(mockAudio, 'currentTime', {
    get: () => mockAudio._currentTime || 0,
    set: (value) => { mockAudio._currentTime = value; },
    configurable: true,
  });
  
  Object.defineProperty(mockAudio, 'duration', {
    get: () => mockAudio._duration || 0,
    set: (value) => { mockAudio._duration = value; },
    configurable: true,
  });
});

/**
 * Property 1: Audio-Profile Consistency
 * For any Smart Profile session with audio recordings, the audio responses should 
 * maintain consistent mapping to their corresponding profile steps and questions.
 */
describe('Property 1: Audio-Profile Consistency', () => {
  const audioPlayerArbitrary = fc.record({
    audioUrl: fc.webUrl(),
    questionText: fc.string({ minLength: 10, maxLength: 200 }),
    stepNumber: fc.integer({ min: 1, max: 20 }),
  });

  it('should maintain consistent step-question mapping across all valid audio player instances', () => {
    fc.assert(
      fc.property(audioPlayerArbitrary, (props) => {
        const { container } = render(
          <AudioPlayer
            audioUrl={props.audioUrl}
            questionText={props.questionText}
            stepNumber={props.stepNumber}
          />
        );

        // Verify step number is displayed correctly
        const stepElement = screen.getByText(`Step ${props.stepNumber}`);
        expect(stepElement).toBeInTheDocument();

        // Verify question text is displayed correctly
        const questionElement = screen.getByText(props.questionText);
        expect(questionElement).toBeInTheDocument();

        // Verify audio element has correct source
        const audioElement = container.querySelector('audio');
        expect(audioElement).toHaveAttribute('src', props.audioUrl);

        // The step number and question should always be consistently paired
        const stepContainer = stepElement.closest('div');
        const questionContainer = questionElement.closest('div');
        expect(stepContainer).toBe(questionContainer);
      })
    );
  });

  it('should preserve step-question relationship during audio state changes', () => {
    fc.assert(
      fc.property(audioPlayerArbitrary, async (props) => {
        render(
          <AudioPlayer
            audioUrl={props.audioUrl}
            questionText={props.questionText}
            stepNumber={props.stepNumber}
          />
        );

        const playButton = screen.getByLabelText(/play audio/i);
        
        // Simulate audio metadata loaded
        mockAudio._duration = 120; // 2 minutes
        const metadataEvent = new Event('loadedmetadata');
        mockAudio.addEventListener.mock.calls
          .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

        // Click play button
        fireEvent.click(playButton);

        // Verify step and question are still correctly displayed after state change
        expect(screen.getByText(`Step ${props.stepNumber}`)).toBeInTheDocument();
        expect(screen.getByText(props.questionText)).toBeInTheDocument();
      })
    );
  });
});

/**
 * Property 5: Audio Storage Reliability
 * For any audio recording operation, the system should either successfully 
 * store the audio with proper metadata or gracefully fallback without data loss.
 */
describe('Property 5: Audio Storage Reliability', () => {
  const audioErrorScenarios = fc.constantFrom(
    'Failed to load audio',
    'Network error',
    'Unsupported format',
    'Playback failed'
  );

  it('should gracefully handle audio loading errors without losing question data', () => {
    fc.assert(
      fc.property(audioPlayerArbitrary, audioErrorScenarios, (props, errorType) => {
        render(
          <AudioPlayer
            audioUrl={props.audioUrl}
            questionText={props.questionText}
            stepNumber={props.stepNumber}
          />
        );

        // Simulate audio error
        const errorEvent = new Event('error');
        mockAudio.addEventListener.mock.calls
          .find(call => call[0] === 'error')?.[1](errorEvent);

        // Verify error state is displayed
        expect(screen.getByText('Audio Error')).toBeInTheDocument();
        
        // Verify question data is preserved even in error state
        expect(screen.getByText(`Question: ${props.questionText}`)).toBeInTheDocument();
        
        // Verify step information is still accessible
        const stepText = screen.getByText(`Step ${props.stepNumber}`);
        expect(stepText).toBeInTheDocument();
      })
    );
  });

  it('should maintain audio controls accessibility during all states', () => {
    fc.assert(
      fc.property(audioPlayerArbitrary, (props) => {
        render(
          <AudioPlayer
            audioUrl={props.audioUrl}
            questionText={props.questionText}
            stepNumber={props.stepNumber}
          />
        );

        // Verify accessibility attributes are present
        const playButton = screen.getByLabelText(/play audio/i);
        expect(playButton).toHaveAttribute('aria-label');

        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax');
        expect(progressBar).toHaveAttribute('aria-valuenow');
        expect(progressBar).toHaveAttribute('aria-label', 'Audio progress');

        const volumeControl = screen.getByLabelText('Volume control');
        expect(volumeControl).toBeInTheDocument();
      })
    );
  });

  it('should handle volume and playback controls consistently', () => {
    fc.assert(
      fc.property(
        audioPlayerArbitrary,
        fc.float({ min: 0, max: 1 }),
        (props, volumeLevel) => {
          render(
            <AudioPlayer
              audioUrl={props.audioUrl}
              questionText={props.questionText}
              stepNumber={props.stepNumber}
            />
          );

          const volumeSlider = screen.getByLabelText('Volume control') as HTMLInputElement;
          
          // Change volume
          fireEvent.change(volumeSlider, { target: { value: volumeLevel.toString() } });
          
          // Verify volume display is consistent
          const volumeDisplay = screen.getByText(`${Math.round(volumeLevel * 100)}%`);
          expect(volumeDisplay).toBeInTheDocument();
          
          // Verify mute button functionality
          const muteButton = screen.getByLabelText(/mute|unmute/i);
          fireEvent.click(muteButton);
          
          // After muting, volume should show 0%
          expect(screen.getByText('0%')).toBeInTheDocument();
        }
      )
    );
  });
});

/**
 * Integration Property: Audio Player Component Integrity
 * The audio player should maintain consistent behavior across all prop combinations
 */
describe('Audio Player Component Integrity', () => {
  it('should handle all valid prop combinations without errors', () => {
    fc.assert(
      fc.property(
        fc.record({
          audioUrl: fc.webUrl(),
          questionText: fc.string({ minLength: 1, maxLength: 500 }),
          stepNumber: fc.integer({ min: 1, max: 100 }),
          className: fc.option(fc.string(), { nil: undefined }),
        }),
        (props) => {
          const onPlayStart = jest.fn();
          const onPlayEnd = jest.fn();

          const { container } = render(
            <AudioPlayer
              {...props}
              onPlayStart={onPlayStart}
              onPlayEnd={onPlayEnd}
            />
          );

          // Component should render without throwing
          expect(container.firstChild).toBeInTheDocument();
          
          // Essential elements should be present
          expect(screen.getByText(`Step ${props.stepNumber}`)).toBeInTheDocument();
          expect(screen.getByText(props.questionText)).toBeInTheDocument();
          expect(screen.getByLabelText(/play audio/i)).toBeInTheDocument();
        }
      )
    );
  });

  it('should maintain time formatting consistency', () => {
    fc.assert(
      fc.property(
        fc.record({
          audioUrl: fc.webUrl(),
          questionText: fc.string({ minLength: 1, maxLength: 100 }),
          stepNumber: fc.integer({ min: 1, max: 10 }),
        }),
        fc.float({ min: 0, max: 3600 }), // 0 to 1 hour in seconds
        (props, timeInSeconds) => {
          render(
            <AudioPlayer
              audioUrl={props.audioUrl}
              questionText={props.questionText}
              stepNumber={props.stepNumber}
            />
          );

          // Simulate audio with duration
          mockAudio._duration = timeInSeconds;
          mockAudio._currentTime = timeInSeconds / 2; // Half way through

          const metadataEvent = new Event('loadedmetadata');
          mockAudio.addEventListener.mock.calls
            .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

          const timeUpdateEvent = new Event('timeupdate');
          mockAudio.addEventListener.mock.calls
            .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

          // Time should be formatted as MM:SS
          const timeElements = screen.getAllByText(/^\d+:\d{2}$/);
          expect(timeElements.length).toBeGreaterThanOrEqual(2); // Current time and duration

          // Verify time format is consistent (MM:SS)
          timeElements.forEach(element => {
            const timeText = element.textContent || '';
            expect(timeText).toMatch(/^\d+:\d{2}$/);
            
            const [minutes, seconds] = timeText.split(':').map(Number);
            expect(seconds).toBeLessThan(60);
            expect(minutes).toBeGreaterThanOrEqual(0);
          });
        }
      )
    );
  });
});