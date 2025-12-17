import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  _currentTime: 0,
  _duration: 0,
  _eventListeners: {} as Record<string, Function[]>,
};

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset mock state
  mockAudio._currentTime = 0;
  mockAudio._duration = 0;
  mockAudio._eventListeners = {};
  
  // Mock addEventListener to store listeners
  mockAudio.addEventListener = jest.fn((event: string, listener: Function) => {
    if (!mockAudio._eventListeners[event]) {
      mockAudio._eventListeners[event] = [];
    }
    mockAudio._eventListeners[event].push(listener);
  });
  
  // Mock HTMLAudioElement constructor
  global.HTMLAudioElement = jest.fn(() => mockAudio) as any;
  
  // Mock audio element properties
  Object.defineProperty(mockAudio, 'currentTime', {
    get: () => mockAudio._currentTime,
    set: (value) => { 
      mockAudio._currentTime = value;
      // Trigger timeupdate event
      mockAudio._eventListeners.timeupdate?.forEach(listener => listener());
    },
    configurable: true,
  });
  
  Object.defineProperty(mockAudio, 'duration', {
    get: () => mockAudio._duration,
    set: (value) => { mockAudio._duration = value; },
    configurable: true,
  });
});

const defaultProps = {
  audioUrl: 'https://example.com/audio.mp3',
  questionText: 'What is your professional experience?',
  stepNumber: 1,
};

describe('AudioPlayer Component', () => {
  describe('Rendering', () => {
    it('renders with basic props', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('What is your professional experience?')).toBeInTheDocument();
      expect(screen.getByText('Audio Response')).toBeInTheDocument();
      expect(screen.getByLabelText('Play audio')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <AudioPlayer {...defaultProps} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('renders audio element with correct source', () => {
      const { container } = render(<AudioPlayer {...defaultProps} />);
      
      const audioElement = container.querySelector('audio');
      expect(audioElement).toHaveAttribute('src', defaultProps.audioUrl);
      expect(audioElement).toHaveAttribute('preload', 'metadata');
    });
  });

  describe('Audio Controls', () => {
    it('shows loading state initially', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const playButton = screen.getByLabelText('Play audio');
      expect(playButton).toBeDisabled();
      
      // Should show loading spinner
      const spinner = playButton.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('enables play button after audio loads', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio loaded
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      expect(playButton).not.toBeDisabled();
    });

    it('toggles play/pause when button is clicked', async () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio loaded
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      
      // Click play
      fireEvent.click(playButton);
      expect(mockAudio.play).toHaveBeenCalled();
      
      // Button should now show pause
      await waitFor(() => {
        expect(screen.getByLabelText('Pause audio')).toBeInTheDocument();
      });
    });

    it('calls onPlayStart callback when audio starts', async () => {
      const onPlayStart = jest.fn();
      render(<AudioPlayer {...defaultProps} onPlayStart={onPlayStart} />);
      
      // Simulate audio loaded
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(onPlayStart).toHaveBeenCalled();
      });
    });

    it('calls onPlayEnd callback when audio ends', () => {
      const onPlayEnd = jest.fn();
      render(<AudioPlayer {...defaultProps} onPlayEnd={onPlayEnd} />);
      
      // Simulate audio ended
      const endedEvent = new Event('ended');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'ended')?.[1](endedEvent);

      expect(onPlayEnd).toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('displays correct time format', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio with duration
      mockAudio._duration = 125; // 2:05
      mockAudio._currentTime = 65; // 1:05
      
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const timeUpdateEvent = new Event('timeupdate');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

      expect(screen.getByText('1:05')).toBeInTheDocument();
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });

    it('updates progress bar width based on current time', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio progress
      mockAudio._duration = 100;
      mockAudio._currentTime = 25; // 25% progress
      
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const timeUpdateEvent = new Event('timeupdate');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

      const progressBar = screen.getByRole('progressbar').querySelector('div');
      expect(progressBar).toHaveStyle('width: 25%');
    });

    it('seeks to clicked position on progress bar', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      mockAudio._duration = 100;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const progressBar = screen.getByRole('progressbar');
      
      // Mock getBoundingClientRect
      progressBar.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        width: 200,
        top: 0,
        right: 200,
        bottom: 20,
        height: 20,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      // Click at 50% position (100px from left)
      fireEvent.click(progressBar, { clientX: 100 });
      
      expect(mockAudio._currentTime).toBe(50); // 50% of 100 seconds
    });
  });

  describe('Volume Controls', () => {
    it('toggles mute when mute button is clicked', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const muteButton = screen.getByLabelText('Mute');
      fireEvent.click(muteButton);
      
      expect(screen.getByLabelText('Unmute')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('updates volume when slider is changed', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      const volumeSlider = screen.getByLabelText('Volume control');
      fireEvent.change(volumeSlider, { target: { value: '0.7' } });
      
      expect(screen.getByText('70%')).toBeInTheDocument();
    });

    it('shows correct volume percentage', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Default volume should be 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('resets audio to beginning when reset button is clicked', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Set some current time
      mockAudio._currentTime = 50;
      
      const resetButton = screen.getByLabelText('Reset audio');
      fireEvent.click(resetButton);
      
      expect(mockAudio._currentTime).toBe(0);
    });

    it('pauses audio when reset is clicked during playback', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate playing state
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      fireEvent.click(playButton);
      
      const resetButton = screen.getByLabelText('Reset audio');
      fireEvent.click(resetButton);
      
      expect(mockAudio.pause).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('displays error state when audio fails to load', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio error
      const errorEvent = new Event('error');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1](errorEvent);

      expect(screen.getByText('Audio Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load audio')).toBeInTheDocument();
      expect(screen.getByText(`Question: ${defaultProps.questionText}`)).toBeInTheDocument();
    });

    it('handles playback errors gracefully', async () => {
      mockAudio.play.mockRejectedValueOnce(new Error('Playback failed'));
      
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio loaded
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByText('Playback failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all interactive elements', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      expect(screen.getByLabelText('Play audio')).toBeInTheDocument();
      expect(screen.getByLabelText('Audio progress')).toBeInTheDocument();
      expect(screen.getByLabelText('Reset audio')).toBeInTheDocument();
      expect(screen.getByLabelText('Mute')).toBeInTheDocument();
      expect(screen.getByLabelText('Volume control')).toBeInTheDocument();
    });

    it('has proper progressbar attributes', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      mockAudio._duration = 100;
      mockAudio._currentTime = 25;
      
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const timeUpdateEvent = new Event('timeupdate');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });

    it('updates ARIA labels based on state', async () => {
      render(<AudioPlayer {...defaultProps} />);
      
      // Simulate audio loaded
      mockAudio._duration = 120;
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const playButton = screen.getByLabelText('Play audio');
      fireEvent.click(playButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Pause audio')).toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('formats time correctly for various durations', () => {
      const testCases = [
        { seconds: 0, expected: '0:00' },
        { seconds: 30, expected: '0:30' },
        { seconds: 60, expected: '1:00' },
        { seconds: 125, expected: '2:05' },
        { seconds: 3661, expected: '61:01' },
      ];

      testCases.forEach(({ seconds, expected }) => {
        const { rerender } = render(<AudioPlayer {...defaultProps} />);
        
        mockAudio._duration = seconds;
        mockAudio._currentTime = seconds;
        
        const metadataEvent = new Event('loadedmetadata');
        mockAudio.addEventListener.mock.calls
          .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

        const timeUpdateEvent = new Event('timeupdate');
        mockAudio.addEventListener.mock.calls
          .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

        expect(screen.getByText(expected)).toBeInTheDocument();
        
        rerender(<AudioPlayer {...defaultProps} key={seconds} />);
      });
    });

    it('handles infinite and NaN time values', () => {
      render(<AudioPlayer {...defaultProps} />);
      
      mockAudio._duration = Infinity;
      mockAudio._currentTime = NaN;
      
      const metadataEvent = new Event('loadedmetadata');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'loadedmetadata')?.[1](metadataEvent);

      const timeUpdateEvent = new Event('timeupdate');
      mockAudio.addEventListener.mock.calls
        .find(call => call[0] === 'timeupdate')?.[1](timeUpdateEvent);

      // Should default to 0:00 for invalid values
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });
});