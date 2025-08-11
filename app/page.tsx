"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

/**
 * Minimal rebuild for Netlify (no external icon libs to reduce build risk)
 */

const APP_KEY = "annetmii-English-Dictionary-v1";
const PIN_KEY = `${APP_KEY}::trainer_pin`;

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
  try {
    const raw = localStorage.getItem(APP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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

function newEmptyLesson(dateStr: string, themeLabel: string) {
  return {
    meta: {
      appName: "annetmii English Dictionary",
      date: dateStr,
      theme: themeLabel,
      title: `${dateStr}｜${themeLabel}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft" as "draft" | "submitted" | "returned" | "confirmed",
      customTheme: "",
    },
    parts: {
      part1: {
        title: "Part 1｜語彙チェック（英単語→日本語訳, 8問）",
        instructions: "英単語の日本語訳を入力しましょう",
        items: Array.from({ length: 8 }).map((_, i) => ({ id: `p1-${i + 1}`, term: "", answerJP: "" })),
      },
      part2: {
        title: "Part 2｜構文トレーニング（穴埋め + 日本語訳, 5問）",
        instructions: "語彙を使って英文を完成させ、日本語訳も書きましょう",
        items: Array.from({ length: 5 }).map((_, i) => ({ id: `p2-${i + 1}`, prompt: "", userEN: "", userJP: "" })),
      },
      part3: {
        title: "Part 3｜会話ロールプレイ（4問）",
        instructions: "日本語のセリフを英訳しましょう",
        items: Array.from({ length: 4 }).map((_, i) => ({ id: `p3-${i + 1}`, scene: "", masayukiJP: "", masayukiEN: "" })),
      },
      part4: {
        title: "Part 4｜英作文",
        instructions: "今日のテーマに沿って自由に英作文しましょう",
        content: "",
      },
    },
    feedback: { overall: "", part1: "", part2: "", part3: "", part4: "" },
  };
}

function hrMondayTemplate(dateStr: string) {
  const lesson = newEmptyLesson(dateStr, weekdayTheme[1].label);
  const p1Terms = [
    "talk to friends / network","look in the classifieds","check Internet job sites","write a resume",
    "write a cover letter","send in your resume and cover letter","set up an interview","get hired",
  ];
  lesson.parts.part1.items = p1Terms.map((t, i) => ({ id: `p1-${i + 1}`, term: t, answerJP: "" }));
  const p2Prompts = [
    "I decided to ________ for new opportunities.","She will ________ her resume tomorrow.",
    "He ________ an interview with the HR manager.","They posted the job in the newspaper, so I will ________.",
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

const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

export default function Page() {
  const [dateStr, setDateStr] = useState<string>(() => ymd(new Date()));
  const weekday = useMemo(() => new Date(dateStr + "T00:00:00").getDay(), [dateStr]);
  const theme = weekdayTheme[weekday];

  const [mode, setMode] = useState<"learner" | "trainer">("learner");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [store, setStore] = useState<Record<string, any>>(() => loadAll());

  // PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinMode, setPinMode] = useState<"set" | "verify" | "change">("verify");
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinOld, setPinOld] = useState("");
  const [pinError, setPinError] = useState("");

  const [showCalendar, setShowCalendar] = useState<boolean>(false);

  const currentLesson: any = useMemo(() => store[dateStr] ?? null, [store, dateStr]);

  function updateStore(next: Record<string, any>) {
    setStore(next);
    saveAll(next);
  }

  function createOrLoadTemplate() {
    const next = clone(store);
    if (next[dateStr]) { alert("この日のレッスンは既に存在します。編集モードで修正してください。"); return; }
    const newLesson = weekday === 1 ? hrMondayTemplate(dateStr) : newEmptyLesson(dateStr, theme.label);
    next[dateStr] = newLesson;
    updateStore(next);
  }

  function saveLesson(partial: any) {
    const next = clone(store);
    next[dateStr] = {
      ...(next[dateStr] ?? newEmptyLesson(dateStr, theme.label)),
      ...partial,
      meta: {
        ...((next[dateStr] ?? {}).meta || {}),
        ...(partial.meta || {}),
        date: dateStr,
        theme: theme.label,
        updatedAt: new Date().toISOString(),
      },
    };
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

  function exportJSON() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const month = (dateStr || new Date().toISOString().slice(0,10)).slice(0,7).replace("-", ""); // YYYYMM
a.download = `${month}_annetmii_english_dictionary.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        updateStore(parsed);
        alert("インポートが完了しました。");
      } catch (e) {
        alert("JSONの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  }

  const disabledForLearner = mode === "learner" && currentLesson?.meta?.status === "submitted";

  function hasLesson(date: Date) { return Boolean(store[ymd(date)]); }

  return (
    <div className="min-h-screen w-full bg-white text-gray-900 p-3 sm:p-4 md:p-6 max-w-3xl mx-auto">
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
                  setPinInput("");
                  setPinConfirm("");
                  setPinOld("");
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
          {mode === "trainer" && (
  <Button size="sm" onClick={createOrLoadTemplate}>
    この日のレッスン作成
  </Button>
)}
          <Button size="sm" variant="outline" onClick={() => window.print()}>印刷 / PDF保存</Button>
          <Button size="sm" variant="outline" onClick={exportJSON}>データ書き出し</Button>
          <input id="data-import" type="file" accept="application/json" className="hidden" onChange={importJSON} />
          <Button size="sm" variant="outline" onClick={() => document.getElementById('data-import')?.click()}>
              データ読み込み
              {mode === "trainer" && (
  <div className="flex flex-wrap items-center gap-2 pb-2 mt-2">
    <Button
      size="sm"
      variant={editMode ? "default" : "outline"}
      onClick={() => setEditMode(!editMode)}
    >
      {editMode ? "編集モード：ON" : "編集モード：OFF"}
    </Button>

    <Button
      size="sm"
      variant="outline"
      onClick={() => { setPinMode("change"); setPinModalOpen(true); }}
    >
      PIN変更
    </Button>

    {currentLesson && (
      <Button size="sm" variant="outline" onClick={removeLesson}>
        このレッスンを削除
      </Button>
    )}
  </div>
)}
            </span>
          </label>
        </div>
      </header>

      <Dialog open={pinModalOpen} onOpenChange={(o) => { setPinModalOpen(o); if (!o) setPinError(""); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {pinMode === "set" && "講師PINの新規設定"}
              {pinMode === "verify" && "講師PINの入力"}
              {pinMode === "change" && "講師PINの変更"}
            </DialogTitle>
            <DialogDescription>
              {pinMode === "set" && "講師モードに切り替えるためのPINを設定します。忘れないようご注意ください。"}
              {pinMode === "verify" && "講師モードに切り替えるために、PINを入力してください。"}
              {pinMode === "change" && "現在のPINを確認してから、新しいPINを設定します。"}
            </DialogDescription>
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
                  setMode("trainer");
                  setEditMode(true);
                  setPinModalOpen(false);
                  return;
                }

                if (pinMode === "set") {
                  if (!pinInput) return setPinError("新しいPINを入力してください。");
                  if (pinInput !== pinConfirm) return setPinError("確認用PINが一致しません。");
                  setPin(pinInput);
                  setMode("trainer");
                  setEditMode(true);
                  setPinModalOpen(false);
                  return;
                }

                if (pinMode === "change") {
                  if (current && pinOld !== current) return setPinError("現在のPINが一致しません。");
                  if (!pinInput) return setPinError("新しいPINを入力してください。");
                  if (pinInput !== pinConfirm) return setPinError("確認用PINが一致しません。");
                  setPin(pinInput);
                  setPinModalOpen(false);
                  return;
                }
              }}
            >
              決定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!currentLesson ? (
        <EmptyState themeLabel={theme.label} />
      ) : (
        <div className="space-y-4 text-[15px] sm:text-base">
          <LessonMetaBar currentLesson={currentLesson} onStatusChange={setStatus} mode={mode} />

          <DayThemeEditor
  value={currentLesson.meta?.customTheme || ""}
  editable={mode === "trainer" && editMode}
  weekdayLabel={theme.label}
  onChange={(v) =>
    saveLesson({
      meta: { ...(currentLesson.meta || {}), customTheme: v },
    })
  }
/>
          <SectionPart1
            data={currentLesson.parts.part1}
            disabled={disabledForLearner}
            onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part1: next } })}
            editMode={mode === "trainer" && editMode}
          />

          <SectionPart2
            data={currentLesson.parts.part2}
            disabled={disabledForLearner}
            onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part2: next } })}
            editMode={mode === "trainer" && editMode}
          />

          <SectionPart3
            data={currentLesson.parts.part3}
            disabled={disabledForLearner}
            onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part3: next } })}
            editMode={mode === "trainer" && editMode}
          />

          <SectionPart4
            data={currentLesson.parts.part4}
            disabled={disabledForLearner}
            onChange={(next) => saveLesson({ parts: { ...currentLesson.parts, part4: next } })}
          />

          <TrainerFeedback
            data={currentLesson.feedback}
            mode={mode}
            onChange={(fb) => saveLesson({ feedback: fb })}
          />

          <BottomActions
            mode={mode}
            lesson={currentLesson}
            onSubmit={() => setStatus("submitted")}
            onReopen={() => setStatus("draft")}
            onReturn={() => setStatus("returned")}
            onConfirm={() => setStatus("confirmed")}
          />
        </div>
      )}

      <footer className="text-center text-xs text-gray-500 mt-10 pb-6">
        © {new Date().getFullYear()} annetmii - 学習を習慣に。
      </footer>
    </div>
  );
}

function EmptyState({ themeLabel }: { themeLabel: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-4 bg-white text-[15px] sm:text-base">
      <h3 className="text-lg font-semibold mb-2">アプリへようこそ — "annetmii English Dictionary"</h3>
      <div className="text-sm space-y-1">
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

function LessonMetaBar({ currentLesson, onStatusChange, mode }: { currentLesson: any; onStatusChange: any; mode: "learner" | "trainer" }) {
  const s = currentLesson.meta?.status || "draft";
  const statusLabel: Record<string, string> = {
    draft: "下書き",
    submitted: "提出済み（ロック中）",
    returned: "返却済み（講師コメントあり）",
    confirmed: "確認済み（学習完了）",
  };
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="text-sm">
          <div className="text-lg font-semibold">{currentLesson.meta?.title}</div>
          <div className="text-xs text-gray-500">ステータス：{statusLabel[s]}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">学習の流れ：</span>
          <span>提出 → 返却 → 確認</span>
        </div>
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
        <p className="text-sm text-gray-900">{data.instructions}</p>
        <div className="space-y-2">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <Input value={it.term} disabled={!editMode} onChange={(e) => updateItem(i, { term: e.target.value })} placeholder="英単語 / フレーズ（編集モードで修正）" />
              <Input value={it.answerJP} disabled={disabled} onChange={(e) => updateItem(i, { answerJP: e.target.value })} placeholder="日本語訳を入力" />
              {editMode && (
                <div className="sm:col-span-2 flex justify-end">
                  <Button onClick={() => removeItem(i)}>削除</Button>
                </div>
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
        <p className="text-sm text-gray-900">{data.instructions}</p>
        <div className="space-y-3">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="space-y-2 border rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Textarea value={it.prompt} disabled={!editMode} onChange={(e) => updateItem(i, { prompt: e.target.value })} placeholder="英文プロンプト（編集モードで修正）"className="min-h-[60px] leading-6" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input value={it.userEN} disabled={disabled} onChange={(e) => updateItem(i, { userEN: e.target.value })} placeholder="英語の解答（穴埋め文）" />
                <Input value={it.userJP} disabled={disabled} onChange={(e) => updateItem(i, { userJP: e.target.value })} placeholder="日本語訳" />
              </div>
              {editMode && (
                <div className="flex justify-end">
                  <Button onClick={() => removeItem(i)}>削除</Button>
                </div>
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
        <p className="text-sm text-gray-900">{data.instructions}</p>
        <div className="space-y-3">
          {data.items.map((it: any, i: number) => (
            <div key={it.id} className="space-y-2 border rounded-xl p-3">
              <Textarea value={it.scene} disabled={!editMode} onChange={(e) => updateItem(i, { scene: e.target.value })} placeholder="シーン（編集モードで修正） 例：二次面接の調整"className="min-h-[60px] leading-6" />
              <div className="grid grid-cols-1 gap-2">
                <Textarea value={it.masayukiJP} disabled={!editMode} onChange={(e) => updateItem(i, { masayukiJP: e.target.value })} placeholder="Masayukiの日本語セリフ（編集モードで修正）" />
                <Textarea value={it.masayukiEN} disabled={disabled} onChange={(e) => updateItem(i, { masayukiEN: e.target.value })} placeholder="↑の英訳を入力" />
              </div>
              {editMode && (
                <div className="flex justify-end">
                  <Button onClick={() => removeItem(i)}>削除</Button>
                </div>
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
        <p className="text-sm text-gray-900">{data.instructions}</p>
        <Textarea value={data.content} disabled={disabled} onChange={(e) => onChange({ ...data, content: e.target.value })} placeholder="自由英作文（テーマに沿って）" className="min-h-[140px]" />
      </div>
    </div>
  );
}

function TrainerFeedback({ data, onChange, mode }: { data: any; onChange: (d: any) => void; mode: "learner" | "trainer" }) {
  const canEdit = mode === "trainer";
  return (
    <div className="rounded-2xl border bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">Trainer Feedback（講師コメント）</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Textarea value={data.part1} onChange={(e) => onChange({ ...data, part1: e.target.value })} disabled={!canEdit} placeholder="Part 1へのコメント" />
          <Textarea value={data.part2} onChange={(e) => onChange({ ...data, part2: e.target.value })} disabled={!canEdit} placeholder="Part 2へのコメント" />
          <Textarea value={data.part3} onChange={(e) => onChange({ ...data, part3: e.target.value })} disabled={!canEdit} placeholder="Part 3へのコメント" />
          <Textarea value={data.part4} onChange={(e) => onChange({ ...data, part4: e.target.value })} disabled={!canEdit} placeholder="Part 4へのコメント" />
        </div>
        <Textarea value={data.overall} onChange={(e) => onChange({ ...data, overall: e.target.value })} disabled={!canEdit} placeholder="総評（全体へのフィードバック）" className="min-h-[100px]" />
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
          disabled={!editable}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例）面接日の再調整メール／候補者への日程提案フレーズ／謝罪＋代替案"
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
}

