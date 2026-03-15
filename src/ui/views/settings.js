/**
 * Settings view — mock-only for Phase 1.
 * Shows a static settings form with no live data or saves.
 * No API or store imports.
 */

import { showToast } from '../components/toast.js'

const CAT = 'SETTINGS_VIEW'

const MOCK_CONFIG = {
  consensus_tier1_pct:   '0.05',
  consensus_tier2_pct:   '0.10',
  consensus_tier3_pct:   '0.25',
  consensus_window_days: '14',
  ai_provider:           'gemini',
  ai_model:              '',
  ollama_base_url:       'http://localhost:11434',
  ollama_fallback_model: 'llama3.2',
  gemini_api_key:        '',
  gemini_fallback_model: 'gemini-2.0-flash',
  ntfy_topic:            '',
  ntfy_base_url:         'https://ntfy.sh',
  notify_on_tier:        '2',
  log_level:             'INFO',
  log_max_rows:          '500',
}

const SECTIONS = [
  {
    title: 'Consensus Thresholds',
    note: 'Fraction of a party (0\u20131) that must trade the same ticker within the window to trigger a signal. Research-backed defaults \u2014 adjust if too noisy.',
    fields: [
      { key: 'consensus_tier1_pct',   label: 'Tier 1 \u2014 Elevated',        type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_tier2_pct',   label: 'Tier 2 \u2014 Strong',          type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_tier3_pct',   label: 'Tier 3 \u2014 Near-Unanimous',  type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_window_days', label: 'Window (days)',             type: 'number', step: '1',    min: '7',    max: '90' },
    ]
  },
  {
    title: 'AI Provider',
    note: 'Ollama runs locally (laptop only). Gemini works on all devices. Model field is optional \u2014 leave blank to use provider default.',
    fields: [
      { key: 'ai_provider',           label: 'Provider',            type: 'select', options: ['ollama', 'gemini'] },
      { key: 'ai_model',              label: 'Model Override',       type: 'text',   placeholder: 'blank = use provider default' },
      { key: 'ollama_base_url',       label: 'Ollama Base URL',      type: 'text',   placeholder: 'http://localhost:11434' },
      { key: 'ollama_fallback_model', label: 'Ollama Default Model', type: 'text',   placeholder: 'llama3.2' },
      { key: 'gemini_api_key',        label: 'Gemini API Key',       type: 'password' },
      { key: 'gemini_fallback_model', label: 'Gemini Default Model', type: 'text',   placeholder: 'gemini-2.0-flash' },
    ]
  },
  {
    title: 'Notifications',
    note: 'ntfy.sh sends push to your phone. Subscribe to your topic in the ntfy app. Leave blank to disable push.',
    fields: [
      { key: 'ntfy_topic',     label: 'ntfy.sh Topic Slug',   type: 'text', placeholder: 'your-private-topic-xyz' },
      { key: 'ntfy_base_url',  label: 'ntfy Server URL',      type: 'text', placeholder: 'https://ntfy.sh' },
      { key: 'notify_on_tier', label: 'Notify from Tier',     type: 'select', options: ['1', '2', '3'] },
    ]
  },
  {
    title: 'Debug & Logging',
    note: 'Logs are written to the "log" tab in your Google Sheet. DEBUG is verbose \u2014 switch to INFO for quieter operation.',
    fields: [
      { key: 'log_level',    label: 'Log Level',    type: 'select', options: ['DEBUG', 'INFO', 'WARN', 'ERROR'] },
      { key: 'log_max_rows', label: 'Max Log Rows', type: 'number', step: '100', min: '100' },
    ]
  }
]

export async function renderSettings(container, signal) {
  const config = { ...MOCK_CONFIG }

  container.innerHTML = `
    <div style="max-width: 560px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--s5);">
        <h2 style="font-size:15px; font-weight:500;">Settings</h2>
        <button class="btn btn-primary" id="save-settings">Save to Sheets</button>
      </div>
      ${SECTIONS.map(section => _renderSection(section, config)).join('')}

      <div style="margin-top:var(--s6); padding-top:var(--s4); border-top:1px solid var(--border-subtle);">
        <div style="font-size:12px; color:var(--text-tertiary);">
          Settings are stored in the <span style="font-family:var(--font-mono)">config</span> tab of your Google Sheet.
          You can also edit them directly in Sheets.
        </div>
        <div style="font-size:11px; color:var(--accent); margin-top:4px;">
          Live settings sync available in Phase 2
        </div>
      </div>
    </div>
  `

  // Save button — show Phase 2 toast
  const opts = signal ? { signal } : {}
  document.getElementById('save-settings').addEventListener('click', () => {
    showToast('Settings save available in Phase 2')
  }, opts)
}

function _renderSection(section, config) {
  return `
    <div class="card" style="margin-bottom:var(--s3);">
      <div style="margin-bottom:var(--s4);">
        <div style="font-size:13px; font-weight:500; margin-bottom:var(--s1);">${section.title}</div>
        <div style="font-size:12px; color:var(--text-tertiary); line-height:1.6;">${section.note}</div>
      </div>
      ${section.fields.map(f => _renderField(f, config[f.key] ?? '')).join('')}
    </div>
  `
}

function _renderField(field, value) {
  const inputStyle = `
    width:100%; padding:var(--s2) var(--s3);
    background:var(--bg-base); border:1px solid var(--border-soft);
    border-radius:var(--r2); color:var(--text-primary);
    font-family:var(--font-sans); font-size:13px;
    outline:none; transition: border-color var(--fast) var(--ease);
  `
  let input

  if (field.type === 'select') {
    input = `<select data-key="${field.key}" style="${inputStyle}">
      ${field.options.map(o => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('')}
    </select>`
  } else {
    input = `<input
      type="${field.type === 'password' ? 'password' : field.type || 'text'}"
      data-key="${field.key}"
      value="${field.type !== 'password' ? (value || '') : ''}"
      placeholder="${field.placeholder || ''}"
      ${field.step ? `step="${field.step}"` : ''}
      ${field.min  ? `min="${field.min}"` : ''}
      ${field.max  ? `max="${field.max}"` : ''}
      style="${inputStyle}"
    />`
  }

  return `
    <div style="display:grid; grid-template-columns:180px 1fr; align-items:center; gap:var(--s3); margin-bottom:var(--s3);">
      <label style="font-size:12px; color:var(--text-secondary);">${field.label}</label>
      ${input}
    </div>
  `
}
