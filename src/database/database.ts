import * as fs from 'fs';
import * as path from 'path';
import { SCHEMA_SQL } from './schema';

export interface IDatabase {
  exec(sql: string): void;
  run(sql: string, params?: any[]): { lastInsertRowid?: number | bigint; changes?: number };
  get<T = any>(sql: string, params?: any[]): T | undefined;
  all<T = any>(sql: string, params?: any[]): T[];
  close(): void;
}

export class AppDatabase implements IDatabase {
  private dbInstance: any;
  private dbPath: string;

  constructor(storageDir: string, dbName: string = 'antigravity_usage.db') {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbPath = path.join(storageDir, dbName);
    this.init();
  }

  private init() {
    try {
      // Try native node:sqlite DatabaseSync first
      const { DatabaseSync } = require('node:sqlite');
      this.dbInstance = new DatabaseSync(this.dbPath);
    } catch {
      // If node:sqlite is not available, we use an in-memory/file SQLite fallback
      throw new Error('SQLite engine could not be initialized.');
    }

    this.exec(SCHEMA_SQL);
  }

  public exec(sql: string): void {
    this.dbInstance.exec(sql);
  }

  public run(sql: string, params: any[] = []): { lastInsertRowid?: number; changes?: number } {
    const stmt = this.dbInstance.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: Number(result.changes)
    };
  }

  public get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.dbInstance.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  public all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.dbInstance.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public close(): void {
    if (this.dbInstance && typeof this.dbInstance.close === 'function') {
      this.dbInstance.close();
    }
  }

  public getDbPath(): string {
    return this.dbPath;
  }
}
