import { getItem, setItem } from 'tauri-plugin-secure-keystore';

const KEY = 'github_mobile_ide_accounts_v1';
type StoredAccount = { login: string; token: string };

export async function loadSavedAccounts(): Promise<StoredAccount[]> {
  const raw = await getItem(KEY);
  if (!raw) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Saved accounts are corrupted. Connect again.');
  return data.filter((entry): entry is StoredAccount =>
    typeof entry === 'object' && entry !== null &&
    typeof (entry as StoredAccount).login === 'string' &&
    typeof (entry as StoredAccount).token === 'string' &&
    Boolean((entry as StoredAccount).login) && Boolean((entry as StoredAccount).token));
}

export async function saveAccount(login: string, token: string): Promise<void> {
  const current = await loadSavedAccounts();
  const others = current.filter(account => account.login !== login);
  await setItem(KEY, JSON.stringify([...others, { login, token }]));
}

export async function forgetAccount(login: string): Promise<void> {
  const current = await loadSavedAccounts();
  await setItem(KEY, JSON.stringify(current.filter(account => account.login !== login)));
}
