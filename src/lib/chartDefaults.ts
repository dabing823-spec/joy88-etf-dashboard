import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import annotationPlugin from 'chartjs-plugin-annotation'

// Register only what is used across the app:
// Line (P1, P4, P8) → CategoryScale, LinearScale, PointElement, LineElement, Filler
// Bar  (P3, P4, P5) → BarElement
// Doughnut (P3)     → ArcElement
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin,
)

import { palette } from './constants'

export const chartColors = {
  accent: palette.accent,
  green: palette.down,
  red: palette.up,
  orange: palette.warning,
  purple: palette.purple,
  cyan: palette.cyan,
  textMuted: palette.textMuted,
  grid: palette.grid,
  text: palette.text,
}

ChartJS.defaults.font.family = "'JetBrains Mono', 'SF Mono', monospace"

export const defaultScaleOptions = {
  ticks: { color: chartColors.textMuted, font: { family: "'JetBrains Mono', monospace" } },
  grid: { color: chartColors.grid },
}

export const defaultPluginOptions = {
  legend: {
    labels: { color: chartColors.textMuted, font: { size: 11 } },
  },
  zoom: {
    pan: { enabled: true, mode: 'x' as const },
    zoom: {
      wheel: { enabled: true },
      pinch: { enabled: true },
      mode: 'x' as const,
    },
  },
}
