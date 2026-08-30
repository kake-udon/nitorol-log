import React, { useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  MapPin,
  Activity,
  MessageSquareText,
  Clock,
  Download,
  FileText,
  Trash2,
  Stethoscope,
  StickyNote,
  Check,
} from "lucide-react";

/* ---------------------------------------------------------------
   トークン(色・タイポ)
--------------------------------------------------------------- */
const COLORS = {
  bg: "#F6F4EF",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEBE2",
  ink: "#1E2A28",
  inkMuted: "#6E7773",
  primary: "#173F3F",
  primaryDark: "#0E2A2A",
  accent: "#DD5B3E",
  accentSoft: "#F6DCD2",
  border: "#E3DDCF",
  low: "#4C8C6B",
  mid: "#C98A2B",
  high: "#C43B2E",
  lowBg: "#E4EFE8",
  midBg: "#F5E9D6",
  highBg: "#F5DEDA",
};

const PAIN_LEVELS = [
  { key: "弱い", color: COLORS.low, bg: COLORS.lowBg },
  { key: "普通", color: COLORS.mid, bg: COLORS.midBg },
  { key: "強い", color: COLORS.high, bg: COLORS.highBg },
];

const LOCATION_CHIPS = ["自宅", "職場", "外出先", "移動中"];
const ACTIVITY_CHIPS = ["安静にしていた", "家事をしていた", "歩いていた", "運動していた"];

const STORAGE_KEY = "nitorol-records-v1";
const STORAGE_KEY_VISITS = "nitorol-visits-v1";

/* ---------------------------------------------------------------
   ユーティリティ
--------------------------------------------------------------- */
const pad = (n) => n.toString().padStart(2, "0");

const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDatetimeLocal = (d) => `${toDateStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${y}年${m}月${d}日(${weekdays[dt.getDay()]})`;
}

function formatTime(datetime) {
  const dt = new Date(datetime);
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function formatMonthLabel(viewMonth) {
  return `${viewMonth.getFullYear()}年${viewMonth.getMonth() + 1}月`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function painMeta(pain) {
  return PAIN_LEVELS.find((p) => p.key === pain) || PAIN_LEVELS[1];
}

function escapeCsvField(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCsv(records, monthLabel) {
  const header = ["日付", "時刻", "場所", "していたこと", "痛みの強さ", "その他"];
  const rows = records.map((r) => {
    const dt = new Date(r.datetime);
    const date = `${dt.getFullYear()}/${pad(dt.getMonth() + 1)}/${pad(dt.getDate())}`;
    return [date, formatTime(r.datetime), r.location, r.activity, r.pain, r.notes];
  });
  const lines = [header, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return "\uFEFF" + lines.join("\r\n");
}

function buildTxt(records, monthLabel) {
  let out = `ニトロール服用記録　${monthLabel}\n`;
  out += `記録件数: ${records.length}件\n`;
  out += "========================================\n\n";
  records.forEach((r, i) => {
    const dt = new Date(r.datetime);
    const date = `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
    out += `${i + 1}. ${date} ${formatTime(r.datetime)}\n`;
    out += `   場所　　　: ${r.location || "(未記入)"}\n`;
    out += `   していたこと: ${r.activity || "(未記入)"}\n`;
    out += `   痛みの強さ : ${r.pain}\n`;
    if (r.notes) out += `   その他　　: ${r.notes}\n`;
    out += "\n";
  });
  return out;
}

function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------------------------------------------------------
   共通UIパーツ
--------------------------------------------------------------- */
function Header({ title, onBack }) {
  return (
    <div style={styles.header}>
      {onBack ? (
        <button onClick={onBack} style={styles.backBtn} aria-label="戻る">
          <ChevronLeft size={22} color={COLORS.surface} />
        </button>
      ) : (
        <div style={{ width: 34 }} />
      )}
      <div style={styles.headerTitle}>{title}</div>
      <div style={{ width: 34 }} />
    </div>
  );
}

function PainBadge({ pain, small }) {
  const meta = painMeta(pain);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: small ? "3px 9px" : "5px 12px",
        borderRadius: 999,
        background: meta.bg,
        color: meta.color,
        fontWeight: 700,
        fontSize: small ? 12 : 13,
        letterSpacing: 0.2,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 999, background: meta.color }} />
      {pain}
    </span>
  );
}

/* ---------------------------------------------------------------
   ホーム画面
--------------------------------------------------------------- */
function HomeScreen({ records, onNewRecord, onEditRecord, onGoHistory, onReset }) {
  const sorted = [...records].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  const latest = sorted[0];

  return (
    <div style={styles.screen}>
      <div style={{ padding: "34px 22px 8px", textAlign: "center" }}>
        <div style={styles.eyebrow}>NITOROL LOG</div>
        <div style={styles.appTitle}>ニトロール服用記録</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "18px 0 8px" }}>
        <button onClick={onNewRecord} style={styles.pulseButtonWrap} aria-label="服用を記録する">
          <span style={styles.pulseRing} />
          <span style={styles.pulseRing2} />
          <span style={styles.pulseCore}>
            <Activity size={34} color={COLORS.surface} strokeWidth={2.4} />
            <span style={styles.pulseCoreLabel}>記録する</span>
          </span>
        </button>
        <div style={styles.pulseHint}>服用したら、まずここをタップ</div>
      </div>

      <div style={{ padding: "10px 18px 0" }}>
        <div style={styles.sectionLabel}>直近の記録</div>
        {latest ? (
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={styles.cardDate}>
                  {formatDateLabel(toDateStr(new Date(latest.datetime)))} {formatTime(latest.datetime)}
                </div>
                <div style={styles.cardRow}>
                  <MapPin size={14} color={COLORS.inkMuted} />
                  <span>{latest.location || "場所の記載なし"}</span>
                </div>
                <div style={styles.cardRow}>
                  <MessageSquareText size={14} color={COLORS.inkMuted} />
                  <span>{latest.activity || "記載なし"}</span>
                </div>
              </div>
              <PainBadge pain={latest.pain} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => onEditRecord(latest, "home")} style={styles.smallBtnOutline}>
                <Pencil size={14} /> 修正
              </button>
              <button onClick={onGoHistory} style={styles.smallBtnGhost}>履歴を見る</button>
            </div>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            まだ記録がありません。<br />
            上の丸いボタンから最初の記録を残しましょう。
          </div>
        )}
      </div>

      {records.length > 0 && (
        <button onClick={onGoHistory} style={styles.historyLink}>
          カレンダーで履歴・CSV/TXT出力を見る →
        </button>
      )}

      <div style={{ flex: 1 }} />
      {records.length > 0 && (
        <button onClick={onReset} style={styles.resetLink}>
          すべての記録を削除する
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   記録・編集フォーム画面
--------------------------------------------------------------- */
function FormScreen({ draft, isEditing, onChange, onSave, onCancel, onDelete }) {
  return (
    <div style={styles.screen}>
      <Header title={isEditing ? "記録を修正" : "服用を記録"} onBack={onCancel} />
      <div style={{ padding: "18px 18px 100px", overflowY: "auto" }}>
        <Field icon={<Clock size={16} color={COLORS.inkMuted} />} label="時刻">
          <input
            type="datetime-local"
            value={draft.datetime}
            onChange={(e) => onChange({ ...draft, datetime: e.target.value })}
            style={styles.input}
          />
        </Field>

        <Field icon={<MapPin size={16} color={COLORS.inkMuted} />} label="場所">
          <input
            type="text"
            placeholder="例: 自宅の寝室"
            value={draft.location}
            onChange={(e) => onChange({ ...draft, location: e.target.value })}
            style={styles.input}
          />
          <ChipRow options={LOCATION_CHIPS} value={draft.location} onPick={(v) => onChange({ ...draft, location: v })} />
        </Field>

        <Field icon={<MessageSquareText size={16} color={COLORS.inkMuted} />} label="何をしていたか">
          <input
            type="text"
            placeholder="例: 階段を上っていた"
            value={draft.activity}
            onChange={(e) => onChange({ ...draft, activity: e.target.value })}
            style={styles.input}
          />
          <ChipRow options={ACTIVITY_CHIPS} value={draft.activity} onPick={(v) => onChange({ ...draft, activity: v })} />
        </Field>

        <Field label="痛みの強さ">
          <div style={{ display: "flex", gap: 8 }}>
            {PAIN_LEVELS.map((p) => {
              const active = draft.pain === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => onChange({ ...draft, pain: p.key })}
                  style={{
                    ...styles.painOption,
                    background: active ? p.color : COLORS.surface,
                    color: active ? COLORS.surface : p.color,
                    borderColor: p.color,
                  }}
                >
                  {p.key}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="その他記入">
          <textarea
            placeholder="気になったことがあれば自由にどうぞ"
            value={draft.notes}
            onChange={(e) => onChange({ ...draft, notes: e.target.value })}
            style={{ ...styles.input, minHeight: 84, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        {isEditing && (
          <button onClick={onDelete} style={styles.deleteLink}>
            <Trash2 size={15} /> この記録を削除する
          </button>
        )}
      </div>

      <div style={styles.formFooter}>
        <button onClick={onSave} style={styles.saveBtn}>
          保存する
        </button>
      </div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={styles.fieldLabel}>
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ options, value, onPick }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {options.map((opt) => (
        <button key={opt} onClick={() => onPick(opt)} style={{ ...styles.chip, ...(value === opt ? styles.chipActive : {}) }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   カレンダー(履歴)画面
--------------------------------------------------------------- */
function CalendarScreen({ records, visits, viewMonth, setViewMonth, onSelectDate, onBack }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const byDate = {};
  records.forEach((r) => {
    const ds = toDateStr(new Date(r.datetime));
    if (!byDate[ds]) byDate[ds] = [];
    byDate[ds].push(r);
  });

  const monthRecords = records
    .filter((r) => {
      const dt = new Date(r.datetime);
      return dt.getFullYear() === year && dt.getMonth() === month;
    })
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div style={styles.screen}>
      <Header title="履歴カレンダー" onBack={onBack} />
      <div style={{ padding: "16px 18px 40px", overflowY: "auto" }}>
        <div style={styles.monthNav}>
          <button
            style={styles.monthNavBtn}
            onClick={() => setViewMonth(new Date(year, month - 1, 1))}
            aria-label="前の月"
          >
            <ChevronLeft size={18} />
          </button>
          <div style={styles.monthLabel}>{formatMonthLabel(viewMonth)}</div>
          <button
            style={styles.monthNavBtn}
            onClick={() => setViewMonth(new Date(year, month + 1, 1))}
            aria-label="次の月"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div style={styles.weekRow}>
          {weekdayLabels.map((w, i) => (
            <div key={w} style={{ ...styles.weekCell, color: i === 0 ? COLORS.high : i === 6 ? COLORS.primary : COLORS.inkMuted }}>
              {w}
            </div>
          ))}
        </div>

        <div style={styles.calGrid}>
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const ds = `${year}-${pad(month + 1)}-${pad(d)}`;
            const dayRecords = byDate[ds] || [];
            const isToday = ds === toDateStr(new Date());
            const isVisit = !!visits[ds];
            return (
              <button
                key={ds}
                onClick={() => onSelectDate(ds)}
                style={{
                  ...styles.dayCell,
                  ...(isToday ? styles.dayCellToday : {}),
                }}
              >
                {isVisit && (
                  <span style={styles.visitBadge}>
                    <Stethoscope size={10} color={COLORS.primary} strokeWidth={2.4} />
                  </span>
                )}
                <span style={{ fontWeight: isToday ? 800 : 500 }}>{d}</span>
                <span style={styles.dotRow}>
                  {dayRecords.slice(0, 4).map((r, idx) => (
                    <span key={idx} style={{ ...styles.dot, background: painMeta(r.pain).color }} />
                  ))}
                  {dayRecords.length > 4 && <span style={styles.dotMore}>+{dayRecords.length - 4}</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div style={styles.legendRow}>
          {PAIN_LEVELS.map((p) => (
            <span key={p.key} style={styles.legendItem}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: p.color, display: "inline-block" }} />
              {p.key}
            </span>
          ))}
          <span style={styles.legendItem}>
            <Stethoscope size={11} color={COLORS.primary} strokeWidth={2.4} />
            診察日
          </span>
        </div>
        <div style={styles.calendarHint}>日付をタップすると、記録の確認や診察日の登録ができます</div>

        <div style={styles.exportBox}>
          <div style={styles.exportTitle}>{formatMonthLabel(viewMonth)}の記録を書き出す</div>
          <div style={styles.exportSub}>通院時に見せやすい形式で保存できます({monthRecords.length}件)</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              style={styles.exportBtn}
              disabled={monthRecords.length === 0}
              onClick={() =>
                downloadFile(
                  buildCsv(monthRecords, formatMonthLabel(viewMonth)),
                  `ニトロール服用記録_${year}${pad(month + 1)}.csv`,
                  "text/csv;charset=utf-8;"
                )
              }
            >
              <Download size={15} /> CSVで書き出す
            </button>
            <button
              style={styles.exportBtn}
              disabled={monthRecords.length === 0}
              onClick={() =>
                downloadFile(
                  buildTxt(monthRecords, formatMonthLabel(viewMonth)),
                  `ニトロール服用記録_${year}${pad(month + 1)}.txt`,
                  "text/plain;charset=utf-8;"
                )
              }
            >
              <FileText size={15} /> TXTで書き出す
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   日別詳細画面
--------------------------------------------------------------- */
function DayScreen({ dateStr, records, visitInfo, onToggleVisit, onChangeVisitNotes, onEditRecord, onBackHome, onBackCalendar }) {
  const dayRecords = records
    .filter((r) => toDateStr(new Date(r.datetime)) === dateStr)
    .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const numerals = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
  const isVisit = !!visitInfo;

  return (
    <div style={styles.screen}>
      <Header title={formatDateLabel(dateStr)} onBack={onBackCalendar} />
      <div style={{ padding: "16px 18px 100px", overflowY: "auto" }}>
        <button onClick={onToggleVisit} style={{ ...styles.visitToggle, ...(isVisit ? styles.visitToggleActive : {}) }}>
          <span style={{ ...styles.visitCheckbox, ...(isVisit ? styles.visitCheckboxActive : {}) }}>
            {isVisit && <Check size={13} color={COLORS.surface} strokeWidth={3} />}
          </span>
          <Stethoscope size={17} color={isVisit ? COLORS.primary : COLORS.inkMuted} />
          <span style={styles.visitToggleLabel}>この日、主治医の診察がありました</span>
        </button>
        {isVisit && (
          <textarea
            placeholder="診察メモ(任意) 例: 次回は9月に予約"
            value={visitInfo.notes || ""}
            onChange={(e) => onChangeVisitNotes(e.target.value)}
            style={{ ...styles.input, minHeight: 64, resize: "vertical", fontFamily: "inherit", marginBottom: 20 }}
          />
        )}

        {dayRecords.length === 0 ? (
          <div style={styles.emptyCard}>この日の記録はありません。</div>
        ) : (
          dayRecords.map((r, i) => (
            <button key={r.id} onClick={() => onEditRecord(r, "day")} style={styles.dayRecordCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <span style={styles.numeral}>{numerals[i] || i + 1}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={styles.cardDate}>{formatTime(r.datetime)}</div>
                    <div style={styles.cardRow}>
                      <MapPin size={13} color={COLORS.inkMuted} />
                      <span>{r.location || "場所の記載なし"}</span>
                    </div>
                    <div style={styles.cardRow}>
                      <MessageSquareText size={13} color={COLORS.inkMuted} />
                      <span>{r.activity || "記載なし"}</span>
                    </div>
                    {r.notes && (
                      <div style={styles.notesRow}>
                        <StickyNote size={13} color={COLORS.inkMuted} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{r.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                <PainBadge pain={r.pain} small />
              </div>
              <div style={styles.tapEditHint}>
                <Pencil size={11} /> タップで修正
              </div>
            </button>
          ))
        )}
      </div>
      <div style={styles.formFooter}>
        <button onClick={onBackHome} style={styles.saveBtnGhost}>
          ホームへもどる
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   メインアプリ
--------------------------------------------------------------- */
export default function App() {
  const [storageError, setStorageError] = useState(false);
  const [records, setRecords] = useState(() => loadFromStorage(STORAGE_KEY, []));
  const [visits, setVisits] = useState(() => loadFromStorage(STORAGE_KEY_VISITS, {}));
  const [screen, setScreen] = useState("home");
  const [draft, setDraft] = useState(null);
  const [returnTo, setReturnTo] = useState("home");
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const persist = useCallback((next) => {
    const ok = saveToStorage(STORAGE_KEY, next);
    if (!ok) setStorageError(true);
  }, []);

  const updateRecords = useCallback(
    (next) => {
      setRecords(next);
      persist(next);
    },
    [persist]
  );

  const persistVisits = useCallback((next) => {
    const ok = saveToStorage(STORAGE_KEY_VISITS, next);
    if (!ok) setStorageError(true);
  }, []);

  const updateVisits = useCallback(
    (next) => {
      setVisits(next);
      persistVisits(next);
    },
    [persistVisits]
  );

  const handleToggleVisit = (dateStr) => {
    const next = { ...visits };
    if (next[dateStr]) {
      delete next[dateStr];
    } else {
      next[dateStr] = { notes: "" };
    }
    updateVisits(next);
  };

  const handleChangeVisitNotes = (dateStr, notes) => {
    if (!visits[dateStr]) return;
    updateVisits({ ...visits, [dateStr]: { ...visits[dateStr], notes } });
  };

  const handleNewRecord = () => {
    setDraft({
      id: null,
      datetime: toDatetimeLocal(new Date()),
      location: "",
      activity: "",
      pain: "普通",
      notes: "",
    });
    setReturnTo("home");
    setScreen("form");
  };

  const handleEditRecord = (record, from) => {
    setDraft({ ...record });
    setReturnTo(from);
    setScreen("form");
  };

  const handleSave = () => {
    if (!draft.datetime) return;
    let next;
    if (draft.id) {
      next = records.map((r) => (r.id === draft.id ? { ...draft } : r));
    } else {
      next = [...records, { ...draft, id: makeId() }];
    }
    updateRecords(next);
    setScreen(returnTo === "day" ? "day" : returnTo === "calendar" ? "calendar" : "home");
  };

  const handleDelete = () => {
    if (!draft?.id) return;
    if (!window.confirm("この記録を削除しますか?")) return;
    updateRecords(records.filter((r) => r.id !== draft.id));
    setScreen(returnTo === "day" ? "day" : returnTo === "calendar" ? "calendar" : "home");
  };

  const handleReset = () => {
    if (!window.confirm("すべての記録を削除します。この操作は元に戻せません。よろしいですか?")) return;
    updateRecords([]);
  };

  return (
    <div style={styles.app} className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        button { font-family: 'Manrope', sans-serif; cursor: pointer; }
        input, textarea { font-family: 'Manrope', sans-serif; }
        button:focus-visible, input:focus-visible, textarea:focus-visible {
          outline: 2px solid ${COLORS.accent};
          outline-offset: 2px;
        }
        @keyframes pulseRing {
          0% { transform: scale(0.9); opacity: 0.55; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes pulseRing2 {
          0% { transform: scale(0.9); opacity: 0.35; }
          70% { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
        @media (max-width: 480px) {
          .app-shell { padding: 0 !important; }
          .device-frame {
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div style={styles.deviceFrame} className="device-frame">
        {storageError && (
          <div style={styles.errorBanner}>保存に失敗しました。もう一度お試しください。</div>
        )}

        {screen === "home" && (
          <HomeScreen
            records={records}
            onNewRecord={handleNewRecord}
            onEditRecord={handleEditRecord}
            onGoHistory={() => {
              setViewMonth(new Date());
              setScreen("calendar");
            }}
            onReset={handleReset}
          />
        )}

        {screen === "form" && draft && (
          <FormScreen
            draft={draft}
            isEditing={!!draft.id}
            onChange={setDraft}
            onSave={handleSave}
            onCancel={() => setScreen(returnTo === "day" ? "day" : returnTo === "calendar" ? "calendar" : "home")}
            onDelete={handleDelete}
          />
        )}

        {screen === "calendar" && (
          <CalendarScreen
            records={records}
            visits={visits}
            viewMonth={viewMonth}
            setViewMonth={setViewMonth}
            onSelectDate={(ds) => {
              setSelectedDate(ds);
              setScreen("day");
            }}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "day" && (
          <DayScreen
            dateStr={selectedDate}
            records={records}
            visitInfo={visits[selectedDate]}
            onToggleVisit={() => handleToggleVisit(selectedDate)}
            onChangeVisitNotes={(notes) => handleChangeVisitNotes(selectedDate, notes)}
            onEditRecord={handleEditRecord}
            onBackHome={() => setScreen("home")}
            onBackCalendar={() => setScreen("calendar")}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   スタイル定義
--------------------------------------------------------------- */
const styles = {
  app: {
    display: "flex",
    justifyContent: "center",
    background: COLORS.bg,
    minHeight: "100vh",
    fontFamily: "'Manrope', -apple-system, 'Segoe UI', sans-serif",
    color: COLORS.ink,
    padding: "10px 0",
  },
  deviceFrame: {
    width: "100%",
    maxWidth: 420,
    minHeight: "100vh",
    background: COLORS.bg,
    display: "flex",
    flexDirection: "column",
    borderRadius: 20,
    overflow: "hidden",
    border: `1px solid ${COLORS.border}`,
    boxShadow: "0 8px 30px rgba(23,63,63,0.08)",
  },
  screen: { display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: COLORS.primary,
    padding: "16px 14px",
  },
  headerTitle: { color: COLORS.surface, fontWeight: 700, fontSize: 16, letterSpacing: 0.3 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "none",
    background: "rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontSize: 11, letterSpacing: 3, color: COLORS.accent, fontWeight: 700 },
  appTitle: { fontSize: 22, fontWeight: 800, color: COLORS.primaryDark, marginTop: 4 },
  pulseButtonWrap: {
    position: "relative",
    width: 148,
    height: 148,
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "999px",
    background: COLORS.accent,
    animation: "pulseRing 2.6s ease-out infinite",
  },
  pulseRing2: {
    position: "absolute",
    inset: 0,
    borderRadius: "999px",
    background: COLORS.accent,
    animation: "pulseRing2 2.6s ease-out infinite",
    animationDelay: "0.6s",
  },
  pulseCore: {
    position: "relative",
    width: 118,
    height: 118,
    borderRadius: "999px",
    background: `linear-gradient(155deg, ${COLORS.accent}, #C24327)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 10px 24px rgba(221,91,62,0.38)",
  },
  pulseCoreLabel: { color: COLORS.surface, fontWeight: 800, fontSize: 15, letterSpacing: 0.5 },
  pulseHint: { marginTop: 10, fontSize: 12.5, color: COLORS.inkMuted },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: COLORS.inkMuted, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" },
  card: {
    background: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    border: `1px solid ${COLORS.border}`,
  },
  emptyCard: {
    background: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 20,
    fontSize: 13.5,
    color: COLORS.inkMuted,
    textAlign: "center",
    lineHeight: 1.7,
  },
  cardDate: { fontWeight: 800, fontSize: 15, color: COLORS.primaryDark, marginBottom: 6, fontVariantNumeric: "tabular-nums" },
  cardRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: COLORS.ink, marginTop: 3 },
  notesRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    fontSize: 12.5,
    color: COLORS.inkMuted,
    marginTop: 6,
    padding: "8px 10px",
    background: COLORS.surfaceAlt,
    borderRadius: 9,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  smallBtnOutline: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 14px",
    borderRadius: 10,
    border: `1.5px solid ${COLORS.primary}`,
    background: "transparent",
    color: COLORS.primary,
    fontWeight: 700,
    fontSize: 13,
  },
  smallBtnGhost: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "none",
    background: "transparent",
    color: COLORS.inkMuted,
    fontWeight: 600,
    fontSize: 13,
    textDecoration: "underline",
  },
  historyLink: {
    margin: "18px 18px 0",
    padding: "13px 16px",
    borderRadius: 14,
    border: `1px dashed ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.primary,
    fontWeight: 700,
    fontSize: 13.5,
    textAlign: "center",
  },
  resetLink: {
    margin: "10px 18px 22px",
    padding: "10px",
    border: "none",
    background: "transparent",
    color: COLORS.inkMuted,
    fontSize: 12,
    textDecoration: "underline",
  },
  fieldLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 700,
    color: COLORS.inkMuted,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    width: "100%",
    padding: "12px 13px",
    borderRadius: 12,
    border: `1.5px solid ${COLORS.border}`,
    fontSize: 15,
    background: COLORS.surface,
    color: COLORS.ink,
  },
  chip: {
    padding: "7px 13px",
    borderRadius: 999,
    border: `1.3px solid ${COLORS.border}`,
    background: COLORS.surface,
    color: COLORS.inkMuted,
    fontSize: 12.5,
    fontWeight: 600,
  },
  chipActive: {
    background: COLORS.primary,
    borderColor: COLORS.primary,
    color: COLORS.surface,
  },
  painOption: {
    flex: 1,
    padding: "12px 0",
    borderRadius: 12,
    border: "2px solid",
    fontWeight: 800,
    fontSize: 14.5,
  },
  deleteLink: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    margin: "6px auto 0",
    padding: "10px 14px",
    border: "none",
    background: "transparent",
    color: COLORS.high,
    fontWeight: 700,
    fontSize: 13,
  },
  formFooter: {
    padding: 16,
    background: COLORS.bg,
    borderTop: `1px solid ${COLORS.border}`,
  },
  saveBtn: {
    width: "100%",
    padding: "15px 0",
    borderRadius: 14,
    border: "none",
    background: COLORS.primary,
    color: COLORS.surface,
    fontWeight: 800,
    fontSize: 15.5,
    letterSpacing: 0.3,
  },
  saveBtnGhost: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    border: `1.5px solid ${COLORS.primary}`,
    background: "transparent",
    color: COLORS.primary,
    fontWeight: 700,
    fontSize: 14.5,
  },
  monthNav: { display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 14 },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: COLORS.primary,
  },
  monthLabel: { fontWeight: 800, fontSize: 17, color: COLORS.primaryDark, minWidth: 110, textAlign: "center" },
  weekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 },
  weekCell: { textAlign: "center", fontSize: 11.5, fontWeight: 700, padding: "4px 0" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  dayCell: {
    position: "relative",
    aspectRatio: "1 / 1",
    border: "none",
    background: COLORS.surface,
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontSize: 13,
    color: COLORS.ink,
  },
  dayCellToday: { border: `1.5px solid ${COLORS.accent}` },
  visitBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 999,
    background: COLORS.accentSoft,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarHint: { textAlign: "center", fontSize: 11.5, color: COLORS.inkMuted, marginTop: 10 },
  dotRow: { display: "flex", gap: 2, alignItems: "center", minHeight: 6 },
  dot: { width: 5, height: 5, borderRadius: 999, display: "inline-block" },
  dotMore: { fontSize: 8.5, color: COLORS.inkMuted, fontWeight: 700, marginLeft: 1 },
  legendRow: { display: "flex", gap: 16, justifyContent: "center", marginTop: 14 },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.inkMuted, fontWeight: 600 },
  exportBox: {
    marginTop: 26,
    background: COLORS.surfaceAlt,
    borderRadius: 16,
    padding: 16,
  },
  exportTitle: { fontWeight: 800, fontSize: 14.5, color: COLORS.primaryDark },
  exportSub: { fontSize: 12, color: COLORS.inkMuted, marginTop: 3 },
  exportBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "11px 0",
    borderRadius: 11,
    border: `1.5px solid ${COLORS.primary}`,
    background: COLORS.surface,
    color: COLORS.primary,
    fontWeight: 700,
    fontSize: 12.5,
  },
  dayRecordCard: {
    width: "100%",
    textAlign: "left",
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  numeral: { fontSize: 17, fontWeight: 800, color: COLORS.accent, lineHeight: "24px" },
  visitToggle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "13px 14px",
    borderRadius: 14,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.surface,
    marginBottom: 14,
    textAlign: "left",
  },
  visitToggleActive: {
    border: `1.5px solid ${COLORS.primary}`,
    background: COLORS.surfaceAlt,
  },
  visitCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    border: `1.5px solid ${COLORS.border}`,
    background: COLORS.surface,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  visitCheckboxActive: { background: COLORS.primary, borderColor: COLORS.primary },
  visitToggleLabel: { fontSize: 13.5, fontWeight: 700, color: COLORS.ink },
  tapEditHint: { display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: COLORS.inkMuted, marginTop: 8 },
  errorBanner: {
    background: COLORS.highBg,
    color: COLORS.high,
    fontSize: 12,
    fontWeight: 700,
    textAlign: "center",
    padding: "8px 10px",
  },
};
