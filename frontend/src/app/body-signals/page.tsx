"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, BodySignal, BodySignalWithContext } from "@/lib/api";
import { toFive } from "@/lib/utils";
import { DayKindBadge } from "@/components/ui/DayKindBadge";
import { ScaleBar } from "@/components/ui/ScaleBar";
import {
  analyzeWellbeingHistory,
  bodySignalChangedProtocol,
  formatHistoryReportPlainText,
} from "@/core/tracking/wellbeing-history-analysis";
import { mergeWellbeingHistoryWithLocal, persistWellbeingDay } from "@/lib/wellbeing-local-store";

const todayStr = () => new Date().toISOString().slice(0, 10);

function SliderField({ label, value, onChange, max = 5 }: {
  label: string; value: number | null; onChange: (v: number) => void; max?: number;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <label className="w-52 text-sm text-ink-secondary shrink-0">{label}</label>
      <input
        type="range"
        min={0}
        max={max}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent"
      />
      <span className="w-7 text-center text-sm font-medium tabular-nums text-ink">
        {value ?? "–"}
      </span>
    </div>
  );
}

function signalSummary(sig: BodySignal): string[] {
  const parts: string[] = [];
  if ((sig.ankles_evening ?? 0) >= 3) parts.push(`Лодыжки ${sig.ankles_evening}/5 → обед лёгкий, без гарнира`);
  if ((sig.eye_area_morning ?? 0) >= 3) parts.push(`Глаза ${sig.eye_area_morning}/5 → гарнир запрещён`);
  if ((sig.head_overload ?? 0) >= 4) parts.push(`Голова ${sig.head_overload}/5 → дыхание на успокоение`);
  if ((sig.sleep_quality ?? 5) <= 2) parts.push(`Сон ${sig.sleep_quality}/5 → без силовых`);
  if ((sig.energy_level ?? 5) <= 2) parts.push(`Энергия ${sig.energy_level}/5 → гарнир допустим`);
  if ((sig.tissue_density ?? 0) >= 3) parts.push(`Тяжесть в теле ${sig.tissue_density}/5`);
  if ((sig.salty_craving ?? 0) >= 3) parts.push(`Тянет на солёное ${sig.salty_craving}/5`);
  if ((sig.sweet_craving ?? 0) >= 3) parts.push(`Тянет на сладкое ${sig.sweet_craving}/5`);
  return parts;
}

function BodySignalsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dateParam = searchParams.get("date");
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"input" | "history">(() =>
    tabParam === "history" ? "history" : "input"
  );
  const [date, setDate] = useState(dateParam || todayStr());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ankles, setAnkles] = useState<number | null>(null);
  const [eyeArea, setEyeArea] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [tissue, setTissue] = useState<number | null>(null);
  const [headOverload, setHeadOverload] = useState<number | null>(null);
  const [sleep, setSleep] = useState<number | null>(null);
  const [sweetCraving, setSweetCraving] = useState<number | null>(null);
  const [saltyCraving, setSaltyCraving] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [lunchType, setLunchType] = useState("");
  const [hadRice, setHadRice] = useState(false);
  const [heaviness, setHeaviness] = useState<number | null>(null);
  const [rebound, setRebound] = useState(false);
  const [nutrNotes, setNutrNotes] = useState("");
  const [history, setHistory] = useState<BodySignalWithContext[]>([]);
  const [histErr, setHistErr] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRangeDays, setHistoryRangeDays] = useState<7 | 30 | 90>(30);

  const historyReport = useMemo(() => analyzeWellbeingHistory(history), [history]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "history") setTab("history");
    else if (t === "input") setTab("input");
  }, [searchParams]);

  useEffect(() => {
    if (dateParam) setDate(dateParam);
  }, [dateParam]);

  useEffect(() => {
    api.getBodySignal(date).then((res) => {
      if (!("detail" in res)) {
        const s = res as BodySignal;
        if (s.ankles_evening != null) setAnkles(s.ankles_evening);
        if (s.eye_area_morning != null) setEyeArea(s.eye_area_morning);
        if (s.weight_kg != null) setWeight(s.weight_kg);
        if (s.tissue_density != null) setTissue(s.tissue_density);
        if (s.head_overload != null) setHeadOverload(s.head_overload);
        if (s.sleep_quality != null) setSleep(s.sleep_quality);
        if (s.sweet_craving != null) setSweetCraving(s.sweet_craving);
        if (s.salty_craving != null) setSaltyCraving(s.salty_craving);
        if (s.energy_level != null) setEnergy(s.energy_level);
        if (s.notes) setNotes(s.notes);
      }
    }).catch(() => {});
  }, [date]);

  const currentSignal: BodySignal = {
    day_date: date, ankles_evening: ankles, eye_area_morning: eyeArea,
    weight_kg: weight, tissue_density: tissue, head_overload: headOverload,
    sleep_quality: sleep, sweet_craving: sweetCraving, salty_craving: saltyCraving,
    energy_level: energy, notes: notes || null,
  };
  const overrides = signalSummary(currentSignal);

  async function saveAll() {
    setSaving(true); setSaved(false);
    try {
      await api.postBodySignal(currentSignal);
      const nutr = {
        day_date: date,
        lunch_type: lunchType || null,
        had_rice: hadRice,
        heaviness,
        rebound_after_ekadashi_pradosh: rebound,
        notes: nutrNotes || null,
      };
      await api.postNutritionLog(nutr);
      persistWellbeingDay(currentSignal, nutr);
      setSaved(true);
    } finally { setSaving(false); }
  }

  function saveAndViewProtocol() {
    saveAll().then(() => router.push(`/today?on=${date}`));
  }

  useEffect(() => {
    if (tab !== "history") return;
    setHistErr("");
    setHistoryLoading(true);
    const to = todayStr();
    const from = new Date(Date.now() - historyRangeDays * 86400000).toISOString().slice(0, 10);
    let cancelled = false;
    api
      .getHistory(from, to)
      .then((rows) => {
        if (cancelled) return;
        const apiRows = Array.isArray(rows) ? rows : [];
        const merged = mergeWellbeingHistoryWithLocal(apiRows);
        const filtered = merged.filter((r) => r.signal.day_date >= from && r.signal.day_date <= to);
        setHistory(filtered);
      })
      .catch((e) => {
        if (!cancelled) setHistErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, historyRangeDays]);

  function downloadHistoryJson() {
    const to = todayStr();
    const from = new Date(Date.now() - historyRangeDays * 86400000).toISOString().slice(0, 10);
    const payload = {
      exported_at: new Date().toISOString(),
      from_date: from,
      to_date: to,
      range_days: historyRangeDays,
      rows: history,
      analysis: historyReport,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `samochuvstvie-${from}_${to}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadReportTxt() {
    const text = formatHistoryReportPlainText(historyReport);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `otchet-samochuvstvie-${historyReport.stats.fromDate || "export"}-${historyReport.stats.toDate || ""}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printHistory() {
    window.print();
  }

  function setTabAndUrl(next: "input" | "history") {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`/body-signals?${params.toString()}`, { scroll: false });
  }

  function setDateAndUrl(nextDate: string) {
    setDate(nextDate);
    setSaved(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", nextDate);
    if (!params.has("tab")) params.set("tab", tab);
    router.replace(`/body-signals?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-strong print:hidden">
        Самочувствие
      </h1>

      {/* Tab switcher */}
      <div className="no-print flex items-center gap-1 p-1 rounded-xl w-fit bg-gold-soft/60 ring-1 ring-gold/25">
        {(["input", "history"] as const).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTabAndUrl(t)}
              type="button"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-ink-secondary hover:bg-surface-card hover:text-ink"
              }`}
            >
              {t === "input" ? "Записать" : "История и отчёт"}
            </button>
          );
        })}
      </div>

      {tab === "input" && (
        <div key="tab-input" className="space-y-6">
          <div className="premium-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-ink-secondary">Дата:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDateAndUrl(e.target.value)}
                className="rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
              />
            </div>
            <h2 className="section-title">Как себя чувствую</h2>
            <p className="text-xs text-ink-tertiary mb-4">0 — нет проблем, 5 — максимум</p>
            <div className="space-y-1">
              <SliderField label="Отёк лодыжек к вечеру" value={ankles} onChange={(v) => { setAnkles(v); setSaved(false); }} />
              <SliderField label="Отёк под глазами утром" value={eyeArea} onChange={(v) => { setEyeArea(v); setSaved(false); }} />
              <div className="flex items-center gap-3 py-1">
                <label className="w-52 text-sm text-ink-secondary shrink-0">Вес, кг</label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="300"
                  value={weight ?? ""}
                  onChange={(e) => { setWeight(e.target.value ? Number(e.target.value) : null); setSaved(false); }}
                  className="w-24 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
                />
              </div>
              <SliderField label="Тяжесть в теле, набухание" value={tissue} onChange={(v) => { setTissue(v); setSaved(false); }} />
              <SliderField label="Перегруз головы, шум мыслей" value={headOverload} onChange={(v) => { setHeadOverload(v); setSaved(false); }} />
              <SliderField label="Как спала (5 = отлично)" value={sleep} onChange={(v) => { setSleep(v); setSaved(false); }} />
              <SliderField label="Тянет на сладкое" value={sweetCraving} onChange={(v) => { setSweetCraving(v); setSaved(false); }} />
              <SliderField label="Тянет на солёное" value={saltyCraving} onChange={(v) => { setSaltyCraving(v); setSaved(false); }} />
              <SliderField label="Энергия (5 = много сил)" value={energy} onChange={(v) => { setEnergy(v); setSaved(false); }} />
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
                placeholder="Заметки"
                className="w-full mt-2 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
                rows={2}
              />
            </div>
          </div>

          {overrides.length > 0 && (
            <div className="rounded-2xl border border-accent/20 bg-accent-light px-5 py-4">
              <p className="text-sm font-medium text-accent-dark mb-2">
                При сохранении протокол изменится:
              </p>
              <div className="flex flex-wrap gap-2">
                {overrides.map((o, i) => (
                  <span key={i} className="badge bg-accent/10 text-accent-dark">{o}</span>
                ))}
              </div>
              <p className="text-xs text-accent-muted mt-2.5">
                Будут скорректированы: обед, гарнир, дыхание, нагрузка, мудра, ароматы.
              </p>
            </div>
          )}

          <div className="premium-card rounded-2xl p-6">
            <h2 className="section-title">Что ела</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <label className="w-52 text-ink-secondary shrink-0">Обед: что именно</label>
                <input
                  value={lunchType}
                  onChange={(e) => setLunchType(e.target.value)}
                  placeholder="курица + кабачок…"
                  className="flex-1 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-52 text-ink-secondary shrink-0">Был гарнир (крупа)?</label>
                <input
                  type="checkbox"
                  checked={hadRice}
                  onChange={(e) => setHadRice(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/25"
                />
              </div>
              <SliderField label="Тяжесть после еды" value={heaviness} onChange={setHeaviness} />
              <div className="flex items-center gap-3">
                <label className="w-52 text-ink-secondary shrink-0">Переела после экадаши/прадош?</label>
                <input
                  type="checkbox"
                  checked={rebound}
                  onChange={(e) => setRebound(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/25"
                />
              </div>
              <textarea
                value={nutrNotes}
                onChange={(e) => setNutrNotes(e.target.value)}
                placeholder="Примечание"
                className="w-full mt-1 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
                rows={2}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveAll}
              disabled={saving}
              className="flex-1 rounded-xl bg-accent py-3 text-sm text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
            <button
              onClick={saveAndViewProtocol}
              disabled={saving}
              className="flex-1 rounded-xl border border-accent text-accent bg-accent-light py-3 text-sm font-semibold hover:bg-accent/10 transition-colors disabled:opacity-50"
            >
              Сохранить и посмотреть протокол
            </button>
          </div>

          {saved && (
            <p className="text-sm text-accent-info text-center">
              Сохранено. Протокол дня пересчитан.
            </p>
          )}
        </div>
      )}

      {tab === "history" && (
        <div key="tab-history" className="space-y-4">
          <div className="no-print flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-secondary">Период:</span>
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setHistoryRangeDays(d)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    historyRangeDays === d
                      ? "bg-accent text-white"
                      : "bg-gold-soft/80 text-ink-secondary ring-1 ring-gold/30 hover:bg-gold-soft"
                  }`}
                >
                  {d} дн.
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printHistory}
                className="rounded-xl border border-border bg-surface-card px-4 py-2 text-sm font-medium text-ink hover:bg-surface-card-soft"
              >
                Печать
              </button>
              <button
                type="button"
                onClick={downloadHistoryJson}
                disabled={historyLoading}
                className="rounded-xl border border-accent/40 bg-accent-light px-4 py-2 text-sm font-medium text-accent-dark hover:bg-accent/10 disabled:opacity-40"
              >
                Сохранить JSON
              </button>
              <button
                type="button"
                onClick={downloadReportTxt}
                disabled={historyLoading}
                className="rounded-xl border border-sage/40 bg-sage-soft/80 px-4 py-2 text-sm font-medium text-sage hover:bg-sage-soft disabled:opacity-40"
              >
                Отчёт TXT
              </button>
            </div>
          </div>

          <p className="no-print text-xs text-ink-tertiary">
            Записи дублируются в браузере (localStorage), чтобы история не пропала при перезапуске сервера. JSON — полный выгруз с анализом; TXT — текст отчёта для врача или дневника.
          </p>

          <div id="wellbeing-print-area" className="space-y-6 print:space-y-4">
            <div className="hidden print:block print:mb-4">
              <p className="font-display text-xl font-semibold text-ink-strong">Самочувствие — отчёт</p>
              <p className="text-sm text-ink-secondary">
                Сформировано: {new Date().toLocaleString("ru-RU")} · период: последние {historyRangeDays} дн.
              </p>
            </div>

            <h2 className="text-lg font-semibold text-ink print:text-base">
              Самочувствие за последние {historyRangeDays} дней
            </h2>

            {histErr && <p className="text-semantic-danger text-sm">{histErr}</p>}
            {historyLoading && (
              <p className="text-ink-secondary text-sm py-6">Загрузка истории…</p>
            )}

            {!historyLoading && history.length > 0 && (
              <div className="premium-card rounded-2xl p-5 space-y-4 print:border print:shadow-none print:p-4">
                <h3 className="section-title print:text-xs">Анализ и рекомендации</h3>
                <div className="space-y-3 text-sm text-ink leading-relaxed">
                  <div>
                    <p className="font-medium text-ink-strong mb-1.5">Выводы по истории</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {historyReport.insights.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-ink-strong mb-1.5">Вес и контур тела</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {historyReport.weightRecommendations.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-ink-strong mb-1.5">Эмоциональный фон</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {historyReport.emotionRecommendations.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {!historyLoading && history.length === 0 && !histErr && (
              <p className="text-ink-tertiary text-sm py-6 text-center">
                Записей пока нет. Заполните самочувствие на вкладке «Записать».
              </p>
            )}

            {!historyLoading &&
            history.map((h, idx) => {
            const ov = signalSummary(h.signal);
            const changed = bodySignalChangedProtocol(h.signal);
            return (
              <div key={h.signal?.day_date ?? idx} className="premium-card rounded-2xl p-5 space-y-3 print:break-inside-avoid print:border print:shadow-none">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">{h.signal.day_date}</span>
                  <div className="flex gap-2 items-center">
                    {h.day_kind && <DayKindBadge kind={h.day_kind} />}
                    {changed && (
                      <span className="badge bg-accent-light text-accent">повлияло на протокол</span>
                    )}
                  </div>
                </div>
                {h.tithi_number && (
                  <p className="text-xs text-ink-tertiary">
                    Титхи {h.tithi_number} · {h.nakshatra_ru}
                  </p>
                )}
                {h.water_retention_risk != null && (
                  <div className="space-y-1">
                    <ScaleBar label="Удержание в тканях" value={toFive(h.water_retention_risk)} />
                    {h.release_drainage_potential != null && <ScaleBar label="Выведение" value={toFive(h.release_drainage_potential)} />}
                    {h.nervous_system_load != null && <ScaleBar label="Нервная нагрузка" value={toFive(h.nervous_system_load)} />}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-ink-secondary">
                  {h.signal.ankles_evening != null && <div>Лодыжки: <span className="font-medium text-ink">{h.signal.ankles_evening}/5</span></div>}
                  {h.signal.eye_area_morning != null && <div>Глаза: <span className="font-medium text-ink">{h.signal.eye_area_morning}/5</span></div>}
                  {h.signal.weight_kg != null && <div>Вес: <span className="font-medium text-ink">{h.signal.weight_kg} кг</span></div>}
                  {h.signal.head_overload != null && <div>Голова: <span className="font-medium text-ink">{h.signal.head_overload}/5</span></div>}
                  {h.signal.sleep_quality != null && <div>Сон: <span className="font-medium text-ink">{h.signal.sleep_quality}/5</span></div>}
                  {h.signal.energy_level != null && <div>Энергия: <span className="font-medium text-ink">{h.signal.energy_level}/5</span></div>}
                  {h.signal.tissue_density != null && <div>Тяжесть: <span className="font-medium text-ink">{h.signal.tissue_density}/5</span></div>}
                  {h.signal.salty_craving != null && <div>Солёное: <span className="font-medium text-ink">{h.signal.salty_craving}/5</span></div>}
                  {h.signal.sweet_craving != null && <div>Сладкое: <span className="font-medium text-ink">{h.signal.sweet_craving}/5</span></div>}
                </div>
                {ov.length > 0 && (
                  <p className="text-xs text-accent border-t border-border-light pt-2">
                    Что изменилось в протоколе: {ov.join("; ")}
                  </p>
                )}
                {h.nutrition && (
                  <p className="text-xs text-ink-secondary border-t border-border-light pt-2">
                    Обед: {h.nutrition.lunch_type || "не записано"}
                    {h.nutrition.had_rice && " · был гарнир"}
                    {h.nutrition.heaviness != null && ` · тяжесть после еды ${h.nutrition.heaviness}/5`}
                    {h.nutrition.rebound_after_ekadashi_pradosh && " · переела после разгрузки"}
                  </p>
                )}
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BodySignalsPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-tertiary">Загрузка…</p>}>
      <BodySignalsPageContent />
    </Suspense>
  );
}
