'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  sectionName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

export class PosErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('POS Component Runtime Error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[300px] rounded-2xl border border-destructive/30 bg-destructive/5 space-y-4">
          <div className="size-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center">
            <AlertTriangle className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              В модуле {this.props.sectionName ? `«${this.props.sectionName}»` : 'кассы'} произошла ошибка
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Данные ваших заказов, столов и кассовой смены в полной безопасности. 
              Остальные модули кассы продолжают работать автономно.
            </p>
            {this.state.error && (
              <pre className="mt-3 p-2 rounded-lg bg-black/40 text-[10px] font-mono text-destructive text-left overflow-x-auto max-w-lg mx-auto">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition cursor-pointer touch-manipulation shadow-md"
          >
            <RefreshCw className="size-3.5" />
            <span>Перезапустить этот модуль</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
