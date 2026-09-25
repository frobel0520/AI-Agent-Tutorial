import React from "react";

const FALLBACK_TITLE = "頁面暫時無法顯示";
const FALLBACK_MESSAGE = "畫面遇到非預期問題，請重新載入後再試。";

export class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" role="alert" aria-live="assertive">
          <div className="app-error-boundary-card">
            <p className="app-error-boundary-eyebrow">AI AGENT TUTORIAL</p>
            <h1>{FALLBACK_TITLE}</h1>
            <p>{FALLBACK_MESSAGE}</p>
            <button className="primary" type="button" onClick={this.handleReload}>
              重新載入頁面
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
