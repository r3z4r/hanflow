const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if `value` is a canonical UUID string (matches the DB `uuid` column format). */
export function isUuid(value: string): boolean {
	return UUID_RE.test(value);
}
