import { invoke } from '@tauri-apps/api/core';

export type Account = { login: string; name?: string | null; avatar_url: string };
export type Repo = {
  id: number; name: string; full_name: string; private: boolean; description: string | null;
  default_branch: string; owner: { login: string }; archived: boolean; html_url: string;
  permissions?: { admin: boolean; push: boolean; pull: boolean };
};
export type Branch = { name: string; commit: { sha: string }; protected: boolean };
export type Entry = { type: 'file' | 'dir' | 'symlink' | 'submodule'; name: string; path: string; sha: string; size: number; download_url?: string | null };
export type FileContent = { path: string; sha: string; text: string };
export type Change = { path: string; text: string | null; originalPath?: string; originalSha?: string | null };

export async function addAccount(tokenInput: string): Promise<Account> {
  const token = tokenInput.trim();
  if (!token) throw new Error('Enter a GitHub access token');
  return invoke<Account>('connect_account', { token });
}
export function removeAccount(login: string): void {
  void invoke('disconnect_account', { login });
}
export function api<T>(login: string, method: string, path: string, body?: unknown): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\'))
    throw new Error('Invalid GitHub API path');
  return invoke<T>('github_api', { account: login, method, path, body: body ?? null });
}
export function repoPath(fullName: string): string {
  const bits = fullName.split('/');
  if (bits.length !== 2 || bits.some(x => !/^[\w.-]+$/.test(x))) throw new Error('Invalid repository');
  return '/repos/' + bits.map(encodeURIComponent).join('/');
}
export function filePath(path: string): string { return path.split('/').map(encodeURIComponent).join('/'); }
export async function repositories(login: string): Promise<Repo[]> {
  const all: Repo[] = [];
  for (let page = 1; page <= 20; page++) {
    const chunk = await api<Repo[]>(login, 'GET', '/user/repos?affiliation=owner,collaborator,organization_member&sort=updated&per_page=100&page=' + page);
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}
export async function createRepository(login: string, name: string, isPrivate: boolean): Promise<Repo> {
  if (!/^[\w.-]{1,100}$/.test(name)) throw new Error('Use letters, digits, dots, dashes or underscores');
  return api<Repo>(login, 'POST', '/user/repos', { name, private: isPrivate, auto_init: true });
}
export async function branches(login: string, repo: string): Promise<Branch[]> {
  const all: Branch[] = [];
  for (let page = 1; page <= 20; page++) {
    const chunk = await api<Branch[]>(login, 'GET', repoPath(repo) + '/branches?per_page=100&page=' + page);
    all.push(...chunk);
    if (chunk.length < 100) break;
  }
  return all;
}
export async function createBranch(login: string, repo: string, from: string, newName: string): Promise<void> {
  if (!/^[\w./-]+$/.test(newName) || newName.includes('..') || newName.endsWith('/')) throw new Error('Invalid branch name');
  const ref = await api<{object:{sha:string}}>(login, 'GET', repoPath(repo) + '/git/ref/heads/' + filePath(from));
  await api(login, 'POST', repoPath(repo) + '/git/refs', {ref:'refs/heads/' + newName, sha:ref.object.sha});
}
export async function directory(login: string, repo: string, branch: string, path = ''): Promise<Entry[]> {
  const result = await api<Entry[] | Entry>(login, 'GET', repoPath(repo) + '/contents/' + filePath(path) + '?ref=' + encodeURIComponent(branch));
  if (!Array.isArray(result)) throw new Error('This path is not a folder');
  return result.sort((a,b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
}
export async function readFile(login: string, repo: string, branch: string, path: string): Promise<FileContent> {
  const item = await api<{sha:string; encoding:string; content:string; size:number; type:string}>(login, 'GET',
    repoPath(repo) + '/contents/' + filePath(path) + '?ref=' + encodeURIComponent(branch));
  if (item.type !== 'file' || item.encoding !== 'base64' || !item.content || item.size > 950_000)
    throw new Error('Only normal text files smaller than about 1 MB are supported');
  const bytes = Uint8Array.from(atob(item.content.replace(/\s/g, '')), c => c.charCodeAt(0));
  if (bytes.includes(0)) throw new Error('Binary file: not safe to edit as text');
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('File is not valid UTF-8 text'); }
  return {path,sha:item.sha,text};
}
export async function commitChanges(login: string, repo: string, branch: string, changes: Change[], message: string): Promise<Record<string,string>> {
  if (!changes.length) throw new Error('Nothing to commit');
  if (!message.trim()) throw new Error('A commit message is required');
  const base = repoPath(repo);

  // Check that every source blob still equals the file originally opened. This
  // prevents a delayed draft from overwriting another person's newer file.
  for (const change of changes) {
    if (change.originalSha) {
      const original = change.originalPath || change.path;
      const current = await api<{sha:string}>(login, 'GET', base + '/contents/' + filePath(original) + '?ref=' + encodeURIComponent(branch));
      if (current.sha !== change.originalSha) throw new Error('Conflict: ' + original + ' changed on GitHub. Reload before committing.');
    }
    // New files AND renamed destinations must not overwrite an existing path.
    if (change.text !== null && (!change.originalSha || (change.originalPath && change.originalPath !== change.path))) {
      try {
        await api(login, 'GET', base + '/contents/' + filePath(change.path) + '?ref=' + encodeURIComponent(branch));
        throw new Error('Conflict: target path already exists: ' + change.path);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes('GitHub 404:')) throw error;
      }
    }
  }

  const ref = await api<{object:{sha:string}}>(login, 'GET', base+'/git/ref/heads/'+filePath(branch));
  const parentSha = ref.object.sha;
  const parent = await api<{tree:{sha:string}}>(login,'GET',base+'/git/commits/'+parentSha);
  const entries: {path:string;mode:'100644';type:'blob';sha:string|null}[] = [];
  const newSha: Record<string,string> = {};

  for (const change of changes) {
    if (change.originalPath && change.originalPath !== change.path)
      entries.push({path:change.originalPath, mode:'100644',type:'blob',sha:null});
    if (change.text === null) {
      entries.push({path:change.path,mode:'100644',type:'blob',sha:null});
    } else {
      const blob = await api<{sha:string}>(login,'POST',base+'/git/blobs',{content:change.text,encoding:'utf-8'});
      entries.push({path:change.path,mode:'100644',type:'blob',sha:blob.sha});
      newSha[change.path] = blob.sha;
    }
  }
  const tree = await api<{sha:string}>(login,'POST',base+'/git/trees',{base_tree:parent.tree.sha,tree:entries});
  const commit = await api<{sha:string}>(login,'POST',base+'/git/commits',{message:message.trim(),tree:tree.sha,parents:[parentSha]});
  // Never force push. A moved branch rejects the update so drafts remain intact.
  await api(login,'PATCH',base+'/git/refs/heads/'+filePath(branch),{sha:commit.sha,force:false});
  return newSha;
}
