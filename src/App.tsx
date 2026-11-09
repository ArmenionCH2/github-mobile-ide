import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  Github, Plus, X, Folder, FileCode2, GitBranch, Code2, LayoutDashboard,
  RefreshCw, GitCommitHorizontal, Trash2, PencilLine, ChevronLeft, Menu,
  GitPullRequest, CircleDot, Play, Settings2, ExternalLink, LogOut, LockKeyhole,
  FilePlus2, AlertCircle, Check
} from 'lucide-react';
import {
  Account, Repo, Branch, Entry, Change, api, addAccount, removeAccount,
  repositories, createRepository, branches, createBranch, directory, readFile,
  commitChanges, repoPath
} from './github';

type Space = { id: string; title: string; repo?: Repo };
type FileDraft = { id: string; path: string; originalPath?: string; originalSha?: string; text: string; base: string; deleted: boolean };
type Section = 'overview' | 'issues' | 'pulls' | 'actions' | 'settings';

const uid = () => Math.random().toString(36).slice(2);
function fail(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function go(url: string) { void openUrl(url).catch(() => undefined); }
function isValidPath(path: string): boolean {
  return path.length > 0 && !path.startsWith('/') && !path.endsWith('/') &&
    !path.split('/').some(p => p === '' || p === '.' || p === '..') && !path.includes('\\');
}
function IconButton({children, title, onClick, disabled}: {children: React.ReactNode;title:string;onClick:()=>void;disabled?:boolean}) {
  return <button type="button" className="icon-btn" title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [active, setActive] = useState('');
  const [showConnect, setShowConnect] = useState(true);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function connect() {
    setBusy(true); setError('');
    try {
      const account = await addAccount(token);
      setAccounts(prev => prev.some(a => a.login === account.login) ? prev : [...prev, account]);
      setActive(account.login); setToken(''); setShowConnect(false);
    } catch(e) { setError(fail(e)); }
    finally { setBusy(false); }
  }
  function signOut(login: string) {
    if (!window.confirm('Disconnect ' + login + '? Unsaved drafts in its workspace will be lost.')) return;
    removeAccount(login);
    const remaining = accounts.filter(a => a.login !== login);
    setAccounts(remaining);
    if (active === login) setActive(remaining[0]?.login || '');
    if (!remaining.length) setShowConnect(true);
  }

  return <div className="app">
    <header className="global-header">
      <div className="brand"><Github size={19}/><strong>GitHub Mobile IDE</strong></div>
      <div className="account-tabs" role="tablist" aria-label="GitHub accounts">
        {accounts.map(a => <button key={a.login} role="tab" aria-selected={active === a.login}
          className={'account-tab ' + (active === a.login ? 'selected' : '')} onClick={() => setActive(a.login)}>
          <img src={a.avatar_url} alt="" /><span>{a.login}</span>
        </button>)}
        <IconButton title="Connect another GitHub account" onClick={() => {setShowConnect(true);setError('');}}><Plus size={18}/></IconButton>
      </div>
    </header>
    <main className="app-body">
      {accounts.length === 0 && <div className="welcome"><Github size={42}/><h1>GitHub, with a real code editor.</h1>
        <p>Manage your repositories and edit directly on GitHub, without cloning or Codespaces.</p>
        <button className="primary" onClick={() => setShowConnect(true)}>Connect GitHub account</button></div>}
      {accounts.map(a => <div key={a.login} className="account-screen" style={{display:active === a.login ? 'flex' : 'none'}}>
        <AccountWorkspace account={a} onDisconnect={() => signOut(a.login)}/>
      </div>)}
    </main>
    {showConnect && <div className="dialog-shade" role="presentation">
      <form className="dialog" onSubmit={e => {e.preventDefault();void connect();}}>
        <div className="dialog-heading"><h2>Connect GitHub account</h2>{accounts.length > 0 && <IconButton title="Close" onClick={() => setShowConnect(false)}><X size={18}/></IconButton>}</div>
        <p>Paste a GitHub personal access token. It stays in app memory for this session and is never saved to the repository or browser storage.</p>
        <label>GitHub access token</label>
        <input type="password" autoComplete="off" autoCapitalize="none" spellCheck={false} value={token} placeholder="github_pat_... or ghp_..." onChange={e => setToken(e.target.value)}/>
        <button type="button" className="link-button" onClick={() => go('https://github.com/settings/personal-access-tokens')}><ExternalLink size={14}/> Create a fine-grained token on GitHub</button>
        <p className="small">Permissions depend on the tasks you want: Contents (write) for edits, Administration (write) for repository settings, and permission to create repositories. Use the minimum necessary permissions.</p>
        {error && <p className="error"><AlertCircle size={16}/>{error}</p>}
        <button type="submit" className="primary" disabled={busy || !token.trim()}>{busy ? 'Verifying account…' : 'Connect account'}</button>
      </form>
    </div>}
  </div>;
}

function AccountWorkspace({account,onDisconnect}: {account:Account;onDisconnect:()=>void}) {
  const [spaces,setSpaces] = useState<Space[]>([{id:'home',title:'Repositories'}]);
  const [activeId,setActiveId] = useState('home');
  const [dirtySpaces,setDirtySpaces] = useState<Record<string,number>>({});
  function openRepo(repo:Repo) {
    const old = spaces.find(s => s.repo?.full_name === repo.full_name);
    if (old) { setActiveId(old.id); return; }
    const id = uid();
    setSpaces(prev => [...prev,{id,title:repo.name,repo}]); setActiveId(id);
  }
  function closeSpace(id:string) {
    const dirtyCount = dirtySpaces[id] || 0;
    if (dirtyCount > 0 && !window.confirm('Close this workspace and discard '+dirtyCount+' uncommitted file change(s)?')) return;
    const remaining=spaces.filter(s=>s.id!==id);
    setSpaces(remaining);
    setDirtySpaces(prev=>{const next={...prev};delete next[id];return next;});
    if (activeId===id) setActiveId(remaining[remaining.length-1]?.id || 'home');
  }
  function deletedSpace(id:string) {
    setSpaces(prev=>prev.filter(s=>s.id!==id));
    setDirtySpaces(prev=>{const next={...prev};delete next[id];return next;});
    setActiveId('home');
  }
  return <>
    <nav className="workspace-tabs" aria-label="Workspaces">
      {spaces.map(s => <div className={'workspace-tab ' + (s.id === activeId ? 'selected' : '')} key={s.id}>
        <button className="tab-body" onClick={() => setActiveId(s.id)}>{s.repo ? <Folder size={14}/> : <LayoutDashboard size={14}/>}<span>{s.title}</span>{(dirtySpaces[s.id]||0)>0&&<i aria-label="Uncommitted workspace changes">●</i>}</button>
        {s.id !== 'home' && <IconButton title={'Close '+s.title} onClick={()=>closeSpace(s.id)}><X size={13}/></IconButton>}
      </div>)}
      <IconButton title="Open repository list" onClick={() => setActiveId('home')}><Plus size={17}/></IconButton>
      <div className="tab-end"><IconButton title={'Disconnect '+account.login} onClick={onDisconnect}><LogOut size={17}/></IconButton></div>
    </nav>
    <div className="workspace-content">
      {spaces.map(s => <div className="workspace-screen" key={s.id} style={{display:s.id===activeId?'flex':'none'}}>
        {s.repo ? <RepoWorkspace key={s.id} account={account.login} repo={s.repo}
            onRename={updated=>setSpaces(prev=>prev.map(w=>w.id===s.id?{...w,title:updated.name,repo:updated}:w))}
            onDeleted={()=>deletedSpace(s.id)}
            onDirtyChange={count=>setDirtySpaces(prev=>prev[s.id]===count?prev:{...prev,[s.id]:count})}/> :
          <Dashboard account={account.login} onOpen={openRepo}/>}
      </div>)}
    </div>
  </>;
}

function Dashboard({account,onOpen}: {account:string;onOpen:(r:Repo)=>void}) {
  const [items,setItems] = useState<Repo[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState('');
  const [create,setCreate] = useState(false);
  const [name,setName] = useState('');
  const [privateRepo,setPrivateRepo] = useState(true);
  const [saving,setSaving] = useState(false);
  async function reload() {
    setLoading(true);setError('');
    try { setItems(await repositories(account)); } catch(e) { setError(fail(e)); }
    finally {setLoading(false);}
  }
  useEffect(()=>{void reload();},[account]);
  async function createNew() {
    setSaving(true);setError('');
    try {
      const repo=await createRepository(account,name.trim(),privateRepo);
      setCreate(false);setName('');setItems(prev=>[repo,...prev]);onOpen(repo);
    } catch(e){setError(fail(e));}
    finally {setSaving(false);}
  }
  const filtered=items.filter(i=>(i.full_name+' '+(i.description||'')).toLowerCase().includes(filter.toLowerCase()));
  return <section className="dashboard">
    <div className="page-title"><div><h1>Repositories</h1><p>{account} · Available repositories</p></div>
      <div className="toolbar"><IconButton title="Refresh repositories" onClick={()=>void reload()} disabled={loading}><RefreshCw size={17}/></IconButton><button className="primary" onClick={()=>setCreate(true)}><Plus size={16}/> New</button></div>
    </div>
    <input aria-label="Filter repositories" className="search" placeholder="Filter repositories…" value={filter} onChange={e=>setFilter(e.target.value)}/>
    {error && <p className="error"><AlertCircle size={16}/>{error}</p>}
    {loading && <p className="muted">Loading repositories…</p>}
    {!loading && <div className="repo-list">{filtered.map(repo=><button key={repo.id} className="repo-item" onClick={()=>onOpen(repo)}>
      <div><strong>{repo.full_name}</strong>{repo.private && <LockKeyhole size={14}/>}</div>
      {repo.description && <p>{repo.description}</p>}
      <small>{repo.archived?'Archived · ':''}Default branch: {repo.default_branch}</small>
    </button>)}
    {!filtered.length && !error && <p className="empty">No matching repositories. You can create a new one.</p>}
    </div>}
    {create && <div className="dialog-shade"><form className="dialog" onSubmit={e=>{e.preventDefault();void createNew();}}>
      <div className="dialog-heading"><h2>Create repository</h2><IconButton title="Cancel" onClick={()=>setCreate(false)}><X size={17}/></IconButton></div>
      <label>Repository name</label><input required value={name} onChange={e=>setName(e.target.value)} placeholder="new-project"/>
      <label className="checkbox-label"><input type="checkbox" checked={privateRepo} onChange={e=>setPrivateRepo(e.target.checked)}/> Private repository</label>
      <p className="small">Creates an initialized repository under {account}.</p>
      <button className="primary" disabled={saving||!name.trim()}>{saving?'Creating…':'Create repository'}</button>
    </form></div>}
  </section>;
}

function RepoWorkspace({account,repo,onRename,onDeleted,onDirtyChange}: {account:string;repo:Repo;onRename:(updated:Repo)=>void;onDeleted:()=>void;onDirtyChange:(count:number)=>void}) {
  const [current,setCurrent] = useState<Repo>(repo);
  const [mode,setMode] = useState<'github'|'ide'>('github');
  const [section,setSection] = useState<Section>('overview');
  const [branch,setBranch] = useState(repo.default_branch);
  const [allBranches,setAllBranches] = useState<Branch[]>([]);
  const [branchError,setBranchError] = useState('');
  const [dirty,setDirty] = useState(0);
  const [menu,setMenu] = useState(false);
  async function loadBranches() {
    try {setAllBranches(await branches(account,current.full_name));setBranchError('');}
    catch(e){setBranchError(fail(e));}
  }
  useEffect(()=>{void loadBranches();},[account,current.full_name]);
  function changeBranch(name:string) {
    if (name===branch) return;
    if (dirty>0 && !window.confirm('Discard '+dirty+' uncommitted file changes to switch branches?')) return;
    setBranch(name);
  }
  async function newBranch() {
    const name=window.prompt('New branch name (from '+branch+')');
    if (!name) return;
    try {await createBranch(account,current.full_name,branch,name);await loadBranches();changeBranch(name);}
    catch(e){setBranchError(fail(e));}
  }
  function updatedRepo(next:Repo) { setCurrent(next);onRename(next); }
  return <>
    <div className="repo-header">
      <div className="repo-headline"><strong>{current.full_name}</strong>{current.private && <LockKeyhole size={14}/>}</div>
      <div className="repo-controls">
        <button className="mode-btn" aria-pressed={mode==='github'} onClick={()=>setMode('github')}><Github size={15}/> GitHub</button>
        <button className="mode-btn" aria-pressed={mode==='ide'} onClick={()=>setMode('ide')}><Code2 size={15}/> IDE</button>
        <span className="head-divider"/>
        <select aria-label="Branch" className="branch-select" value={branch} onChange={e=>changeBranch(e.target.value)}>
          {!allBranches.some(b=>b.name===branch)&&<option value={branch}>{branch}</option>}
          {allBranches.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
        <IconButton title="Create branch" onClick={()=>void newBranch()}><Plus size={16}/></IconButton>
        <IconButton title="Repository menu" onClick={()=>setMenu(p=>!p)}><Menu size={18}/></IconButton>
      </div>
      {menu && <div className="repo-menu"><button onClick={()=>{go(current.html_url);setMenu(false);}}>Open on github.com <ExternalLink size={15}/></button>
        <button onClick={()=>{setMode('github');setSection('settings');setMenu(false);}}>Repository settings <Settings2 size={15}/></button></div>}
    </div>
    {branchError && <p className="error small"><AlertCircle size={15}/>{branchError}</p>}
    <div className="repo-mode-screen" style={{display:mode==='github'?'flex':'none'}}>
      <div className="section-tabs">{(['overview','issues','pulls','actions','settings'] as Section[]).map(s=>
        <button key={s} aria-pressed={section===s} onClick={()=>setSection(s)}>{s==='overview'?<LayoutDashboard size={14}/>:s==='issues'?<CircleDot size={14}/>:s==='pulls'?<GitPullRequest size={14}/>:s==='actions'?<Play size={14}/>:<Settings2 size={14}/>} {s}</button>)}</div>
      <div className="section-content">
        {section==='overview' && <div className="overview">
          <h2>{current.name}</h2><p>{current.description||'No description'}</p>
          <div className="facts"><span>{current.private?'Private':'Public'}</span><span>{current.archived?'Archived':'Active'}</span><span>Branch: {branch}</span></div>
          <div className="button-row"><button className="primary" onClick={()=>setMode('ide')}><Code2 size={17}/> Open IDE</button><button onClick={()=>go(current.html_url)}><ExternalLink size={17}/> GitHub website</button></div>
        </div>}
        {(section==='issues'||section==='pulls'||section==='actions') && <RemoteList account={account} repo={current.full_name} type={section}/>}
        {section==='settings' && <RepoSettings account={account} repo={current} onUpdate={updatedRepo} onDeleted={onDeleted}/>} 
      </div>
    </div>
    <div className="repo-mode-screen" style={{display:mode==='ide'?'flex':'none'}}>
      <Editor key={current.full_name+':'+branch} account={account} repo={current.full_name} branch={branch} onDirty={count=>{setDirty(count);onDirtyChange(count);}}/>
    </div>
  </>;
}

function RemoteList({account,repo,type}: {account:string;repo:string;type:'issues'|'pulls'|'actions'}) {
  const [items,setItems] = useState<{title:string;number?:number;html_url:string;state?:string}[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  async function reload() {
    setLoading(true);setError('');
    try {
      const base=repoPath(repo);
      if(type==='actions') {
        const data=await api<{workflow_runs:{id:number;name:string;display_title:string;html_url:string;status:string}[]}>(account,'GET',base+'/actions/runs?per_page=30');
        setItems(data.workflow_runs.map(x=>({title:x.display_title||x.name,html_url:x.html_url,state:x.status})));
      } else {
        const data=await api<{number:number;title:string;html_url:string;state:string;pull_request?:unknown}[]>(account,'GET',base+'/'+type+'?state=open&per_page=30');
        setItems(data.filter(x=>type==='pulls'||!x.pull_request).map(x=>({title:x.title,number:x.number,html_url:x.html_url,state:x.state})));
      }
    }catch(e){setError(fail(e));}
    finally{setLoading(false);}
  }
  useEffect(()=>{void reload();},[account,repo,type]);
  return <div className="remote-list"><div className="list-heading"><h2>{type==='pulls'?'Pull requests':type==='issues'?'Issues':'Workflow runs'}</h2>
    <IconButton title="Refresh" onClick={()=>void reload()}><RefreshCw size={17}/></IconButton></div>
    {loading?<p className="muted">Loading…</p>:error?<p className="error">{error}</p>:items.length===0?<p className="empty">No items found.</p>:
      items.map(x=><button className="remote-item" key={x.html_url} onClick={()=>go(x.html_url)}>
        <span>{x.number?'#'+x.number+' · ':''}{x.title}</span><small>{x.state}</small><ExternalLink size={14}/>
      </button>)}
  </div>;
}

function RepoSettings({account,repo,onUpdate,onDeleted}:{account:string;repo:Repo;onUpdate:(r:Repo)=>void;onDeleted:()=>void}) {
  const [name,setName] = useState(repo.name);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function rename() {
    setBusy(true);setError('');
    try {
      const updated=await api<Repo>(account,'PATCH',repoPath(repo.full_name),{name:name.trim()});
      onUpdate(updated);
    }catch(e){setError(fail(e));}
    finally{setBusy(false);}
  }
  async function archive() {
    if(!window.confirm((repo.archived?'Unarchive ':'Archive ')+repo.full_name+'?')) return;
    setBusy(true);setError('');
    try{onUpdate(await api<Repo>(account,'PATCH',repoPath(repo.full_name),{archived:!repo.archived}));}
    catch(e){setError(fail(e));}finally{setBusy(false);}
  }
  async function remove() {
    const typed=window.prompt('To permanently delete this repository, enter: '+repo.full_name);
    if(typed!==repo.full_name) return;
    setBusy(true);setError('');
    try {await api(account,'DELETE',repoPath(repo.full_name));onDeleted();}
    catch(e){setError(fail(e));}finally{setBusy(false);}
  }
  return <div className="settings-panel"><h2>Repository settings</h2><p>Administrative actions require GitHub permissions for this repository.</p>
    {error&&<p className="error">{error}</p>}
    <label>Repository name</label><div className="button-row"><input value={name} onChange={e=>setName(e.target.value)}/><button disabled={busy||!name.trim()||name===repo.name} onClick={()=>void rename()}>Rename</button></div>
    <div className="settings-action"><div><strong>{repo.archived?'Unarchive':'Archive'} repository</strong><p>Toggle read-only archival state.</p></div><button disabled={busy} onClick={()=>void archive()}>{repo.archived?'Unarchive':'Archive'}</button></div>
    <div className="settings-action danger"><div><strong>Delete repository</strong><p>Permanent operation. Repository name confirmation is required.</p></div><button disabled={busy} onClick={()=>void remove()}>Delete</button></div>
  </div>;
}

function Editor({account,repo,branch,onDirty}: {account:string;repo:string;branch:string;onDirty:(n:number)=>void}) {
  const [folder,setFolder] = useState('');
  const [entries,setEntries] = useState<Entry[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [files,setFiles] = useState<FileDraft[]>([]);
  const [currentId,setCurrentId] = useState('');
  const [showFiles,setShowFiles] = useState(true);
  const [newFile,setNewFile] = useState(false);
  const [newPath,setNewPath] = useState('');
  const [commitDialog,setCommitDialog] = useState(false);
  const [commitMessage,setCommitMessage] = useState('');
  const [saving,setSaving] = useState(false);
  const active=files.find(f=>f.id===currentId);
  const dirtyFiles=files.filter(f=>f.deleted||f.path!==f.originalPath||(f.text!==f.base));
  useEffect(()=>onDirty(dirtyFiles.length),[dirtyFiles.length,onDirty]);
  async function loadDirectory(path:string) {
    setFolder(path);setLoading(true);setError('');
    try{setEntries(await directory(account,repo,branch,path));}
    catch(e){setError(fail(e));setEntries([]);}
    finally{setLoading(false);}
  }
  useEffect(()=>{void loadDirectory('');},[account,repo,branch]);
  async function openFile(path:string) {
    const already=files.find(f=>f.path===path&&!f.deleted);
    if(already){setCurrentId(already.id);setShowFiles(false);return;}
    setError('');
    try {
      const read=await readFile(account,repo,branch,path);
      const draft:FileDraft={id:uid(),path,originalPath:path,originalSha:read.sha,text:read.text,base:read.text,deleted:false};
      setFiles(prev=>[...prev,draft]);setCurrentId(draft.id);setShowFiles(false);
    }catch(e){setError(fail(e));}
  }
  function addFile() {
    if(!isValidPath(newPath)){setError('Enter a valid relative file path, such as src/new.ts');return;}
    if(files.some(f=>f.path===newPath&&!f.deleted)){setError('File is already open');return;}
    const draft:FileDraft={id:uid(),path:newPath,text:'',base:'',deleted:false};
    setFiles(prev=>[...prev,draft]);setCurrentId(draft.id);setNewFile(false);setNewPath('');setShowFiles(false);setError('');
  }
  function renameFile() {
    if(!active||active.deleted)return;
    const path=window.prompt('New relative path',active.path);
    if(!path||path===active.path)return;
    if(!isValidPath(path)){setError('Invalid file path');return;}
    if(files.some(f=>f.path===path&&f.id!==active.id)){setError('File already open');return;}
    setFiles(prev=>prev.map(f=>f.id===active.id?{...f,path}:f));
  }
  function deleteFile() {
    if(!active||!window.confirm('Stage deletion of '+active.path+'? Changes will only be published when you commit.'))return;
    if(active.path!==active.originalPath && active.originalSha){
      setFiles(prev=>prev.map(f=>f.id===active.id?{...f,path:f.originalPath!,deleted:true}:f));
      return;
    }
    if(!active.originalSha){const remaining=files.filter(f=>f.id!==active.id);setFiles(remaining);setCurrentId(remaining[0]?.id||'');}
    else setFiles(prev=>prev.map(f=>f.id===active.id?{...f,deleted:true}:f));
  }
  function closeFile(id:string) {
    const f=files.find(x=>x.id===id);
    if(f&&(f.deleted||f.text!==f.base||f.path!==f.originalPath)&&!window.confirm('Discard uncommitted changes to '+f.path+'?'))return;
    const remaining=files.filter(f=>f.id!==id);
    setFiles(remaining);if(currentId===id)setCurrentId(remaining[remaining.length-1]?.id||'');
  }
  async function commit() {
    setSaving(true);setError('');
    try {
      const changes:Change[]=dirtyFiles.map(f=>({path:f.path,text:f.deleted?null:f.text,originalPath:f.originalPath,originalSha:f.originalSha||null}));
      const shas=await commitChanges(account,repo,branch,changes,commitMessage);
      const remaining=files.filter(f=>!f.deleted).map(f=>({...f,originalPath:f.path,originalSha:shas[f.path]||f.originalSha,base:f.text}));
      setFiles(remaining);setCurrentId(id=>remaining.some(f=>f.id===id)?id:(remaining[0]?.id||''));
      setCommitDialog(false);setCommitMessage('');await loadDirectory(folder);
    }catch(e){setError(fail(e));}
    finally{setSaving(false);}
  }
  const extensions=useMemo(()=>{
    if(!active)return [];
    const ext=active.path.split('.').pop()?.toLowerCase();
    return ext==='json'?[json()]:['md','markdown'].includes(ext||'')?[markdown()]:
      ['js','jsx','ts','tsx','mjs','cjs'].includes(ext||'')?[javascript({typescript:ext==='ts'||ext==='tsx',jsx:ext==='jsx'||ext==='tsx'})]:[];
  },[active?.path]);
  return <div className="ide">
    <div className="ide-topbar"><IconButton title="Toggle file explorer" onClick={()=>setShowFiles(v=>!v)}><Menu size={17}/></IconButton>
      <div className="ide-location"><GitBranch size={14}/><span>{branch}</span></div>
      <div className="ide-spacer"/>
      <button className="small-action" onClick={()=>setNewFile(true)}><FilePlus2 size={16}/> <span>New file</span></button>
      <button className="primary small-action" onClick={()=>setCommitDialog(true)} disabled={dirtyFiles.length===0}><GitCommitHorizontal size={17}/> Commit {dirtyFiles.length||''}</button>
    </div>
    {error&&<div className="ide-error"><AlertCircle size={16}/>{error}<IconButton title="Dismiss error" onClick={()=>setError('')}><X size={14}/></IconButton></div>}
    <div className="ide-main">
      <aside className={'file-explorer '+(showFiles?'open':'')}>
        <div className="explorer-title"><strong>Explorer</strong><IconButton title="Refresh folder" onClick={()=>void loadDirectory(folder)}><RefreshCw size={15}/></IconButton></div>
        <div className="folder-path"><button onClick={()=>void loadDirectory('')}>{repo.split('/')[1]}</button>
          {folder && <><span>/</span><button onClick={()=>void loadDirectory(folder.split('/').slice(0,-1).join('/'))}><ChevronLeft size={13}/>{folder}</button></>}
        </div>
        <div className="files-list">
          {loading&&<p className="muted small">Loading folder…</p>}
          {!loading&&entries.map(e=><button className="file-row" key={e.path} onClick={()=>e.type==='dir'?void loadDirectory(e.path):void openFile(e.path)}>
            {e.type==='dir'?<Folder size={16}/>:<FileCode2 size={16}/>}<span>{e.name}</span></button>)}
          {!loading&&entries.length===0&&<p className="muted small">No items in this folder.</p>}
        </div>
      </aside>
      <section className="editor-area">
        <div className="editor-tabs">
          {files.map(f=><div key={f.id} className={'editor-tab '+(currentId===f.id?'selected':'')+(f.deleted?' deleted':'')}>
            <button onClick={()=>{setCurrentId(f.id);setShowFiles(false);}}><FileCode2 size={13}/><span>{f.path.split('/').pop()}</span>{(f.deleted||f.text!==f.base||f.path!==f.originalPath)&&<i aria-label="Uncommitted">●</i>}</button>
            <IconButton title={'Close '+f.path} onClick={()=>closeFile(f.id)}><X size={12}/></IconButton>
          </div>)}
        </div>
        {!active?<div className="editor-empty"><Code2 size={38}/><strong>Open a file to edit</strong><span>Select a source file or create a new one.</span></div>:
          <><div className="editor-filebar"><span>{active.path}</span>
            <div className="editor-actions"><IconButton title="Rename or move file" onClick={renameFile} disabled={active.deleted}><PencilLine size={16}/></IconButton>
              <IconButton title="Delete file" onClick={deleteFile} disabled={active.deleted}><Trash2 size={16}/></IconButton></div>
          </div>
          {active.deleted?<div className="editor-empty">Deletion staged. Commit to remove this file from GitHub.</div>:
            <CodeMirror className="code-editor" value={active.text} theme="dark" height="100%" extensions={extensions}
              basicSetup={{lineNumbers:true,foldGutter:true,highlightActiveLine:true}}
              onChange={value=>setFiles(prev=>prev.map(f=>f.id===active.id?{...f,text:value}:f))}/>}
          </>}
      </section>
    </div>
    {newFile&&<div className="dialog-shade"><form className="dialog" onSubmit={e=>{e.preventDefault();addFile();}}>
      <div className="dialog-heading"><h2>Create file</h2><IconButton title="Cancel" onClick={()=>setNewFile(false)}><X size={17}/></IconButton></div>
      <label>Relative file path</label><input autoFocus value={newPath} onChange={e=>setNewPath(e.target.value)} placeholder="src/example.ts"/>
      <p className="small">Folders are created implicitly by file paths. Empty folders are not stored in Git.</p>
      <button className="primary">Create draft</button>
    </form></div>}
    {commitDialog&&<div className="dialog-shade"><form className="dialog" onSubmit={e=>{e.preventDefault();void commit();}}>
      <div className="dialog-heading"><h2>Commit changes</h2><IconButton title="Cancel" onClick={()=>setCommitDialog(false)}><X size={17}/></IconButton></div>
      <p>Target: <strong>{account} / {repo} / {branch}</strong></p>
      <div className="change-list">{dirtyFiles.map(f=><div key={f.id}><Check size={14}/><span>{f.deleted?'Delete: ':!f.originalSha?'Add: ':f.path!==f.originalPath?'Move: ':'Edit: '}{f.path}</span></div>)}</div>
      <label>Commit message</label><input value={commitMessage} onChange={e=>setCommitMessage(e.target.value)} placeholder="Describe your changes"/>
      <p className="small">All staged files are committed together. GitHub conflicts will block the commit; force pushes are never used.</p>
      <button className="primary" disabled={saving||!commitMessage.trim()}>{saving?'Committing…':'Commit '+dirtyFiles.length+' file(s)'}</button>
    </form></div>}
  </div>;
}
