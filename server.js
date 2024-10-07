import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

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

// Initialize Firebase and Firestore
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Function to send emails
async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: to,
    subject: subject,
    text: text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

// Function to fetch event details, user emails, and send notifications
async function fetchEventsAndSendEmails() {
  const eventsSnapshot = await getDocs(collection(db, "Events"));

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, createdBy } = eventData;

    // Get EventType details from EventTypes collection
    const eventTypeDoc = await getDoc(
      doc(db, "EventTypes", type.split("/").pop())
    );
    const eventTypeData = eventTypeDoc.exists() ? eventTypeDoc.data() : {};

    // Fetch users for the event
    const usersSnapshot = await getDocs(collection(db, "Users"));
    const usersToEmail = usersSnapshot.docs
      .map((userDoc) => {
        const userData = userDoc.data();
        return { email: userData.email, name: userData.name };
      })
      .filter((user) => !!user.email); // Ensure users have valid emails

    // Prepare the email content
    const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;

    // Send emails to all selected users
    for (const user of usersToEmail) {
      await sendEmail(user.email, `Event Notification - ${name}`, emailContent);
    }
  }
}

// Schedule the cron job to run daily at 8 AM (adjust as needed)
cron.schedule("0 8 * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
