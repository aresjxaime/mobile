import { Storage as FileStorage } from './storage.ts';
import SqlStorage from './sqlStorage.ts';

const useSql = (process.env.USE_SQL === '1' || process.env.USE_SQL === 'true');

export const Storage = useSql ? SqlStorage : FileStorage;
export default Storage;
