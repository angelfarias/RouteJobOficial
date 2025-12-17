import { render, screen } from '@testing-library/react';
import AudioPlayer from '../AudioPlayer';

// Simple integration test to verify component renders without errors
describe('AudioPlayer Integration', () => {
  const mockProps = {
    audioUrl: 'https://example.com/test-audio.mp3',
    questionText: 'Test question for audio response',
    stepNumber: 1,
  };

  beforeEach(() => {
    // Mock HTMLAudioElement for integration test
    global.HTMLAudioElement = jest.fn(() => ({
      play: jest.fn(),
      pause: jest.fn(),
      load: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      currentTime: 0,
      duration: 0,
      volume: 1,
    })) as any;
  });

  it('renders AudioPlayer component successfully', () => {
    render(<AudioPlayer {...mockProps} />);
    
    // Verify essential elements are present
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Test question for audio response')).toBeInTheDocument();
    expect(screen.getByText('Audio Response')).toBeInTheDocument();
    expect(screen.getByLabelText('Play audio')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio progress')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume control')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(
      <AudioPlayer {...mockProps} className="test-class" />
    );
    
    expect(container.firstChild).toHaveClass('test-class');
  });

  it('displays correct step number and question', () => {
    render(
      <AudioPlayer 
        {...mockProps} 
        stepNumber={5} 
        questionText="What are your technical skills?" 
      />
    );
    
    expect(screen.getByText('Step 5')).toBeInTheDocument();
    expect(screen.getByText('What are your technical skills?')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<AudioPlayer {...mockProps} />);
    
    const playButton = screen.getByLabelText('Play audio');
    expect(playButton).toHaveAttribute('type', 'button');
    
    const progressBar = screen.getByLabelText('Audio progress');
    expect(progressBar).toHaveAttribute('role', 'progressbar');
    
    const volumeControl = screen.getByLabelText('Volume control');
    expect(volumeControl).toHaveAttribute('type', 'range');
  });
});