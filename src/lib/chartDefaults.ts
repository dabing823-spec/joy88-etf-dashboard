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

export const chartColors = {
  accent: '#e09f3e',
  green: '#22c55e',
  red: '#e54545',
  orange: '#f59e0b',
  purple: '#a855f7',
  cyan: '#22d3ee',
  textMuted: '#7d829a',
  grid: 'rgba(30, 34, 53, 0.5)',
  text: '#e8eaef',
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
