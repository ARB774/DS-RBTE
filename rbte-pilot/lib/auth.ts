import 'server-only';
import { z } from 'zod';
import { createHash } from 'node:crypto';
export const SESSION_COOKIE='__Host-rbte_pilot';
export const tokenSchema=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export type AuthUser={id:string;email:string;name:string;role:'PARTICIPANT'};
