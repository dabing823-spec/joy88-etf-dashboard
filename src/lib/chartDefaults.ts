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
  accent: '#4f8ef7',
  green: '#00c48c',
  red: '#ff4757',
  orange: '#ffa502',
  purple: '#a855f7',
  cyan: '#22d3ee',
  textMuted: '#8b8fa3',
  grid: 'rgba(42, 46, 61, 0.5)',
  text: '#e4e6eb',
}

export const defaultScaleOptions = {
  ticks: { color: chartColors.textMuted },
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
