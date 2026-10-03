import * as fs from 'fs';
import * as path from 'path';
import { SCHEMA_SQL, MIGRATION_SQL, COLUMN_MIGRATIONS } from './schema';

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

  constructor(storageDir: string, dbName: string = 'antigravity_analytics.db') {
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

    // Run migration to drop old duplicating usage table
    try {
      this.exec(MIGRATION_SQL);
    } catch {
      // Migration may fail if table doesn't exist, that's fine
    }

    // Create schema (IF NOT EXISTS is safe to re-run)
    this.exec(SCHEMA_SQL);

    // Run column migrations safely — each may fail if column already exists
    for (const sql of COLUMN_MIGRATIONS) {
      try {
        this.exec(sql);
      } catch {
        // Column already exists, skip
      }
    }
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
