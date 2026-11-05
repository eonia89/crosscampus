import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

// Fixed loopback target: this helper has no production project or host option.
const environment = await initializeTestEnvironment({
  projectId: "demo-crosscampus",
  firestore: { host: "127.0.0.1", port: 8080 },
});

try {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const email of ["owner@example.test", "member@example.test"]) {
      await setDoc(doc(db, "access", email), { enabled: true });
    }
  });
  console.log(
    "Local invitations ready: owner@example.test, member@example.test",
  );
} finally {
  await environment.cleanup();
}
