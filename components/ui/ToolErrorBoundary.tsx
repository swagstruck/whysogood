'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  toolName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ToolErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ToolErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="c-card"
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            background: 'var(--bg-1)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: 600,
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              background: 'var(--neg-subtle)',
              color: 'var(--neg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={26} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
              {this.props.toolName ? `${this.props.toolName} encountered an error` : 'Tool encountered an unexpected error'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              The tool ran into an unhandled condition while processing in your browser. All your data remains private and local.
            </p>
          </div>

          {this.state.error?.message && (
            <div
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--neg)',
                textAlign: 'left',
                overflowX: 'auto',
                maxHeight: 120,
              }}
            >
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button
              variant="primary"
              onClick={this.handleReset}
              icon={<RotateCcw size={15} />}
            >
              Reset Tool
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
