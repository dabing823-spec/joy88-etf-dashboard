import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
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
