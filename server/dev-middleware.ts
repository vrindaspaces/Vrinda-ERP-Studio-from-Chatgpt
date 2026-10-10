import {DatabaseSync} from 'node:sqlite';
import {readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync, unlinkSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {IncomingMessage, ServerResponse} from 'node:http';
import worker from './worker.ts';

const dbPath = process.env.TEST_DB || './erp-database.sqlite';
const database = new DatabaseSync(dbPath);
const fileDirectory = dbPath + '.files';
mkdirSync(fileDirectory, {recursive: true});

database.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
const migrations = readdirSync('drizzle').filter(n => n.endsWith('.sql')).sort();
for (const name of migrations) {
  const row = database.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name);
  if (!row) {
    database.exec(readFileSync('drizzle/' + name, 'utf8'));
    database.prepare('INSERT INTO _local_migrations VALUES (?)').run(name);
  }
}

function statement(sql: string, args: any[] = []) {
  return {
    bind: (...values: any[]) => statement(sql, values),
    all: async () => ({results: database.prepare(sql).all(...(args as any))}),
    run: async () => ({meta: {changes: Number(database.prepare(sql).run(...(args as any)).changes)}})
  };
}

const DB = {
  prepare: (sql: string) => statement(sql),
  batch: async (statements: any[]) => {
    database.exec('BEGIN');
    try {
      const result = [];
      for (const s of statements) {
        result.push(await s.run());
      }
      database.exec('COMMIT');
      return result;
    } catch (e) {
      database.exec('ROLLBACK');
      throw e;
    }
  }
};

const filePath = (key: string) => fileDirectory + '/' + createHash('sha256').update(key).digest('hex');
const metaPath = (key: string) => filePath(key) + '.meta';

const FILES = {
  put: async (key: string, body: any, options?: any) => {
    const bytes = Buffer.from(await new Response(body).arrayBuffer());
    writeFileSync(filePath(key), bytes);
    if (options?.httpMetadata) {
      writeFileSync(metaPath(key), JSON.stringify(options.httpMetadata));
    }
  },
  get: async (key: string) => {
    const p = filePath(key);
    if (!existsSync(p)) return null;
    let meta: any = {};
    if (existsSync(metaPath(key))) {
      try {
        meta = JSON.parse(readFileSync(metaPath(key), 'utf8'));
      } catch {}
    }
    return {
      body: readFileSync(p),
      httpMetadata: meta
    };
  },
  delete: async (key: string) => {
    const p = filePath(key);
    if (existsSync(p)) unlinkSync(p);
    if (existsSync(metaPath(key))) unlinkSync(metaPath(key));
  },
  list: async () => {
    if (!existsSync(fileDirectory)) return {objects: [], truncated: false};
    const files = readdirSync(fileDirectory).filter(f => !f.endsWith('.meta'));
    return {
      objects: files.map(f => ({
        key: f,
        size: statSync(fileDirectory + '/' + f).size
      })),
      truncated: false
    };
  }
};

const env = {
  DB,
  FILES,
  SITE_OWNER_EMAIL: process.env.SITE_OWNER_EMAIL || 'praveen123456@gmail.com',
  EMAIL_SETTINGS_KEY: Buffer.from('12345678901234567890123456789012').toString('base64')
};

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse, next?: () => void) {
  if (!req.url?.startsWith('/api/')) {
    if (next) return next();
    res.statusCode = 404;
    return res.end('Not found');
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) {
        for (const v of val) headers.append(key, v);
      } else if (val !== undefined) {
        headers.set(key, val);
      }
    }

    if (!headers.get('oai-authenticated-user-email')) {
      headers.set('oai-authenticated-user-email', process.env.SITE_OWNER_EMAIL || 'praveen123456@gmail.com');
    }

    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const url = `${protocol}://${host}${req.url}`;

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      ...(['GET', 'HEAD'].includes(req.method!) ? {} : {body: Buffer.concat(chunks)})
    });

    const response = await worker.fetch(webRequest, env);

    res.statusCode = response.status;
    for (const [k, v] of response.headers.entries()) {
      res.setHeader(k, v);
    }

    const bodyBuf = Buffer.from(await response.arrayBuffer());
    res.end(bodyBuf);
  } catch (err) {
    console.error('API middleware error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({error: 'Server error'}));
  }
}
