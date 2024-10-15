import admin from "firebase-admin";
import serviceAccount from "../fcts-calender.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fcts-calendar-tool.firebaseio.com",
});

const db = admin.firestore();

export { admin }; // Export admin instance
export default db;
