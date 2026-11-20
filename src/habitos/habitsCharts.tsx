// src/habitos/habitsCharts.tsx — Componentes Chart.js com limpeza segura e suporte reativo a tema claro/escuro
import { useEffect, useRef, useState } from 'react';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { fmtDate, WEEKDAYS_SHORT } from './habitsStorage';
import type { BodyMetric } from './habitsTypes';

export interface ChartThemeColors {
  accent: string;
  success: string;
  warning: string;
  danger: string;
  muted: string;
  info: string;
  border: string;
  fontBody: string;
  palette: string[];
  soft: (hex: string, alpha?: number) => string;
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

export function hexAlpha(hex: string, alpha = 0.12): string {
  const h = (hex || '').replace('#', '').trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (h.length !== 6) return hex;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return hex;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function getChartThemeColors(): ChartThemeColors {
  const accent = cssVar('--accent-fill', '#5F7A52');
  const success = cssVar('--success', '#2F6B3A');
  const warning = cssVar('--warning', '#7A4E16');
  const danger = cssVar('--danger', '#A4443F');
  const muted = cssVar('--muted', '#5B6659');
  const info = cssVar('--info', '#2F5F7E');
  const accentDark = cssVar('--accent-dark', '#2F4A2A');
  const border = cssVar('--border', '#E3DACA');
  const fontBody = cssVar('--font-body', 'Figtree, system-ui, sans-serif');

  return {
    accent,
    success,
    warning,
    danger,
    muted,
    info,
    border,
    fontBody,
    palette: [accent, muted, success, warning, danger, info, accentDark],
    soft: (c: string, a = 0.12) => hexAlpha(c, a),
  };
}

export function useChartEnvironment(): { themeTick: number; isMobile: boolean } {
  const [themeTick, setThemeTick] = useState(0);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 600 : false
  );

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const observer = new MutationObserver(() => {
      setThemeTick(t => t + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    let rzTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(rzTimer);
      rzTimer = setTimeout(() => {
        setIsMobile(window.innerWidth < 600);
      }, 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      observer.disconnect();
      clearTimeout(rzTimer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { themeTick, isMobile };
}

function applyChartDefaults(colors: ChartThemeColors) {
  Chart.defaults.color = colors.muted;
  Chart.defaults.borderColor = colors.border;
  Chart.defaults.font.family = colors.fontBody;
}

// ── 1. Evolução Corporal (chartBody) ──────────────────────────────────────────
export function BodyEvolutionChart({ rows }: { rows: BodyMetric[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rows.length) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const labels = rows.map(r => fmtDate(r.recorded_at));
    const datasets: ChartConfiguration<'line', Array<number | null>, string>['data']['datasets'] = [];

    const w = rows.map(r => r.weight_kg);
    if (w.some(v => v != null)) {
      datasets.push({
        label: 'Peso (kg)',
        data: w,
        borderColor: colors.accent,
        backgroundColor: colors.soft(colors.accent),
        tension: 0.3,
        pointRadius: 4,
        spanGaps: true,
        yAxisID: 'y',
      });
    }

    const mu = rows.map(r => r.muscle_pct);
    if (mu.some(v => v != null)) {
      datasets.push({
        label: 'Músculo (%)',
        data: mu,
        borderColor: colors.success,
        backgroundColor: colors.soft(colors.success),
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true,
        yAxisID: 'y1',
      });
    }

    const fa = rows.map(r => r.fat_pct);
    if (fa.some(v => v != null)) {
      datasets.push({
        label: 'Gordura (%)',
        data: fa,
        borderColor: colors.warning,
        backgroundColor: colors.soft(colors.warning),
        tension: 0.3,
        pointRadius: 3,
        spanGaps: true,
        yAxisID: 'y1',
      });
    }

    const chart = new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'kg' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: '%' },
            min: 0,
            max: 100,
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [rows, themeTick]);

  if (!rows.length) {
    return <div className="empty">Registre medições para visualizar o gráfico de evolução.</div>;
  }

  return (
    <div className="chart-box" style={{ height: 280 }}>
      <canvas ref={canvasRef} id="chartBody" />
    </div>
  );
}

// ── 2. Pontuação Diária 30d (chartDaily) ──────────────────────────────────────
export function DailyScoreChart({
  dates,
  scores,
}: {
  dates: string[];
  scores: Array<number | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dates.map(fmtDate),
        datasets: [
          {
            label: 'Pontuação %',
            data: scores,
            borderColor: colors.accent,
            backgroundColor: colors.soft(colors.accent),
            fill: true,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [dates, scores, themeTick, isMobile]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartDaily" />
    </div>
  );
}

// ── 3. Cumprimento da Dieta 30d (chartDietDaily) ──────────────────────────────
export function DietDailyChart({
  dates,
  scores,
}: {
  dates: string[];
  scores: Array<number | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: dates.map(fmtDate),
        datasets: [
          {
            label: 'Dieta %',
            data: scores,
            borderColor: colors.muted,
            backgroundColor: colors.soft(colors.muted),
            fill: true,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [dates, scores, themeTick, isMobile]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartDietDaily" />
    </div>
  );
}

// ── 4. Cumprimento por Refeição (chartMealsCompliance) ────────────────────────
export function MealsComplianceChart({
  items,
}: {
  items: Array<{ name: string; pct: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const axis = isMobile ? 'y' : 'x';
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map(m => m.name),
        datasets: [
          {
            label: '% cumprimento',
            data: items.map(m => m.pct),
            backgroundColor: colors.muted,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: axis,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: isMobile ? { x: { min: 0, max: 100 } } : { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [items, themeTick, isMobile]);

  if (!items.length) {
    return <div className="empty">Sem plano alimentar cadastrado.</div>;
  }

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartMealsCompliance" />
    </div>
  );
}

// ── 5. Cumprimento por Hábito (chartHabits) ───────────────────────────────────
export function HabitsComplianceChart({
  items,
}: {
  items: Array<{ name: string; pct: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const axis = isMobile ? 'y' : 'x';
    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map(h => h.name),
        datasets: [
          {
            label: '% Cumprimento',
            data: items.map(h => h.pct),
            backgroundColor: colors.accent,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: axis,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: isMobile ? { x: { min: 0, max: 100 } } : { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [items, themeTick, isMobile]);

  if (!items.length) {
    return <div className="empty">Sem hábitos cadastrados.</div>;
  }

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartHabits" />
    </div>
  );
}

// ── 6. Média por Dia da Semana (chartWeekday) ─────────────────────────────────
export function WeekdayAvgChart({ values }: { values: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [...WEEKDAYS_SHORT],
        datasets: [{ label: 'Média %', data: values, backgroundColor: colors.success }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [values, themeTick, isMobile]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartWeekday" />
    </div>
  );
}

// ── 7. Erros por Dia da Semana (chartWeekdayFails) ────────────────────────────
export function WeekdayFailsChart({ values }: { values: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [...WEEKDAYS_SHORT],
        datasets: [{ label: 'Erros', data: values, backgroundColor: colors.danger }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [values, themeTick, isMobile]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartWeekdayFails" />
    </div>
  );
}

// ── 8. Motivos de Erro (chartReason) ──────────────────────────────────────────
export function ReasonDoughnutChart({
  items,
}: {
  items: Array<{ label: string; count: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.label),
        datasets: [
          {
            data: items.map(i => i.count),
            backgroundColor: items.map((_, idx) => colors.palette[idx % colors.palette.length]),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [items, themeTick, isMobile]);

  if (!items.length) {
    return <div className="empty">Nenhum erro com motivo registrado.</div>;
  }

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartReason" />
    </div>
  );
}

// ── 9. Erros por Refeição (chartMeal) ─────────────────────────────────────────
export function MealFailsChart({
  items,
}: {
  items: Array<{ label: string; count: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !items.length) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: items.map(i => i.label),
        datasets: [
          {
            label: 'Erros',
            data: items.map(i => i.count),
            backgroundColor: colors.warning,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [items, themeTick, isMobile]);

  if (!items.length) {
    return <div className="empty">Nenhum erro por refeição registrado.</div>;
  }

  return (
    <div className="chart-box">
      <canvas ref={canvasRef} id="chartMeal" />
    </div>
  );
}

// ── 10. Tendência Geral (chartTrend) ──────────────────────────────────────────
export function TrendLineChart({
  labels,
  values,
  trendLine,
  weeklyChange,
}: {
  labels: string[];
  values: Array<number | null>;
  trendLine: number[];
  weeklyChange: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { themeTick, isMobile } = useChartEnvironment();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = getChartThemeColors();
    applyChartDefaults(colors);

    const trendColor =
      weeklyChange > 1 ? colors.success : weeklyChange < -1 ? colors.danger : colors.muted;

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Real',
            data: values,
            borderColor: colors.accent,
            backgroundColor: colors.soft(colors.accent),
            fill: true,
            tension: 0.3,
            spanGaps: true,
            pointRadius: 2,
          },
          {
            label: 'Tendência',
            data: trendLine,
            borderColor: trendColor,
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: isMobile ? 10 : 14, font: { size: isMobile ? 10 : 12 } },
          },
        },
        scales: { y: { min: 0, max: 100 } },
      },
    });

    return () => {
      chart.destroy();
    };
  }, [labels, values, trendLine, weeklyChange, themeTick, isMobile]);

  return (
    <div className="chart-box" style={{ marginTop: 14 }}>
      <canvas ref={canvasRef} id="chartTrend" />
    </div>
  );
}
