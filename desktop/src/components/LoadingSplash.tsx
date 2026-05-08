export function LoadingSplash() {
    return (
        <div className="splash">
            <div className="splash-card">
                <div className="splash-mark">M</div>
                <h1>Mì Làm Văn Phòng</h1>
                <p>Đang khởi động trợ lý AI cho công sở Việt Nam…</p>
                <div className="splash-spinner" aria-hidden="true" />
                <p className="splash-hint">Lần đầu mở app có thể mất 20-30 giây để tải pandas, numpy, scipy.</p>
            </div>
        </div>
    );
}
