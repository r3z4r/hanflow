/**
 * Format a single Server-Sent Events frame: a named event with a JSON payload,
 * terminated by the blank line that delimits SSE messages.
 */
export function sseFrame(event: string, data: unknown): string {
	return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
