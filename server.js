import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = express();
const port = 5000;
let usersToEmail = [];

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
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_USERNAME, // Use environment variable for sender email
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

async function fetchEventsAndSendEmails() {
  const querySnapshot = await getDocs(collection(db, "Events"));

  querySnapshot?.forEach(async (doc) => {
    const eventData = doc.data();
    const { eventType, Event, User, selectedUser } = eventData;

    if (selectedUser && selectedUser.length > 0) {
      usersToEmail = selectedUser;
    } else {
      usersToEmail = User;
    }

    // Log the users to email for debugging
    console.log("Users to email:", usersToEmail);

    if (usersToEmail && usersToEmail.length > 0) {
      usersToEmail.forEach(async (userEmail) => {
        const emailContent = `Event Type: ${eventType}\nEvent: ${Event}`;
        await sendEmail(userEmail, "Event Notification", emailContent);
      });
    } else {
      console.warn("No valid users to email.");
    }
  });
}

// Schedule a cron job to run every minute (adjust as needed)
cron.schedule("* * * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
