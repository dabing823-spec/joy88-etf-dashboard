export function P9AiQA() {
  const notebookUrl = 'https://notebooklm.google.com/notebook/9bec166a-94f4-45cc-8ef7-59520e8ee192'

  const examples = [
    { emoji: '📊', title: '持股變化解讀', question: '為什麼經理人加碼/減碼特定個股？背後的產業邏輯是什麼？' },
    { emoji: '🛡', title: '風險評估', question: '目前的宏觀風險訊號如何影響 ETF 持股配置？' },
    { emoji: '🎯', title: '策略建議', question: '根據目前的持股變化趨勢，投資人應該如何調整部位？' },
  ]

  function copyQuestion(text: string) {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-text-primary">🤖 AI 問答</h2>

      {/* Hero */}
      <div className="text-center py-8">
        <div className="text-5xl mb-4">🤖</div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">ETF 持股 AI 分析助手</h3>
        <p className="text-text-muted max-w-lg mx-auto mb-6">
          使用 NotebookLM 進行 ETF 持股變化的雙視角分析（法人觀點 + 交易者觀點），基於每日更新的持股數據提供即時洞察。
        </p>
        <a
          href={notebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-6 py-3 bg-accent text-white rounded-lg text-sm font-semibold hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(79,142,247,0.35)] transition-all"
        >
          開啟 NotebookLM →
        </a>
      </div>

      {/* Example Questions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {examples.map((item) => (
          <button
            key={item.title}
            onClick={() => copyQuestion(item.question)}
            className="bg-card rounded-xl border border-border p-5 text-left hover:border-accent hover:-translate-y-1 transition-all group"
          >
            <div className="text-2xl mb-2">{item.emoji}</div>
            <h3 className="text-sm font-bold text-accent mb-2 group-hover:text-white transition-colors">{item.title}</h3>
            <p className="text-xs text-text-muted leading-relaxed">{item.question}</p>
            <div className="text-[10px] text-text-muted mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              點擊複製問題
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
