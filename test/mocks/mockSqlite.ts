import initSqlJs, { Database, SqlValue } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import Module from 'module';
import { vi } from 'vitest';

// Initialize sql.js WebAssembly engine
const SQL = await initSqlJs();

export class MockDatabaseSync {
  private db: Database;
  private dbPath?: string;
  private isClosed = false;

  constructor(location: string, _options?: any) {
    this.dbPath = location;
    if (location && location !== ':memory:') {
      if (fs.existsSync(location)) {
        try {
          const buffer = fs.readFileSync(location);
          if (buffer.length > 0) {
            this.db = new SQL.Database(buffer);
          } else {
            this.db = new SQL.Database();
          }
        } catch {
          this.db = new SQL.Database();
        }
      } else {
        const dir = path.dirname(location);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }
  }

  private persist(): void {
    if (this.isClosed || !this.dbPath || this.dbPath === ':memory:') {
      return;
    }
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch {
      // Ignore write errors during teardown
    }
  }

  public exec(sql: string): void {
    if (this.isClosed) throw new Error('Database is closed');
    this.db.run(sql);
    this.persist();
  }

  public prepare(sql: string) {
    if (this.isClosed) throw new Error('Database is closed');
    const db = this.db;
    const persist = () => this.persist();
    const normalizeParams = (params: any[]): SqlValue[] => {
      let list = params;
      if (params.length === 1 && Array.isArray(params[0])) {
        list = params[0];
      }
      return list.map((val) => {
        if (val === undefined || val === null) {
          return null;
        }
        if (typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        if (val instanceof Date) {
          return val.toISOString();
        }
        if (typeof val === 'bigint') {
          return Number(val);
        }
        return val;
      });
    };

    return {
      run: (...params: any[]) => {
        if (this.isClosed) throw new Error('Database is closed');
        const flatParams = normalizeParams(params);
        db.run(sql, flatParams);
        const changes = db.getRowsModified();
        let lastInsertRowid = 0;
        try {
          const res = db.exec('SELECT last_insert_rowid() AS id');
          if (res.length > 0 && res[0].values && res[0].values.length > 0) {
            lastInsertRowid = Number(res[0].values[0][0]);
          }
        } catch {
          // Ignore
        }
        persist();
        return {
          changes,
          lastInsertRowid
        };
      },

      get: (...params: any[]) => {
        if (this.isClosed) throw new Error('Database is closed');
        const flatParams = normalizeParams(params);
        const stmt = db.prepare(sql);
        try {
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      all: (...params: any[]) => {
        if (this.isClosed) throw new Error('Database is closed');
        const flatParams = normalizeParams(params);
        const stmt = db.prepare(sql);
        const results: any[] = [];
        try {
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        } finally {
          stmt.free();
        }
      }
    };
  }

  public close(): void {
    if (this.isClosed) return;
    this.persist();
    try {
      this.db.close();
    } catch {
      // Ignore
    }
    this.isClosed = true;
  }
}

/**
 * Installs the SQLite mock into Vitest and Node module loaders.
 */
export function setupSqliteMock(): void {
  // 1. Mock via Vitest
  vi.mock('node:sqlite', () => ({
    DatabaseSync: MockDatabaseSync,
    default: {
      DatabaseSync: MockDatabaseSync
    }
  }));

  // 2. Intercept dynamic CommonJS require('node:sqlite')
  const origRequire = (Module as any).prototype.require;
  (Module as any).prototype.require = function (id: string, ...args: any[]) {
    if (id === 'node:sqlite' || id === 'sqlite') {
      return {
        DatabaseSync: MockDatabaseSync,
        default: {
          DatabaseSync: MockDatabaseSync
        }
      };
    }
    return origRequire.apply(this, [id, ...args]);
  };
}

// Auto-install mock immediately on module import
setupSqliteMock();
