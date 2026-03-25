import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="text-text-muted text-sm">頁面載入失敗</div>
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:bg-accent/80 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              重試
            </button>
            <button
              onClick={this.handleReload}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-card border border-border text-text-muted hover:text-text-primary hover:bg-card-hover transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            >
              重新整理
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
