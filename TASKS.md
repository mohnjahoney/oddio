
# ODDiO MVP Tasks

## Phase 1 — Project Bootstrap

### Project Setup
- [ ] Create Vite + TypeScript app
- [ ] Configure linting/formatting
- [ ] Establish directory structure
- [ ] Create basic dark "lab" visual theme

### Initial Architecture
- [ ] Create top-level modules:
  - [ ] `protocol/`
  - [ ] `audio/`
  - [ ] `analysis/`
  - [ ] `ui/`
  - [ ] `visualization/`
- [ ] Define shared types/interfaces
- [ ] Add basic logging/debug utilities


## Phase 1.5 — Visual Pipeline Workspace

The app should be organized around a left-to-right pipeline:

```text
Text / Encode  ->  Audio Workspace  ->  Decode / Text
```

The central audio workspace should become the main source of truth once audio exists.
Generated tones, imported files, dropped files, and recorded audio should all converge into
one current audio buffer. Playback, export, waveform rendering, spectrogram rendering, and
decoding should all read from that current audio buffer.

### Pipeline Layout
- [ ] Replace the placeholder panel grid with a three-zone pipeline layout:
  - [ ] left encoder column
  - [ ] center audio workspace
  - [ ] right decoder column
- [ ] Make the center audio workspace the largest visual region
- [ ] Visually communicate the left-to-right flow from text to audio to decoded text
- [ ] Keep the interface feeling like a signal-analysis workbench rather than a product dashboard

### Encoder Column
- [ ] Add text/hex tabs for the source message
- [ ] Keep the text entry field as the primary input surface
- [ ] Add `ODDiO IT` encode button
- [ ] Add encoding parameters below the source message area:
  - [ ] tone duration
  - [ ] silence gap
  - [ ] output volume
  - [ ] waveform type display, fixed to sine for MVP
  - [ ] START/STOP marker toggle or status if framing is added
- [ ] Show generated hex and tone summary after encoding

### Audio Workspace
- [ ] Add large spectrogram region with time on the x-axis and frequency on the y-axis
- [ ] Add waveform region directly below the spectrogram
- [ ] Align waveform and spectrogram on the same time axis
- [ ] Show waveform whenever an audio buffer is present
- [ ] Add standard playback controls for the current audio buffer
- [ ] Add export audio control
- [ ] Add import audio control
- [ ] Add drag-and-drop target for audio files
- [ ] Add record control that can create a new audio buffer from microphone input
- [ ] Display a clear empty state before audio exists

### Decoder Column
- [ ] Add read-only decoded text/hex tabs
- [ ] Add reverse `ODDiO` decode button
- [ ] Keep reverse `ODDiO` disabled or visually inactive until audio exists
- [ ] Add decoding parameters below the decoded output area:
  - [ ] analysis window size
  - [ ] confidence threshold
  - [ ] silence threshold
  - [ ] expected tone duration
- [ ] Show detected notes, reconstructed hex, decoded text, and decode status after decoding


## Phase 2 — Encoding Pipeline + Generated Audio Buffer

### Symbol System
- [ ] Define hexadecimal symbol set
- [ ] Define tone mapping table
- [ ] Create note/frequency utilities
- [ ] Add tone lookup helpers

### Text Encoding
- [ ] Convert text → UTF-8 bytes
- [ ] Convert bytes → hex stream
- [ ] Convert hex stream → tone sequence
- [ ] Add START/STOP markers (optional)

### Audio Buffer Generation
- [ ] Generate a concrete audio buffer from the tone sequence
- [ ] Use browser-native Web Audio API primitives where practical
- [ ] Implement fixed tone duration and silence gap defaults
- [ ] Add fade-in/fade-out envelopes to reduce clicks
- [ ] Store generated audio as the current audio buffer in the central workspace
- [ ] Calculate basic audio metadata:
  - [ ] duration
  - [ ] sample rate
  - [ ] source type: generated/imported/recorded

### UI Integration
- [ ] Wire source text field to encoding pipeline
- [ ] Wire `ODDiO IT` button to generate the current audio buffer
- [ ] Display generated hex stream
- [ ] Display generated tone sequence
- [ ] Display generated audio metadata
- [ ] Enable audio workspace playback controls after generation
- [ ] Enable reverse `ODDiO` button after generation


## Phase 3 — Audio Workspace Inputs + Playback

### Current Audio Buffer Model
- [ ] Define shared current-audio-buffer state/interface
- [ ] Treat generated, imported, dropped, and recorded audio as interchangeable buffer sources
- [ ] Preserve source metadata for observability
- [ ] Reset downstream decode results when the current audio buffer changes

### Playback
- [ ] Initialize Web Audio API context
- [ ] Implement playback for the current audio buffer
- [ ] Add play/pause/stop or restart controls
- [ ] Add playback position/progress display
- [ ] Keep waveform cursor aligned with playback position

### Import / Drop / Export
- [ ] Import audio file through a file picker
- [ ] Import audio file through drag-and-drop
- [ ] Decode imported files into an audio buffer
- [ ] Export current audio buffer as a WAV file
- [ ] Surface import/export errors clearly

### Recording
- [ ] Request microphone permissions
- [ ] Record microphone input into an audio buffer
- [ ] Add record/stop state handling
- [ ] Store recorded audio as the current audio buffer
- [ ] Surface microphone permission errors clearly

### Waveform
- [ ] Render waveform for the current audio buffer
- [ ] Distinguish tones from silence clearly
- [ ] Keep waveform time axis aligned with the spectrogram region


## Phase 4 — Spectrogram + Pitch Detection

### Spectral Density
- [ ] Compute spectral density from the current audio buffer
- [ ] Render spectrogram with time on the x-axis and frequency on the y-axis
- [ ] Represent spectral magnitude through color/intensity
- [ ] Re-render spectrogram when current audio buffer or analysis parameters change

### Pitch Guides
- [ ] Add pitch guide overlays for octave anchor notes (C3, C4, etc.)
- [ ] Draw horizontal pitch guide lines across the spectrogram
- [ ] Add chromatic tick/dot markers between octave anchors
- [ ] Keep pitch guides visually useful without obscuring spectral data

### Note Extraction
- [ ] Segment audio into symbol windows
- [ ] Detect dominant frequency per analysis window
- [ ] Convert detected frequency → nearest note
- [ ] Add confidence estimation
- [ ] Handle silence and ambiguous regions explicitly
- [ ] Label regions on the spectrogram with pitch estimates
- [ ] Evaluate whether a pitch-detection package should replace or augment the initial FFT approach

### Debug / Observability
- [ ] Display detected note sequence
- [ ] Display confidence/debug visualization
- [ ] Add decode boundary / symbol-window overlays
- [ ] Make failed or low-confidence regions visible in the graph


## Phase 5 — Decode Pipeline

### Symbol Reconstruction
- [ ] Decode detected notes → hex symbols
- [ ] Reconstruct hex stream
- [ ] Convert hex stream → UTF-8 text
- [ ] Handle invalid notes gracefully
- [ ] Handle invalid hex and UTF-8 decode errors gracefully

### Decode UI
- [ ] Wire reverse `ODDiO` button to the decode pipeline
- [ ] Display detected note sequence
- [ ] Display decoded hex stream
- [ ] Display decoded text
- [ ] Add decode status/errors
- [ ] Keep decoded text field read-only
- [ ] Keep decoded text/hex tabs synchronized with pipeline output

### Robustness
- [ ] Add silence thresholding
- [ ] Add simple checksum/parity validation (optional)
- [ ] Tune timing tolerances
- [ ] Preserve intermediate decode artifacts for debugging


## Phase 6 — MVP Refinement

### UX / Lab Feel
- [ ] Improve visual hierarchy
- [ ] Refine the left-to-right pipeline feel
- [ ] Add retro signal-lab styling where it improves comprehension
- [ ] Improve playback/import/record/decode transitions
- [ ] Add subtle animation/motion
- [ ] Improve oscilloscope / signal-lab visual identity

### Testing
- [ ] Test generated audio → decode without leaving the browser
- [ ] Test exported WAV → imported WAV → decode
- [ ] Test laptop speaker → phone recording → laptop decode
- [ ] Test phone speaker → laptop decode
- [ ] Test noisy-room scenarios
- [ ] Test different playback volumes
- [ ] Tune tone durations and spacing
- [ ] Tune pitch detection and confidence thresholds

### Cleanup
- [ ] Refactor protocol constants/config
- [ ] Improve internal documentation
- [ ] Remove dead/debug code
- [ ] Prepare simple deployment build


## Stretch Goals (Still MVP-Compatible)

These are optional if the core loop becomes stable quickly.

- [ ] Configurable tone duration
- [ ] Configurable waveform type
- [ ] Alternate tone alphabets
- [ ] Packet framing visualization
- [ ] Sequence replay visualization
- [ ] Interactive spectrogram inspection/cursor tools
- [ ] Zoom/pan controls for analysis timeline
- [ ] Side-by-side comparison between generated and imported audio
- [ ] Manual correction of detected note regions before final decode


## Explicitly Deferred

Not part of current MVP scope:

- realtime streaming decode
- ultrasonic transport
- encryption
- mobile-native apps
- advanced ECC
- polyphonic encoding
- high-bandwidth transfer
- networking/server infrastructure
- user accounts/sharing systems
- production protocol standardization
