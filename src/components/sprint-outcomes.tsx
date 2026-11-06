import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ExternalLink,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  FEEDBACK_LIMIT,
  OUTCOME_LIMIT,
  SAFE_URL_PATTERN,
} from "../lib/domain.mjs";

type Item = Record<string, any>;
// Resolves to null on success, or a user-facing error message on failure.
export type OutcomeAction = (
  command: Item,
  message: string,
) => Promise<string | null>;

type Draft = {
  title: string;
  url: string;
  contribution: string;
  reflection: string;
};
const blank: Draft = { title: "", url: "", contribution: "", reflection: "" };

const when = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const stamp = (ms: number) =>
  Number.isFinite(ms) ? when.format(new Date(ms)) : "";

// Only links that still pass the shared HTTPS pattern become clickable;
// anything else (for example tampered browser storage) renders as plain text.
function safeHref(url: unknown) {
  return typeof url === "string" && SAFE_URL_PATTERN.test(url) ? url : null;
}
function linkLabel(url: string) {
  try {
    const u = new URL(url);
    const label = `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}`;
    return label.length > 52 ? `${label.slice(0, 51)}…` : label;
  } catch {
    return url;
  }
}

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.trim().length;
  return (
    <span
      className={n > max ? "char-count over" : "char-count"}
      aria-hidden="true"
    >
      {n}/{max}
    </span>
  );
}

function OutcomeForm({
  initial = blank,
  submitLabel,
  savingLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: Draft;
  submitLabel: string;
  savingLabel: string;
  busy: boolean;
  onSubmit: (d: Draft) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || busy) return;
    setSaving(true);
    setError("");
    const failure = await onSubmit(draft);
    setSaving(false);
    // Keep everything the person typed when saving fails.
    if (failure) setError(failure);
    else setDraft(blank);
  }
  return (
    <form className="outcome-form" onSubmit={submit} aria-busy={saving}>
      <label htmlFor={`${id}-title`}>
        <span>
          결과물 이름 <Counter value={draft.title} max={80} />
        </span>
        <input
          id={`${id}-title`}
          value={draft.title}
          onChange={set("title")}
          required
          minLength={3}
          maxLength={80}
          placeholder="예: 30초 테스트 영상 1차본"
        />
      </label>
      <label htmlFor={`${id}-url`}>
        <span>결과물 링크</span>
        <input
          id={`${id}-url`}
          type="url"
          inputMode="url"
          value={draft.url}
          onChange={set("url")}
          required
          maxLength={2048}
          pattern="https://.*"
          placeholder="https://"
          aria-describedby={`${id}-url-note`}
        />
        <small id={`${id}-url-note`} className="field-note">
          https:// 로 시작하는 공유 링크 하나 (Google Drive, Figma, YouTube 등).
          링크는 팀원에게만 보여요.
        </small>
      </label>
      <label htmlFor={`${id}-contribution`} className="wide">
        <span>
          내가 기여한 부분 <Counter value={draft.contribution} max={500} />
        </span>
        <textarea
          id={`${id}-contribution`}
          value={draft.contribution}
          onChange={set("contribution")}
          required
          minLength={10}
          maxLength={500}
          rows={3}
          placeholder="이번 결과물에서 내가 맡아서 한 일"
        />
      </label>
      <label htmlFor={`${id}-reflection`} className="wide">
        <span>
          돌아보기 <Counter value={draft.reflection} max={1000} />
        </span>
        <textarea
          id={`${id}-reflection`}
          value={draft.reflection}
          onChange={set("reflection")}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          placeholder="잘 된 점, 어려웠던 점, 다음에 바꿔볼 것"
        />
      </label>
      {error && (
        <p className="form-error wide" role="alert">
          {error} 입력한 내용은 그대로 남아 있어요.
        </p>
      )}
      <div className="form-actions wide">
        <button className="btn primary small" disabled={saving || busy}>
          {saving ? savingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn secondary small"
            onClick={onCancel}
            disabled={saving}
          >
            취소
          </button>
        )}
      </div>
    </form>
  );
}

function FeedbackForm({
  outcome,
  busy,
  run,
  full,
}: {
  outcome: Item;
  busy: boolean;
  run: OutcomeAction;
  full: boolean;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (full)
    return (
      <p className="muted feedback-full">
        피드백은 결과물마다 {FEEDBACK_LIMIT}개까지 남길 수 있어요.
      </p>
    );
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || busy) return;
    setSaving(true);
    setError("");
    const failure = await run(
      {
        type: "feedback.create",
        projectId: outcome.projectId,
        outcomeId: outcome.id,
        outcomeCreatedAt: outcome.createdAt,
        body,
      },
      "피드백을 남겼어요.",
    );
    setSaving(false);
    if (failure) setError(failure);
    else setBody("");
  }
  return (
    <form className="feedback-form" onSubmit={submit} aria-busy={saving}>
      <label htmlFor={`${id}-body`}>
        <span>
          피드백 남기기 <Counter value={body} max={500} />
        </span>
        <textarea
          id={`${id}-body`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={5}
          maxLength={500}
          rows={2}
          placeholder="좋았던 점 하나, 다음에 시도해 볼 점 하나"
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error} 입력한 내용은 그대로 남아 있어요.
        </p>
      )}
      <button className="btn secondary small" disabled={saving || busy}>
        {saving ? "남기는 중…" : "피드백 보내기"}
      </button>
    </form>
  );
}

function OutcomeCard({
  outcome: o,
  world,
  actor,
  busy,
  run,
}: {
  outcome: Item;
  world: Item;
  actor: string;
  busy: boolean;
  run: OutcomeAction;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);
  const mine = o.userId === actor;
  const name = (uid: string) =>
    world.profiles?.[uid]?.name ?? (uid === actor ? "나" : "팀원");
  const notes: Item[] = (world.feedback ?? [])
    .filter((f: Item) => f.outcomeId === o.id && f.projectId === o.projectId)
    .sort((a: Item, b: Item) => a.createdAt - b.createdAt);
  const href = safeHref(o.url);
  const titleId = useId();
  async function remove() {
    setDeleting(true);
    setError("");
    const failure = await run(
      { type: "outcome.delete", projectId: o.projectId, outcomeId: o.id },
      "결과물을 삭제했어요.",
    );
    if (failure) {
      setDeleting(false);
      setError(failure);
    }
  }
  if (editing)
    return (
      <article className="outcome-card editing" aria-label={`${o.title} 수정`}>
        <OutcomeForm
          initial={{
            title: o.title,
            url: o.url,
            contribution: o.contribution,
            reflection: o.reflection,
          }}
          submitLabel="수정 저장"
          savingLabel="저장 중…"
          busy={busy}
          onCancel={() => setEditing(false)}
          onSubmit={async (d) => {
            const failure = await run(
              {
                type: "outcome.update",
                projectId: o.projectId,
                outcomeId: o.id,
                outcome: d,
              },
              "결과물을 수정했어요.",
            );
            if (!failure) setEditing(false);
            return failure;
          }}
        />
      </article>
    );
  return (
    <article className="outcome-card" aria-labelledby={titleId}>
      <header className="outcome-head">
        <div>
          <h4 id={titleId}>{o.title}</h4>
          <p className="outcome-meta">
            <strong>{name(o.userId)}</strong>
            {mine && <span className="mine-badge">내 결과물</span>}
            <span>
              <time dateTime={new Date(o.createdAt).toISOString()}>
                {stamp(o.createdAt)}
              </time>
              {o.updatedAt > o.createdAt && " · 수정됨"}
            </span>
          </p>
        </div>
        {mine && !confirming && (
          <div className="outcome-tools">
            <button
              type="button"
              className="btn secondary small"
              onClick={() => setEditing(true)}
              disabled={busy}
            >
              <Pencil size={13} aria-hidden="true" /> 수정
            </button>
            <button
              type="button"
              className="btn secondary small danger"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              <Trash2 size={13} aria-hidden="true" /> 삭제
            </button>
          </div>
        )}
      </header>
      {confirming && (
        <div
          className="confirm-delete"
          role="alertdialog"
          aria-label="삭제 확인"
        >
          <p>
            이 결과물
            {notes.length ? `과 피드백 ${notes.length}개를` : "을"} 삭제할까요?
            되돌릴 수 없어요.
          </p>
          <div>
            <button
              type="button"
              ref={confirmRef}
              className="btn small danger-solid"
              onClick={remove}
              disabled={deleting || busy}
            >
              {deleting ? "삭제 중…" : "삭제하기"}
            </button>
            <button
              type="button"
              className="btn secondary small"
              onClick={() => {
                setConfirming(false);
                setError("");
              }}
              disabled={deleting}
            >
              취소
            </button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
      {href ? (
        <a
          className="outcome-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={14} aria-hidden="true" />
          <span>{linkLabel(href)}</span>
          <span className="sr-only"> (새 탭에서 열림)</span>
        </a>
      ) : (
        <p className="outcome-link invalid">{String(o.url ?? "")}</p>
      )}
      <dl className="outcome-body">
        <div>
          <dt>내가 기여한 부분</dt>
          <dd>{o.contribution}</dd>
        </div>
        <div>
          <dt>돌아보기</dt>
          <dd>{o.reflection}</dd>
        </div>
      </dl>
      <section className="feedback" aria-label={`${o.title}에 대한 피드백`}>
        <h5>
          <MessageSquare size={14} aria-hidden="true" /> 피드백 {notes.length}
        </h5>
        {notes.length > 0 && (
          <ul>
            {notes.map((f) => (
              <li key={f.id}>
                <p className="outcome-meta">
                  <strong>{name(f.userId)}</strong>
                  <time dateTime={new Date(f.createdAt).toISOString()}>
                    {stamp(f.createdAt)}
                  </time>
                </p>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        )}
        <FeedbackForm
          outcome={o}
          busy={busy}
          run={run}
          full={notes.length >= FEEDBACK_LIMIT}
        />
      </section>
    </article>
  );
}

export function SprintOutcomes({
  projectId,
  world,
  actor,
  busy,
  run,
}: {
  projectId: string;
  world: Item;
  actor: string;
  busy: boolean;
  run: OutcomeAction;
}) {
  const [adding, setAdding] = useState(false);
  const headingId = useId();
  const outcomes: Item[] = (world.outcomes ?? [])
    .filter((o: Item) => o.projectId === projectId)
    .sort((a: Item, b: Item) => b.createdAt - a.createdAt);
  const full = outcomes.length >= OUTCOME_LIMIT;
  return (
    <section className="outcomes" aria-labelledby={headingId}>
      <header className="outcomes-head">
        <div>
          <span className="pill">첫 결과물</span>
          <h3 id={headingId}>만든 것을 남기고, 서로 피드백해요.</h3>
          <p>팀원만 볼 수 있어요.</p>
        </div>
        <span className="outcomes-count">
          {outcomes.length}/{OUTCOME_LIMIT}
        </span>
      </header>
      {!outcomes.length && !adding && (
        <p className="outcomes-empty">
          첫 번째 결과물을 남겨봐. 작은 초안도 좋아.
        </p>
      )}
      {adding ? (
        <div className="outcome-card new">
          <OutcomeForm
            submitLabel="결과물 남기기"
            savingLabel="저장 중…"
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={async (d) => {
              const failure = await run(
                { type: "outcome.create", projectId, outcome: d },
                "결과물을 남겼어요.",
              );
              if (!failure) setAdding(false);
              return failure;
            }}
          />
        </div>
      ) : full ? (
        <p className="muted">
          결과물은 팀마다 {OUTCOME_LIMIT}개까지 남길 수 있어요. 예전 결과물을
          정리하면 새로 남길 수 있어요.
        </p>
      ) : (
        <button
          type="button"
          className="btn primary small add-outcome"
          onClick={() => setAdding(true)}
          disabled={busy}
        >
          <Plus size={15} aria-hidden="true" /> 결과물 남기기
        </button>
      )}
      {outcomes.map((o) => (
        <OutcomeCard
          key={`${o.id}-${o.createdAt}`}
          outcome={o}
          world={world}
          actor={actor}
          busy={busy}
          run={run}
        />
      ))}
    </section>
  );
}
