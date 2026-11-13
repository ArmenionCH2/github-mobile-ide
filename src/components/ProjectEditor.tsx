import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import type { Repo } from '../github';
import { projectNameLimit, type Project } from '../projects';

type Props = {
  project?: Project;
  repos: Repo[];
  onSave: (name: string, repositories: Project['repositories']) => string | undefined;
  onDelete: () => string | undefined;
  onClose: () => void;
};

export default function ProjectEditor({ project, repos, onSave, onDelete, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(project?.name ?? '');
  const [selected, setSelected] = useState(() => new Map(project?.repositories.map(repo => [repo.id, repo.name])));
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const repoIds = useMemo(() => new Set(repos.map(repo => repo.id)), [repos]);
  const options = useMemo(() => [
    ...repos.map(repo => ({ id: repo.id, name: repo.full_name, unavailable: false })),
    ...(project?.repositories ?? []).filter(repo => !repoIds.has(repo.id))
      .map(repo => ({ ...repo, unavailable: true })),
  ], [repos, repoIds, project]);
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(repo => repo.name.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  function toggle(id: number, fullName: string, checked: boolean) {
    setSelected(previous => {
      const next = new Map(previous);
      if (checked) next.set(id, fullName);
      else next.delete(id);
      return next;
    });
  }

  return <dialog ref={dialog} className="dialog project-editor" aria-labelledby="project-editor-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={event => {
      event.preventDefault();
      if (confirmDelete) { setError(onDelete() ?? ''); return; }
      setError(onSave(name.trim(), options.filter(repo => selected.has(repo.id))
        .map(({ id, name: repoName }) => ({ id, name: repoName }))) ?? '');
    }}>
      <div className="dialog-heading">
        <h2 id="project-editor-title">{confirmDelete ? 'Delete project?' : project ? 'Edit project' : 'New project'}</h2>
        <button type="button" className="icon-btn" aria-label="Close project editor" onClick={onClose}><X size={18}/></button>
      </div>
      {confirmDelete ? <p>Delete “{project?.name}” from this app? Its repositories and workspace tabs won’t be deleted.</p> : <>
        <label htmlFor="project-name">Project name</label>
        <input id="project-name" value={name} maxLength={projectNameLimit} required onChange={event => setName(event.target.value)}/>
        <div className="project-picker-heading"><strong>Repositories</strong><span>{selected.size} selected</span></div>
        <label className="repo-nav-search"><Search size={16}/><input value={query} placeholder="Search by owner or repo…"
          aria-label="Find repositories to add" onChange={event => setQuery(event.target.value)}/></label>
        <div className="project-picker" role="group" aria-label="Project repositories">
          {matching.map(repo => <label key={repo.id} className="project-picker-option">
            <input type="checkbox" checked={selected.has(repo.id)}
              onChange={event => toggle(repo.id, repo.name, event.target.checked)}/>
            <span>{repo.name}{repo.unavailable && <small>Not in the current repository list</small>}</span>
          </label>)}
          {!matching.length && <p className="muted small">{query.trim() ? 'No matching repositories.' : 'No repositories available yet.'}</p>}
        </div>
      </>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="project-editor-actions">
        {project && !confirmDelete && <button type="button" className="small-action project-delete" onClick={() => {
          setError(''); setConfirmDelete(true);
        }}><Trash2 size={15}/> Delete project</button>}
        {confirmDelete && <button type="button" className="small-action" onClick={() => {
          setError(''); setConfirmDelete(false);
        }}>Keep project</button>}
        <button type="submit" className={confirmDelete ? 'small-action project-delete' : 'primary'}
          disabled={!confirmDelete && !name.trim()}>{confirmDelete ? 'Delete project' : project ? 'Save changes' : 'Create project'}</button>
      </div>
    </form>
  </dialog>;
}
