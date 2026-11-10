import { useEffect, useMemo, useState } from 'react';
import { Building2, FolderGit2, History, Menu, Pin, Search, Users, X } from 'lucide-react';
import type { Repo } from '../github';

type View = 'all' | 'owned' | 'shared' | 'pinned' | 'recent';
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
  const [view, setView] = useState<View>('all');
  const [pins, setPins] = useState<string[]>(() => loadList(pinKey));
  const [recent, setRecent] = useState<string[]>(() => loadList(recentKey));
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { setPins(loadList(pinKey)); setRecent(loadList(recentKey)); setView('all'); }, [account]);
  const repoMap = useMemo(() => new Map(repos.map(r => [r.full_name, r])), [repos]);
  const displayed = useMemo(() => {
    let selected: Repo[];
    switch (view) {
      case 'owned': selected = repos.filter(r => r.owner.login.toLowerCase() === account.toLowerCase()); break;
      case 'shared': selected = repos.filter(r => r.owner.login.toLowerCase() !== account.toLowerCase()); break;
      case 'pinned': selected = pins.map(n => repoMap.get(n)).filter((r): r is Repo => Boolean(r)); break;
      case 'recent': selected = recent.map(n => repoMap.get(n)).filter((r): r is Repo => Boolean(r)); break;
      default: selected = repos;
    }
    const q = search.trim().toLowerCase();
    return q ? selected.filter(r => (r.full_name + ' ' + (r.description || '')).toLowerCase().includes(q)) : selected;
  }, [repos, account, repoMap, pins, recent, view, search]);
  function select(next: View) { setView(next); setSearch(''); setDrawer(false); }
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
      {tabs.map(t => <button key={t.id} className={'repo-nav-link ' + (view === t.id ? 'current' : '')} onClick={() => select(t.id)}>
        <t.Icon size={16}/><span>{t.title}</span>{t.id === 'pinned' && <small>{pins.length}</small>}</button>)}
      {pins.length > 0 && <><div className="repo-nav-subheading">PINNED</div>{pins.slice(0, 10).map(name => <button className="repo-nav-shortcut" key={name} onClick={() => { const r = repoMap.get(name); if (r) open(r); }}>
        <Pin size={13}/><span>{name}</span></button>)}</>}
      {recent.length > 0 && <><div className="repo-nav-subheading">RECENT</div>{recent.slice(0, 10).map(name => <button className="repo-nav-shortcut" key={name} onClick={() => { const r = repoMap.get(name); if (r) open(r); }}>
        <History size={13}/><span>{name}</span></button>)}</>}
    </aside>
    <div className="repo-nav-main">
      <div className="repo-nav-heading"><button className="icon-btn repo-nav-toggle" title="Open navigation" onClick={() => setDrawer(true)}><Menu size={19}/></button>
        <h2>{tabs.find(t => t.id === view)?.title}</h2><small>{displayed.length}</small></div>
      <label className="repo-nav-search"><Search size={17}/><input value={search} placeholder="Find a repository…" aria-label="Search repositories" onChange={e => setSearch(e.target.value)}/></label>
      <div className="repo-nav-list">
        {displayed.map(repo => <div className="repo-nav-card" key={repo.id}>
          <button className="repo-nav-open" onClick={() => open(repo)}><strong>{repo.full_name}</strong>
            <small>{repo.description || (repo.private ? 'Private' : 'Public')} · {repo.default_branch}{repo.archived ? ' · Archived' : ''}</small></button>
          <button className={'repo-nav-pin ' + (pins.includes(repo.full_name) ? 'pinned' : '')} onClick={() => pin(repo.full_name)}
            title={pins.includes(repo.full_name) ? 'Unpin repository' : 'Pin repository'} aria-label={pins.includes(repo.full_name) ? 'Unpin ' + repo.full_name : 'Pin ' + repo.full_name}><Pin size={17}/></button>
        </div>)}
        {displayed.length === 0 && <p className="empty">No repositories in this section.</p>}
      </div>
    </div>
  </div>;
}
