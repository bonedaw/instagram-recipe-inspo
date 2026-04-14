const { URL } = require('url');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Instagram API error ${res.status}: ${body}`);
  }
  return res.json();
}

function buildMediaUrl({ graphBaseUrl, igUserId, igAccessToken, limit }) {
  const url = new URL(`${graphBaseUrl}/${igUserId}/media`);
  url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('access_token', igAccessToken);
  return url.toString();
}

async function fetchAllMedia({ graphBaseUrl, igUserId, igAccessToken, limit = 40, maxPages = 4 }) {
  const items = [];
  let nextUrl = buildMediaUrl({ graphBaseUrl, igUserId, igAccessToken, limit });
  let page = 0;

  while (nextUrl && page < maxPages) {
    page += 1;
    const payload = await fetchJson(nextUrl);
    if (Array.isArray(payload.data)) items.push(...payload.data);
    nextUrl = payload?.paging?.next || null;
  }

  return items;
}

module.exports = { fetchAllMedia };
