import type { WorkbenchModel } from "../shared/types";

export function renderWorkbench(root: HTMLElement, model: WorkbenchModel): void {
  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar" aria-label="ODDiO status">
        <div>
          <p class="eyebrow">Experimental audio communication lab</p>
          <h1>ODDiO</h1>
        </div>
        <div class="status-pill">
          <span class="status-light" aria-hidden="true"></span>
          <span>${model.status.label}</span>
        </div>
      </header>

      <section class="pipeline" aria-label="ODDiO signal pipeline">
        <aside class="lab-panel side-panel encoder-panel">
          <div class="panel-heading">
            <span class="panel-kicker">Text / Encode</span>
            <h2>Source</h2>
          </div>
          <div class="tab-row" role="tablist" aria-label="Source format">
            <button
              type="button"
              class="tab-button active-tab"
              role="tab"
              aria-selected="true"
              data-source-tab="text"
            >
              Text
            </button>
            <button
              type="button"
              class="tab-button"
              role="tab"
              aria-selected="false"
              data-source-tab="hex"
            >
              Hex
            </button>
            <button
              type="button"
              class="tab-button"
              role="tab"
              aria-selected="false"
              data-source-tab="tones"
            >
              Tones
            </button>
          </div>
          <div class="source-panel-stack">
            <div data-source-panel="text">
              <label class="input-label" for="message-input">Message</label>
              <textarea
                id="message-input"
                rows="8"
                placeholder="Type a short message..."
                spellcheck="false"
              ></textarea>
            </div>
            <div data-source-panel="hex" hidden>
              <div class="field-heading">
                <label class="input-label" for="generated-hex">Hex</label>
                <span><output id="generated-bytes">0</output> UTF-8 bytes</span>
              </div>
              <textarea id="generated-hex" rows="8" placeholder="Hex will appear here..." readonly></textarea>
            </div>
            <div data-source-panel="tones" hidden>
              <label class="input-label" for="generated-tones">Tones</label>
              <textarea
                id="generated-tones"
                rows="8"
                placeholder="Tone sequence will appear here..."
                readonly
              ></textarea>
            </div>
          </div>
          <button type="button" class="primary-action" id="encode-button">ODDiO</button>

          <div class="parameter-group" aria-label="Encoding parameters">
            <div class="group-heading">
              <span class="panel-kicker">Encode Params</span>
            </div>
            ${renderParameterList(model.encodingParameters)}
          </div>

          <output class="summary-readout" aria-label="Generated signal summary">
            <span>Signal</span>
            <strong id="generated-signal-summary">No generated audio</strong>
          </output>
        </aside>

        <section class="audio-workspace lab-panel" id="audio-workspace" aria-label="Current audio buffer">
          <div class="audio-header">
            <div class="panel-heading">
              <span class="panel-kicker">Audio Workspace</span>
              <h2>Current Buffer</h2>
            </div>
            <div class="buffer-state" id="buffer-state">
              <span class="status-light inactive-light" id="buffer-state-light" aria-hidden="true"></span>
              <span id="buffer-state-label">No audio loaded</span>
            </div>
          </div>

          <div class="spectrogram-shell">
            <div class="axis-label y-axis">Frequency</div>
            <div class="spectrogram-display" aria-label="Spectrogram empty state">
              <canvas id="spectrogram-canvas" class="spectrogram-canvas"></canvas>
              <canvas id="pitch-estimate-canvas" class="pitch-estimate-canvas"></canvas>
              <div id="pitch-guide-layer" class="pitch-guide-layer" aria-hidden="true"></div>
              <div id="note-region-layer" class="note-region-layer" aria-hidden="true"></div>
              <div class="empty-audio-state" id="empty-audio-state">
                <span>Drop audio here</span>
                <strong>or generate it from text</strong>
              </div>
            </div>
            <div class="axis-label x-axis">Time</div>
          </div>

          <div class="analysis-controls" aria-label="Spectrogram analysis controls">
            <label>
              <span>analysis</span>
              <select id="analysis-package-select">
                <option value="HomeMade">HomeMade</option>
                <option value="Pitchy">Pitchy</option>
              </select>
            </label>
            <label>
              <span>strategy</span>
              <select id="decode-strategy-select">
                <option value="FixedGrid">Fixed Grid</option>
                <option value="Threshold">Threshold</option>
              </select>
            </label>
            <label class="checkbox-control">
              <span>overlay</span>
              <input id="pitch-overlay-toggle" type="checkbox" checked />
            </label>
            <label class="checkbox-control">
              <span>pitch line</span>
              <input id="pitch-estimate-toggle" type="checkbox" />
            </label>
            <label>
              <span>f bins</span>
              <input
                id="frequency-bin-slider"
                type="range"
                min="24"
                max="288"
                step="12"
                value="144"
              />
              <input
                id="frequency-bin-input"
                type="number"
                min="24"
                max="288"
                step="12"
                value="144"
              />
            </label>
            <label>
              <span>t bins</span>
              <input
                id="time-slice-slider"
                type="range"
                min="40"
                max="240"
                step="10"
                value="120"
              />
              <input
                id="time-slice-input"
                type="number"
                min="40"
                max="240"
                step="10"
                value="120"
              />
            </label>
            <div
              class="strategy-parameter-panel"
              id="threshold-parameter-panel"
              aria-label="Threshold decode strategy parameters"
              hidden
            >
              <div class="strategy-parameter-heading">
                <span>Decode Strategy Parameters</span>
              </div>
              <label>
                <span>volume</span>
                <input
                  id="threshold-volume-input"
                  type="number"
                  min="0"
                  max="1"
                  step="0.005"
                  value="0.02"
                />
              </label>
              <label>
                <span>clarity</span>
                <input
                  id="threshold-clarity-input"
                  type="number"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value="0.75"
                />
              </label>
              <label>
                <span>duration ms</span>
                <input
                  id="threshold-duration-input"
                  type="number"
                  min="20"
                  max="1000"
                  step="10"
                  value="80"
                />
              </label>
            </div>
          </div>

          <div class="waveform-display" id="waveform-display" aria-label="Waveform empty state">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          <div class="transport-row" aria-label="Audio controls">
            <button
              type="button"
              class="icon-button"
              id="play-button"
              aria-label="Play current audio"
              disabled
            >
              Play
            </button>
            <button
              type="button"
              class="icon-button"
              id="stop-button"
              aria-label="Stop current audio"
              disabled
            >
              Stop
            </button>
            <output class="playback-time" id="playback-time" aria-label="Playback position">
              0.00 / 0.00 s
            </output>
            <button type="button" class="secondary-button" id="import-button">Import</button>
            <input id="audio-file-input" type="file" accept="audio/*" hidden />
            <button type="button" class="secondary-button" id="export-button" disabled>Export</button>
            <button type="button" class="secondary-button" id="test-beep-button">Beep</button>
            <button type="button" class="record-button" id="record-button">Record</button>
          </div>
        </section>

        <aside class="lab-panel side-panel decoder-panel">
          <div class="panel-heading">
            <span class="panel-kicker">Decode / Text</span>
            <h2>Recovered</h2>
          </div>
          <div class="tab-row" role="tablist" aria-label="Decoded format">
            <button
              type="button"
              class="tab-button active-tab"
              role="tab"
              aria-selected="true"
              data-decode-tab="text"
            >
              Text
            </button>
            <button
              type="button"
              class="tab-button"
              role="tab"
              aria-selected="false"
              data-decode-tab="hex"
            >
              Hex
            </button>
          </div>
          <div class="decode-panel-stack">
            <div data-decode-panel="text">
              <label class="input-label" for="decoded-output">Decoded</label>
              <textarea
                id="decoded-output"
                rows="8"
                placeholder="Decoded text will appear here..."
                readonly
              ></textarea>
            </div>
            <div data-decode-panel="hex" hidden>
              <label class="input-label" for="decoded-hex-output">Decoded Hex</label>
              <textarea
                id="decoded-hex-output"
                rows="8"
                placeholder="Decoded hex will appear here..."
                readonly
              ></textarea>
            </div>
          </div>
          <button type="button" class="primary-action reverse-action" id="decode-button" disabled>
            <span aria-hidden="true">ODDiO</span>
            <span class="visually-hidden">Reverse ODDiO</span>
          </button>

          <div class="parameter-group" aria-label="Decoding parameters">
            <div class="group-heading">
              <span class="panel-kicker">Decode Params</span>
            </div>
            ${renderParameterList(model.decodingParameters)}
          </div>

          <output class="summary-readout" aria-label="Decode summary">
            <span>Notes</span>
            <strong id="detected-notes-output">--</strong>
            <span>Status</span>
            <strong id="decode-status-output">Idle</strong>
          </output>
        </aside>
      </section>

      <footer class="debug-strip">
        <span id="debug-status">${model.status.detail}</span>
      </footer>
    </main>
  `;
}

function renderParameterList(parameters: WorkbenchModel["encodingParameters"]): string {
  return `
    <dl class="parameter-list">
      ${parameters
        .map(
          (parameter) => `
            <div>
              <dt>${parameter.label}</dt>
              <dd>${parameter.value}</dd>
            </div>
          `,
        )
        .join("")}
    </dl>
  `;
}
