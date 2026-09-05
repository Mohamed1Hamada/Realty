import { demoData, type DemoDB } from "./demoData";

const STORAGE_KEY = "realty-demo-db-v1";

/** مخزن محلي في المتصفح يستخدمه وضع العرض (demo) */
let cache: DemoDB | null = null;

function load(): DemoDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as DemoDB;
      return cache;
    }
  } catch {
    /* بيانات تالفة — هنرجع للأصلية */
  }
  cache = structuredClone(demoData);
  persist();
  return cache;
}

function persist() {
  if (!cache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* التخزين ممتلئ أو محظور */
  }
}

export const store = {
  read(): DemoDB {
    return load();
  },

  table<K extends keyof DemoDB>(name: K): DemoDB[K] {
    return load()[name];
  },

  insert<K extends keyof DemoDB>(name: K, row: DemoDB[K][number]) {
    const db = load();
    db[name] = [row, ...db[name]] as DemoDB[K];
    persist();
    return row;
  },

  update<K extends keyof DemoDB>(
    name: K,
    id: string,
    patch: Partial<DemoDB[K][number]>,
  ) {
    const db = load();
    db[name] = db[name].map((row) =>
      (row as { id: string }).id === id ? { ...row, ...patch } : row,
    ) as DemoDB[K];
    persist();
    return db[name].find((row) => (row as { id: string }).id === id);
  },

  remove<K extends keyof DemoDB>(name: K, id: string) {
    const db = load();
    db[name] = db[name].filter(
      (row) => (row as { id: string }).id !== id,
    ) as DemoDB[K];
    persist();
  },

  reset() {
    cache = structuredClone(demoData);
    persist();
  },
};
