import { Heart, RefreshCw } from "lucide-react";
import { APP_RELEASE, type useAppUpdate } from "../../hooks/useAppUpdate";
export function SiteFooter({
  update,
}: {
  update: ReturnType<typeof useAppUpdate>;
}) {
  return (
    <>
      {" "}
      <footer className="site-footer">
        <span>64 ô cờ. Vô vàn câu chuyện.</span>
        <div>
          <span className="footer-love">
            Made for two
            <Heart size={11} />
          </span>
          <button
            className="build-version"
            onClick={() => void update.check()}
            aria-label="Kiểm tra cập nhật"
            title={`Bản ${APP_RELEASE.version} · ${APP_RELEASE.builtAt}`}
          >
            <RefreshCw
              size={11}
              className={update.status === "checking" ? "spinning" : ""}
            />
            {APP_RELEASE.revision}
          </button>
        </div>
      </footer>
      {update.status === "current" && !update.available && (
        <span className="sr-only" role="status">
          Bạn đang dùng bản mới nhất.
        </span>
      )}
      {update.status === "error" && (
        <div className="update-check-error" role="status">
          Chưa kiểm tra được cập nhật. Bạn có thể thử lại ở mã phiên bản cuối
          trang.
        </div>
      )}
    </>
  );
}
