import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { signIn } from '../../auth';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (session) redirect(303, '/');
	return {};
};

export const actions = { default: signIn };
