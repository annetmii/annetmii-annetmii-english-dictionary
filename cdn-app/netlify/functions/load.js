/* netlify/functions/load.js */
const OWNER = process.env.GITHUB_OWNER || 'owner-name';
const REPO = process.env.GITHUB_REPO || 'repo-name';
const FILE_PATH = process.env.GITHUB_DATA_PATH || 'data/english-dict.json';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function fetchFromGitHub() {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'netlify-fn',
    },
  });
  if (res.status === 404) return { json: {}, sha: null };
  if (!res.ok) throw new Error(`GitHub fetch error: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content || '', 'base64').toString('utf8');
  let json = {};
  try { json = JSON.parse(content); } catch { json = {}; }
  return { json, sha: data.sha || null };
}

exports.handler = async (event) => {
  try {
    if (!GITHUB_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: 'Missing GITHUB_TOKEN' }) };
    const url = new URL(event.rawUrl || `https://${event.headers.host}${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
    const date = url.searchParams.get('date') || '';
    if (!date) return { statusCode: 400, body: JSON.stringify({ error: 'date is required' }) };

    const { json } = await fetchFromGitHub();

    // 互換：v2(users.*.*) / v1(user.*.*) / v0([date])
    if (json?.[date]) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(json[date] || {}) };
    }
    // v1/v2 も探す
    if (json?.users && typeof json.users === 'object') {
      for (const user of Object.keys(json.users)) {
        if (json.users[user]?.[date]) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json.users[user][date]) };
      }
    }
    for (const user of Object.keys(json || {})) {
      if (json[user]?.[date]) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json[user][date]) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({}) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};
