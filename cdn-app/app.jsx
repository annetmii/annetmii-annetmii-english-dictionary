/* global React, ReactDOM */
const { useEffect, useRef, useState } = React;

const APP_KEY = "no-build-english-dict-v1";
const LS = {
  user: `${APP_KEY}::user`,
  cache: `${APP_KEY}::cache`,
  lastSyncedAt: `${APP_KEY}::last_sync`,
};
const IDLE_MS = 60_000;

const ymd = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0,10);
const todayStr = () => ymd(new Date());
const nowIso = () => new Date().toISOString();

function loadLocal() { try { return JSON.parse(localStorage.getItem(LS.cache) || "{}"); } catch { return {}; } }
function saveLocal(obj) { localStorage.setItem(LS.cache, JSON.stringify(obj)); }

async function cloudLoad({ user, date }) {
  const res = await fetch(`/.netlify/functions/load?user=${encodeURIComponent(user)}&date=${encodeURIComponent(date)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`load failed: ${res.status}`);
  return await res.json(); // { ok, data|null }
}
async function cloudSave({ user, date, data }) {
  const res = await fetch("/.netlify/functions/save", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ user, date, data }),
  });
  if (!res.ok) throw new Error(`save failed: ${res.status}`);
  return await res.json(); // { ok, savedAt }
}

function newEmptyLesson(dateStr) {
  return {
    meta: { date: dateStr, updatedAt: nowIso(), status: "draft", title: `${dateStr} Lesson` },
    parts: {
      part1: { title: "Part 1｜語彙", items: Array.from({length:8}).map((_,i)=>({id:`p1-${i+1}`, term:"", answerJP:""})) },
      part2: { title: "Part 2｜構文", items: Array.from({length:5}).map((_,i)=>({id:`p2-${i+1}`, prompt:"", userEN:"", userJP:""})) },
      part3: { title: "Part 3｜会話", items: Array.from({length:4}).map((_,i)=>({id:`p3-${i+1}`, scene:"", masayukiJP:"", masayukiEN:""})) },
      part4: { title: "Part 4｜英作文", content: "" },
    },
    feedback: { overall: "", part1: "", part2: "", part3: "", part4: "" },
  };
}

function App() {
  const [user, setUser] = useState(() => localStorage.getItem(LS.user) || "");
  const [dateStr, setDateStr] = useState(() => todayStr());
  const [store, setStore] = useState(() => (loadLocal()[todayStr()] || newEmptyLesson(todayStr())));
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const idleTimer = useRef(null);
  const [mode, setMode] = useState("learner"); // "learner" | "trainer"

  useEffect(() => { // ローカル自動保存
    const all = loadLocal(); all[dateStr] = store; saveLocal(all);
  }, [store, dateStr]);

  function scheduleIdleSync() { // 入力停止60秒で同期
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => { if (dirty && user) syncToCloud("idle"); }, IDLE_MS);
  }

  useEffect(() => { // 起動/ユーザー/日付変更時にクラウド読み込み
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const res = await cloudLoad({ user, date: dateStr });
        if (res.ok && res.data) {
          setStore(res.data);
        } else {
          const local = loadLocal();
          setStore(local[dateStr] || newEmptyLesson(dateStr));
        }
        setDirty(false);
      } catch {
        const local = loadLocal();
        setStore(local[dateStr] || newEmptyLesson(dateStr));
      } finally { setLoading(false); }
    })();
  }, [user, dateStr]);

  const patch = (mutator) => { // 変更ヘルパ
    setStore((prev) => { const next = structuredClone(prev); mutator(next); next.meta.updatedAt = nowIso(); return next; });
    setDirty(true); scheduleIdleSync();
  };

  async function syncToCloud() {
    const res = await cloudSave({ user, date: dateStr, data: store });
    if (res.ok) { setDirty(false); localStorage.setItem(LS.lastSyncedAt, res.savedAt); }
    return res;
  }
  async function handleSubmit() { // 送信＝必ず同期
    if (!user) { alert("まず名前を入力してください"); return; }
    patch(n => { n.meta.status = "submitted"; });
    try { await syncToCloud(); alert("提出＆同期完了"); } 
    catch { alert("同期に失敗しました（ローカルには保存済み）"); }
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{margin:'8px 0', padding:'10px 12px'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            <img src="/logo.png" alt="logo" width="44" height="44" />
            <div>
              <div style={{fontWeight:700}}>English Dictionary</div>
              <div className="label">日付：{dateStr} ／ ステータス：{store.meta.status}</div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span className="label">学習者</span>
            <label style={{display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer'}}>
              <input type="checkbox"
                     checked={mode === "trainer"}
                     onChange={(e)=> setMode(e.target.checked ? "trainer" : "learner")}
              />
              <span className="label">講師</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="card" style={{margin:'8px 0', padding:'10px 12px'}}>
        <div className="row">
          <div style={{flex:1, minWidth:240}}>
            <div className="label">あなたの名前（初回のみ）</div>
            <input className="input" placeholder="例）Masayuki"
              value={user}
              onChange={(e)=>{ const v=e.target.value.trim(); setUser(v); localStorage.setItem(LS.user, v); }}
            />
          </div>
          <div>
            <div className="label">日付</div>
            <input type="date" className="input" value={dateStr} onChange={(e)=>setDateStr(e.target.value)} />
          </div>
          <button className="btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "同期中..." : "送信（同期）"}
          </button>
        </div>
      </div>

      {/* Part 1 */}
      <div className="card" style={{marginTop:12}}>
        <h2 style={{marginTop:0}}>Part 1｜語彙</h2>
        {store.parts.part1.items.map((it,i)=>(
          <div key={it.id} className="row">
            <input className="input" placeholder={`英単語/フレーズ #${i+1}`}
              value={it.term}
              readOnly={mode !== "trainer"}
              onChange={(e)=>patch(n=>{n.parts.part1.items[i].term=e.target.value;})}/>
            <input className="input" placeholder="日本語訳"
              value={it.answerJP} onChange={(e)=>patch(n=>{n.parts.part1.items[i].answerJP=e.target.value;})}/>
          </div>
        ))}
      </div>

      {/* Part 2 */}
      <div className="card" style={{marginTop:12}}>
        <h2 style={{marginTop:0}}>Part 2｜構文</h2>
        {store.parts.part2.items.map((it,i)=>(
          <div key={it.id} className="row" style={{alignItems:"stretch"}}>
            <textarea className="textarea" placeholder={`プロンプト #${i+1}`}
              value={it.prompt}
              readOnly={mode !== "trainer"}
              onChange={(e)=>patch(n=>{n.parts.part2.items[i].prompt=e.target.value;})}/>
            <textarea className="textarea" placeholder="英語の解答"
              value={it.userEN} onChange={(e)=>patch(n=>{n.parts.part2.items[i].userEN=e.target.value;})}/>
            <textarea className="textarea" placeholder="日本語訳"
              value={it.userJP} onChange={(e)=>patch(n=>{n.parts.part2.items[i].userJP=e.target.value;})}/>
          </div>
        ))}
      </div>

      {/* Part 3 */}
      <div className="card" style={{marginTop:12}}>
        <h2 style={{marginTop:0}}>Part 3｜会話</h2>
        {store.parts.part3.items.map((it,i)=>(
          <div key={it.id} className="row" style={{alignItems:"stretch"}}>
            <textarea className="textarea" placeholder="シーン"
              value={it.scene}
              readOnly={mode !== "trainer"}
              onChange={(e)=>patch(n=>{n.parts.part3.items[i].scene=e.target.value;})}/>
            <textarea className="textarea" placeholder="日本語セリフ"
              value={it.masayukiJP}
              readOnly={mode !== "trainer"}
              onChange={(e)=>patch(n=>{n.parts.part3.items[i].masayukiJP=e.target.value;})}/>
            <textarea className="textarea" placeholder="英訳"
              value={it.masayukiEN} onChange={(e)=>patch(n=>{n.parts.part3.items[i].masayukiEN=e.target.value;})}/>
          </div>
        ))}
      </div>

      {/* Part 4 */}
      <div className="card" style={{marginTop:12}}>
        <h2 style={{marginTop:0}}>Part 4｜英作文</h2>
        <textarea className="textarea" placeholder="自由英作文"
          value={store.parts.part4.content}
          onChange={(e)=>patch(n=>{n.parts.part4.content=e.target.value;})}/>
      </div>
{/* Trainer Feedback（講師モードのみ表示。空欄は非表示にしない＝入力可能にする） */}
      <div className="card" style={{marginTop:12, marginBottom:24, display: mode==="trainer" ? "block":"none"}}>
        <h2 style={{marginTop:0}}>Trainer Feedback（講師コメント）</h2>
        <div className="row">
          <textarea className="textarea" placeholder="Part 1へのコメント"
            value={store.feedback.part1}
            onChange={(e)=>patch(n=>{n.feedback.part1=e.target.value;})}/>
          <textarea className="textarea" placeholder="Part 2へのコメント"
            value={store.feedback.part2}
            onChange={(e)=>patch(n=>{n.feedback.part2=e.target.value;})}/>
          <textarea className="textarea" placeholder="Part 3へのコメント"
            value={store.feedback.part3}
            onChange={(e)=>patch(n=>{n.feedback.part3=e.target.value;})}/>
          <textarea className="textarea" placeholder="Part 4へのコメント"
            value={store.feedback.part4}
            onChange={(e)=>patch(n=>{n.feedback.part4=e.target.value;})}/>
        </div>
        <div className="row" style={{marginTop:8}}>
          <textarea className="textarea" placeholder="総評"
            value={store.feedback.overall}
            onChange={(e)=>patch(n=>{n.feedback.overall=e.target.value;})}/>
        </div>
      </div>
      
      <div className="hint">
        最終更新：{new Date(store.meta.updatedAt).toLocaleString()} ｜ ステータス：{store.meta.status}
        {localStorage.getItem(LS.lastSyncedAt) ? ` ｜ 最終同期：${new Date(localStorage.getItem(LS.lastSyncedAt)).toLocaleString()}` : ""}
      </div>
      {/* Footer */}
      <div style={{textAlign:'center', fontSize:12, color:'#6b7280', padding:'24px 0 32px'}}>
        © {new Date().getFullYear()} annetmii - 学習を習慣に。
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
