import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
} from "firebase/firestore";
import { makeDemoWorld, reduceWorld, visibleWorld } from "../lib/domain.mjs";
import { createStore } from "../lib/firebase-store.mjs";
let pending: Promise<any> | undefined;
async function services() {
  if (!pending)
    pending = (async () => {
      const emulator =
        import.meta.env.DEV &&
        import.meta.env.VITE_USE_EMULATORS === "true" &&
        ["localhost", "127.0.0.1"].includes(location.hostname);
      const config = emulator
        ? {
            projectId: "demo-crosscampus",
            apiKey: "demo-key",
            authDomain: "localhost",
          }
        : await fetch("/__/firebase/init.json").then((r) => {
            if (!r.ok) throw Error("Firebase 설정을 불러오지 못했어요.");
            return r.json();
          });
      const app = initializeApp(config as FirebaseOptions);
      const auth = getAuth(app);
      const db = getFirestore(app);
      if (emulator) {
        connectAuthEmulator(auth, "http://127.0.0.1:9099", {
          disableWarnings: true,
        });
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
      }
      await auth.authStateReady();
      return { auth, db };
    })();
  return pending;
}
export function watchSession(callback: (signedIn: boolean) => void) {
  let active = true;
  let unsubscribe = () => {};
  services()
    .then(({ auth }) => {
      if (active)
        unsubscribe = onAuthStateChanged(auth, (user) => callback(!!user));
    })
    .catch(() => {});
  return () => {
    active = false;
    unsubscribe();
  };
}
export async function login() {
  const { auth } = await services();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}
export async function logout() {
  const { auth } = await services();
  await signOut(auth);
}
async function session() {
  try {
    return await services();
  } catch {
    return null;
  }
}
function demoKey(uid?: string) {
  return `crosscampus.firebase.demo.v1.${uid ?? "guest"}`;
}
function demoWorld(uid?: string) {
  try {
    const raw = localStorage.getItem(demoKey(uid));
    if (raw) {
      const w = JSON.parse(raw);
      if (
        w.version === 1 &&
        w.profiles &&
        Array.isArray(w.projects) &&
        Array.isArray(w.applications) &&
        Array.isArray(w.sprints) &&
        w.bookmarks &&
        Array.isArray(w.reports)
      )
        return w;
    }
  } catch {}
  return makeDemoWorld();
}
async function member() {
  const s = await services();
  const u = s.auth.currentUser;
  if (!u) throw Error("Google 계정으로 로그인해 주세요.");
  if (!u.emailVerified || !u.email)
    throw Error("확인된 Google 계정이 필요해요.");
  const access = await getDoc(doc(s.db, "access", u.email));
  if (!access.exists() || access.data().enabled !== true)
    throw Error(
      "현재 실제 프로젝트는 초대된 계정만 이용할 수 있어요. 체험 공간은 로그인 없이 둘러볼 수 있습니다.",
    );
  return { ...s, user: u };
}
export function friendlyError(error: any) {
  const code = error?.code ?? "";
  if (code.includes("permission-denied"))
    return "이 계정에 작업 권한이 없거나 다른 팀원이 먼저 변경했어요. 새로고침 후 다시 확인해 주세요.";
  if (code.includes("popup-closed-by-user"))
    return "로그인이 취소됐어요. 다시 시도할 수 있어요.";
  if (code.includes("popup-blocked"))
    return "로그인 팝업이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.";
  if (code.includes("resource-exhausted"))
    return "현재 무료 이용량 한도에 도달했어요. 나중에 다시 시도해 주세요.";
  if (code.includes("unavailable"))
    return "연결을 확인한 뒤 다시 시도해 주세요. 입력 내용은 유지됩니다.";
  return error instanceof Error ? error.message : "요청을 처리하지 못했어요.";
}
export async function loadWorld(mode: string, actor: string) {
  if (mode === "demo") {
    const s = await session();
    const user = s?.auth.currentUser;
    return {
      world: visibleWorld(demoWorld(user?.uid), actor),
      actor,
      authenticated: !!user,
      mode,
    };
  }
  const { db, user } = await member();
  return {
    world: await createStore(db, user.uid).load(),
    actor: user.uid,
    authenticated: true,
    mode,
  };
}
export async function sendCommand(mode: string, actor: string, command: any) {
  if (mode === "demo") {
    const s = await session();
    const user = s?.auth.currentUser;
    const world =
      command.type === "reset"
        ? makeDemoWorld()
        : reduceWorld(demoWorld(user?.uid), actor, command);
    localStorage.setItem(demoKey(user?.uid), JSON.stringify(world));
    return {
      world: visibleWorld(world, actor),
      actor,
      authenticated: !!user,
      mode,
    };
  }
  const { db, user } = await member();
  return {
    world: await createStore(db, user.uid).execute(command),
    actor: user.uid,
    authenticated: true,
    mode,
  };
}
