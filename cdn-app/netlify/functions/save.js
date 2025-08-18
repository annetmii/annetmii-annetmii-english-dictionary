export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const OWNER = process.env.GITHUB_OWNER;
    const REPO  = process.env.GITHUB_REPO;
    const DIR   = process.env.DATA_DIR || "data";
    if (!GITHUB_TOKEN || !OWNER || !REPO) {
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:"Missing GitHub env" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const user = String(body.user || "").trim();
    const date = String(body.date || "").trim();
    const data = body.data;
    if (!user || !date || !data) return { statusCode: 400, body: JSON.stringify({ ok:false, error:"user/date/data required" }) };

    const path = `${DIR}/${encodeURIComponent(user)}/${date}.json`;
    const url  = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const message = `save ${user}/${date}.json`;
    const content = Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64");

    // 既存SHA取得
    let sha;
    const head = await fetch(url, { headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent":"netlify-func" }});
    if (head.ok) { const j = await head.json(); sha = j.sha; }

    const put = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `token ${GITHUB_TOKEN}`, "User-Agent":"netlify-func", "Content-Type":"application/json" },
      body: JSON.stringify({ message, content, sha }),
    });
    if (!put.ok) return { statusCode: 502, body: JSON.stringify({ ok:false, error:`github ${put.status}` }) };

    return { statusCode: 200, body: JSON.stringify({ ok:true, savedAt: new Date().toISOString() }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: e.message }) };
  }
};
