import { useEffect, useId, useRef } from 'react'
import { Download, Swords } from 'lucide-react'
import type { MoveLogItem } from '../types/chess'

export function MoveHistory({
  history,
  onExport,
}: {
  history: MoveLogItem[]
  onExport: () => void
}) {
  const headingId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [history.length])
  const pairs = Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => ({
    num: index + 1,
    white: history[index * 2],
    black: history[index * 2 + 1],
  }))
  return (
    <section className="panel history-panel" aria-labelledby={headingId}>
      <div className="panel-heading">
        <div className="history-title">
          <h2 id={headingId}>Nước đi</h2>
          <span className="count-badge" data-testid="move-count">
            {history.length}
          </span>
        </div>
        <button
          className="icon-button"
          onClick={onExport}
          disabled={!history.length}
          title="Tải biên bản PGN"
          aria-label="Tải biên bản PGN"
        >
          <Download size={16} />
        </button>
      </div>
      <div className="history-columns" aria-hidden="true">
        <span>#</span>
        <span>
          <i className="color-dot w" />
          Trắng
        </span>
        <span>
          <i className="color-dot b" />
          Đen
        </span>
      </div>
      <div
        ref={scrollRef}
        className="history-scroll"
        tabIndex={history.length > 6 ? 0 : -1}
        role="region"
        aria-label="Biên bản nước đi"
      >
        {!pairs.length ? (
          <div className="history-empty">
            <div className="empty-icon">
              <Swords size={23} strokeWidth={1.3} />
            </div>
            <strong>Mọi câu chuyện đều có nước đầu tiên.</strong>
            <p>Đi một nước cờ. Viết câu chuyện của bạn.</p>
          </div>
        ) : (
          pairs.map((pair) => (
            <div key={pair.num} className="history-row">
              <span>{pair.num.toString().padStart(2, '0')}</span>
              <span className={history.length === pair.num * 2 - 1 ? 'latest-move' : ''}>
                {pair.white?.san}
              </span>
              <span className={history.length === pair.num * 2 ? 'latest-move' : ''}>
                {pair.black?.san ?? '—'}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="history-footer">
        <span className="live-dot" />
        {history.length
          ? `${Math.ceil(history.length / 2)} lượt · Ký hiệu chuẩn SAN`
          : 'Sẵn sàng cho nước đi đầu tiên'}
      </div>
    </section>
  )
}
