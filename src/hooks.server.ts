import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';

// sequence is used here so future handles (CSP headers, rate limiting, locale)
// can be inserted without restructuring this file
export const handle = sequence(authHandle);
