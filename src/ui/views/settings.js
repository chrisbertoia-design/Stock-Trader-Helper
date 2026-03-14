/**
 * Settings view — reads/writes the Google Sheets config tab.
 * Groups settings into sections. All values editable in-app.
 */

import { getConfig, saveEditableConfig } from '../../stores/config.js'
import { info }                          from '../../services/logger.js'
import { showToast }                     from '../components/toast.js'

const CAT = 'SETTINGS_VIEW'

const SECTIONS = [
  {
    title: 'Consensus Thresholds',
    note: 'Fraction of a party (0–1) that must trade the same ticker within the window to trigger a signal. Research-backed defaults — adjust if too noisy.',
    fields: [
      { key: 'consensus_tier1_pct',   label: 'Tier 1 — Elevated',        type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_tier2_pct',   label: 'Tier 2 — Strong',          type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_tier3_pct',   label: 'Tier 3 — Near-Unanimous',  type: 'number', step: '0.01', min: '0.01', max: '1' },
      { key: 'consensus_window_days', label: 'Window (days)',             type: 'number', step: '1',    min: '7',    max: '90' },
    ]
  },
  {
    title: 'AI Provider',
    note: 'Ollama runs locally (laptop only). Gemini works on all devices. Model field is optional — leave blank to use provider default.',
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
    note: 'Logs are written to the "log" tab in your Google Sheet. DEBUG is verbose — switch to INFO for quieter operation.',
    fields: [
      { key: 'log_level',    label: 'Log Level',    type: 'select', options: ['DEBUG', 'INFO', 'WARN', 'ERROR'] },
      { key: 'log_max_rows', label: 'Max Log Rows', type: 'number', step: '100', min: '100' },
    ]
  }
]

export async function renderSettings(container) {
  info(CAT, 'renderSettings()')
  const config = getConfig()
  const edits  = { ...config }

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
      </div>
    </div>
  `

  // Track changes
  container.addEventListener('change', (e) => {
    const key = e.target.dataset.key
    if (key) edits[key] = e.target.value
  })

  document.getElementById('save-settings').addEventListener('click', async () => {
    const btn = document.getElementById('save-settings')
    btn.textContent = 'Saving...'
    btn.disabled = true
    try {
      await saveEditableConfig(edits)
      showToast('Settings saved to Google Sheets')
      info(CAT, 'Settings saved')
    } catch (e) {
      showToast(`Save failed: ${e.message}`)
    } finally {
      btn.textContent = 'Save to Sheets'
      btn.disabled = false
    }
  })
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
