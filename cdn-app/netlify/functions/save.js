/* netlify/functions/save.js */
const OWNER = process.env.GITHUB_OWNER || "owner-name";
const REPO = process.env.GITHUB_REPO || "repo-name";
const FILE_PATH = process.env.GITHUB_DATA_PATH || "data/english-dict.json";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function getFile() {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "netlify-fn",
    },
  });
  if (res.status === 404) return { json: {}, sha: null };
  if (!res.ok) throw new Error(`GitHub fetch error: ${res.status}`);
  const data = await res.json();
  const content = Buffer.from(data.content || "", "base64").toString("utf8");
  let json = {};
  try { json = JSON.parse(content); } catch { json = {}; }
  return { json, sha: data.sha || null };
}

async function putFile(json, sha, date) {
  const message = `chore(data): auto-sync ${date}`;
  const content = Buffer.from(JSON.stringify(json, null, 2), "utf8").toString("base64");
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(FILE_PATH)}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "netlify-fn",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, content, sha: sha || undefined }),
  });
  if (!res.ok) throw new Error(`GitHub put error: ${res.status} ${await res.text()}`);
  return res.json();
}

exports.handler = async (event) => {
  try {
    if (!GITHUB_TOKEN) return { statusCode: 500, body: JSON.stringify({ error: "Missing GITHUB_TOKEN" }) };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };

    const { date, data } = JSON.parse(event.body || "{}");
    if (!date || !data) return { statusCode: 400, body: JSON.stringify({ error: "date and data are required" }) };

    const { json: current, sha } = await getFile();

    // v0: { [date]: lesson } にマージ保存
    const next = typeof current === "object" && current ? JSON.parse(JSON.stringify(current)) : {};
    next[date] = data;

    await putFile(next, sha, date);
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e?.message || e) }) };
  }
};
