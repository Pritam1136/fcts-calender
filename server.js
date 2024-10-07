import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = express();
const port = 5000;
dotenv.config();
app.use(express.json());

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

async function fetchEventsAndSendEmails() {
  try {
    const querySnapshot = await getDocs(collection(db, "Events"));
    if (querySnapshot.empty) {
      console.warn("No events found in the collection.");
      return;
    }

    for (const doc of querySnapshot.docs) {
      const eventData = doc.data();
      const { eventType, Event, User, selectedUser } = eventData;

      const usersToEmail =
        selectedUser && selectedUser.length > 0 ? selectedUser : User;

      if (usersToEmail && usersToEmail.length > 0) {
        for (const userEmail of usersToEmail) {
          const emailContent = `Event Type: ${eventType}\nEvent: ${Event}`;
          await sendEmail(userEmail, "Event Notification", emailContent);
        }
      } else {
        console.warn("No valid users to email.");
      }
    }
  } catch (error) {
    console.error("Error fetching events:", error);
  }
}

// Schedule a cron job to run every day at 8:00 AM
cron.schedule("0 8 * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
