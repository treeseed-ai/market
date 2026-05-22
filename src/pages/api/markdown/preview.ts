import type { APIRoute } from 'astro';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

export const prerender = false;

function json(payload: unknown, status = 200) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

const markdownPreviewProcessor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkRehype)
	.use(rehypeStringify);

export const POST: APIRoute = async (context) => {
	const session = context.locals.auth;
	if (!session) return json({ ok: false, error: 'Authentication required.' }, 401);

	const body = await context.request.json().catch(() => ({}));
	const markdown = typeof body.markdown === 'string' ? body.markdown : '';
	const file = await markdownPreviewProcessor.process(markdown);
	return json({ ok: true, payload: { html: String(file) } });
};
