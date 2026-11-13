export type Project = {
  id: string;
  name: string;
  repositories: { id: number; name: string }[];
};

export const projectNameLimit = 60;

function storageKey(account: string) {
  return 'github-mobile-ide-projects:v1:' + account.toLowerCase();
}

export function loadProjects(account: string): Project[] {
  const value: unknown = JSON.parse(localStorage.getItem(storageKey(account)) ?? '[]');
  if (!Array.isArray(value)) throw new Error('Invalid project list');
  const ids = new Set<string>();
  for (const project of value) {
    if (!project || typeof project.id !== 'string' || !project.id || ids.has(project.id) ||
        typeof project.name !== 'string' || !project.name.trim() || project.name.length > projectNameLimit ||
        !Array.isArray(project.repositories)) throw new Error('Invalid project');
    const repoIds = new Set<number>();
    for (const repo of project.repositories) {
      if (!repo || !Number.isSafeInteger(repo.id) || repo.id <= 0 || repoIds.has(repo.id) ||
          typeof repo.name !== 'string' || !repo.name) throw new Error('Invalid project repository');
      repoIds.add(repo.id);
    }
    ids.add(project.id);
  }
  return value as Project[];
}

export function saveProjects(account: string, projects: Project[]) {
  localStorage.setItem(storageKey(account), JSON.stringify(projects));
}
