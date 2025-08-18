export const handler = async (event) => {
  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO  = process.env.GITHUB_REPO;
    const DIR   = process.env.DATA_DIR || "data";
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing GitHub env" }) };
    }
    const params = event.queryStringParameters || {};
    const user = (params.user || "").trim();
    const date = (params.date || "").trim();
    if (!user || !date) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"user/date required" }) };

    const path = `${DIR}/${encodeURIComponent(user)}/${date}.json`;
    const url  = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const res  = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent":"netlify-func" }});
    if (res.status === 404) return { statusCode: 200, body: JSON.stringify({ ok:true, data:null }) };
    if (!res.ok) return { statusCode: 502, body: JSON.stringify({ ok:false, error:`github ${res.status}` }) };

    const json = await res.json();
    const content = Buffer.from(json.content, "base64").toString("utf8");
    return { statusCode: 200, body: JSON.stringify({ ok:true, data: JSON.parse(content) }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
