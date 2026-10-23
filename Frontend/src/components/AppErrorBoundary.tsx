import { Component, type ErrorInfo, type ReactNode } from 'react';

export default class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Render error', error, info.componentStack); }
  render() {
    if (this.state.failed) return <main className="grid min-h-dvh place-items-center bg-gray-50 px-4 text-center text-[#111827]">
      <div><h1 className="text-3xl font-black">No pudimos mostrar esta pantalla</h1><p className="mt-3 text-gray-600">Recarga la aplicación. Si el problema continúa, vuelve al inicio.</p><button onClick={() => window.location.assign('/')} className="mt-6 bg-[#111827] px-6 py-3 font-bold text-white">Volver al inicio</button></div>
    </main>;
    return this.props.children;
  }
}
