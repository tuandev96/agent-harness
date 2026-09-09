/** Closed schema vocabulary, exported as draft-07. Unsupported keywords fail rather than being ignored. */
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'integer' | 'boolean' | 'null';
  const?: unknown; enum?: unknown[]; anyOf?: Schema[];
  properties?: Record<string, Schema>; required?: string[]; additionalProperties?: false;
  items?: Schema; minItems?: number; maxItems?: number; uniqueItems?: boolean;
  minLength?: number; maxLength?: number; pattern?: string; minimum?: number; maximum?: number;
}
export const text: Schema = { type: 'string', minLength: 1, maxLength: 4096 };
export const id: Schema = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$' };
export const hash: Schema = { type: 'string', pattern: '^[a-f0-9]{64}$' };
export const integer = (minimum = 0, maximum = Number.MAX_SAFE_INTEGER): Schema => ({ type: 'integer', minimum, maximum });
export const array = (items: Schema, minItems = 0, uniqueItems = false): Schema => ({type:'array',items,minItems,maxItems:10000,uniqueItems});
export const object = (properties: Record<string, Schema>): Schema => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const nullable = (schema: Schema): Schema => ({anyOf:[schema,{type:'null'}]});
const keywords = new Set(['type','const','enum','anyOf','properties','required','additionalProperties','items','minItems','maxItems','uniqueItems','minLength','maxLength','pattern','minimum','maximum']);
export function errors(schema: Schema, value: unknown, path = '$'): string[] {
  if (Object.keys(schema).some(k => !keywords.has(k))) throw new Error('UNSUPPORTED_SCHEMA_KEYWORD');
  if (schema.anyOf) return schema.anyOf.some(s => errors(s,value,path).length === 0) ? [] : [`${path}: no alternative matched`];
  if ('const' in schema && value !== schema.const) return [`${path}: wrong constant`];
  if (schema.enum && !schema.enum.includes(value)) return [`${path}: invalid enum`];
  if (!schema.type) return [];
  const e: string[] = [];
  const fail = (m: string) => e.push(`${path}: ${m}`);
  if (schema.type === 'null') { if(value !== null) fail('expected null'); }
  else if (schema.type === 'boolean') { if(typeof value !== 'boolean') fail('expected boolean'); }
  else if (schema.type === 'integer') {
    if (!Number.isSafeInteger(value)) fail('expected safe integer');
    else if ((value as number) < (schema.minimum ?? -Infinity) || (value as number) > (schema.maximum ?? Infinity)) fail('out of range');
  } else if (schema.type === 'string') {
    if(typeof value !== 'string') fail('expected string');
    else if(value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity) || (schema.pattern && !new RegExp(schema.pattern).test(value))) fail('invalid string');
  } else if (schema.type === 'array') {
    if(!Array.isArray(value)) fail('expected array');
    else {
      if(value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity)) fail('array size');
      if(schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) fail('duplicate item');
      if(schema.items) value.forEach((v,i)=>e.push(...errors(schema.items!,v,`${path}[${i}]`)));
    }
  } else if (schema.type === 'object') {
    if(value === null || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) fail('expected plain object');
    else {
      const row = value as Record<string, unknown>;
      for(const k of schema.required ?? []) if(!Object.hasOwn(row,k)) fail(`missing ${k}`);
      for(const [k,v] of Object.entries(row)) {
        if(!Object.hasOwn(schema.properties ?? {},k)) { if(schema.additionalProperties === false) fail(`unknown ${k}`); }
        else e.push(...errors(schema.properties![k]!,v,`${path}.${k}`));
      }
    }
  }
  return e;
}
export function assertSchema(schema: Schema, value: unknown): void {
  const issues=errors(schema,value); if(issues.length) throw new Error('SCHEMA: '+issues.slice(0,12).join('; '));
}
