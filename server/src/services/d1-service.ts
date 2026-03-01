type Primitive = string | number | boolean | null;

/**
 * Recursively flattens an object into primitive values.
 * Dates → ISO string, nested objects → rejected with error.
 */
function flattenForD1(value: unknown): Primitive {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();

  // For JSON columns: convert object/array to JSON string
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (e) {
      throw new Error(`Failed to stringify JSON field: ${e}`, { cause: e });
    }
  }

  throw new Error(`Unsupported value for D1: ${value} (${typeof value})`);
}

export class D1Service<T> {
  protected readonly db: D1Database;
  private readonly tableName: string;

  constructor(db: D1Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /* ------------------------------------------------------------------ */
  /* READ OPERATIONS                                                    */
  /* ------------------------------------------------------------------ */
  async getAll(where?: Partial<T>): Promise<T[]> {
    if (where && Object.keys(where).length > 0) {
      return this.findAll(where);
    }
    const { results } = await this.db.prepare(`SELECT * FROM ${this.tableName}`).all();
    return (results as T[]) || [];
  }

  async getById(id: string): Promise<T | null> {
    return (await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .first()) as T | null;
  }

  async findAll(where: Partial<T>): Promise<T[]> {
    const { clause, values } = this.buildWhereClause(where);
    const { results } = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${clause}`)
      .bind(...values)
      .all();
    return (results as T[]) || [];
  }

  async findOne(where: Partial<T>): Promise<T | null> {
    const { clause, values } = this.buildWhereClause(where);
    return (await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${clause}`)
      .bind(...values)
      .first()) as T | null;
  }

  /* ------------------------------------------------------------------ */
  /* CREATE                                                             */
  /* ------------------------------------------------------------------ */
  async create(item: T): Promise<any> {
    const obj = item as any;

    // Explicitly list columns (recommended) OR use Object.keys
    const keys: string[] = [];
    const bindValues: Primitive[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue; // skip undefined
      keys.push(key);
      bindValues.push(flattenForD1(value));
    }

    if (keys.length === 0) {
      throw new Error('No valid fields to insert');
    }

    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

    return await this.db
      .prepare(sql)
      .bind(...bindValues)
      .run();
  }

  /* ------------------------------------------------------------------ */
  /* UPDATE                                                             */
  /* ------------------------------------------------------------------ */
  async update(id: string, item: Partial<T>): Promise<any> {
    const obj = item as any;
    const setParts: string[] = [];
    const bindValues: Primitive[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue;
      setParts.push(`${key} = ?`);
      bindValues.push(flattenForD1(value));
    }

    if (setParts.length === 0) {
      throw new Error('No fields to update');
    }

    bindValues.push(id); // WHERE id = ?

    const sql = `UPDATE ${this.tableName} SET ${setParts.join(', ')} WHERE id = ?`;

    return await this.db
      .prepare(sql)
      .bind(...bindValues)
      .run();
  }

  /* ------------------------------------------------------------------ */
  /* DELETE                                                             */
  /* ------------------------------------------------------------------ */
  async delete(id: string): Promise<any> {
    return await this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).bind(id).run();
  }

  /* ------------------------------------------------------------------ */
  /* HELPERS                                                            */
  /* ------------------------------------------------------------------ */
  private buildWhereClause(where: Partial<T>): { clause: string; values: Primitive[] } {
    const entries = Object.entries(where as any).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      return { clause: '1=1', values: [] };
    }

    const clauseParts = entries.map(([k]) => `${k} = ?`);
    const values = entries.map(([, v]) => flattenForD1(v));

    return {
      clause: clauseParts.join(' AND '),
      values,
    };
  }
}
