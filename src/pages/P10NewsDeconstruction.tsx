import { useState } from 'react'
import { useData } from '../contexts/DataContext'
import { Badge } from '../components/shared'
import type { NewsAnalysisItem } from '../types'

const categoryColors: Record<string, 'red' | 'green' | 'blue' | 'orange' | 'purple' | 'yellow'> = {
  red: 'red', green: 'green', blue: 'blue', orange: 'orange', purple: 'purple', yellow: 'yellow',
}

function NewsCard({ item, isActive, onClick }: { item: NewsAnalysisItem; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isActive ? 'bg-accent/10 border-accent' : 'bg-card border-border hover:bg-card-hover'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-semibold text-text-primary leading-snug">{item.headline}</span>
        <Badge variant={categoryColors[item.category_color] || 'blue'}>{item.category}</Badge>
      </div>
      <div className="text-xs text-text-muted">{item.source && <>{item.source} | </>}{item.date}</div>
    </button>
  )
}

function LayerSection({ label, badge, color, children }: { label: string; badge: string; color: string; children: React.ReactNode }) {
  return (
    <details open className="mb-3">
      <summary className={`cursor-pointer font-semibold text-sm py-2 px-3 rounded-lg bg-card hover:bg-card-hover border border-border ${color}`}>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold mr-2 ${
          badge === 'L1' ? 'bg-accent/20 text-accent' :
          badge === 'L2' ? 'bg-purple/20 text-purple' :
          'bg-up/20 text-up'
        }`}>{badge}</span>
        {label}
      </summary>
      <div className="mt-2 pl-4 text-sm text-text-muted leading-relaxed space-y-2">
        {children}
      </div>
    </details>
  )
}

function NewsDetail({ item }: { item: NewsAnalysisItem }) {
  const { layer1, layer2, layer3 } = item
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-base font-bold text-text-primary">{item.headline}</h3>
        {item.link && (
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline shrink-0">
            原文
          </a>
        )}
      </div>

      <LayerSection label="表面資訊 — 當前市場環境" badge="L1" color="">
        <div><strong>事件：</strong>{layer1.event}</div>
        <div><strong>數據：</strong>{layer1.data}</div>
        <div><strong>市場反應：</strong>{layer1.market_reaction}</div>
        <div><strong>時間軸：</strong>{layer1.timeline}</div>
      </LayerSection>

      <LayerSection label="隱藏資訊 — 市場定價落差" badge="L2" color="">
        <div><strong>受益者：</strong>{layer2.beneficiaries.join('、')}</div>
        <div><strong>受害者：</strong>{layer2.victims.join('、')}</div>
        <div><strong>定價狀態：</strong>{layer2.pricing_status}</div>
        <div><strong>真實動機：</strong>{layer2.real_motive}</div>
        <div><strong>市場盲點：</strong>{layer2.market_blind_spots}</div>
      </LayerSection>

      <LayerSection label="系統決策 — 基於風險訊號的行動" badge="L3" color="">
        <div><strong>持倉影響：</strong>{layer3.position_impact}</div>
        <div><strong>期望值：</strong>{layer3.expected_value}</div>
        <div><strong>時機：</strong>{layer3.timing}</div>
        <div><strong>風險評估：</strong>{layer3.risk_assessment}</div>
        <div><strong>行動計畫：</strong>{layer3.action_plan}</div>
      </LayerSection>
    </div>
  )
}

export function P10NewsDeconstruction() {
  const { newsAnalysis } = useData()
  const [activeIndex, setActiveIndex] = useState(0)

  const articles = newsAnalysis?.news_analyses || []
  const activeArticle = articles[activeIndex]

  if (articles.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-text-primary">新聞解構</h2>
        <div className="bg-card border border-border rounded-xl p-8 text-center text-text-muted">暫無新聞分析</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-text-primary">📰 新聞解構 — 巨人傑三層次分析</h2>
      {newsAnalysis && (
        <div className="text-xs text-text-muted">更新時間：{newsAnalysis.updated_at} | {newsAnalysis.notebook}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {articles.map((item, i) => (
            <NewsCard key={item.id} item={item} isActive={i === activeIndex} onClick={() => setActiveIndex(i)} />
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          {activeArticle && <NewsDetail item={activeArticle} />}
        </div>
      </div>
    </div>
  )
}
