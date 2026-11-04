"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Plus,
  Compass,
  Bookmark,
  Users,
  Layers,
  Clock,
  Globe,
  Check,
  CheckCircle2,
  X,
  ChevronRight,
  Flag,
  MessageSquare,
  CalendarDays,
  SlidersHorizontal,
  Sparkles,
  RefreshCw,
  Settings2,
  Menu,
  MoveUpRight,
  ExternalLink,
  Leaf,
  Film,
  BookOpen,
  Code2,
  Heart,
  GraduationCap,
} from "lucide-react";
import { categories, skills, modes, getMatch } from "../lib/domain.mjs";
type Item = Record<string, any>;
const nav = [
  ["discover", "프로젝트 발견", Compass],
  ["saved", "저장한 프로젝트", Bookmark],
  ["activity", "나의 지원", MessageSquare],
  ["teams", "우리 팀 · 첫 주", Users],
  ["manage", "모집 관리", Layers],
] as const;
const labels: Record<string, string> = {
  pending: "검토 중",
  accepted: "팀 합류",
  rejected: "이번엔 함께하지 못했어요",
  withdrawn: "지원 취소",
};
function Emblem() {
  return (
    <span className="emblem">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
function Art({
  color = "coral",
  small = false,
}: {
  color?: string;
  small?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`project-art ${color} ${small ? "small-art" : ""}`}
    >
      <div className="art-grid" />
      <div className="art-orbit" />
      <div className="art-paper">
        <span className="art-stamp">
          MAKE
          <br />
          SOMETHING
          <br />
          TOGETHER.
        </span>
        <span className="art-line" />
        <span className="art-line short" />
      </div>
      <div className="art-shape">
        <Emblem />
      </div>
      <span className="art-star">✳</span>
      <span className="art-caption">A LITTLE IDEA. A REAL BEGINNING.</span>
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      aria-label={title}
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="닫기" onClick={onClose}>
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Emblem />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export default function Crosscampus() {
  const [data, setData] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [mode, setMode] = useState("demo"),
    [actor, setActor] = useState("demo-jin"),
    [view, setView] = useState("discover"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("전체"),
    [roleFilter, setRoleFilter] = useState("전체 역할"),
    [timeFilter, setTimeFilter] = useState("전체 시간"),
    [sort, setSort] = useState("추천순"),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [mobileNav, setMobileNav] = useState(false),
    [revision, setRevision] = useState(0);
  const endpoint = `/api/world?mode=${mode}&actor=${encodeURIComponent(actor)}`;
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    fetch(endpoint, { signal: controller.signal })
      .then(async (r) => {
        const d = (await r.json()) as Item;
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [endpoint, revision]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  async function action(command: Item, message = "저장했어요.") {
    if (busy) return false;
    setBusy(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const d = (await r.json()) as Item;
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setToast(message);
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장하지 못했어요.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const world = data?.world,
    me = world?.profiles[data?.actor],
    activeActor = data?.actor ?? actor,
    projects: Item[] = world?.projects ?? [],
    apps: Item[] = world?.applications ?? [],
    saved: string[] = world?.bookmarks[activeActor] ?? [],
    selectedProject = projects.find((p) => p.id === selected),
    owned = projects.filter((p) => p.ownerId === activeActor),
    incoming = apps.filter(
      (a) => a.status === "pending" && owned.some((p) => p.id === a.projectId),
    );
  const filtered = projects
    .filter(
      (p) =>
        (view !== "saved" || saved.includes(p.id)) &&
        (category === "전체" || p.category === category) &&
        (roleFilter === "전체 역할" || p.roles.includes(roleFilter)) &&
        (timeFilter === "전체 시간" || p.hours <= Number(timeFilter)) &&
        `${p.title} ${p.subtitle} ${p.category} ${p.roles.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "최신순"
        ? b.createdAt - a.createdAt
        : getMatch(b, me).score - getMatch(a, me).score,
    );
  function changeView(v: string) {
    setView(v);
    setMobileNav(false);
    setQuery("");
    setCategory("전체");
    setRoleFilter("전체 역할");
    setTimeFilter("전체 시간");
    setSelected(null);
  }
  function startCreate() {
    if (!data?.authenticated) {
      setModal("signin");
      return;
    }
    setModal(me ? "create" : "profile");
  }
  function openProfile() {
    setModal(data?.authenticated ? "profile" : "signin");
  }
  const navTitle = nav.find((n) => n[0] === view)?.[1] ?? "프로젝트 발견";
  function Card({ p }: { p: Item }) {
    const owner = world.profiles[p.ownerId];
    const filled = world.filledRoles?.[p.id] ?? [];
    const match = getMatch(p, me);
    const closed =
      p.status !== "open" ||
      Date.parse(`${p.deadline}T23:59:59+09:00`) < Date.now();
    return (
      <article className="project-card">
        <button
          className="card-visual"
          aria-label={`${p.title} 상세 보기`}
          onClick={() => setSelected(p.id)}
        >
          <Art color={p.color} />
          <span className="category-badge">{p.category}</span>
          <span className="open-badge">
            {closed
              ? "모집 마감"
              : `${p.roles.length - filled.length} roles open`}
          </span>
        </button>
        <div className="card-body">
          <div className="card-kicker">
            <span>{p.weeks} WEEK PROJECT</span>
            <button
              className={`icon-btn bookmark ${saved.includes(p.id) ? "is-saved" : ""}`}
              aria-label={`${p.title} ${saved.includes(p.id) ? "저장 취소" : "저장"}`}
              onClick={() =>
                action(
                  { type: "bookmark", projectId: p.id },
                  saved.includes(p.id)
                    ? "저장을 해제했어요."
                    : "저장한 프로젝트에 담았어요.",
                )
              }
              disabled={busy}
            >
              <Bookmark
                size={19}
                fill={saved.includes(p.id) ? "currentColor" : "none"}
              />
            </button>
          </div>
          <button className="title-link" onClick={() => setSelected(p.id)}>
            <h3>{p.title}</h3>
          </button>
          <p className="card-subtitle">{p.subtitle}</p>
          <div className="role-tags">
            {p.roles.map((r: string) => (
              <span className={filled.includes(r) ? "filled" : ""} key={r}>
                {filled.includes(r) ? <Check size={11} /> : <Plus size={11} />}{" "}
                {r}
              </span>
            ))}
          </div>
          <div className="card-meta">
            <span>
              <Clock size={13} /> 주 {p.hours}시간
            </span>
            <span>
              <Globe size={13} /> {p.mode}
            </span>
          </div>
          <div className="card-bottom">
            <div className="owner">
              <span className={`avatar mini ${p.color}`}>
                {owner?.name?.slice(0, 1) ?? "?"}
              </span>
              <span>
                {owner?.name ?? "팀 리더"}
                <small>{owner?.school ?? ""}</small>
              </span>
            </div>
            <button
              className="circle-link"
              aria-label={`${p.title} 열기`}
              onClick={() => setSelected(p.id)}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
          {match.reasons.length > 0 && (
            <div className="match-line">
              <Sparkles size={12} />
              {match.reasons[0]}
            </div>
          )}
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => changeView("discover")}>
          <Emblem />
          <span>
            crosscampus<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="sidebar-label">MAKE YOUR NEXT CHAPTER</div>
        <nav>
          {nav.map(([key, title, Icon]) => (
            <button
              key={key}
              className={`nav-item ${view === key ? "active" : ""}`}
              onClick={() => changeView(key)}
            >
              <Icon size={19} />
              <span>{title}</span>
              {key === "manage" && incoming.length > 0 && (
                <b>{incoming.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny-label">BIG IDEAS START SMALL</span>
          <span className="note-star">✳</span>
          <h3>
            네 학교 밖에도,
            <br />네 팀이 있어.
          </h3>
          <p>
            완벽한 스펙 없이도 괜찮아.
            <br />
            지금 할 수 있는 일부터.
          </p>
          <button onClick={startCreate}>
            아이디어 꺼내기 <ArrowUpRight size={16} />
          </button>
        </div>
        <button className="sidebar-profile" onClick={openProfile}>
          <span className="avatar cobalt">{me?.name?.slice(0, 1) ?? "+"}</span>
          <span>
            <strong>{me?.name ?? "프로필 만들기"}</strong>
            <small>{me?.grade ?? "너의 관심사를 알려줘"}</small>
          </span>
          <Settings2 size={16} />
        </button>
        <button className="about-link" onClick={() => setModal("about")}>
          Crosscampus에 대해 <ArrowUpRight size={13} />
        </button>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-btn"
              aria-label="메뉴 열기"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={21} />
            </button>
            <span>WORKSPACE</span>
            <ChevronRight size={13} />
            <strong>{navTitle}</strong>
          </div>
          <div className="top-actions">
            <div className="mode-switch" aria-label="공간 선택">
              <button
                className={mode === "demo" ? "selected" : ""}
                disabled={busy}
                onClick={() => {
                  setMode("demo");
                  setSelected(null);
                  setModal("");
                  changeView("discover");
                }}
              >
                체험 공간
              </button>
              <button
                className={mode === "live" ? "selected" : ""}
                disabled={busy}
                onClick={() => {
                  if (!data?.authenticated) {
                    setModal("signin");
                    return;
                  }
                  setMode("live");
                  setSelected(null);
                  setModal("");
                  changeView("discover");
                }}
              >
                실제 프로젝트
              </button>
            </div>
            <button className="btn primary small" onClick={startCreate}>
              <Plus size={16} /> 프로젝트 만들기
            </button>
          </div>
        </header>
        <div className={`demo-strip ${mode === "live" ? "live-strip" : ""}`}>
          <span>
            <span className="status-dot" />
            {mode === "demo"
              ? "샘플 학교와 학생으로 팀 만들기를 체험해 보세요. 변경 내용은 내 체험 공간에만 저장돼요."
              : "초기 비공개 파일럿 · 학교 정보는 자기소개이며 재학 인증을 뜻하지 않아요."}
          </span>
          {mode === "demo" && (
            <label>
              체험 역할{" "}
              <select
                aria-label="체험 역할"
                disabled={busy}
                value={actor}
                onChange={(e) => {
                  setActor(e.target.value);
                  setSelected(null);
                  setModal("");
                }}
              >
                <option value="demo-jin">Jin · 참여할 팀 찾기</option>
                <option value="demo-mina">Mina · 팀 리더</option>
                <option value="demo-yuri">Yuri · 메이커</option>
              </select>
            </label>
          )}
        </div>
        <main>
          {error ? (
            <Empty
              title="연결을 잠깐 놓쳤어요"
              body={error}
              action={
                <button
                  className="btn primary"
                  onClick={() => setRevision((x) => x + 1)}
                >
                  다시 불러오기
                </button>
              }
            />
          ) : !data ? (
            <div className="loading">
              <Emblem />
              <p>다음 시작을 찾는 중…</p>
            </div>
          ) : (
            <>
              {(view === "discover" || view === "saved") && (
                <>
                  {view === "discover" ? (
                    <section className="hero">
                      <div className="hero-copy">
                        <span className="eyebrow">
                          <span /> DIFFERENT SCHOOLS. SHARED POSSIBILITIES.
                        </span>
                        <h1>
                          혼자 떠올린 아이디어,
                          <br />
                          <em>함께 만드는 첫 시작.</em>
                        </h1>
                        <p>
                          학교 밖에서 관심사가 맞는 친구를 만나고,
                          <br className="desktop-br" /> 작지만 진짜인 프로젝트를
                          함께 완성해 봐.
                        </p>
                        <div className="hero-actions">
                          <button
                            className="btn dark"
                            onClick={() =>
                              document.getElementById("project-search")?.focus()
                            }
                          >
                            내가 함께할 팀 찾기 <ArrowRight size={17} />
                          </button>
                          <button
                            className="text-button"
                            onClick={() => setModal("how")}
                          >
                            어떻게 시작하나요? <ArrowUpRight size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="hero-collage" aria-hidden="true">
                        <div className="collage-oval" />
                        <div className="float-note note-one">
                          <span>YOUR IDEA</span>
                          <strong>
                            작은 시작이
                            <br />
                            팀이 되는 순간.
                          </strong>
                          <div className="doodle-arrow">↗</div>
                        </div>
                        <div className="float-note note-two">
                          <span>THE FIRST SPRINT</span>
                          <div className="people-dots">
                            <b>J</b>
                            <b>M</b>
                            <b>Y</b>
                            <i>+</i>
                          </div>
                          <div className="mini-check">
                            <Check size={14} /> 첫 번째 결과물 만들기
                          </div>
                          <div className="note-progress">
                            <i />
                          </div>
                        </div>
                        <span className="collage-star">✳</span>
                        <span className="collage-label">
                          GOOD THINGS
                          <br />
                          START WITH A “WHAT IF”.
                        </span>
                      </div>
                    </section>
                  ) : (
                    <section className="page-intro">
                      <span className="eyebrow">YOUR SHORTLIST</span>
                      <h1>눈여겨본 다음 시작.</h1>
                      <p>마음이 갔던 아이디어를 다시 만나봐.</p>
                    </section>
                  )}
                  {view === "discover" && (
                    <div className="journey">
                      <div>
                        <span>01</span>
                        <strong>관심사로 만나고</strong>
                        <small>학교보다 중요한 건, 함께할 일</small>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span>02</span>
                        <strong>작게 합류하고</strong>
                        <small>할 수 있는 역할과 시간으로</small>
                      </div>
                      <ArrowRight size={18} />
                      <div>
                        <span>03</span>
                        <strong>첫 주를 완성하고</strong>
                        <small>우리 팀만의 작은 결과물까지</small>
                      </div>
                    </div>
                  )}
                  <section className="discovery">
                    <div className="section-heading">
                      <div>
                        <span className="eyebrow">FIND YOUR PEOPLE</span>
                        <h2>
                          {view === "saved"
                            ? "저장한 프로젝트"
                            : "지금, 함께할 사람을 찾고 있어요"}{" "}
                          <span className="count">{filtered.length}</span>
                        </h2>
                      </div>
                      <label className="sort-label">
                        정렬{" "}
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option>추천순</option>
                          <option>최신순</option>
                        </select>
                      </label>
                    </div>
                    <div className="filter-row">
                      <div className="search-field">
                        <Search size={18} />
                        <input
                          id="project-search"
                          aria-label="프로젝트 검색"
                          placeholder="관심사, 프로젝트, 하고 싶은 역할"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button
                            className="icon-btn"
                            aria-label="검색 지우기"
                            onClick={() => setQuery("")}
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <select
                        aria-label="역할 필터"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option>전체 역할</option>
                        {skills.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        aria-label="활동 시간 필터"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                      >
                        <option>전체 시간</option>
                        <option value="2">주 2시간 이하</option>
                        <option value="3">주 3시간 이하</option>
                        <option value="5">주 5시간 이하</option>
                      </select>
                    </div>
                    <div className="category-tabs">
                      {["전체", ...categories].map((c) => (
                        <button
                          key={c}
                          className={category === c ? "active" : ""}
                          onClick={() => setCategory(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {filtered.length ? (
                      <div className="project-grid">
                        {filtered.map((p) => (
                          <Card p={p} key={p.id} />
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title={
                          projects.length
                            ? "아직 딱 맞는 프로젝트가 없어요"
                            : "첫 번째 아이디어를 기다리고 있어요"
                        }
                        body={
                          projects.length
                            ? "검색어나 필터를 바꿔보거나, 직접 팀을 시작해 봐."
                            : "프로필을 만들고 작은 프로젝트 하나를 꺼내보세요."
                        }
                        action={
                          <button
                            className="btn primary"
                            onClick={
                              projects.length
                                ? () => {
                                    setQuery("");
                                    setCategory("전체");
                                    setRoleFilter("전체 역할");
                                    setTimeFilter("전체 시간");
                                  }
                                : startCreate
                            }
                          >
                            {projects.length
                              ? "필터 초기화"
                              : "첫 프로젝트 만들기"}
                          </button>
                        }
                      />
                    )}
                  </section>
                </>
              )}
              {view === "activity" && (
                <>
                  <section className="page-intro">
                    <span className="eyebrow">
                      A LITTLE COURAGE, A NEW BEGINNING
                    </span>
                    <h1>내가 보낸 첫 인사.</h1>
                    <p>지원한 프로젝트의 소식을 여기서 확인해요.</p>
                  </section>
                  <div className="stack">
                    {apps.filter((a) => a.userId === activeActor).length ? (
                      apps
                        .filter((a) => a.userId === activeActor)
                        .map((a) => {
                          const p = projects.find((p) => p.id === a.projectId);
                          return (
                            <article className="activity-card" key={a.id}>
                              <div className={`activity-icon ${p?.color}`}>
                                <ArrowUpRight />
                              </div>
                              <div className="flex-grow">
                                <span className={`pill ${a.status}`}>
                                  {labels[a.status]}
                                </span>
                                <h3>{p?.title}</h3>
                                <p>
                                  {a.role} · {a.note}
                                </p>
                              </div>
                              {a.status === "pending" ? (
                                <button
                                  className="btn secondary small"
                                  disabled={busy}
                                  onClick={() =>
                                    action(
                                      { type: "withdraw", applicationId: a.id },
                                      "지원을 취소했어요.",
                                    )
                                  }
                                >
                                  지원 취소
                                </button>
                              ) : a.status === "accepted" ? (
                                <button
                                  className="btn primary small"
                                  onClick={() => changeView("teams")}
                                >
                                  우리 팀으로 <ArrowRight size={15} />
                                </button>
                              ) : null}
                            </article>
                          );
                        })
                    ) : (
                      <Empty
                        title="아직 보낸 인사가 없어요"
                        body="함께하고 싶은 프로젝트에 네가 할 수 있는 일을 알려줘."
                        action={
                          <button
                            className="btn primary"
                            onClick={() => changeView("discover")}
                          >
                            프로젝트 발견하기
                          </button>
                        }
                      />
                    )}
                  </div>
                </>
              )}
              {view === "manage" && (
                <>
                  <section className="page-intro">
                    <span className="eyebrow">IDEAS NEED PEOPLE</span>
                    <h1>우리 팀의 다음 멤버.</h1>
                    <p>
                      스펙보다, 이번 프로젝트에 함께할 역할과 시간을 살펴봐요.
                    </p>
                  </section>
                  {owned.length ? (
                    owned.map((p) => (
                      <section className="manage-card" key={p.id}>
                        <div className="section-heading">
                          <div>
                            <span className="eyebrow">
                              {p.category} ·{" "}
                              {p.status === "open" ? "모집 중" : "모집 마감"}
                            </span>
                            <h2>{p.title}</h2>
                          </div>
                          <button
                            className="btn secondary small"
                            disabled={busy}
                            onClick={() =>
                              action(
                                { type: "close", projectId: p.id },
                                p.status === "open"
                                  ? "모집을 마감했어요."
                                  : "모집을 다시 열었어요.",
                              )
                            }
                          >
                            {p.status === "open" ? "모집 마감" : "다시 모집"}
                          </button>
                        </div>
                        {apps.filter(
                          (a) =>
                            a.projectId === p.id && a.status !== "withdrawn",
                        ).length ? (
                          apps
                            .filter(
                              (a) =>
                                a.projectId === p.id &&
                                a.status !== "withdrawn",
                            )
                            .map((a) => {
                              const person = world.profiles[a.userId];
                              return (
                                <div className="applicant" key={a.id}>
                                  <span className="avatar lavender">
                                    {person?.name[0]}
                                  </span>
                                  <div className="flex-grow">
                                    <strong>
                                      {person?.name}{" "}
                                      <span className="muted">
                                        {person?.grade} · {person?.school}
                                      </span>
                                    </strong>
                                    <p>{a.note}</p>
                                    <div className="role-tags">
                                      <span>{a.role}</span>
                                      <span>주 {person?.hours}시간 가능</span>
                                      <span>{person?.language}</span>
                                    </div>
                                  </div>
                                  {a.status === "pending" ? (
                                    <div className="decision-buttons">
                                      <button
                                        className="btn primary small"
                                        disabled={busy}
                                        onClick={() =>
                                          action(
                                            {
                                              type: "decide",
                                              projectId: p.id,
                                              applicationId: a.id,
                                              decision: "accepted",
                                            },
                                            "팀원이 합류했어요! 우리 팀의 첫 주 보드가 열렸어요.",
                                          )
                                        }
                                      >
                                        함께하기 <Check size={15} />
                                      </button>
                                      <button
                                        className="text-button"
                                        disabled={busy}
                                        onClick={() =>
                                          action(
                                            {
                                              type: "decide",
                                              projectId: p.id,
                                              applicationId: a.id,
                                              decision: "rejected",
                                            },
                                            "지원 결과를 저장했어요.",
                                          )
                                        }
                                      >
                                        이번엔 보류
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`pill ${a.status}`}>
                                      {labels[a.status]}
                                    </span>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <p className="muted">
                            아직 지원한 친구가 없어요. 역할과 결과물이
                            구체적인지 살펴보세요.
                          </p>
                        )}
                      </section>
                    ))
                  ) : (
                    <Empty
                      title="네 아이디어로 팀을 시작해 봐"
                      body="필요한 역할과 함께 만들 결과물만 정하면 돼."
                      action={
                        <button className="btn primary" onClick={startCreate}>
                          프로젝트 만들기
                        </button>
                      }
                    />
                  )}
                </>
              )}
              {view === "teams" && (
                <>
                  <section className="page-intro">
                    <span className="eyebrow">THE FIRST SPRINT</span>
                    <h1>우리의 첫 일주일.</h1>
                    <p>
                      큰 계획보다 작은 결과물 하나. 함께 시작할 수 있는 것부터.
                    </p>
                  </section>
                  {world.sprints.length ? (
                    world.sprints.map((s: Item) => {
                      const p = projects.find((p) => p.id === s.projectId),
                        done = s.tasks.filter((t: Item) => t.done).length;
                      return (
                        <section className="sprint-card" key={s.projectId}>
                          <div className="sprint-top">
                            <span className="pill">WEEK 01 · KICKOFF</span>
                            <span>
                              {done}/{s.tasks.length} 완료
                            </span>
                          </div>
                          <h2>{p?.title}</h2>
                          <div className="progress-track">
                            <i
                              style={{
                                width: `${(done / s.tasks.length) * 100}%`,
                              }}
                            />
                          </div>
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              await action(
                                {
                                  type: "kickoff",
                                  projectId: s.projectId,
                                  goal: f.get("goal"),
                                  meeting: f.get("meeting"),
                                },
                                "첫 주 계획을 저장했어요.",
                              );
                            }}
                          >
                            <label>
                              첫 주에 완성할 것
                              <input
                                name="goal"
                                defaultValue={s.goal}
                                required
                                minLength={5}
                                maxLength={250}
                              />
                            </label>
                            <label>
                              첫 모임 · 시간과 진행 방식
                              <input
                                name="meeting"
                                defaultValue={s.meeting}
                                placeholder="예: 토요일 오후 3시, 온라인"
                                maxLength={150}
                              />
                            </label>
                            <button
                              className="btn secondary small"
                              disabled={busy}
                            >
                              계획 저장
                            </button>
                          </form>
                          <div className="sprint-tasks">
                            {s.tasks.map((t: Item) => (
                              <label
                                className={t.done ? "task done" : "task"}
                                key={t.id}
                              >
                                <input
                                  type="checkbox"
                                  checked={t.done}
                                  disabled={busy}
                                  onChange={(e) =>
                                    action(
                                      {
                                        type: "task",
                                        projectId: s.projectId,
                                        taskId: t.id,
                                        done: e.target.checked,
                                      },
                                      e.target.checked
                                        ? "작은 한 걸음, 완료했어요."
                                        : "할 일을 다시 열었어요.",
                                    )
                                  }
                                />
                                <span>{t.title}</span>
                              </label>
                            ))}
                          </div>
                          {done === s.tasks.length && (
                            <div className="sprint-success">
                              <CheckCircle2 size={20} />
                              <div>
                                <strong>우리 팀의 첫 시작을 완성했어요.</strong>
                                <p>
                                  다음 모임에서는 만든 것을 서로 보여주고 다음
                                  목표를 정해봐요.
                                </p>
                              </div>
                            </div>
                          )}
                        </section>
                      );
                    })
                  ) : (
                    <Empty
                      title="함께할 팀이 생기면, 여기서 시작해요"
                      body={
                        mode === "demo"
                          ? "프로젝트에 지원한 뒤 Mina로 바꿔 지원을 수락해 보세요. 팀의 첫 주 보드가 열려요."
                          : "팀 리더가 첫 팀원을 수락하면 실행 보드가 자동으로 열려요."
                      }
                      action={
                        <button
                          className="btn primary"
                          onClick={() => changeView("discover")}
                        >
                          팀 찾으러 가기
                        </button>
                      }
                    />
                  )}
                </>
              )}
              <footer className="footer">
                <span>
                  <Emblem /> 작은 시작을, 함께.
                </span>
                <button onClick={() => setModal("about")}>
                  소개 · 이용 안내 <ArrowUpRight size={13} />
                </button>
                {mode === "demo" && (
                  <button onClick={() => setModal("reset")}>
                    체험 처음부터 <RefreshCw size={12} />
                  </button>
                )}
                <span className="footer-credit">
                  CROSSCAMPUS / EARLY PREVIEW
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {selectedProject && (
        <Modal title="프로젝트 살펴보기" onClose={() => setSelected(null)} wide>
          <ProjectDetail
            project={selectedProject}
            world={world}
            actor={activeActor}
            me={me}
            busy={busy}
            authenticated={data?.authenticated}
            onAction={action}
            onProfile={() => {
              setSelected(null);
              openProfile();
            }}
            onClose={() => setSelected(null)}
          />
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="너의 관심사를 알려줘" onClose={() => setModal("")}>
          <ProfileForm
            profile={me}
            busy={busy}
            submit={async (profile) => {
              if (
                await action(
                  { type: "profile", profile },
                  "프로필을 저장했어요.",
                )
              )
                setModal("");
            }}
          />
        </Modal>
      )}
      {modal === "create" && (
        <Modal title="작은 아이디어를 꺼내봐" onClose={() => setModal("")} wide>
          <ProjectForm
            busy={busy}
            submit={async (project) => {
              if (
                await action(
                  { type: "create", project },
                  "새로운 시작이 열렸어요.",
                )
              ) {
                setModal("");
                changeView("manage");
              }
            }}
          />
        </Modal>
      )}
      {modal === "signin" && (
        <Modal title="나만의 공간에서 이어가기" onClose={() => setModal("")}>
          <div className="modal-body">
            <p>로그인하면 프로젝트와 지원 내용을 저장할 수 있어요.</p>
            <a
              className="btn primary"
              href="/signin-with-chatgpt?return_to=/"
              target="_top"
            >
              ChatGPT로 로그인 <ArrowRight size={16} />
            </a>
          </div>
        </Modal>
      )}
      {modal === "how" && (
        <Modal title="세 번의 작은 시작" onClose={() => setModal("")}>
          <div className="modal-body how-body">
            <div>
              <b>01</b>
              <h3>할 수 있는 일을 알려줘</h3>
              <p>
                학교 이름보다 네 관심사와 가능한 시간이 중요해. 처음이어도
                함께할 역할이 있어.
              </p>
            </div>
            <div>
              <b>02</b>
              <h3>구체적인 첫 인사를 보내</h3>
              <p>
                어떤 역할을 맡고 싶은지, 첫 주에 무엇을 해볼 수 있는지 제안해
                봐.
              </p>
            </div>
            <div>
              <b>03</b>
              <h3>첫 일주일을 함께 완성해</h3>
              <p>
                팀에 합류하면 작은 목표를 정하고, 실행 보드에서 첫 작업을
                시작해.
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => {
                setModal("");
                changeView("discover");
              }}
            >
              함께할 프로젝트 찾기 <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === "about" && (
        <Modal title="Crosscampus에 대해" onClose={() => setModal("")}>
          <div className="modal-body prose">
            <span className="eyebrow">DIFFERENT SCHOOLS. ONE FIRST STEP.</span>
            <h3>학교 밖에서, 함께 시작할 사람.</h3>
            <p>
              Crosscampus는 한국 국제학교 고등학생이 관심사·역할·가능한 시간으로
              프로젝트 팀을 만들고 첫 작업까지 이어가는 서비스입니다.
            </p>
            <h4>지금은 초기 평가용 프리뷰예요</h4>
            <p>
              체험 공간의 학생·학교·프로젝트는 모두 가상 예시입니다. 실제
              프로젝트 공간과 분리되어 있으며, 체험의 수락이나 완료는 실제 활동
              실적이 아닙니다.
            </p>
            <p>
              실제 프로젝트에서는 로그인한 계정의 프로필과 활동을 저장합니다.
              현재 사이트는 비공개이며 초대된 계정만 접근할 수 있습니다. 학교
              정보는 사용자가 입력하며 재학 인증이나 학교와의 제휴를 뜻하지
              않습니다.
            </p>
            <h4>함께 지키는 약속</h4>
            <p>
              연락처·집 주소·개인 시간표를 소개에 적지 마세요. 서로 동의한
              역할과 시간으로 활동하고, 부적절한 프로젝트는 상세 화면에서 신고할
              수 있습니다. 신고는 기록되며, 초기 프리뷰에서 실시간 운영 대응은
              제공하지 않습니다.
            </p>
            <p>
              CAS 인정 여부는 소속 학교에 확인해야 합니다. 참여 자체가 활동
              인정이나 입시 성과를 보장하지 않습니다.
            </p>
          </div>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="체험을 처음부터 시작할까요?" onClose={() => setModal("")}>
          <div className="modal-body">
            <p>
              내 체험 공간의 변경 내용만 초기화합니다. 실제 프로젝트 공간은
              유지됩니다.
            </p>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                if (
                  await action({ type: "reset" }, "체험 공간을 초기화했어요.")
                )
                  setModal("");
              }}
            >
              체험 초기화
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ProfileForm({
  profile,
  busy,
  submit,
}: {
  profile: Item;
  busy: boolean;
  submit: (p: Item) => void;
}) {
  const [selected, setSelected] = useState<string[]>(profile?.skills ?? []);
  return (
    <form
      className="modal-body form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit({
          ...Object.fromEntries(f),
          skills: selected,
          hours: Number(f.get("hours")),
        });
      }}
    >
      <p className="form-lead">
        함께할 수 있는 일을 알려주세요. 멋진 경력이 없어도 괜찮아요.
      </p>
      <label>
        이름 또는 별명
        <input
          name="name"
          defaultValue={profile?.name}
          required
          maxLength={30}
          placeholder="팀에서 불리고 싶은 이름"
        />
      </label>
      <div className="form-row">
        <label>
          학교
          <input
            name="school"
            defaultValue={profile?.school}
            required
            maxLength={80}
            placeholder="재학 중인 학교"
          />
        </label>
        <label>
          학년
          <select name="grade" defaultValue={profile?.grade ?? "G10"}>
            {["G9", "G10", "G11", "G12"].map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>
          함께할 수 있는 역할 <small>1~4개</small>
        </legend>
        <div className="choice-chips">
          {skills.map((s) => (
            <button
              type="button"
              aria-pressed={selected.includes(s)}
              className={selected.includes(s) ? "selected" : ""}
              onClick={() =>
                setSelected(
                  selected.includes(s)
                    ? selected.filter((x) => x !== s)
                    : selected.length < 4
                      ? [...selected, s]
                      : selected,
                )
              }
              key={s}
            >
              {selected.includes(s) && <Check size={13} />} {s}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-row">
        <label>
          일주일에 가능한 시간
          <input
            name="hours"
            type="number"
            min="1"
            max="10"
            defaultValue={profile?.hours ?? 2}
            required
          />
        </label>
        <label>
          함께 사용할 언어
          <select
            name="language"
            defaultValue={profile?.language ?? "한국어·English"}
          >
            <option>한국어·English</option>
            <option>한국어</option>
            <option>English</option>
          </select>
        </label>
      </div>
      <label>
        짧은 소개
        <textarea
          name="bio"
          defaultValue={profile?.bio}
          maxLength={250}
          placeholder="어떤 일에 마음이 움직이나요?"
        />
      </label>
      <p className="field-note">
        프로필은 이 공간의 참여자에게 보입니다. 개인 연락처는 적지 마세요.
      </p>
      <button className="btn primary full" disabled={busy || !selected.length}>
        프로필 저장 <ArrowRight size={16} />
      </button>
    </form>
  );
}
function ProjectForm({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (p: Item) => void;
}) {
  const [roles, setRoles] = useState<string[]>([]);
  return (
    <form
      className="modal-body form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        submit({
          ...Object.fromEntries(f),
          roles,
          hours: Number(f.get("hours")),
          weeks: Number(f.get("weeks")),
        });
      }}
    >
      <div className="create-tip">
        <Sparkles size={20} />
        <div>
          <strong>‘언젠가’ 대신, 작은 결과물 하나.</strong>
          <p>
            영상 한 편, 인터뷰 세 개, 작동하는 웹페이지 하나. 첫 목표가
            구체적이면 함께할 사람도 찾기 쉬워요.
          </p>
        </div>
      </div>
      <label>
        프로젝트 이름
        <input
          name="title"
          required
          minLength={3}
          maxLength={70}
          placeholder="예: 우리가 만드는 학교 밖 라디오"
        />
      </label>
      <label>
        한 줄 소개
        <input
          name="subtitle"
          required
          minLength={5}
          maxLength={110}
          placeholder="누구를 위해 무엇을 함께 하나요?"
        />
      </label>
      <label>
        어떤 프로젝트인가요?
        <textarea
          name="description"
          required
          minLength={20}
          maxLength={1500}
          rows={4}
          placeholder="시작하고 싶은 이유와 첫 주에 해볼 일을 적어주세요. (20자 이상)"
        />
      </label>
      <label>
        함께 완성할 결과물
        <input
          name="outcome"
          required
          minLength={5}
          maxLength={250}
          placeholder="예: 서로 다른 학교 친구를 인터뷰한 10분 오디오 1편"
        />
      </label>
      <div className="form-row">
        <label>
          분야
          <select name="category">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          진행 방식
          <select name="mode">
            {modes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>
          함께할 역할 <small>역할별 1명 · 최대 4개</small>
        </legend>
        <div className="choice-chips">
          {skills.map((s) => (
            <button
              type="button"
              aria-pressed={roles.includes(s)}
              className={roles.includes(s) ? "selected" : ""}
              onClick={() =>
                setRoles(
                  roles.includes(s)
                    ? roles.filter((x) => x !== s)
                    : roles.length < 4
                      ? [...roles, s]
                      : roles,
                )
              }
              key={s}
            >
              {roles.includes(s) ? <Check size={13} /> : <Plus size={13} />} {s}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-row">
        <label>
          기간 · 주
          <input
            type="number"
            name="weeks"
            min="1"
            max="12"
            defaultValue="2"
            required
          />
        </label>
        <label>
          주당 활동 시간
          <input
            type="number"
            name="hours"
            min="1"
            max="10"
            defaultValue="2"
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          모집 마감일
          <input
            name="deadline"
            type="date"
            required
            min={new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Seoul",
            }).format(new Date())}
            defaultValue={new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Seoul",
            }).format(new Date(Date.now() + 14 * 86400000))}
          />
        </label>
        <label>
          함께 사용할 언어
          <select name="language">
            <option>한국어·English</option>
            <option>한국어</option>
            <option>English</option>
          </select>
        </label>
      </div>
      <p className="field-note">
        처음부터 완벽한 계획은 필요 없어요. 역할과 시간을 서로 합의하고
        시작해요.
      </p>
      <button className="btn primary full" disabled={busy || !roles.length}>
        우리 팀의 시작 열기 <ArrowUpRight size={18} />
      </button>
    </form>
  );
}
function ProjectDetail({
  project: p,
  world,
  actor,
  me,
  busy,
  authenticated,
  onAction,
  onProfile,
  onClose,
}: {
  project: Item;
  world: Item;
  actor: string;
  me: Item;
  busy: boolean;
  authenticated: boolean;
  onAction: (c: Item, m?: string) => Promise<boolean>;
  onProfile: () => void;
  onClose: () => void;
}) {
  const [role, setRole] = useState(""),
    [note, setNote] = useState(""),
    [report, setReport] = useState(false),
    [reason, setReason] = useState("");
  const owner = world.profiles[p.ownerId],
    filled = world.filledRoles[p.id] ?? [],
    existing = world.applications.find(
      (a: Item) =>
        a.projectId === p.id &&
        a.userId === actor &&
        ["pending", "accepted"].includes(a.status),
    ),
    mine = p.ownerId === actor,
    closed =
      p.status !== "open" ||
      Date.parse(`${p.deadline}T23:59:59+09:00`) < Date.now(),
    match = getMatch(p, me);
  return (
    <div className="detail">
      <Art color={p.color} small />
      <div className="detail-content">
        <span className="eyebrow">
          {p.category} · {p.weeks} WEEK PROJECT
        </span>
        <h2>{p.title}</h2>
        <p className="detail-subtitle">{p.subtitle}</p>
        <div className="detail-facts">
          <span>
            <Clock size={17} />
            <b>주 {p.hours}시간</b>
          </span>
          <span>
            <CalendarDays size={17} />
            <b>{p.weeks}주 동안</b>
          </span>
          <span>
            <Globe size={17} />
            <b>{p.mode}</b>
          </span>
        </div>
        <div className="detail-columns">
          <div>
            <h3>함께 해볼 일</h3>
            <p>{p.description}</p>
            <div className="outcome-box">
              <span className="eyebrow">OUR SMALL, REAL OUTCOME</span>
              <h4>{p.outcome}</h4>
            </div>
            <h3>함께할 역할</h3>
            <div className="role-tags">
              {p.roles.map((r: string) => (
                <span key={r}>
                  {filled.includes(r) ? (
                    <Check size={12} />
                  ) : (
                    <Plus size={12} />
                  )}{" "}
                  {r} {filled.includes(r) ? "합류 완료" : "1명"}
                </span>
              ))}
            </div>
            <h3>이 프로젝트를 시작한 친구</h3>
            <div className="owner detail-owner">
              <span className={`avatar ${p.color}`}>{owner?.name[0]}</span>
              <span>
                <strong>
                  {owner?.name} · {owner?.grade}
                </strong>
                <small>{owner?.school}</small>
              </span>
            </div>
            <p>{owner?.bio}</p>
            <small className="muted">
              사용 언어 {p.language} · 모집 마감 {p.deadline} (한국 시간)
            </small>
          </div>
          <aside className="join-panel">
            {match.reasons.length > 0 && (
              <div className="why-fit">
                <span>
                  <Sparkles size={15} /> 함께하기 좋은 이유
                </span>
                {match.reasons.map((r: string) => (
                  <p key={r}>
                    <Check size={13} />
                    {r}
                  </p>
                ))}
              </div>
            )}
            {mine ? (
              <div className="join-status">
                <h3>네가 시작한 프로젝트예요.</h3>
                <p>모집 관리에서 친구들의 참여 제안을 확인해요.</p>
              </div>
            ) : existing ? (
              <div className="join-status">
                <CheckCircle2 size={28} />
                <h3>
                  {existing.status === "accepted"
                    ? "우리 팀에 합류했어요!"
                    : "첫 인사를 보냈어요."}
                </h3>
                <p>
                  {existing.status === "accepted"
                    ? "우리 팀 · 첫 주에서 첫 작업을 시작해요."
                    : "리더가 제안을 살펴보고 있어요. 나의 지원에서 상태를 확인할 수 있어요."}
                </p>
              </div>
            ) : closed ? (
              <p>모집이 마감된 프로젝트예요.</p>
            ) : !me ? (
              <button className="btn primary full" onClick={onProfile}>
                프로필 만들고 함께하기
              </button>
            ) : !authenticated ? (
              <a
                className="btn primary full"
                href="/signin-with-chatgpt?return_to=/"
                target="_top"
              >
                로그인하고 함께하기
              </a>
            ) : (
              <form
                className="form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onAction(
                    { type: "apply", projectId: p.id, role, note },
                    "첫 인사를 보냈어요. 나의 지원에서 확인해요.",
                  );
                }}
              >
                <h3>작은 첫 인사를 보내봐.</h3>
                <label>
                  함께할 역할
                  <select
                    value={role}
                    required
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="">역할 선택</option>
                    {p.roles
                      .filter((r: string) => !filled.includes(r))
                      .map((r: string) => (
                        <option key={r}>{r}</option>
                      ))}
                  </select>
                </label>
                <label>
                  첫 주에 어떤 일을 해볼 수 있나요?
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    required
                    minLength={10}
                    maxLength={600}
                    rows={4}
                    placeholder="관심을 갖게 된 이유, 할 수 있는 일, 가능한 시간을 알려줘요."
                  />
                </label>
                <button className="btn primary full" disabled={busy || !role}>
                  함께하고 싶어요 <ArrowUpRight size={17} />
                </button>
                <small className="field-note">
                  개인 연락처를 적지 않아도 지원할 수 있어요.
                </small>
              </form>
            )}
          </aside>
        </div>
        <button className="report-link" onClick={() => setReport(!report)}>
          <Flag size={13} /> 이 프로젝트 신고
        </button>
        {report && (
          <form
            className="report-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await onAction(
                  { type: "report", projectId: p.id, reason },
                  "신고를 기록했어요. 초기 프리뷰에서는 실시간 운영 대응을 제공하지 않습니다.",
                )
              )
                setReport(false);
            }}
          >
            <label>
              신고 내용
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={5}
                maxLength={500}
                required
              />
            </label>
            <button className="btn secondary small" disabled={busy}>
              신고 기록
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
