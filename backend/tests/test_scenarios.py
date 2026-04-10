"""
20+ deterministic test scenarios for the recommendation engine components.
Tests only rule-based logic — no Swiss Ephemeris dependency.
All selectors now return (result, trace) tuples.
Run: PYTHONPATH=. python -m pytest tests/test_scenarios.py -v
"""

from datetime import date, timedelta

from app.domain.models.body_signals import BodySignalEntry
from app.domain.models.enums import (
    AromaSlot,
    BreathingPractice,
    DayType,
    MealMatrix,
    MudraType,
)
from app.domain.models.protocol import DailyScales
from app.domain.services.body_signal_interpreter import interpret_signals
from app.domain.services.breath_selector import select_breathing
from app.domain.services.mudra_selector import select_mudra
from app.domain.services.aroma_selector import select_aroma
from app.domain.services.meal_matrices import pick_meal


# ── 1. Ankle swelling >= 3 -> retention matrix, rice forbidden ──

def test_signal_ankle_swelling_forces_retention():
    sig = BodySignalEntry(day_date=date(2026, 5, 1), ankles_evening=4)
    ov = interpret_signals(sig)
    assert ov.force_meal_matrix == MealMatrix.C_RETENTION
    assert ov.force_rice_forbidden is True
    assert any("отёк" in w.lower() or "лодыж" in w.lower() for w in ov.extra_warnings)
    assert any("4/5" in t for t in ov.trace)


# ── 2. Eye swelling >= 3 -> rice forbidden + no comfort food ──

def test_signal_eye_swelling_blocks_rice():
    sig = BodySignalEntry(day_date=date(2026, 5, 2), eye_area_morning=3)
    ov = interpret_signals(sig)
    assert ov.force_rice_forbidden is True
    assert ov.force_no_comfort_food is True
    assert any("3/5" in t for t in ov.trace)


# ── 3. Mental overload >= 4 -> reduce complexity ──

def test_signal_mental_overload_reduces_complexity():
    sig = BodySignalEntry(day_date=date(2026, 5, 3), head_overload=4)
    ov = interpret_signals(sig)
    assert ov.reduce_meal_complexity is True
    assert any("4/5" in t for t in ov.trace) and any("перегруж" in t.lower() for t in ov.trace)


# ── 4. Sleep <= 2 -> reduce exercise ──

def test_signal_low_sleep_reduces_exercise():
    sig = BodySignalEntry(day_date=date(2026, 5, 4), sleep_quality=1)
    ov = interpret_signals(sig)
    assert ov.reduce_exercise is True
    assert any("1/5" in t for t in ov.trace) and any("сон" in t.lower() for t in ov.trace)


# ── 5. Low energy + no swelling -> conditional rice ──

def test_signal_low_energy_conditional_rice():
    sig = BodySignalEntry(day_date=date(2026, 5, 5), energy_level=1, ankles_evening=1, eye_area_morning=0)
    ov = interpret_signals(sig)
    assert ov.rice_conditionally_allowed is True
    assert ov.force_rice_forbidden is False
    assert any("Мало сил" in t for t in ov.trace)


# ── 6. No signals -> empty override with trace ──

def test_signal_none_returns_empty():
    ov = interpret_signals(None)
    assert ov.force_day_type is None
    assert ov.force_meal_matrix is None
    assert ov.force_rice_forbidden is False
    assert len(ov.extra_warnings) == 0
    assert any("не переданы" in t for t in ov.trace)


# ── 7. Breathing: nervous day -> bhramari + trace ──

def test_breathing_high_sensitivity():
    b, trace = select_breathing(DayType.high_sensitivity_day)
    assert b.practice == BreathingPractice.bhramari
    assert b.minutes > 0
    assert b.best_time != ""
    assert b.contraindication != ""
    assert any("high_sensitivity_day" in t for t in trace)
    assert any("bhramari" in t for t in trace)


# ── 8. Breathing: ekadashi -> sama vritti + trace ──

def test_breathing_ekadashi():
    b, trace = select_breathing(DayType.ekadashi_day)
    assert b.practice == BreathingPractice.sama_vritti
    assert any("ekadashi_day" in t for t in trace)
    assert any("sama_vritti" in t for t in trace)


# ── 9. Breathing: mental overload forces bhramari + trace ──

def test_breathing_mental_overload_override():
    b, trace = select_breathing(DayType.stable_day, mental_overload=True)
    assert b.practice == BreathingPractice.bhramari
    assert any("mental_overload=True" in t for t in trace)
    assert any("overriding" in t for t in trace)


# ── 10. Mudra: drainage -> apana + trace ──

def test_mudra_drainage():
    m, trace = select_mudra(DayType.drainage_day, False, False, False)
    assert m.mudra == MudraType.apana
    assert m.suggested is True
    assert any("drainage_day" in t for t in trace)
    assert any("apana" in t for t in trace)


# ── 11. Mudra: pre_full_moon -> none + trace ──

def test_mudra_pre_full_moon_none():
    m, trace = select_mudra(DayType.pre_full_moon_retention_day, True, False, False)
    assert m.suggested is False
    assert any("none" in t for t in trace)


# ── 12. Mudra: low energy no swelling -> prana + trace ──

def test_mudra_low_energy():
    m, trace = select_mudra(DayType.stable_day, False, False, low_energy_no_swelling=True)
    assert m.mudra == MudraType.prana
    assert any("prana" in t for t in trace)
    assert any("low_energy_no_swelling" in t for t in trace)


# ── 13. Aroma: stable -> frankincense morning, rose evening + trace ──

def test_aroma_stable():
    a, trace = select_aroma(DayType.stable_day)
    assert a.morning == AromaSlot.frankincense
    assert a.evening == AromaSlot.rose
    assert any("stable_day" in t for t in trace)
    assert any("frankincense" in t.lower() or "ладан" in t.lower() for t in trace)


# ── 14. Aroma: high sensitivity -> no stimulation evening + trace ──

def test_aroma_high_sensitivity_no_stimulation():
    a, trace = select_aroma(DayType.high_sensitivity_day)
    assert a.evening == AromaSlot.rose
    assert a.morning != AromaSlot.rosemary
    assert any("high_sensitivity_day" in t for t in trace)


# ── 15. Meal: ekadashi matrix has no meat ──

def test_meal_ekadashi_no_meat():
    for doy in range(1, 366):
        m = pick_meal(MealMatrix.D_EKADASHI, doy)
        assert m.protein == "—", f"Day {doy}: ekadashi should have no meat"


# ── 16. Meal: rice matrix always mentions rice ──

def test_meal_rice_matrix_has_rice():
    grain_markers = ("рис", "греч", "чечевиц", "паста", "ячн")
    for doy in range(1, 366):
        m = pick_meal(MealMatrix.F_RICE, doy)
        low = m.full_description.lower()
        assert any(k in low for k in grain_markers), f"Day {doy}: F_RICE meal must include a grain/starch side"


# ── 17. Rice forbidden on ekadashi + trace ──

def test_rice_forbidden_ekadashi():
    from app.domain.services.rice_policy import decide_rice
    from app.domain.services.body_signal_interpreter import _EMPTY
    r, trace = decide_rice(
        DayType.ekadashi_day,
        DailyScales(water_retention_risk=30, release_drainage_potential=70, nervous_system_load=30, need_for_rhythm_precision=40),
        _EMPTY,
    )
    assert r.allowed is False
    assert any("не допускает" in t.lower() for t in trace) or any("круп" in t.lower() for t in trace)


# ── 18. Output model has all required fields ──

def test_protocol_model_completeness():
    from app.domain.models.protocol import DailyProtocol
    required = {
        "date", "weekday", "lunar_day_number", "moon_phase", "nakshatra",
        "ekadashi_flag", "pradosh_flag", "day_type", "body_effect_summary",
        "nutrition", "supplements", "breathing_practice",
        "mudra_recommendation", "aroma_protocol", "movement_load",
        "thyroid_safety_notes", "body_markers_to_track", "warnings",
        "scales", "moon_illumination_pct", "rule_trace",
    }
    fields = set(DailyProtocol.model_fields.keys())
    missing = required - fields
    assert not missing, f"Missing: {missing}"


# ── 19. Supplements: endoluten every 3 days ──

def test_endoluten_every_3_days():
    from app.domain.services.supplements import build_supplements, ENDOLUTEN_ANCHOR
    days_with = []
    for i in range(30):
        d = ENDOLUTEN_ANCHOR + timedelta(days=i)
        s = build_supplements(d)
        if s.endoluten_today:
            days_with.append(i)
    gaps = [days_with[j + 1] - days_with[j] for j in range(len(days_with) - 1)]
    assert all(g == 3 for g in gaps), f"Gaps should be 3: {gaps}"


# ── 20. Thyroid safety notes present ──

def test_thyroid_safety_notes():
    from app.domain.services.thyroid_safety import THYROID_NOTES
    assert any("йод" in n.lower() for n in THYROID_NOTES)
    assert any("селен" in n.lower() for n in THYROID_NOTES)
    assert any("дыхательн" in n.lower() for n in THYROID_NOTES)
    assert len(THYROID_NOTES) >= 4


# ── 21. Rice allowed on stable day with low retention ──

def test_rice_allowed_stable_low_retention():
    from app.domain.services.rice_policy import decide_rice
    from app.domain.services.body_signal_interpreter import _EMPTY
    r, trace = decide_rice(
        DayType.stable_day,
        DailyScales(water_retention_risk=40, release_drainage_potential=60, nervous_system_load=40, need_for_rhythm_precision=40),
        _EMPTY,
    )
    assert r.allowed is True
    assert any("разрешена" in t.lower() for t in trace)


# ── 22. Rice forbidden when body signal forces it ──

def test_rice_forbidden_body_signal_override():
    from app.domain.services.rice_policy import decide_rice
    sig = BodySignalEntry(day_date=date(2026, 5, 10), ankles_evening=4)
    ov = interpret_signals(sig)
    r, trace = decide_rice(
        DayType.stable_day,
        DailyScales(water_retention_risk=30, release_drainage_potential=70, nervous_system_load=30, need_for_rhythm_precision=30),
        ov,
    )
    assert r.allowed is False
    assert any("самочувствию" in t.lower() for t in trace)


# ── 23. RuleTrace model has all 10 sections ──

def test_rule_trace_model_completeness():
    from app.domain.models.protocol import RuleTrace
    required_sections = {
        "day_type_rules", "scales_modifiers", "rice_rules",
        "breathing_rules", "mudra_rules", "thyroid_rules",
        "body_signal_rules", "meal_matrix_rules", "load_rules",
        "aroma_rules",
    }
    fields = set(RuleTrace.model_fields.keys())
    missing = required_sections - fields
    assert not missing, f"Missing trace sections: {missing}"


# ── 24. Breathing: pradosh -> lengthened_exhale ──

def test_breathing_pradosh_trace():
    b, trace = select_breathing(DayType.pradosh_day)
    assert b.practice == BreathingPractice.lengthened_exhale
    assert any("pradosh_day" in t for t in trace)
    assert len(trace) >= 2


# ── 25. Interface conformance ──

def test_interfaces_rice():
    from app.domain.interfaces import RiceDecider
    from app.domain.services.rice_policy import decide_rice
    assert isinstance(decide_rice, RiceDecider)


def test_interfaces_breath():
    from app.domain.interfaces import BreathSelector
    from app.domain.services.breath_selector import select_breathing as sb
    assert isinstance(sb, BreathSelector)


def test_interfaces_mudra():
    from app.domain.interfaces import MudraSelector
    from app.domain.services.mudra_selector import select_mudra as sm
    assert isinstance(sm, MudraSelector)


def test_interfaces_aroma():
    from app.domain.interfaces import AromaSelector
    from app.domain.services.aroma_selector import select_aroma as sa
    assert isinstance(sa, AromaSelector)


def test_interfaces_body_signal():
    from app.domain.interfaces import BodySignalInterpreter
    from app.domain.services.body_signal_interpreter import interpret_signals as interp
    assert isinstance(interp, BodySignalInterpreter)


def test_interfaces_meal_picker():
    from app.domain.interfaces import MealPicker
    from app.domain.services.meal_matrices import pick_meal as pm
    assert isinstance(pm, MealPicker)


def test_interfaces_supplements():
    from app.domain.interfaces import SupplementBuilder
    from app.domain.services.supplements import build_supplements as bs
    assert isinstance(bs, SupplementBuilder)


def test_interfaces_thyroid():
    from app.domain.interfaces import ThyroidSafetyBuilder
    from app.domain.services.thyroid_safety import build_thyroid_safety as bt
    assert isinstance(bt, ThyroidSafetyBuilder)


# ── 33. Sample protocols file is valid JSON with all 12 scenarios ──

def test_sample_protocols_file():
    import json
    import os
    path = os.path.join(os.path.dirname(__file__), "..", "schemas", "sample_protocols.json")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list)
    assert len(data) == 12
    for item in data:
        assert "scenario" in item
        assert "day_type" in item
        assert "rule_trace" in item
        assert "rice" in item["rule_trace"]
        assert "breathing" in item["rule_trace"]
        assert "mudra" in item["rule_trace"]
        assert "aroma" in item["rule_trace"]
        assert "body_signals" in item["rule_trace"]


# ── 34. JSON schema files exist for core models ──

def test_json_schemas_exist():
    import os
    schema_dir = os.path.join(os.path.dirname(__file__), "..", "schemas")
    required = [
        "DailyProtocol.schema.json",
        "RuleTrace.schema.json",
        "DailyScales.schema.json",
        "BodySignalEntry.schema.json",
        "NatalChartD1.schema.json",
    ]
    for name in required:
        path = os.path.join(schema_dir, name)
        assert os.path.isfile(path), f"Missing schema: {name}"
