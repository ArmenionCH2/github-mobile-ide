import { useMemo, useState } from 'react';
import { Building2, ChevronLeft, Folder, FolderGit2, History, Menu, PencilLine, Pin, Plus, Search, Users, X } from 'lucide-react';
import type { Repo } from '../github';
import { loadProjects, saveProjects, type Project } from '../projects';
import ProjectEditor from './ProjectEditor';

type View = 'all' | 'owned' | 'shared' | 'pinned' | 'recent';
type Destination = { kind: 'repositories'; view: View } | { kind: 'projects' } | { kind: 'project'; id: string };
type Props = { account: string; repos: Repo[]; onOpen: (repo: Repo) => void };
function loadList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
const tabs: { id: View; title: string; Icon: typeof Pin }[] = [
  { id: 'all', title: 'All repositories', Icon: FolderGit2 },
  { id: 'owned', title: 'Owned by me', Icon: Users },
  { id: 'shared', title: 'Shared & organizations', Icon: Building2 },
  { id: 'pinned', title: 'Pinned', Icon: Pin },
  { id: 'recent', title: 'Recent', Icon: History },
];
export default function RepositoryNavigator({ account, repos, onOpen }: Props) {
  const pinKey = 'github-mobile-ide-pins:' + account;
  const recentKey = 'github-mobile-ide-recents:' + account;
  const [destination, setDestination] = useState<Destination>({ kind: 'repositories', view: 'all' });
  const [projectState, setProjectState] = useState(() => {
    try { return { projects: loadProjects(account), error: '' }; }
    catch { return { projects: [], error: 'Could not read saved projects on this device.' }; }
  });
  const [editor, setEditor] = useState<{ project?: Project } | null>(null);
  const [pins, setPins] = useState<string[]>(() => loadList(pinKey));
  const [recent, setRecent] = useState<string[]>(() => loadList(recentKey));
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  const { projects } = projectState;
  const activeProject = destination.kind === 'project' ? projects.find(project => project.id === destination.id) : undefined;
  const isProjectList = destination.kind === 'projects';
  const view = destination.kind === 'repositories' ? destination.view : undefined;
  const reposById = useMemo(() => new Map(repos.map(repo => [repo.id, repo])), [repos]);
  const repoMap = useMemo(() => new Map(repos.map(r => [r.full_name, r])), [repos]);
  const displayed = useMemo(() => {
    let selected: Repo[];
    if (activeProject) {
      selected = activeProject.repositories.map(member => reposById.get(member.id)).filter((r): r is Repo => Boolean(r));
    } else switch (view) {
      case 'owned': selected = repos.filter(r => r.owner.login.toLowerCase() === account.toLowerCase()); break;
      case 'shared': selected = repos.filter(r => r.owner.login.toLowerCase() !== account.toLowerCase()); break;
      case 'pinned': selected = pins.map(n => repoMap.get(n)).filter((r): r is Repo => Boolean(r)); break;
      case 'recent': selected = recent.map(n => repoMap.get(n)).filter((r): r is Repo => Boolean(r)); break;
      default: selected = repos;
    }
    const q = search.trim().toLowerCase();
    return q ? selected.filter(r => (r.full_name + ' ' + (r.description || '')).toLowerCase().includes(q)) : selected;
  }, [repos, account, repoMap, pins, recent, view, search, activeProject, reposById]);
  const unavailable = activeProject?.repositories.filter(repo => !reposById.has(repo.id)) ?? [];

  function select(next: Destination) { setDestination(next); setSearch(''); setDrawer(false); }
  function persist(next: Project[]) {
    if (projectState.error) return projectState.error;
    try { saveProjects(account, next); }
    catch { return 'Could not save projects on this device. No changes were made.'; }
    setProjectState({ projects: next, error: '' });
  }
  function updateProject(name: string, repositories: Project['repositories']) {
    if (!name) return 'Enter a project name.';
    const existing = editor?.project;
    if (projects.some(project => project.id !== existing?.id && project.name.toLowerCase() === name.toLowerCase())) {
      return 'A project with this name already exists.';
    }
    const saved: Project = { id: existing?.id ?? crypto.randomUUID(), name, repositories };
    const error = persist(existing ? projects.map(project => project.id === saved.id ? saved : project) : [...projects, saved]);
    if (error) return error;
    setEditor(null);
    select({ kind: 'project', id: saved.id });
  }
  function deleteProject() {
    const error = persist(projects.filter(project => project.id !== editor?.project?.id));
    if (error) return error;
    setEditor(null);
    select({ kind: 'projects' });
  }
  function open(repo: Repo) {
    setRecent(prev => {
      const next = [repo.full_name, ...prev.filter(n => n !== repo.full_name)].slice(0, 20);
      localStorage.setItem(recentKey, JSON.stringify(next)); return next;
    });
    onOpen(repo); setDrawer(false);
  }
  function pin(name: string) {
    setPins(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [name, ...prev];
      localStorage.setItem(pinKey, JSON.stringify(next)); return next;
    });
  }
  return <div className="repository-navigator">
    {drawer && <button className="repo-nav-backdrop" aria-label="Close repository navigation" onClick={() => setDrawer(false)} />}
    <aside className={'repo-nav-sidebar ' + (drawer ? 'open' : '')} aria-label="Repository navigation">
      <div className="repo-nav-title"><strong>Repositories</strong><button className="icon-btn nav-close" onClick={() => setDrawer(false)} aria-label="Close navigation"><X size={17}/></button></div>
      <button className={'repo-nav-link ' + (destination.kind !== 'repositories' ? 'current' : '')}
        aria-current={destination.kind !== 'repositories' ? 'page' : undefined} onClick={() => select({ kind: 'projects' })}>
        <Folder size={16}/><span>Projects</span><small>{projects.length}</small>
      </button>
      {tabs.map(t => <button key={t.id} className={'repo-nav-link ' + (view === t.id ? 'current' : '')} aria-current={view === t.id ? 'page' : undefined} onClick={() => select({ kind: 'repositories', view: t.id })}>
        <t.Icon size={16}/><span>{t.title}</span>{t.id === 'pinned' && <small>{pins.length}</small>}</button>)}
      {pins.length > 0 && <><div className="repo-nav-subheading">PINNED</div>{pins.slice(0, 10).map(name => <button className="repo-nav-shortcut" key={name} onClick={() => { const r = repoMap.get(name); if (r) open(r); }}>
        <Pin size={13}/><span>{name}</span></button>)}</>}
      {recent.length > 0 && <><div className="repo-nav-subheading">RECENT</div>{recent.slice(0, 10).map(name => <button className="repo-nav-shortcut" key={name} onClick={() => { const r = repoMap.get(name); if (r) open(r); }}>
        <History size={13}/><span>{name}</span></button>)}</>}
    </aside>
    <div className="repo-nav-main">
      <div className="repo-nav-heading">
        <button className="icon-btn repo-nav-toggle" aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(true)}><Menu size={19}/></button>
        {activeProject && <button className="icon-btn" aria-label="Back to projects" onClick={() => select({ kind: 'projects' })}><ChevronLeft size={18}/></button>}
        <h2>{activeProject?.name ?? (isProjectList ? 'Projects' : tabs.find(t => t.id === view)?.title)}</h2>
        {isProjectList && <button className="primary project-action" disabled={Boolean(projectState.error)} onClick={() => setEditor({})}><Plus size={16}/> New project</button>}
        {activeProject && <button className="project-action" onClick={() => setEditor({ project: activeProject })}><PencilLine size={15}/> Edit project</button>}
        {view && <button className="project-action projects-mobile-link" onClick={() => select({ kind: 'projects' })}><Folder size={15}/> Projects</button>}
        {view && <small>{displayed.length}</small>}
      </div>
      {isProjectList ? <div className="repo-nav-list">
        {projectState.error && <p className="error" role="alert">{projectState.error}</p>}
        {projects.map(project => <button className="project-card" key={project.id} onClick={() => select({ kind: 'project', id: project.id })}>
          <Folder size={19}/><strong>{project.name}</strong><small>{project.repositories.length} {project.repositories.length === 1 ? 'repo' : 'repos'}</small>
        </button>)}
        {!projects.length && !projectState.error && <p className="empty">No projects yet. Create one to group related repositories.</p>}
      </div> : <>
      <label className="repo-nav-search"><Search size={17}/><input value={search} placeholder="Find a repository…" aria-label="Search repositories" onChange={e => setSearch(e.target.value)}/></label>
      <div className="repo-nav-list">
        {displayed.map(repo => <div className="repo-nav-card" key={repo.id}>
          <button className="repo-nav-open" onClick={() => open(repo)}><strong>{repo.full_name}</strong>
            <small>{repo.description || (repo.private ? 'Private' : 'Public')} · {repo.default_branch}{repo.archived ? ' · Archived' : ''}</small></button>
          <button className={'repo-nav-pin ' + (pins.includes(repo.full_name) ? 'pinned' : '')} onClick={() => pin(repo.full_name)}
            title={pins.includes(repo.full_name) ? 'Unpin repository' : 'Pin repository'} aria-label={pins.includes(repo.full_name) ? 'Unpin ' + repo.full_name : 'Pin ' + repo.full_name}><Pin size={17}/></button>
        </div>)}
        {unavailable.filter(repo => repo.name.toLowerCase().includes(search.trim().toLowerCase())).map(repo => <div className="repo-nav-card project-unavailable" key={repo.id}>
          <strong>{repo.name}</strong><small>Not in the current repository list</small>
        </div>)}
        {!displayed.length && !unavailable.some(repo => repo.name.toLowerCase().includes(search.trim().toLowerCase())) &&
          <p className="empty">{search.trim() ? 'No matching repositories.' : activeProject ? 'No repositories yet. Use Edit project to add some.' : 'No repositories in this section.'}</p>}
      </div>
      </>}
    </div>
    {editor && <ProjectEditor project={editor.project} repos={repos} onSave={updateProject} onDelete={deleteProject} onClose={() => setEditor(null)}/>}
  </div>;
}
