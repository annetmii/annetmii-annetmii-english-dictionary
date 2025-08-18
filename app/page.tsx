"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import {
   Dialog, DialogContent, DialogDescription,
   DialogFooter, DialogHeader, DialogTitle
 } from "../components/ui/dialog";
import { Label } from "@/components/ui/label";

const APP_KEY = "annetmii-English-Dictionary-v1";
const PIN_KEY = `${APP_KEY}::trainer_pin`;

// Netlify Functions endpoints（追加）
const NETLIFY_LOAD = "/.netlify/functions/load";
const NETLIFY_SAVE = "/.netlify/functions/save";

// 曜日テーマ（そのまま）
const weekdayTheme: Record<number, { key: string; label: string }> = {
  0: { key: "seasonal", label: "Seasonal（季節・イベント・行事）" },
  1: { key: "hr", label: "HR（採用・育成）" },
  2: { key: "compliance", label: "Compliance（勤怠・制度）" },
  3: { key: "hq", label: "HQ（本国報告・ドキュメント作成）" },
  4: { key: "sales", label: "Sales（接客・営業・販売スキル）" },
  5: { key: "smalltalk", label: "Small Talk（雑談・会食）" },
  6: { key: "writing", label: "Writing（書き言葉・メール・案内）" },
};

function ymd(d: Date) {
  const z = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return z.toISOString().slice(0, 10);
}

function loadAll(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(APP_KEY) || "{}"); } catch { return {}; }
}
function saveAll(data: Record<string, any>) {
  localStorage.setItem(APP_KEY, JSON.stringify(data));
}

function getPin(): string {
  try { return localStorage.getItem(PIN_KEY) || ""; } catch { return ""; }
}
function setPin(pin: string) {
  try { localStorage.setItem(PIN_KEY, pin); } catch {}
}

/** 旧データ互換：欠けを補完（parts/feedback を必ず揃える） */
function ensureShape(raw: any, dateStr: string, themeLabel: string) {
  const safe = (v: any, fb: any) => (v === undefined || v === null ? fb : v);

  const metaIn = safe(raw?.meta, {});
  const now = new Date().toISOString();
  const meta = {
    appName: "annetmii English Dictionary",
    date: safe(metaIn.date, dateStr),
    theme: safe(metaIn.theme, themeLabel),
    title: safe(metaIn.title, `${dateStr}｜${themeLabel}`),
    createdAt: safe(metaIn.createdAt, now),
    updatedAt: safe(metaIn.updatedAt, now),
    status: safe(metaIn.status, "draft" as "draft" | "submitted" | "returned" | "confirmed"),
    customTheme: safe(metaIn.customTheme, ""),
  };

  const partsIn = safe(raw?.parts, {});
  const p1 = safe(partsIn.part1, { title: "Part 1｜語彙チェック（英単語→日本語訳, 8問）", instructions: "英単語の日本語訳を入力しましょう。", items: [] });
  const p2 = safe(partsIn.part2, { title: "Part 2｜構文トレーニング（穴埋め + 日本語訳, 5問）", instructions: "語彙を使って英文を完成させ、日本語訳も書きましょう。", items: [] });
  const p3 = safe(partsIn.part3, { title: "Part 3｜会話ロールプレイ（4問）", instructions: "日本語のセリフを英訳しましょう。", items: [] });
  const p4 = safe(partsIn.part4, { title: "Part 4｜英作文", instructions: "今日のテーマに沿って自由に英作文しましょう。", content: "" });

  const fixItems = (arr: any[], factory: (i: number) => any, n: number) => {
    if (!Array.isArray(arr)) arr = [];
    if (arr.length === 0) arr = Array.from({ length: n }).map((_, i) => factory(i));
    return arr;
  };
  p1.items = fixItems(p1.items, (i) => ({ id: `p1-${i + 1}`, term: "", answerJP: "" }), 8);
  p2.items = fixItems(p2.items, (i) => ({ id: `p2-${i + 1}`, prompt: "", userEN: "", userJP: "" }), 5);
  p3.items = fixItems(p3.items, (i) => ({ id: `p3-${i + 1}`, scene: "", masayukiJP: "", masayukiEN: "" }), 4);

  const fbIn = safe(raw?.feedback, {});
  const feedback = {
    overall: safe(fbIn.overall, ""),
    part1: safe(fbIn.part1, ""),
    part2: safe(fbIn.part2, ""),
    part3: safe(fbIn.part3, ""),
    part4: safe(fbIn.part4, ""),
  };

  return { meta, parts: { part1: p1, part2: p2, part3: p3, part4: p4 }, feedback };
}

function newEmptyLesson(dateStr: string, themeLabel: string) {
  return ensureShape({}, dateStr, themeLabel);
}

function hrMondayTemplate(dateStr: string) {
  const lesson = newEmptyLesson(dateStr, weekdayTheme[1].label);
  const p1Terms = [
    "talk to friends / network", "look in the classifieds", "check Internet job sites", "write a resume",
    "write a cover letter", "send in your resume and cover letter", "set up an interview", "get hired",
  ];
  lesson.parts.part1.items = p1Terms.map((t, i) => ({ id: `p1-${i + 1}`, term: t, answerJP: "" }));
  const p2Prompts = [
    "I decided to ________ for new opportunities.",
    "She will ________ her resume tomorrow.",
    "He ________ an interview with the HR manager.",
    "They posted the job in the newspaper, so I will ________.",
    "After two interviews, I finally ________.",
  ];
  lesson.parts.part2.items = p2Prompts.map((p, i) => ({ id: `p2-${i + 1}`, prompt: p, userEN: "", userJP: "" }));
  lesson.parts.part3.items = [
    { id: "p3-1", scene: "採用面接：職務経験を尋ねる", masayukiJP: "本日はお時間ありがとうございます。以前の職務経験についてお話しします。", masayukiEN: "" },
    { id: "p3-2", scene: "応募理由を確認する", masayukiJP: "履歴書を評価いただきありがとうございます。この職に応募した理由はスキルアップのためです。", masayukiEN: "" },
    { id: "p3-3", scene: "二次面接の調整", masayukiJP: "はい、来週の平日午後5時以降でしたら面接に参加できます。", masayukiEN: "" },
    { id: "p3-4", scene: "クロージング", masayukiJP: "ありがとうございます。採用されるように頑張ります。", masayukiEN: "" },
  ];
  return lesson;
}

const clone = (o: any) => JSON.parse(JSON.stringify(o));

/* --- 講師コメント：そのまま --- */
function PartFeedbackInline({
  label,
  value,
  canEdit,
  onSave,
}: {
  label: string;
  value: string;
  canEdit: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string>(value || "");
  React.useEffect(() => { setText(value || ""); }, [value]);
  if (!canEdit && !String(value || "").trim()) return null;
  return (
    <div className="mx-0 sm:mx-0">
      <div className="flex items-center justify-between px-4">
        <div className="text-sm font-medium text-gray-700">講師コメント（{label}）</div>
        {canEdit && !editing && (
          <button type="button" className="text-xs text-blue-600 underline" onClick={() => setEditing(true)}>
            {String(value || "").trim() ? "編集" : "コメントを書く"}
          </button>
        )}
      </div>
      <div className="p-4 pt-2">
        {editing && canEdit ? (
          <div className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`${label} へのコメント`} className="min-h-[80px]" autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setEditing(false); setText(value || ""); }}>キャンセル</Button>
              <Button onClick={() => { onSave(text); setEditing(false); }}>保存</Button>
            </div>
          </div>
        ) : (
          String(value || "").trim()
            ? <div className="rounded-xl border bg-white p-3 text-[15px] whitespace-pre-wrap">{value}</div>
            : canEdit ? (<div className="text-xs text-gray-400">※ まだコメントはありません。</div>) : null
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [dateStr, setDateStr] = useState<string>(() => ymd(new Date()));
  const weekday = useMemo(() => new Date(dateStr + "T00:00:00").getDay(), [dateStr]);
  const theme = weekdayTheme[weekday];

  const [mode, setMode] = useState<"learner" | "trainer">("learner");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [store, setStore] = useState<Record<string, any>>(() => loadAll());

  // ====== 削除：青/黄バナー関連の状態・離脱ガードは廃止 ======
  // （UI要素も後段で削除）

  // ====== 60秒アイドルで自動同期（追加） ======
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const lastSyncedHashRef = useRef<string>("");

  const calcHash = (v: any) => { try { return JSON.stringify(v); } catch { return ""; } };

  const scheduleIdleSync = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const inactive = Date.now() - lastActivityRef.current;
      if (inactive >= 60_000) void syncToCloud();
    }, 60_000);
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    scheduleIdleSync();
  }, [scheduleIdleSync]);

  useEffect(() => {
    const events = ["keydown", "input", "mousemove", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true } as any));
    scheduleIdleSync();
    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity as any));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [markActivity, scheduleIdleSync]);

  // ====== ローカル即時保存は維持（追加：activity記録のみ） ======
  function updateStore(next: Record<string, any>) {
    setStore(next);
    saveAll(next);
    markActivity();
  }

  // ====== 起動/日付変更時にクラウド自動読み込み（追加） ======
  const loadFromCloud = useCallback(async () => {
    try {
      const res = await fetch(`${NETLIFY_LOAD}?date=${encodeURIComponent(dateStr)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          const fixed = ensureShape(data, dateStr, theme.label);
          const next = clone(loadAll());
          next[dateStr] = fixed;
          setStore(next);
          saveAll(next);
          lastSyncedHashRef.current = calcHash(next);
          return;
        }
      }
      // クラウドに無ければ local → 無ければ新規
      const local = loadAll();
      if (!local[dateStr]) local[dateStr] = newEmptyLesson(dateStr, theme.label);
      setStore(local);
      saveAll(local);
      lastSyncedHashRef.current = calcHash(local);
    } catch {
      const local = loadAll();
      if (!local[dateStr]) local[dateStr] = newEmptyLesson(dateStr, theme.label);
      setStore(local);
      saveAll(local);
      lastSyncedHashRef.current = calcHash(local);
    }
  }, [dateStr, theme.label]);

  useEffect(() => { void loadFromCloud(); }, [loadFromCloud]);

  // ====== クラウド保存（追加） ======
  const syncToCloud = useCallback(async () => {
    try {
      const snapshot = clone(store);
      const current = snapshot[dateStr] ?? newEmptyLesson(dateStr, theme.label);
      const snapshotHash = calcHash(snapshot);
      if (snapshotHash === lastSyncedHashRef.current) return; // 変更なし
      setSyncing(true);
      await fetch(NETLIFY_SAVE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, data: current }),
      });
      lastSyncedHashRef.current = snapshotHash;
    } catch {
      // 失敗時は次のアイドル同期/提出同期で再試行
    } finally {
      setSyncing(false);
    }
  }, [store, dateStr, theme.label]);

  const currentLesson = useMemo(() => store[dateStr] ?? null, [store, dateStr]);

  function createOrLoadTemplate() {
    const next = clone(store);
    if (next[dateStr]) { alert("この日のレッスンは既に存在します。編集モードで修正してください。"); return; }
    const newLesson = weekday === 1 ? hrMondayTemplate(dateStr) : newEmptyLesson(dateStr, theme.label);
    next[dateStr] = newLesson;
    updateStore(next);
  }

  function saveLesson(partial: any) {
    const next = clone(store);
    next[dateStr] = ensureShape({
      ...(next[dateStr] ?? newEmptyLesson(dateStr, theme.label)),
      ...partial,
      meta: {
        ...((next[dateStr] ?? {}).meta || {}),
        ...(partial.meta || {}),
        date: dateStr,
        theme: theme.label,
        updatedAt: new Date().toISOString(),
      },
    }, dateStr, theme.label);
    updateStore(next);
  }

  function removeLesson() {
    if (!confirm("この日のレッスンを削除します。よろしいですか？")) return;
    const next = clone(store);
    delete next[dateStr];
    updateStore(next);
  }

  function setStatus(status: "draft" | "submitted" | "returned" | "confirmed") {
    if (!currentLesson) return;
    saveLesson({ meta: { ...(currentLesson.meta || {}), status } });
  }

  // 提出時は必ず同期（要求どおり）
  const handleSubmit = useCallback(async () => {
    setStatus("submitted");
    await syncToCloud();
  }, [syncToCloud]);

  const handleReturn = useCallback(async () => {
    setStatus("returned");
    await syncToCloud();
  }, [syncToCloud]);

  const handleConfirm = useCallback(async () => {
    setStatus("confirmed");
    await syncToCloud();
  }, [syncToCloud]);

  function hasLesson(d: Date) { return Boolean(store[ymd(d)]); }

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 p-3 sm:p-4 md:p-6 max-w-3xl mx-auto" aria-busy={syncing ? true : undefined}>
      {/* App brand header（そのまま） */}
      <div className="flex flex-col items-center justify-center py-4">
        <Image src="/logo.png" alt="annetmii English Dictionary Logo" width={88} height={88} className="mb-2" />
        <h1 className="text-2xl font-bold text-gray-900">English Dictionary</h1>
      </div>

      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b mb-3 sm:mb-4">
        <div className="flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-2">
            <button
              className="border rounded-xl px-3 py-1 text-sm hover:bg-gray-50"
              onClick={() => setShowCalendar((s) => !s)}
              aria-expanded={showCalendar}
            >
              {dateStr}（{theme.label}）
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">学習者</span>
            <Switch
              checked={mode === "trainer"}
              onCheckedChange={(v) => {
                setPinError("");
                if (v) {
                  const has = !!getPin();
                  setPinMode(has ? "verify" : "set");
                  setPinInput(""); setPinConfirm(""); setPinOld("");
                  setPinModalOpen(true);
                } else {
                  setMode("learner");
                  setEditMode(false);
                }
              }}
            />
            <span className="text-xs">講師</span>
          </div>
        </div>

        {showCalendar && (
          <div className="pb-3">
            <div className="rounded-2xl border bg-white shadow-sm">
              <div className="p-4">
                <Calendar
                  locale="ja-JP"
                  value={new Date(dateStr)}
                  onChange={(v: any) => {
                    const d = Array.isArray(v) ? v[0] : v;
                    setDateStr(ymd(d));
                    setShowCalendar(false);
                  }}
                  prev2Label={null}
                  next2Label={null}
                  tileClassName={({ date }) => hasLesson(date) ? "relative" : undefined}
                  tileContent={({ date }) => hasLesson(date) ? (
                    <span className="absolute left-1/2 -translate-x-1/2 mt-6 h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  ) : null}
                />
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />
                    レッスンあり
                  </span>
                  <span>日付をタップで切替</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pb-2">
          {mode === "trainer" && (<Button size="sm" onClick={createOrLoadTemplate}>この日のレッスン作成</Button>)}
          <Button size="sm" variant="outline" onClick={() => window.print()}>印刷 / PDF保存</Button>
          {/* ▼ 削除指定：手動の「データ書き出し」「データ読み込み」は撤去 */}
        </div>
      </header>

      {/* ▼ 削除指定：青バナー／黄バナーは完全削除 */}

      {/* 本文（そのまま） */}
      <div className="text-[15px] sm:text-base">
        {!currentLesson ? (
          <EmptyState themeLabel={theme.label} />
        ) : (
          <div className="space-y-4">
            <LessonMetaBar currentLesson={currentLesson} />

            {/* 今日のテーマ */}
            <DayThemeEditor
              value={currentLesson.meta?.customTheme || ""}
              editable={mode === "trainer" && editMode}
              weekdayLabel={theme.label}
              onChange={(v) => saveLesson({ meta: { ...(currentLesson.meta || {}), customTheme: v } })}
            />

            {/* Part 1 */}
            <SectionPart1
              data={currentLesson.parts.part1}
              disabled={mode === "learner" && currentLesson?.meta?.status === "submitted"}
              onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part1: next } })}
              editMode={mode === "trainer" && editMode}
            />
            <PartFeedbackInline
              label="Part 1"
              value={currentLesson.feedback?.part1 || ""}
              canEdit={mode === "trainer"}
              onSave={(v) => saveLesson({ feedback: { ...currentLesson.feedback, part1: v } })}
            />

            {/* Part 2 */}
            <SectionPart2
              data={currentLesson.parts.part2}
              disabled={mode === "learner" && currentLesson?.meta?.status === "submitted"}
              onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part2: next } })}
              editMode={mode === "trainer" && editMode}
            />
            <PartFeedbackInline
              label="Part 2"
              value={currentLesson.feedback?.part2 || ""}
              canEdit={mode === "trainer"}
              onSave={(v) => saveLesson({ feedback: { ...currentLesson.feedback, part2: v } })}
            />

            {/* Part 3 */}
            <SectionPart3
              data={currentLesson.parts.part3}
              disabled={mode === "learner" && currentLesson?.meta?.status === "submitted"}
              onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part3: next } })}
              editMode={mode === "trainer" && editMode}
            />
            <PartFeedbackInline
              label="Part 3"
              value={currentLesson.feedback?.part3 || ""}
              canEdit={mode === "trainer"}
              onSave={(v) => saveLesson({ feedback: { ...currentLesson.feedback, part3: v } })}
            />

            {/* Part 4 */}
            <SectionPart4
              data={currentLesson.parts.part4}
              disabled={mode === "learner" && currentLesson?.meta?.status === "submitted"}
              onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part4: next } })}
            />
            <PartFeedbackInline
              label="Part 4"
              value={currentLesson.feedback?.part4 || ""}
              canEdit={mode === "trainer"}
              onSave={(v) => saveLesson({ feedback: { ...currentLesson.feedback, part4: v } })}
            />

            {/* Overall */}
            <PartFeedbackInline
              label="総評"
              value={currentLesson.feedback?.overall || ""}
              canEdit={mode === "trainer"}
              onSave={(v) => saveLesson({ feedback: { ...currentLesson.feedback, overall: v } })}
            />

            {/* 下部アクション */}
            <BottomActions
              mode={mode}
              lesson={currentLesson}
              onSubmit={handleSubmit}
              onReopen={() => setStatus("draft")}
              onReturn={handleReturn}
              onConfirm={handleConfirm}
            />
          </div>
        )}
      </div>

      {/* PINモーダル（そのまま） */}
      <PinDialog
        openState={{
          pinModalOpen, setPinModalOpen, pinMode, setPinMode, pinInput, setPinInput, pinConfirm, setPinConfirm, pinOld, setPinOld, pinError, setPinError
        }}
        setMode={setMode}
        setEditMode={setEditMode}
      />

      <footer className="text-center text-xs text-gray-500 mt-10 pb-6">
        © {new Date().getFullYear()} annetmii - 学習を習慣に。
      </footer>

      {/* ▼ 削除指定：起動ガードDialog（読み込み促し）は撤去 */}
    </div>
  );

  // ==== PINモーダル（元の処理を関数化してそのまま） ====
  function PinDialog({
    openState,
    setMode,
    setEditMode
  }: any) {
    const {
      pinModalOpen, setPinModalOpen, pinMode, setPinMode,
      pinInput, setPinInput, pinConfirm, setPinConfirm,
      pinOld, setPinOld, pinError, setPinError
    } = openState;

    return (
      <Dialog open={pinModalOpen} onOpenChange={(o) => { setPinModalOpen(o); if (!o) setPinError(""); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {pinMode === "set" && "講師PINの新規設定"}
              {pinMode === "verify" && "講師PINの入力"}
              {pinMode === "change" && "講師PINの変更"}
            </DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <div className="grid gap-3 p-4 pt-0">
            {pinMode === "change" && (
              <div className="grid gap-1.5">
                <Label htmlFor="pinOld">現在のPIN</Label>
                <Input id="pinOld" type="password" inputMode="numeric" value={pinOld} onChange={(e) => setPinOld(e.target.value)} />
              </div>
            )}

            {(pinMode === "set" || pinMode === "change") && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="pinNew">新しいPIN</Label>
                  <Input id="pinNew" type="password" inputMode="numeric" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pinConfirm">新しいPIN（確認）</Label>
                  <Input id="pinConfirm" type="password" inputMode="numeric" value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value)} />
                </div>
              </>
            )}

            {pinMode === "verify" && (
              <div className="grid gap-1.5">
                <Label htmlFor="pinVerify">PIN</Label>
                <Input id="pinVerify" type="password" inputMode="numeric" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
              </div>
            )}

            {pinError && <p className="text-sm text-red-600">{pinError}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button onClick={() => setPinModalOpen(false)}>キャンセル</Button>
            <Button
              onClick={() => {
                setPinError("");
                const current = getPin();

                if (pinMode === "verify") {
                  if (!pinInput) return setPinError("PINを入力してください。");
                  if (pinInput !== current) return setPinError("PINが違います。");
                  setMode("trainer"); setEditMode(true); setPinModalOpen(false); return;
                }

                if (pinMode === "set") {
                  if (!pinInput) return setPinError("新しいPINを入力してください。");
                  if (pinInput !== pinConfirm) return setPinError("確認用PINが一致しません。");
                  setPin(pinInput); setMode("trainer"); setEditMode(true); setPinModalOpen(false); return;
                }

                if (pinMode === "change") {
                  if (current && pinOld !== current) return setPinError("現在のPINが一致しません。");
                  if (!pinInput) return setPinError("新しいPINを入力してください。");
                  if (pinInput !== pinConfirm) return setPinError("確認用PINが一致しません。");
                  setPin(pinInput); setPinModalOpen(false); return;
                }
              }}
            >
              決定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}

/* ========= UI Blocks（既存のまま） ========= */

function EmptyState({ themeLabel }: { themeLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-4 bg-white text-[15px] sm:text-base">
      <h3 className="text-lg font-semibold mb-2">アプリへようこそ — "annetmii English Dictionary"</h3>
      <div className="space-y-1">
        <p>この日のレッスンは未作成です。以下のボタンからテンプレートを作成してください。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>曜日テーマ：<span className="font-medium">{themeLabel}</span></li>
          <li>編集モードで問題の追加・削除・文言修正ができます。</li>
          <li>Masayukiが「提出」→ Akiが「返却（講師コメント）」→ Masayukiが「確認済み」で完了。</li>
          <li>データは端末内に保存（JSON出力/読み込み対応）。</li>
        </ul>
      </div>
    </div>
  );
}

function LessonMetaBar({ currentLesson }: { currentLesson: any; }) {
  const s = currentLesson.meta?.status || "draft";
  const statusLabel: Record<string, string> = {
    draft: "下書き",
    submitted: "提出済み（ロック中）",
    returned: "返却済み（講師コメントあり）",
    confirmed: "確認済み（学習完了）",
  };
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 py-3">
        <div className="text-lg font-semibold text-gray-900">
          {currentLesson.meta?.date}｜{currentLesson.meta?.theme}
        </div>
        <div className="mt-1 text-xs text-gray-800">
          ステータス：{statusLabel[s]}
        </div>
      </div>
    </div>
  );
}

function DayThemeEditor({
  value,
  editable,
  onChange,
  weekdayLabel,
}: {
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  weekdayLabel: string;
}) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">今日のテーマ</h3>
      </div>
      <div className="p-4">
        <Textarea
          value={value}
          readOnly={!editable}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Picture Dictionaryの「Job Search」（p.173）を参考に学びましょう。"
          className="min-h-[80px] leading-6"
        />
      </div>
    </div>
  );
}

function SectionPart1({ data, onChange, disabled, editMode }: { data: any; onChange: (d: any) => void; disabled?: boolean; editMode?: boolean }) {
  function updateItem(i: number, patch: any) {
    const next = JSON.parse(JSON.stringify(data));
    next.items[i] = { ...next.items[i], ...patch };
    onChange(next);
  }
  function addItem() {
    const next = JSON.parse(JSON.stringify(data));
    next.items.push({ id: `p1-${Date.now()}`, term: "", answerJP: "" });
    onChange(next);
  }
  function removeItem(i: number) {
    const next = JSON.parse(JSON.stringify(data));
    next.items.splice(i, 1);
    onChange(next);
  }
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{data.title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-base text-gray-900">{data.instructions}</p>
        <div className="space-y-2">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <Input
                value={it.term}
                readOnly={!editMode}
                onChange={(e) => updateItem(i, { term: e.target.value })}
                placeholder="英単語 / フレーズ（編集モードで修正）"
                className="leading-6"
              />
              <Input
                value={it.answerJP}
                disabled={disabled}
                onChange={(e) => updateItem(i, { answerJP: e.target.value })}
                placeholder="日本語訳を入力"
                className={
                  (it.colorJP === "green" ? "bg-green-100 " :
                   it.colorJP === "orange" ? "bg-orange-100 " :
                   it.colorJP === "red" ? "bg-red-100 " : "") + ""
                }
              />
              {editMode && (
                <>
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="text-xs text-gray-600">評価：</span>
                    <Button size="sm" className="bg-green-200 hover:bg-green-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "green" })}>正解</Button>
                    <Button size="sm" className="bg-orange-200 hover:bg-orange-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "orange" })}>惜しい！</Button>
                    <Button size="sm" className="bg-red-200 hover:bg-red-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "red" })}>間違い</Button>
                    <Button size="sm" variant="outline" onClick={() => updateItem(i, { colorJP: "" })}>クリア</Button>
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button onClick={() => removeItem(i)}>削除</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {editMode && (
          <div className="flex justify-end">
            <Button onClick={addItem}>追加</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionPart2({ data, onChange, disabled, editMode }: { data: any; onChange: (d: any) => void; disabled?: boolean; editMode?: boolean }) {
  function updateItem(i: number, patch: any) {
    const next = JSON.parse(JSON.stringify(data));
    next.items[i] = { ...next.items[i], ...patch };
    onChange(next);
  }
  function addItem() {
    const next = JSON.parse(JSON.stringify(data));
    next.items.push({ id: `p2-${Date.now()}`, prompt: "", userEN: "", userJP: "" });
    onChange(next);
  }
  function removeItem(i: number) {
    const next = JSON.parse(JSON.stringify(data));
    next.items.splice(i, 1);
    onChange(next);
  }
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{data.title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-base text-gray-900">{data.instructions}</p>
        <div className="space-y-3">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="space-y-2 border rounded-xl p-3">
              <Textarea
                value={it.prompt}
                readOnly={!editMode}
                onChange={(e) => updateItem(i, { prompt: e.target.value })}
                placeholder="英文プロンプト（編集モードで修正）"
                className="min-h-[60px] leading-6"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Textarea
                  value={it.userEN}
                  disabled={disabled}
                  onChange={(e) => updateItem(i, { userEN: e.target.value })}
                  placeholder="英語の解答（穴埋め文）"
                  className={
                    (it.colorEN === "green" ? "bg-green-100 " :
                     it.colorEN === "orange" ? "bg-orange-100 " :
                     it.colorEN === "red" ? "bg-red-100 " : "") + ""
                  }
                />
                <Textarea
                  value={it.userJP}
                  disabled={disabled}
                  onChange={(e) => updateItem(i, { userJP: e.target.value })}
                  placeholder="日本語訳"
                  className={
                    (it.colorJP === "green" ? "bg-green-100 " :
                     it.colorJP === "orange" ? "bg-orange-100 " :
                     it.colorJP === "red" ? "bg-red-100 " : "") + ""
                  }
                />
              </div>
              {editMode && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <span>EN評価：</span>
                      <Button size="sm" className="bg-green-200 hover:bg-green-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "green" })}>正解</Button>
                      <Button size="sm" className="bg-orange-200 hover:bg-orange-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "orange" })}>惜しい！</Button>
                      <Button size="sm" className="bg-red-200 hover:bg-red-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "red" })}>間違い</Button>
                      <Button size="sm" variant="outline" onClick={() => updateItem(i, { colorEN: "" })}>クリア</Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>JP評価：</span>
                      <Button size="sm" className="bg-green-200 hover:bg-green-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "green" })}>正解</Button>
                      <Button size="sm" className="bg-orange-200 hover:bg-orange-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "orange" })}>惜しい！</Button>
                      <Button size="sm" className="bg-red-200 hover:bg-red-300" variant="ghost" onClick={() => updateItem(i, { colorJP: "red" })}>間違い</Button>
                      <Button size="sm" variant="outline" onClick={() => updateItem(i, { colorJP: "" })}>クリア</Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => removeItem(i)}>削除</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {editMode && (
          <div className="flex justify-end">
            <Button onClick={addItem}>追加</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionPart3({ data, onChange, disabled, editMode }: { data: any; onChange: (d: any) => void; disabled?: boolean; editMode?: boolean }) {
  function updateItem(i: number, patch: any) {
    const next = JSON.parse(JSON.stringify(data));
    next.items[i] = { ...next.items[i], ...patch };
    onChange(next);
  }
  function addItem() {
    const next = JSON.parse(JSON.stringify(data));
    next.items.push({ id: `p3-${Date.now()}`, scene: "", masayukiJP: "", masayukiEN: "" });
    onChange(next);
  }
  function removeItem(i: number) {
    const next = JSON.parse(JSON.stringify(data));
    next.items.splice(i, 1);
    onChange(next);
  }
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{data.title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-base text-gray-900">{data.instructions}</p>
        <div className="space-y-3">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="space-y-2 border rounded-xl p-3">
              <Textarea
                value={it.scene}
                readOnly={!editMode}
                onChange={(e) => updateItem(i, { scene: e.target.value })}
                placeholder="シーン（編集モードで修正） 例：二次面接の調整"
                className="min-h-[60px] leading-6"
              />
              <div className="grid grid-cols-1 gap-2">
                <Textarea
                  value={it.masayukiJP}
                  readOnly={!editMode}
                  onChange={(e) => updateItem(i, { masayukiJP: e.target.value })}
                  placeholder="Masayukiの日本語セリフ（講師モードで編集）"
                  className="min-h-[60px] leading-6"
                />
                <Textarea
                  value={it.masayukiEN}
                  disabled={disabled}
                  onChange={(e) => updateItem(i, { masayukiEN: e.target.value })}
                  placeholder="↑の英訳を入力"
                  className={
                    (it.colorEN === "green" ? "bg-green-100 " :
                     it.colorEN === "orange" ? "bg-orange-100 " :
                     it.colorEN === "red" ? "bg-red-100 " : "") + ""
                  }
                />
              </div>
              {editMode && (
                <>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <span>EN評価：</span>
                    <Button size="sm" className="bg-green-200 hover:bg-green-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "green" })}>正解</Button>
                    <Button size="sm" className="bg-orange-200 hover:bg-orange-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "orange" })}>惜しい！</Button>
                    <Button size="sm" className="bg-red-200 hover:bg-red-300" variant="ghost" onClick={() => updateItem(i, { colorEN: "red" })}>間違い</Button>
                    <Button size="sm" variant="outline" onClick={() => updateItem(i, { colorEN: "" })}>クリア</Button>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => removeItem(i)}>削除</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {editMode && (
          <div className="flex justify-end">
            <Button onClick={addItem}>追加</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionPart4({ data, onChange, disabled }: { data: any; onChange: (d: any) => void; disabled?: boolean }) {
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{data.title}</h3>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-base text-gray-900">{data.instructions}</p>
        <Textarea
          value={data.content}
          disabled={disabled}
          onChange={(e) => onChange({ ...data, content: e.target.value })}
          placeholder="自由英作文"
          className="min-h-[140px]"
        />
      </div>
    </div>
  );
}

function BottomActions({ mode, lesson, onSubmit, onReopen, onReturn, onConfirm }: { mode: "learner" | "trainer"; lesson: any; onSubmit: () => void; onReopen: () => void; onReturn: () => void; onConfirm: () => void }) {
  const status = lesson.meta?.status || "draft";
  return (
    <div className="sticky bottom-2">
      <div className="rounded-2xl border bg-white shadow-lg">
        <div className="p-4 py-3 flex flex-wrap gap-2 items-center justify-between">
          <div className="text-xs text-gray-600">最終更新：{new Date(lesson.meta?.updatedAt || Date.now()).toLocaleString()}</div>
          <div className="flex items-center gap-2">
            {mode === "learner" && status === "draft" && (<Button onClick={onSubmit}>提出</Button>)}
            {mode === "learner" && status === "submitted" && (<Button onClick={onReopen}>編集再開</Button>)}
            {mode === "trainer" && status === "submitted" && (<Button onClick={onReturn}>返却（コメント付き）</Button>)}
            {mode === "learner" && status === "returned" && (<Button onClick={onConfirm}>確認済みにする</Button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
