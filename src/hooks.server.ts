import { sequence } from '@sveltejs/kit/hooks';
import { handle as authHandle } from './auth';
import type { Handle } from '@sveltejs/kit';

const appHandle: Handle = async ({ event, resolve }) => {
	return resolve(event);
};

export const handle = sequence(authHandle, appHandle);
