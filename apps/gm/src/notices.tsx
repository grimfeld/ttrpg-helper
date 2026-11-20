// Toast notices in the main window: several stack, each closes itself or can be dismissed.
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const NOTICE_DURATION_MS = 8000;

interface Notice {
  readonly id: number;
  readonly text: string;
}

type Notify = (text: string) => void;

const NoticesContext = createContext<Notify | null>(null);

export function useNotify(): Notify {
  const notify = useContext(NoticesContext);
  if (notify === null) throw new Error("useNotify needs a NoticesProvider");
  return notify;
}

export function NoticesProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [notices, setNotices] = useState<readonly Notice[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  const notify = useCallback((text: string) => {
    const id = nextId.current++;
    setNotices((current) => [...current, { id, text }]);
  }, []);

  return (
    <NoticesContext.Provider value={notify}>
      {children}
      <ol className="notices" aria-label="Notices">
        {notices.map((notice) => (
          <Toast key={notice.id} notice={notice} onDismiss={dismiss} />
        ))}
      </ol>
    </NoticesContext.Provider>
  );
}

function Toast({
  notice,
  onDismiss,
}: {
  readonly notice: Notice;
  readonly onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notice.id);
    }, NOTICE_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [notice.id, onDismiss]);
  return (
    <li className="notice" role="status">
      <span>{notice.text}</span>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => {
          onDismiss(notice.id);
        }}
      >
        ×
      </button>
    </li>
  );
}
