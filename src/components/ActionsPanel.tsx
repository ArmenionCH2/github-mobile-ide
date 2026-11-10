import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Play, Plus, RefreshCw, X } from 'lucide-react';
import { api, repoPath } from '../github';

type Workflow = { id: number; name: string; path: string; state: string; html_url: string };
type Run = { id: number; name: string; display_title: string; html_url: string; status: string; conclusion: string | null };
type TemplateId = 'manual' | 'node' | 'rust';
const templateNames: Record<TemplateId, string> = { manual: 'Manual workflow', node: 'Node.js CI', rust: 'Rust CI' };
const templates: Record<TemplateId, { path: string; content: string }> = {
  manual: {
    path: '.github/workflows/manual.yml',
    content: ['name: Manual workflow', '', 'on:', '  workflow_dispatch:', '', 'jobs:', '  run:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - name: Hello', '        run: echo "Started manually from GitHub Actions"', ''].join('\n'),
  },
  node: {
    path: '.github/workflows/node-ci.yml',
    content: ['name: Node.js CI', '', 'on:', '  push:', '  pull_request:', '  workflow_dispatch:', '', 'jobs:', '  build:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/setup-node@v4', '        with:', "          node-version: '22'", '      - name: Install dependencies', '        run: npm install', '      - name: Test if available', '        run: npm test --if-present', ''].join('\n'),
  },
  rust: {
    path: '.github/workflows/rust-ci.yml',
    content: ['name: Rust CI', '', 'on:', '  push:', '  pull_request:', '  workflow_dispatch:', '', 'jobs:', '  test:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: dtolnay/rust-toolchain@stable', '      - name: Test', '        run: cargo test --all', ''].join('\n'),
  },
};

interface Props { account: string; repo: string; branch: string; onOpenIDE: () => void; }
function humanError(e: unknown) { return e instanceof Error ? e.message : String(e); }
export default function ActionsPanel({ account, repo, branch, onOpenIDE }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [template, setTemplate] = useState<TemplateId>('manual');
  const [yaml, setYaml] = useState(templates.manual.content);
  const [path, setPath] = useState(templates.manual.path);
  const [target, setTarget] = useState(branch);
  const base = repoPath(repo);

  async function reload() {
    setBusy(true); setError('');
    try {
      const [w, r] = await Promise.all([
        api<{ workflows: Workflow[] }>(account, 'GET', base + '/actions/workflows?per_page=100'),
        api<{ workflow_runs: Run[] }>(account, 'GET', base + '/actions/runs?per_page=30'),
      ]);
      setWorkflows(w.workflows || []);
      setRuns(r.workflow_runs || []);
    } catch (e) { setError(humanError(e)); }
    finally { setBusy(false); }
  }
  useEffect(() => { void reload(); }, [account, repo]);
  useEffect(() => { setTarget(branch); }, [branch]);

  function selectTemplate(next: TemplateId) {
    setTemplate(next); setYaml(templates[next].content); setPath(templates[next].path);
  }
  function startSetup() { selectTemplate('manual'); setEditing(true); setMessage(''); setError(''); }

  async function createWorkflow() {
    const filename = path.trim();
    if (!/^\.github\/workflows\/[a-zA-Z0-9_-]+\.ya?ml$/.test(filename)) {
      setError('Workflow path must be .github/workflows/name.yml (or .yaml).'); return;
    }
    if (!yaml.trim()) { setError('A workflow YAML file cannot be empty.'); return; }
    if (!window.confirm('Create ' + filename + ' in ' + repo + ' on branch ' + target + '? The YAML can execute code on GitHub runners.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      // No SHA is provided: GitHub refuses to overwrite any existing file.
      const encoded = btoa(Array.from(new TextEncoder().encode(yaml), byte => String.fromCharCode(byte)).join(''));
      await api(account, 'PUT', base + '/contents/' + filename.split('/').map(encodeURIComponent).join('/'), {
        message: 'ci: add ' + templateNames[template] + ' workflow',
        content: encoded,
        branch: target,
      });
      setEditing(false);
      setMessage('Workflow committed to ' + target + '. It may need a push or a manual dispatch before the first run appears.');
      await reload();
    } catch (e) {
      setError(humanError(e) + ' Ensure your GitHub token has Workflows (write) permission.');
    } finally { setBusy(false); }
  }
  async function dispatch(w: Workflow) {
    if (!window.confirm('Request a manual run of ' + w.name + ' on ' + branch + '?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api(account, 'POST', base + '/actions/workflows/' + w.id + '/dispatches', { ref: branch });
      setMessage('Dispatch requested. Refresh to see the new workflow run.');
    } catch (e) { setError(humanError(e) + ' Manual runs require workflow_dispatch and Actions (write) permission.'); }
    finally { setBusy(false); }
  }
  return <section className="remote-list actions-page">
    <div className="list-heading"><div><h2>Actions</h2><p className="muted small">Configure workflows and run automation on GitHub.</p></div>
      <div className="toolbar"><button type="button" className="small-action" disabled={busy} onClick={startSetup}><Plus size={15}/> New workflow</button>
        <button type="button" className="icon-btn" aria-label="Refresh workflows" disabled={busy} onClick={() => void reload()}><RefreshCw size={17}/></button></div></div>
    {error && <p className="error" role="alert"><AlertCircle size={16}/>{error}</p>}
    {message && <p className="success-note" role="status"><CheckCircle2 size={16}/>{message}</p>}
    {busy && <p className="muted small">Working with GitHub…</p>}
    {!busy && workflows.length === 0 && !editing && <div className="actions-empty">
      <Play size={32}/><h3>Start using GitHub Actions</h3>
      <p>No workflows are configured in this repository yet. Create your first workflow using a starter template.</p>
      <button className="primary" onClick={startSetup}><Plus size={16}/> Set up a workflow</button>
    </div>}
    {workflows.length > 0 && <><h3 className="subsection-title">Workflows ({workflows.length})</h3>
      {workflows.map(w => <div className="workflow-item" key={w.id}>
        <div><strong>{w.name}</strong><small>{w.path} · {w.state}</small></div>
        <button disabled={busy || w.state !== 'active'} onClick={() => void dispatch(w)}><Play size={14}/> Run</button>
        <button aria-label={'View ' + w.name + ' on GitHub'} onClick={() => window.open(w.html_url, '_blank', 'noopener')}><ExternalLink size={15}/></button>
      </div>)}</>}
    {runs.length > 0 && <><h3 className="subsection-title">Recent runs</h3>{runs.map(run => <button className="remote-item" key={run.id}
      onClick={() => window.open(run.html_url, '_blank', 'noopener')}>
        <span>{run.display_title || run.name}</span><small>{run.conclusion || run.status}</small><ExternalLink size={14}/></button>)}</>}
    {editing && <div className="dialog-shade"><div className="dialog workflow-dialog" role="dialog" aria-modal="true" aria-label="Create a workflow">
      <div className="dialog-heading"><h2>Create workflow</h2><button className="icon-btn" aria-label="Close" onClick={() => setEditing(false)}><X size={16}/></button></div>
      <label htmlFor="workflow-template">Starter template</label><select id="workflow-template" value={template} onChange={e => selectTemplate(e.target.value as TemplateId)}>
        {Object.keys(templateNames).map(id => <option key={id} value={id}>{templateNames[id as TemplateId]}</option>)}</select>
      <label htmlFor="workflow-path">File name in .github/workflows/</label>
      <input id="workflow-path" spellCheck={false} value={path} onChange={e => setPath(e.target.value)}/>
      <label htmlFor="workflow-branch">Target branch</label><input id="workflow-branch" value={target} onChange={e => setTarget(e.target.value)}/>
      <label htmlFor="workflow-yaml">Workflow YAML (editable)</label><textarea id="workflow-yaml" className="workflow-yaml" spellCheck={false} value={yaml} onChange={e => setYaml(e.target.value)} rows={15}/>
      <p className="small">Commit creates an actual workflow file. GitHub permissions: Contents (write) and Workflows (write). For advanced editing, use the IDE.</p>
      <div className="button-row"><button disabled={busy} onClick={() => { setEditing(false); onOpenIDE(); }}>Open IDE</button>
        <button className="primary" disabled={busy || !yaml.trim() || !target.trim()} onClick={() => void createWorkflow()}>{busy ? 'Committing…' : 'Commit workflow'}</button></div>
    </div></div>}
  </section>;
}
