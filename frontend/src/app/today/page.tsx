"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, DailyProtocol, RuleTrace } from "@/lib/api";
import type { DailyProtocolUi } from "@/core/protocol/daily-protocol-ui";
import { mealMatrixLabel } from "@/lib/meal-matrix-labels";
import { toFive } from "@/lib/utils";
import { ScaleBar } from "@/components/ui/ScaleBar";
import { DayKindBadge } from "@/components/ui/DayKindBadge";

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

/* ── Contextual metric descriptions ─────────────────────── */

const metricNote = (kind: string, v: number): string => {
  const notes: Record<string, string[]> = {
    retention: [
      "Нет риска",
      "Тело легко отдаёт воду",
      "Небольшой риск задержки",
      "Заметный риск удержания",
      "Высокий риск отёков",
      "Максимальная задержка",
    ],
    drainage: [
      "Окно закрыто",
      "Слабое окно для выведения",
      "Есть потенциал",
      "Хорошее окно для дренажа",
      "Сильный потенциал выведения",
      "Лучший день для дренажа",
    ],
    nervous: [
      "Полный покой",
      "Нервная система спокойна",
      "Лёгкое напряжение",
      "Умеренная нагрузка",
      "Сильное напряжение",
      "Максимальный перегруз",
    ],
    rhythm: [
      "Свободный режим",
      "Лёгкий контроль",
      "Контроль желателен",
      "Режим важен",
      "Строгий ритм обязателен",
      "Максимальная дисциплина",
    ],
  };
  const arr = notes[kind];
  if (!arr) return "";
  return arr[Math.min(v, arr.length - 1)];
};

/* ── Metric card for summary row ────────────────────────── */

function MetricCard({ title, value, max, barColor, borderColor, note }: {
  title: string; value: number; max: number; barColor: string; borderColor: string; note: string;
}) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className={`premium-card rounded-2xl border-l-[3px] ${borderColor} p-4 pt-3.5 flex flex-col gap-1.5 min-w-0`}>
      <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest">{title}</span>
      <div className="flex items-end gap-1.5">
        <span className="text-[32px] font-extrabold tabular-nums leading-none text-ink">{value}</span>
        <span className="text-sm text-ink-faint mb-1">/ {max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[rgba(28,23,20,0.1)] overflow-hidden mt-1">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-ink-secondary leading-snug mt-0.5">{note}</span>
    </div>
  );
}

/* ── Reusable helpers ───────────────────────────────────── */

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[15px] leading-relaxed">
      <span className="text-ink-secondary font-medium shrink-0 w-20">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */

function TodayPageContent() {
  const searchParams = useSearchParams();
  const onParam = searchParams.get("on");
  const [proto, setProto] = useState<DailyProtocol | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    onParam || new Date().toISOString().slice(0, 10)
  );
  const [err, setErr] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setErr("");
    api.getToday(selectedDate).then(setProto).catch((e) => setErr(e.message));
  }, [selectedDate, refreshKey]);

  if (err)
    return <p className="text-semantic-danger py-16 text-center">{err}</p>;
  if (!proto)
    return <p className="py-16 text-center text-ink-tertiary">Собираю протокол…</p>;

  const s = proto.scales;
  const n = proto.nutrition;
  const l = n.lunch;
  const hasSignalOverrides = (proto.rule_trace?.body_signal_rules ?? []).some(
    (r) => !r.includes("не записано") && !r.includes("в норме")
  );

  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════
          1. HERO HEADER — dark anchor
          ═══════════════════════════════════════════════ */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-hero-mobile lg:text-hero text-ink-strong tracking-[-0.03em]">
              Протокол дня
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-border-strong bg-surface-card px-3 py-1.5 text-sm text-ink shadow-card focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
            />
            <button
              onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              className="text-sm font-bold text-accent hover:text-accent-dark transition-colors"
            >
              сегодня
            </button>
            <button
              onClick={reload}
              className="text-sm font-medium text-ink-tertiary hover:text-accent transition-colors"
            >
              Пересчитать протокол
            </button>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gold/25 shadow-[var(--shadow-premium-lg)]">
          <div className="premium-hero px-6 pt-6 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <p className="text-section-mobile lg:text-section text-white tracking-[-0.02em]">
                  {fmt(proto.date)}, {proto.weekday}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-[14px]">
                  <span className="font-medium text-gold-bright">
                    Титхи {proto.lunar_day_number}
                    {proto.tithi_name_ru ? ` · ${proto.tithi_name_ru}` : ""}
                  </span>
                  <span className="text-white/25">|</span>
                  <span className="text-white/92">{proto.nakshatra}</span>
                  <span className="text-white/25">|</span>
                  <span className="text-white/80">{proto.moon_phase}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:pt-1">
                <DayKindBadge kind={proto.day_type} />
                {proto.ekadashi_flag && (
                  <span className="badge border border-white/25 bg-white/10 text-white">экадаши</span>
                )}
                {proto.pradosh_flag && (
                  <span className="badge border border-white/25 bg-white/10 text-white">прадош</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasSignalOverrides && (
          <div className="mt-4 rounded-xl border border-accent bg-accent-light px-5 py-3.5 flex items-center justify-between gap-4 shadow-card">
            <div>
              <p className="text-sm font-bold text-accent-dark">Тело услышано — протокол подстроен</p>
              <p className="text-xs text-accent-muted mt-0.5">Обед, крупа, дыхание и нагрузка скорректированы под ваши ощущения</p>
            </div>
            <Link href={`/body-signals?date=${selectedDate}`}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-dark transition-colors shrink-0 shadow-card">
              Записать заново
            </Link>
          </div>
        )}
        {!hasSignalOverrides && (
          <Link href={`/body-signals?date=${selectedDate}`}
            className="mt-4 block text-center rounded-xl border-2 border-dashed border-gold/35 py-3.5 text-sm font-medium text-ink-tertiary hover:border-gold hover:text-ink-secondary hover:bg-gold-soft/80 transition-all">
            + Как вы себя чувствуете сегодня?
          </Link>
        )}
      </section>

      {proto.natal_forecast && (
        <section className="rounded-2xl border border-sage/30 bg-gradient-to-br from-sage-soft/90 via-surface-card to-surface-card-soft shadow-[var(--shadow-premium)] overflow-hidden">
          <div className="px-5 py-4 border-b border-sage/20 bg-sage/5">
            <h2 className="font-display text-lg sm:text-xl text-ink-strong tracking-tight">
              {proto.natal_forecast.title}
            </h2>
            <p className="text-xs text-ink-tertiary mt-1.5">
              Транзитная Луна в накшатре «{proto.nakshatra}» · {proto.natal_forecast.tithi_label} ·{" "}
              {proto.lunar_day_number}-й лунный день
            </p>
          </div>
          <div className="px-5 py-5 space-y-4">
            {proto.natal_forecast.paragraphs.map((p, i) => (
              <p key={i} className="text-[15px] text-ink leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          2. SUMMARY METRICS
          ═══════════════════════════════════════════════ */}
      {proto.signal_protocol_ui && (
        <SignalProtocolSection ui={proto.signal_protocol_ui} />
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Риск удержания воды" value={toFive(s.water_retention_risk)} max={5}
          barColor="bg-semantic-danger" borderColor="border-l-semantic-danger"
          note={metricNote("retention", toFive(s.water_retention_risk))} />
        <MetricCard title="Окно для выведения" value={toFive(s.release_drainage_potential)} max={5}
          barColor="bg-accent-info" borderColor="border-l-accent-info"
          note={metricNote("drainage", toFive(s.release_drainage_potential))} />
        <MetricCard title="Нагрузка на нервную систему" value={toFive(s.nervous_system_load)} max={5}
          barColor="bg-accent-secondary" borderColor="border-l-accent-secondary"
          note={metricNote("nervous", toFive(s.nervous_system_load))} />
        <MetricCard title="Требуемая точность" value={toFive(s.need_for_rhythm_precision)} max={5}
          barColor="bg-accent" borderColor="border-l-accent"
          note={metricNote("rhythm", toFive(s.need_for_rhythm_precision))} />
      </section>

      {/* ═══════════════════════════════════════════════
          3. MAIN PROTOCOL CONTENT
          ═══════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.35fr_0.95fr] gap-5">

        {/* ── LEFT COLUMN ──────────────────────────────── */}
        <div className="space-y-5">

          {/* Body effect — tinted card, not white */}
          <div className="premium-card rounded-2xl p-6">
            <h2 className="text-card-title text-ink-strong mb-3">Что происходит с телом</h2>
            <p className="text-[15px] text-ink leading-relaxed">{proto.body_effect_summary}</p>
            <div className="mt-4 space-y-2.5">
              <ScaleBar label="Удержание воды" value={toFive(s.water_retention_risk)} />
              <ScaleBar label="Потенциал выведения" value={toFive(s.release_drainage_potential)} />
              <ScaleBar label="Напряжение нервной системы" value={toFive(s.nervous_system_load)} />
              <ScaleBar label="Требуемая точность режима" value={toFive(s.need_for_rhythm_precision)} />
            </div>
          </div>

          {/* NUTRITION — visually strongest card: accent left border, elevated */}
          <div className="premium-card rounded-2xl p-6 border-l-[3px] border-l-gold shadow-[var(--shadow-premium-lg)]">
            <h2 className="font-display text-card-title text-ink-strong mb-4">Обед сегодня</h2>

            {n.selection_assurance && (
              <p className="text-sm text-ink leading-relaxed mb-4 rounded-xl border border-gold/20 bg-surface-card-soft px-4 py-3">
                {n.selection_assurance}
              </p>
            )}

            <p className="text-sm text-ink-tertiary leading-relaxed mb-4">{n.breakfast}</p>

            <div className="rounded-xl bg-surface-card-soft border border-gold/15 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[17px] font-bold text-ink">
                  Обед {l.time_window}
                </h3>
                <div className="flex gap-2">
                  {l.early_lunch && <span className="badge bg-accent-info-soft text-accent-info">ранний обед</span>}
                  <span className="badge bg-accent-light text-accent">{mealMatrixLabel(l.matrix_used)}</span>
                </div>
              </div>
              <p className="text-[15px] text-ink leading-relaxed">{l.full_description}</p>
              <div className="flex items-baseline gap-2 text-sm pt-2 border-t border-border">
                <span className="text-ink-secondary font-semibold">Крупа:</span>
                <span className={n.rice.allowed ? "text-accent-info font-bold" : "text-ink-tertiary font-semibold"}>
                  {n.rice.allowed ? "можно" : "сегодня без крупы"}
                </span>
                {n.rice.reason && <span className="text-sm text-ink-tertiary">— {n.rice.reason}</span>}
              </div>
            </div>
          </div>

          <div className="premium-card rounded-2xl p-6">
            <h2 className="text-card-title text-ink-strong mb-3">Нутрицевтики по расписанию</h2>
            <ul className="space-y-2.5">
              {proto.supplements.slots.map((sl, i) => (
                <li key={i} className="text-[15px] leading-relaxed">
                  <span className="font-semibold text-ink-secondary">{sl.time}:</span>{" "}
                  <span className="text-ink">{sl.items}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-ink-tertiary mt-4 pt-3 border-t border-border">
              {proto.supplements.endoluten_note}
            </p>
          </div>

          <div className="premium-card rounded-2xl p-5">
            <h2 className="text-card-title text-ink-strong mb-2">Движение сегодня</h2>
            <p className="text-xs text-ink-tertiary mb-3 leading-relaxed">
              По титхи {proto.lunar_day_number}{proto.tithi_name_ru ? ` (${proto.tithi_name_ru})` : ""} и фазе Луны; без спортивного тона — если не любите нагрузки, берите нижние границы.
            </p>
            <div className="flex items-center gap-3 mb-3">
              <DayKindBadge kind={proto.movement_load.profile} />
            </div>
            <ul className="space-y-2.5">
              {proto.movement_load.items.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────── */}
        <div className="space-y-5">

          <div className="premium-card rounded-2xl p-5">
            <h2 className="text-card-title text-ink-strong mb-3">Дыхание</h2>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-[17px] font-bold text-accent">{proto.breathing_practice.title_ru}</span>
              <span className="text-sm text-ink-tertiary">{proto.breathing_practice.minutes} мин</span>
            </div>
            <div className="space-y-2.5">
              <DetailRow label="Когда">{proto.breathing_practice.best_time}</DetailRow>
              <DetailRow label="Поза">{proto.breathing_practice.posture}</DetailRow>
              <DetailRow label="Техника">{proto.breathing_practice.technique}</DetailRow>
              <DetailRow label="Язык">{proto.breathing_practice.tongue_position}</DetailRow>
            </div>
            {proto.breathing_practice.contraindication && (
              <p className="text-sm text-ink-tertiary border-t border-border pt-3 mt-4">
                {proto.breathing_practice.contraindication}
              </p>
            )}
          </div>

          {proto.mudra_recommendation.suggested && (
            <div className="premium-card rounded-2xl p-5">
              <h2 className="text-card-title text-ink-strong mb-3">Мудра дня</h2>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[17px] font-bold text-accent">{proto.mudra_recommendation.name_ru}</span>
                <span className="text-sm text-ink-tertiary">{proto.mudra_recommendation.duration_minutes} мин</span>
              </div>
              <p className="text-sm text-accent-muted mb-4">{proto.mudra_recommendation.reason}</p>
              <div className="space-y-2.5">
                <DetailRow label="Пальцы">{proto.mudra_recommendation.finger_technique}</DetailRow>
                <DetailRow label="Поза">{proto.mudra_recommendation.posture}</DetailRow>
                <DetailRow label="Дыхание">{proto.mudra_recommendation.breathing_during}</DetailRow>
                <DetailRow label="Язык">{proto.mudra_recommendation.tongue_position}</DetailRow>
                <DetailRow label="Когда">{proto.mudra_recommendation.when_to_do}</DetailRow>
              </div>
              {proto.mudra_recommendation.caution && (
                <p className="text-sm text-ink-tertiary border-t border-border pt-3 mt-4">
                  {proto.mudra_recommendation.caution}
                </p>
              )}
            </div>
          )}

          <div className="premium-card rounded-2xl p-5">
            <h2 className="text-card-title text-ink-strong mb-3">Ароматы</h2>
            {proto.aroma_protocol.rotation_note && (
              <p className="text-xs text-ink-tertiary mb-3 leading-relaxed">{proto.aroma_protocol.rotation_note}</p>
            )}
            <div className="space-y-2.5">
              <DetailRow label="Утро">{proto.aroma_protocol.morning_detail}</DetailRow>
              <DetailRow label="День">{proto.aroma_protocol.daytime_detail}</DetailRow>
              <DetailRow label="Вечер">{proto.aroma_protocol.evening_detail}</DetailRow>
            </div>
          </div>

          <div className="premium-card rounded-2xl p-5">
            <h2 className="text-card-title text-ink-strong mb-3">Что тело покажет к вечеру</h2>
            <ul className="space-y-2">
              {proto.body_markers_to_track.map((t, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink leading-relaxed">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          4. WARNINGS
          ═══════════════════════════════════════════════ */}
      {proto.warnings.length > 0 && (
        <section className="rounded-2xl border border-semantic-danger/30 bg-semantic-danger-light p-6">
          <h2 className="text-card-title text-semantic-danger mb-3">На что обратить внимание</h2>
          <ul className="space-y-2 text-[15px] text-ink">
            {proto.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-semantic-danger/50" />
                {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          5. TECHNICAL / SAFETY AREA (collapsed)
          ═══════════════════════════════════════════════ */}
      {proto.rule_trace ? <RuleTraceBlock trace={proto.rule_trace} /> : null}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-ink-tertiary">Загрузка…</p>}>
      <TodayPageContent />
    </Suspense>
  );
}

/* ── Rule Trace (technical, collapsed, bottom of page) ───── */

const TRACE_SECTIONS: { key: keyof RuleTrace; label: string }[] = [
  { key: "day_type_rules", label: "Почему такой тип дня" },
  { key: "scales_modifiers", label: "Откуда шкалы" },
  { key: "alignment_rules", label: "Сверка D1/D9 и обед" },
  { key: "body_signal_rules", label: "Влияние самочувствия" },
  { key: "meal_matrix_rules", label: "Выбор обеда" },
  { key: "rice_rules", label: "Решение по крупе" },
  { key: "breathing_rules", label: "Выбор дыхания" },
  { key: "mudra_rules", label: "Выбор мудры" },
  { key: "aroma_rules", label: "Выбор аромата" },
  { key: "load_rules", label: "Выбор нагрузки" },
  { key: "thyroid_rules", label: "Защита щитовидной железы" },
  { key: "signal_protocol_engine", label: "Сигнальный движок (правила)" },
];

type SignalBadgeTone = DailyProtocolUi["meta"]["badges"][number]["tone"];

const BADGE_TONE: Record<SignalBadgeTone, string> = {
  neutral: "border-border bg-surface-card-soft text-ink-secondary",
  info: "border-accent-info/35 bg-accent-info-soft text-accent-info",
  good: "border-emerald-300/60 bg-emerald-50 text-emerald-900",
  warning: "border-amber-300/70 bg-amber-50 text-amber-950",
  danger: "border-red-300/70 bg-red-50 text-red-950",
};

function SignalProtocolSection({ ui }: { ui: DailyProtocolUi }) {
  const sc = ui.scores;
  return (
    <section className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-light/90 to-surface-card shadow-[var(--shadow-premium-lg)] overflow-hidden">
      <div className="px-5 py-4 border-b border-accent/15 bg-accent/5">
        <h2 className="font-display text-lg sm:text-xl text-ink-strong tracking-tight">
          Сигнальный протокол
        </h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {ui.meta.badges.map((b, i) => (
            <span
              key={i}
              className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border ${BADGE_TONE[b.tone]}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-4 min-w-0">
          <div>
            <h3 className="text-base font-bold text-ink-strong">{ui.summary.title}</h3>
            <p className="text-sm text-ink-secondary mt-2 leading-relaxed">{ui.summary.bodyEffect}</p>
            {ui.summary.warning ? (
              <p className="text-sm text-accent-dark font-medium mt-3 rounded-lg border border-accent/25 bg-white/60 px-3 py-2">
                {ui.summary.warning}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-gold/20 bg-surface-card-soft p-4 space-y-2">
            <h4 className="text-sm font-bold text-ink">{ui.protocol.lunchTitle}</h4>
            <pre className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap font-sans">
              {ui.protocol.lunchText}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-bold text-ink mb-2">Добавки (краткий список слоя)</h4>
            <ul className="space-y-1.5 text-sm text-ink-secondary">
              {ui.protocol.supplements.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gold shrink-0">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wide mb-1">
                {ui.protocol.breathingTitle}
              </h4>
              <p className="text-sm text-ink leading-relaxed">{ui.protocol.breathingText}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wide mb-1">
                {ui.protocol.loadTitle}
              </h4>
              <p className="text-sm text-ink leading-relaxed">{ui.protocol.loadText}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div>
            <h4 className="text-xs font-bold text-ink-tertiary uppercase tracking-wide mb-2">
              Оценки слоя (1–5)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="rounded-lg bg-surface-card-soft border border-border px-2 py-1.5">
                <span className="text-ink-faint block">Вода</span>
                <span className="font-bold tabular-nums text-ink">{sc.waterRetentionRisk}</span>
              </div>
              <div className="rounded-lg bg-surface-card-soft border border-border px-2 py-1.5">
                <span className="text-ink-faint block">Дренаж</span>
                <span className="font-bold tabular-nums text-ink">{sc.drainagePotential}</span>
              </div>
              <div className="rounded-lg bg-surface-card-soft border border-border px-2 py-1.5">
                <span className="text-ink-faint block">Нервы</span>
                <span className="font-bold tabular-nums text-ink">{sc.nervousSystemLoad}</span>
              </div>
              <div className="rounded-lg bg-surface-card-soft border border-border px-2 py-1.5">
                <span className="text-ink-faint block">Режим</span>
                <span className="font-bold tabular-nums text-ink">{sc.rhythmPrecisionNeed}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3">
            <h4 className="text-sm font-bold text-ink mb-1">{ui.safety.thyroidSafetyTitle}</h4>
            <p className="text-xs text-ink-secondary leading-relaxed">{ui.safety.thyroidSafetyText}</p>
          </div>

          <div className="rounded-xl border border-border p-3">
            <h4 className="text-sm font-bold text-ink mb-2">{ui.tracking.title}</h4>
            <ul className="space-y-1 text-xs text-ink-secondary max-h-40 overflow-y-auto">
              {ui.tracking.markers.map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-gold shrink-0">•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function RuleTraceBlock({ trace }: { trace: RuleTrace }) {
  const [open, setOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpenSections((p) => ({ ...p, [k]: !p[k] }));

  const sections = TRACE_SECTIONS.filter(({ key }) => {
    const lines = trace[key];
    return lines && lines.length > 0;
  });

  return (
    <section className="premium-card rounded-xl p-4 bg-surface-card-soft">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left text-sm font-semibold text-ink-tertiary hover:text-ink-secondary transition-colors">
        <span className={`text-[10px] transition-transform duration-200 ${open ? "rotate-90" : ""}`}>▶</span>
        Почему так — трассировка правил
      </button>
      {open && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {sections.map(({ key, label }) => {
            const lines = trace[key]!;
            const isOpen = openSections[key] ?? false;
            return (
              <div key={key} className="rounded-lg border border-border overflow-hidden">
                <button onClick={() => toggle(key)}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-hover transition-colors">
                  <span className={`text-[9px] text-ink-tertiary transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                  {label}
                  <span className="text-[10px] text-ink-faint ml-auto tabular-nums">{lines.length}</span>
                </button>
                {isOpen && (
                  <ul className="px-3 pb-2 space-y-0.5">
                    {lines.map((line, i) => (
                      <li key={i} className="text-xs text-ink-tertiary leading-relaxed pl-3">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
