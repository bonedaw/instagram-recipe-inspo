const { URL } = require('url');

const DEFAULT_APP_ID = '936619743392459';

function parseCaption(node) {
  const captionEdges = node?.edge_media_to_caption?.edges;
  if (!Array.isArray(captionEdges) || captionEdges.length === 0) return '';
  return String(captionEdges[0]?.node?.text || '');
}

function toMedia(node) {
  const shortcode = String(node?.shortcode || '');
  return {
    id: String(node?.id || shortcode || ''),
    caption: parseCaption(node),
    media_type: node?.is_video ? 'VIDEO' : 'IMAGE',
    media_url: node?.display_url || node?.thumbnail_src || '',
    thumbnail_url: node?.thumbnail_src || node?.display_url || '',
    permalink: shortcode ? `https://www.instagram.com/p/${shortcode}/` : '',
    timestamp: node?.taken_at_timestamp
      ? new Date(Number(node.taken_at_timestamp) * 1000).toISOString()
      : null,
  };
}

function buildHeaders({ userAgent, appId, sessionId }) {
  const headers = {
    Accept: '*/*',
    'User-Agent': userAgent,
    'X-IG-App-ID': appId || DEFAULT_APP_ID,
    Referer: 'https://www.instagram.com/',
  };
  if (sessionId) {
    headers.Cookie = `sessionid=${sessionId}`;
  }
  return headers;
}

async function fetchJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Instagram scrape error ${res.status}: ${body.slice(0, 260)}`);
  }
  return res.json();
}

async function scrapeProfileMedia({
  username,
  limit = 40,
  userAgent,
  appId,
  sessionId,
}) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit || 40)));
  const headers = buildHeaders({ userAgent, appId, sessionId });

  const url = new URL('https://i.instagram.com/api/v1/users/web_profile_info/');
  url.searchParams.set('username', username);

  const payload = await fetchJson(url.toString(), headers);
  const edges = payload?.data?.user?.edge_owner_to_timeline_media?.edges;
  if (!Array.isArray(edges)) {
    throw new Error('Could not parse profile media from Instagram response');
  }

  return edges.slice(0, safeLimit).map((edge) => toMedia(edge?.node || {}));
}

module.exports = { scrapeProfileMedia };
