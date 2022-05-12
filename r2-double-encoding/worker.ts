import { R2Bucket } from 'https://raw.githubusercontent.com/skymethod/denoflare/6c4af9d158cf07739a5b0843ae313cd94b3ee26a/common/cloudflare_workers_types.d.ts';

export default {

    async fetch(request: Request, env: { bucket: R2Bucket }): Promise<Response> {
        const { method, url, headers } = request;
        console.log(`${method} ${url}`);
        const acceptEncoding = headers.get('accept-encoding');
        if (acceptEncoding) console.log(`Request accept-encoding: ${acceptEncoding}`);
        if (method !== 'GET') return new Response(`Method '${method}' not allowed`, { status: 405 });
        const key = new URL(url).pathname.substring(1); // remove leading slash
        if (key === '') return new Response('Specify a key using an url path', { status: 400 });
        const { bucket } = env;
        
        const obj = await bucket.get(key);
        if (!obj) return new Response('not found', { status: 404 });
        const { contentType, contentDisposition } = obj.httpMetadata;
        const responseHeaders = new Headers({ 'etag': obj.httpEtag });
        if (contentType) responseHeaders.set('content-type', contentType); // seems to trigger auto-gzipping

        if (contentDisposition === 'gzip') { // uploaded with 'content-encoding: gzip'. This line is not a typo, currently a bug in the r2 runtime maps content-encoding -> content-disposition
            responseHeaders.set('content-encoding', 'gzip');
            responseHeaders.set('cache-control', 'no-transform'); // supposed to disable auto-gzipping, currently doesn't
            // if the client sends accept-encoding: gzip, the cloudflare frontend will re-gzip this (so it will be gzipped twice) and include content-encoding: gzip in the response
            // if the client does not send accept-encoding: gzip, the cloudflare frontend will send these already gzipped bytes _without_ a content-encoding
        }
        return new Response(obj.body, { headers: responseHeaders });
    }

};
