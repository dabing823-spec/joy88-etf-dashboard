export function P9AiQA() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">AI 問答</h2>
      <div className="bg-card rounded-xl border border-border p-6">
        <p className="text-text-muted mb-4">
          使用 NotebookLM 進行 ETF 持股變化的雙視角分析（法人觀點 + 交易者觀點）
        </p>
        <a
          href="https://notebooklm.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          開啟 NotebookLM
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: '持股變化解讀', desc: '為什麼經理人加碼/減碼特定個股？背後的產業邏輯是什麼？' },
          { title: '風險評估', desc: '目前的宏觀風險訊號如何影響 ETF 持股配置？' },
          { title: '策略建議', desc: '根據目前的持股變化趨勢，投資人應該如何調整部位？' },
        ].map((item) => (
          <div key={item.title} className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-bold text-accent mb-2">{item.title}</h3>
            <p className="text-xs text-text-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
