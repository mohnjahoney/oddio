

# ODDiO MVP Specification

## Overview

ODDiO is a browser-based experimental audio communication lab.

The MVP demonstrates that short text messages can be:
- encoded into sequences of tones
- played through ordinary speakers
- recorded externally
- decoded back into text through microphone analysis

The initial implementation prioritizes:
- simplicity
- observability
- reliability
- rapid iteration

Bandwidth and efficiency are intentionally secondary.


## Core User Flow

1. User types a short text message
2. User presses `ODDiO IT`
3. Browser encodes the message into audio tones
4. Browser plays the tone sequence
5. User records/replays the sound externally
6. User switches ODDiO into listening mode
7. Browser analyzes incoming audio
8. ODDiO reconstructs the symbol stream
9. Decoded text is displayed


## Platform

Initial platform:
- browser-based web app
- TypeScript
- Vite
- Web Audio API

The browser app should function both as:
- user interface
- protocol debugging laboratory


## Audio Encoding

### Encoding Model

Text is converted into:

```text
UTF-8 bytes
→ hexadecimal symbols
→ tone sequence
```

Example:

```text
HELLO
→ 48454C4C4F
→ tones
```


### Tone Alphabet

The MVP uses:
- single monophonic tones
- chromatic pitches
- approximately C3–C5 range

Initial symbol space:
- hexadecimal digits (0–F)
- 16 tones total

Suggested initial mapping:

```text
0  -> C3
1  -> C#3
2  -> D3
3  -> D#3
4  -> E3
5  -> F3
6  -> F#3
7  -> G3
8  -> G#3
9  -> A3
A  -> A#3
B  -> B3
C  -> C4
D  -> C#4
E  -> D4
F  -> D#4
```

This mapping is intentionally simple and deterministic.


### Timing

Initial timing is fixed-length.

Suggested defaults:
- tone duration: 250ms
- silence gap: 50ms

No adaptive timing or realtime synchronization is required in the MVP.


### Tone Synthesis

Use browser-native Web Audio API oscillator nodes.

Initial waveform:
- sine wave

Future customization of timbre is explicitly out of scope for MVP.


## Decoding

### Processing Model

The MVP decoder operates in batch-processing mode.

Reasoning:
- easier debugging
- easier visualization
- simpler synchronization
- easier experimentation with thresholds and analysis

Realtime streaming decode is intentionally deferred.


### Audio Analysis

Incoming audio is analyzed using:
- Web Audio API
- FFT/spectral analysis

Initial strategy:
- detect dominant frequency per symbol window
- map detected pitch back into symbol space
- reconstruct hexadecimal stream
- decode UTF-8 text


### Error Handling

MVP error handling should remain lightweight.

Initial mechanisms:
- confidence thresholds
- invalid-symbol detection
- basic checksum or parity validation (optional)

Advanced ECC systems are out of scope.


## Interface / Lab Environment

The interface should resemble a signal-analysis workbench rather than a traditional app UI.

Suggested components:
- text input
- `ODDiO IT` button
- playback controls
- listening mode toggle
- waveform visualization
- FFT/spectrogram visualization
- detected note stream
- decoded hexadecimal stream
- decoded text output
- confidence/debug indicators

The visualization layer is considered essential to the MVP experience.


### Visualization Goals

The visualization system should function as a signal-analysis workbench rather than decorative UI.

The visualizations are intended to support:
- debugging
- protocol understanding
- pitch recognition intuition
- timing analysis
- decoder trust/confidence
- exploratory experimentation

The spectrogram view is expected to become the primary analysis surface.


### Spectrogram / Spectral Density View

The MVP should include a scrolling or continuously updating 2D spectral density visualization.

Desired characteristics:
- horizontal axis represents time
- vertical axis represents frequency
- color/intensity represents spectral magnitude

The spectrogram should make it visually easy to identify:
- tone regions
- silence gaps
- pitch transitions
- harmonics
- noisy or ambiguous regions
- failed decodes or artifacts


### Waveform View

The MVP should also include a simpler waveform representation.

The waveform does not need to be visually sophisticated.

Primary goals:
- visibly distinguish tones from silence
- help users understand packet timing
- provide intuitive temporal structure

The waveform should appear directly below the spectrogram.


### Time Alignment

Waveform and spectrogram views should share the same horizontal time axis.

Preferred layout:

```text
Spectrogram
Waveform
```

This alignment should allow users to visually correlate:
- waveform amplitude
- silence regions
- spectral activity
- symbol timing
- decoding boundaries


### Pitch Guides

The spectrogram should include musical pitch guides.

Suggested approach:
- label octave anchor notes directly (C3, C4, etc.)
- optionally represent intermediate chromatic pitches with dots/ticks
- extend pitch guides horizontally across the spectrogram

These pitch guides should allow users to approximately identify transmitted notes by eye.

The pitch guides are considered an important part of the educational and debugging experience.


## Architecture

The codebase should separate:

```text
protocol/
audio/
analysis/
ui/
visualization/
```

Protocol logic should remain as platform-independent as practical.


## Explicit Non-Goals (MVP)

The MVP does NOT attempt to solve:
- realtime streaming decode
- ultrasonic transport
- encryption
- packet networking
- high bandwidth transfer
- overlapping/polyphonic tones
- advanced musical encoding
- mobile-native integration
- background operation
- production-grade robustness


## Future Possibilities (Speculative)

Potential future directions:
- realtime decode
- error correction layers
- customizable tone alphabets
- musical/steganographic modes
- ultrasonic transport
- SDKs and open protocol tooling
- IVR metadata transmission
- device pairing workflows
- artistic/social communication systems

These are exploratory directions rather than commitments.