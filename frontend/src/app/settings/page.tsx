"use client";

import { useState } from "react";
import { PRODUCT_COMBINATION_MANDATE, PROTOCOL_SCOPE_NOTICE } from "@/core/profile/fixed-rules";
import {
  NAVAMSA_D9_NOTICE,
  SPECIAL_LAGNAS,
  formatSpecialLagnaRow,
} from "@/core/profile/natal-divisions";
import {
  NATAL_CHART_NARRATIVE_SECTIONS,
  NATAL_CHART_NARRATIVE_TITLE,
} from "@/core/profile/natal-chart-narrative";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gold/25 bg-gradient-to-br from-surface-card via-gold-soft/80 to-sage-soft/35 p-6 shadow-card ring-1 ring-sage/15 ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title">{children}</h2>;
}

export default function SettingsPage() {
  const [tz, setTz] = useState("Europe/Moscow");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight bg-gradient-to-r from-burgundy via-accent-dark to-sage bg-clip-text text-transparent">
        Настройки и натальный профиль
      </h1>

      <Card>
        <SectionLabel>Правило подбора продуктов</SectionLabel>
        <p className="text-sm text-ink leading-relaxed mb-3">{PRODUCT_COMBINATION_MANDATE}</p>
        <p className="text-xs text-ink-secondary leading-relaxed border-t border-border pt-3">{PROTOCOL_SCOPE_NOTICE}</p>
        <ul className="text-xs text-ink-tertiary mt-3 space-y-1 list-disc pl-4">
          <li>Каноничный список белков и овощей и исключения — блок «Фиксированные правила» ниже на этой странице; приложение опирается на них при расчёте.</li>
          <li>Транзитная накшатра, титхи, фаза Луны, тип дня и матрица обеда считаются на «Сегодня» автоматически; коррекция по телу — через «Самочувствие».</li>
          <li>Справочно для сверки: D1, навамша (D9) и специальные лагны — ниже на этой странице.</li>
        </ul>
      </Card>

      <Card>
        <SectionLabel>Натальная карта (D1)</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            ["Лагна", "Стрелец 25°05′ (Пурва Ашадха, пада 4)"],
            ["Солнце", "Овен 24°20′ (Бхарани, пада 4)"],
            ["Луна", "Близнецы 2°55′ (Мригашира, пада 3)"],
            ["Марс", "Телец 20°12′ (Рохини, пада 4)"],
            ["Меркурий", "Овен 25°10′ (R, Атмакарака)"],
            ["Юпитер", "Весы 5°31′ (R)"],
            ["Венера", "Телец 19°53′ (свой знак)"],
            ["Сатурн", "Овен 19°26′ (дебилитация)"],
            ["Раху", "Водолей 15°41′"],
            ["Кету", "Лев 15°41′"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-ink-tertiary w-24 shrink-0">{label}</span>
              <span className="text-ink">{value}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>{NATAL_CHART_NARRATIVE_TITLE}</SectionLabel>
        <p className="text-xs text-ink-secondary leading-relaxed mb-4">
          Текст отражает зашитую в приложение карту и задаёт смысл шкал и обеда: удержание и тяжесть как ответ системы на ритм и нагрузку, а не «лишняя вода» абстрактно. Расчёт на «Сегодня» по-прежнему строится на транзитах, титхи и матрице; при необходимости сверяйте D9 и спец. лагны ниже.
        </p>
        <div className="space-y-6 max-h-[min(70vh,720px)] overflow-y-auto pr-1 border-t border-border/60 pt-4">
          {NATAL_CHART_NARRATIVE_SECTIONS.map((sec) => (
            <div key={sec.heading}>
              <h3 className="text-sm font-bold text-ink-strong mb-2">{sec.heading}</h3>
              {sec.paragraphs.map((p, i) => (
                <p key={i} className="text-sm text-ink leading-relaxed mb-3 last:mb-0">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Навамша (D9) и специальные лагны</SectionLabel>
        <p className="text-xs text-ink-secondary leading-relaxed mb-4">{NAVAMSA_D9_NOTICE}</p>
        <p className="text-sm font-medium text-ink mb-2">Special Lagnas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {SPECIAL_LAGNAS.map((row) => (
            <div key={row.id} className="flex gap-2">
              <span className="text-ink-tertiary w-28 shrink-0">{row.label}</span>
              <span className="text-ink">{formatSpecialLagnaRow(row)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>Часовой пояс</SectionLabel>
        <select
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="rounded-xl border border-border bg-surface-card px-4 py-2.5 text-sm text-ink w-full focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
        >
          <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
          <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
          <option value="Europe/London">Europe/London (UTC+0/+1)</option>
        </select>
      </Card>

      <Card>
        <SectionLabel>Фиксированные правила питания</SectionLabel>
        <ul className="text-sm text-ink space-y-2 leading-relaxed">
          <li>
            Завтрак 08:00–10:00: 1 яйцо с жидким желтком, банан или 2 финика, 5 черри, 25–30 г листового салата; кофе после еды — кардамон, гвоздика, молотый чёрный перец, мускатный орех, корица
          </li>
          <li className="text-ink-secondary">Основной приём пищи — обед в окне 13:00–15:00 (в прадош и др. «ранних» днях — 12:30–14:00 или уже по расчёту на «Сегодня»)</li>
          <li>Только 1 яйцо в день, только на завтрак</li>
          <li>После 18:00 еды нет</li>
          <li className="text-ink-secondary">
            Исключены: маш, овсянка, тыква, индейка, свинина, авокадо, кинза, перловка
          </li>
          <li>Белок: курица, телятина, говядина, форель, лосось, минтай, треска, печень говяжья, печень куриная</li>
          <li>Овощи: кабачок, цветная капуста, брокколи, сладкий перец, помидоры, баклажаны, стручковая фасоль, белокочанная капуста, пекинская капуста, морковь, немного свёклы, салатные листья</li>
        </ul>
      </Card>

      <Card>
        <SectionLabel>Нутрицевтики</SectionLabel>
        <ul className="text-sm space-y-2 leading-relaxed">
          {[
            [
              "За 30 минут до завтрака (натощак)",
              "ALA (альфа-липоевая кислота) — нутрицевтик; строго до завтрака, отдельно от еды",
            ],
            ["После завтрака", "L-теанин, женолутен"],
            [
              "С обедом",
              "Омега-3, пиколинат хрома, берберин, витамин D + K2; цинк и селен — одна капсула, только с обедом",
            ],
            ["Вечером", "Магний бисглицинат, ГАМК 500 мг, 5-HTP 120 мг"],
            ["Эндолутен", "1 раз в 3 дня, первая половина дня"],
          ].map(([time, items]) => (
            <li key={time}>
              <span className="text-ink-secondary font-medium">{time}:</span>{" "}
              <span className="text-ink">{items}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionLabel>Защита щитовидной железы</SectionLabel>
        <ul className="text-sm text-ink-secondary space-y-1.5 leading-relaxed">
          <li>Йод и тирозин исключены из нутрицевтической поддержки</li>
          <li>Йодосодержащие добавки, водоросли и келп не добавляются без назначения врача</li>
          <li>Селен — только в составе утверждённых добавок</li>
          <li>Консервативный режим: стабильное время еды, без эскалации стимуляторов</li>
        </ul>
      </Card>
    </div>
  );
}
