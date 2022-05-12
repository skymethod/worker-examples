import { R2Bucket } from 'https://raw.githubusercontent.com/skymethod/denoflare/6c4af9d158cf07739a5b0843ae313cd94b3ee26a/common/cloudflare_workers_types.d.ts';

export default {

    async fetch(request: Request, env: { bucket: R2Bucket }): Promise<Response> {
        const { method, url, headers } = request;
        console.log(`${method} ${url}`);
        if (method !== 'GET') return new Response(`Method '${method}' not allowed`, { status: 405 });
        const ifNoneMatch = headers.get('if-none-match');
        if (ifNoneMatch) console.log(`Request if-none-match: ${ifNoneMatch}`); // see what the client (e.g. browser) sends
        const key = new URL(url).pathname.substring(1); // remove leading slash
        if (key === '') return new Response('Specify a key using an url path', { status: 400 });
        const { bucket } = env;
        // r2 bug: 'onlyIf: headers' fails currently
        // only works if the client sends the raw etag value (inside the double-quotes), which they won't since it's against the spec
        const obj = await bucket.get(key, { onlyIf: headers });
        if (!obj) return new Response('not found', { status: 404 });
        // httpEtag is the one surrounded by double quotes: e.g. "6bb97153935014dacd49aec024966005"
        // note the cf frontend will append a leading W/ to the final etag response header when the response is auto-gzippable, even when not auto-gzipping (when the client doesn't support it)
        const { contentType } = obj.httpMetadata;
        console.log(`Setting response tag to: ${obj.httpEtag}`);
        const responseHeaders = new Headers({ 'etag': obj.httpEtag });
        if (contentType) responseHeaders.set('content-type', contentType); // seems to trigger auto-gzipping
        return new Response(obj.body, { headers: responseHeaders });
    }

};
