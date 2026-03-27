import { Link } from 'react-router-dom'

const features = [
  { icon: 'P', color: 'bg-accent/10 text-accent', title: '經理人持股追蹤', desc: '每日追蹤 5 檔主動式 ETF (00981A、00991A 等) 持股變化，掌握經理人買賣動向' },
  { icon: '8', color: 'bg-up/10 text-up', title: '8 大風險訊號', desc: '基於學術研究的宏觀風險預警系統，追蹤 VIX、SPY/JPY 套利平倉、HYG/TLT 流動性等指標' },
  { icon: '50', color: 'bg-down/10 text-down', title: '0050 吃豆腐策略', desc: '市值排名預測 0050 成分股調整，提前佈局潛在納入標的' },
  { icon: 'AI', color: 'bg-warning/10 text-warning', title: 'AI 雙視角分析', desc: 'NotebookLM 驅動的法人視角 + 交易者視角每日分析報告' },
]

const signals = [
  { label: 'VIX 趨勢', value: '警戒', level: 'red' as const, desc: '加速上升中，偏離均值 1.8 sigma' },
  { label: 'SPY/JPY 套利平倉壓力', value: '警戒', level: 'red' as const, desc: '日圓急升觸發 carry trade 平倉風險' },
  { label: '流動性枯竭', value: '正常', level: 'green' as const, desc: 'HYG/TLT 利差穩定，流動性充裕' },
]

const steps = [
  { num: 1, title: '資料抓取', desc: '每日自動從 TWSE、TAIFEX、Yahoo Finance 等來源抓取最新數據' },
  { num: 2, title: '風險驗證', desc: '3 Agent 系統：Data Agent 抓取 / Validator Agent 驗證 / Signal Agent 計算' },
  { num: 3, title: '訊號推播', desc: '風險燈號即時更新，異動通知直達手機' },
]

const plans = [
  { name: 'Free', price: 'NT$0', popular: false, features: ['基本儀表板瀏覽', '數據延遲 1 天', '8 大風險訊號（概覽）', '0050 成分股排名'], btnText: '免費開始', btnStyle: 'border border-accent text-accent hover:bg-accent hover:text-white' },
  { name: 'Pro', price: 'NT$299', popular: true, features: ['全功能即時數據', '每日風險訊號推播', 'AI 雙視角分析報告', '經理人持股異動通知', '歷史數據回測'], btnText: '立即升級', btnStyle: 'bg-accent text-white hover:opacity-90' },
  { name: 'Premium', price: 'NT$799', popular: false, features: ['完整 API 存取', '自訂 Watchlist', '優先客服支援', '自訂風險門檻', '批量資料匯出'], btnText: '聯絡我們', btnStyle: 'border border-accent text-accent hover:bg-accent hover:text-white' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-border h-14 flex items-center justify-between px-8">
        <span className="text-base font-bold text-accent">JOY88</span>
        <div className="flex gap-6 text-sm">
          <a href="#features" className="text-text-muted hover:text-text-primary transition-colors">功能</a>
          <a href="#signals" className="text-text-muted hover:text-text-primary transition-colors">風險訊號</a>
          <a href="#how" className="text-text-muted hover:text-text-primary transition-colors">運作方式</a>
          <a href="#pricing" className="text-text-muted hover:text-text-primary transition-colors">方案</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14" style={{ background: 'linear-gradient(170deg, var(--color-bg) 40%, var(--color-card-hover) 70%, var(--color-bg) 100%)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-[fadeUp_0.7s_ease_both]">
          <span className="text-accent">JOY88</span> 主動式 ETF 追蹤儀表板
        </h1>
        <p className="text-lg text-text-muted max-w-xl mb-8 animate-[fadeUp_0.7s_ease_0.15s_both]">
          掌握經理人持股異動，提前捕捉市場風險訊號
        </p>
        <Link to="/dashboard" className="inline-block px-8 py-3 bg-accent text-white rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(224,159,62,0.35)] transition-all animate-[fadeUp_0.7s_ease_0.3s_both]">
          立即體驗
        </Link>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">核心功能</h2>
        <p className="text-center text-text-muted mb-12">為台股投資人打造的專業追蹤工具</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 hover:border-accent transition-all">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold mb-3 ${f.color}`}>{f.icon}</div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Preview */}
      <section className="py-20 px-6 max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">儀表板預覽</h2>
        <p className="text-center text-text-muted mb-12">即時掌握市場全貌</p>
        <div className="bg-card border border-border rounded-2xl min-h-[340px] flex items-center justify-center text-text-muted relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
          <span className="relative z-10">Dashboard Preview</span>
        </div>
      </section>

      {/* Signals */}
      <section id="signals" className="py-20 px-6 max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">多維風險評估</h2>
        <p className="text-center text-text-muted mb-12">融合一階導數（速度）、二階導數（加速度）與統計機率的多維風險評估</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {signals.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-6 text-center">
              <div className={`w-3.5 h-3.5 rounded-full mx-auto mb-2 ${s.level === 'red' ? 'bg-up shadow-[0_0_8px_var(--color-up)]' : 'bg-down shadow-[0_0_8px_var(--color-down)]'}`} />
              <div className="text-xs text-text-muted mb-1">{s.label}</div>
              <div className={`text-2xl font-bold mb-1 ${s.level === 'red' ? 'text-up' : 'text-down'}`}>{s.value}</div>
              <p className="text-xs text-text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-6 max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">運作方式</h2>
        <p className="text-center text-text-muted mb-12">三步驟自動化 Pipeline</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map(s => (
            <div key={s.num} className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent text-white inline-flex items-center justify-center text-lg font-bold mb-4">{s.num}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2">選擇方案</h2>
        <p className="text-center text-text-muted mb-12">從免費開始，隨需升級</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {plans.map(p => (
            <div key={p.name} className={`bg-card border rounded-xl p-8 text-center relative hover:-translate-y-1 transition-all ${p.popular ? 'border-accent' : 'border-border'}`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">最受歡迎</span>
              )}
              <h3 className="font-semibold mb-1">{p.name}</h3>
              <div className={`text-3xl font-extrabold my-3 ${p.popular ? 'text-accent' : ''}`}>{p.price}</div>
              <div className="text-sm text-text-muted mb-5">每月</div>
              <ul className="text-left mb-6 space-y-2">
                {p.features.map(f => (
                  <li key={f} className="text-sm text-text-muted py-1 border-b border-border">
                    <span className="text-accent font-bold mr-1">/</span>{f}
                  </li>
                ))}
              </ul>
              <Link to="/dashboard" className={`inline-block px-6 py-2 rounded-lg text-sm font-semibold transition-all ${p.btnStyle}`}>
                {p.btnText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center text-sm text-text-muted">
        <div className="mb-3 space-x-6">
          <a href="#" className="hover:text-text-primary transition-colors">免責聲明</a>
          <a href="#" className="hover:text-text-primary transition-colors">隱私政策</a>
          <a href="#" className="hover:text-text-primary transition-colors">服務條款</a>
        </div>
        <p>JOY88 ETF Dashboard 2025-2026</p>
        <p className="text-xs mt-1 opacity-60">Powered by Wolf Pack Agent Pipeline</p>
      </footer>
    </div>
  )
}
