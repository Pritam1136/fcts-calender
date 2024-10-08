import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import serviceAccount from "./fcts-calender.json" assert { type: "json" };

const app = express();
const port = 5000;

dotenv.config();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fcts-calendar-tool.firebaseio.com",
});

const db = admin.firestore();

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

// Helper function to check if a given date is tomorrow
function isEventTomorrow(startDate) {
  const eventDate = new Date(startDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    eventDate.getDate() === tomorrow.getDate() &&
    eventDate.getMonth() === tomorrow.getMonth() &&
    eventDate.getFullYear() === tomorrow.getFullYear()
  );
}

function isEventThisWeek(startDate) {}

async function fetchDailyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    // Check if the event is happening tomorrow
    if (!isEventTomorrow(startDate)) {
      console.log(`Skipping event: ${name}, not happening tomorrow.`);
      continue; // Skip if the event isn't tomorrow
    }

    let eventTypeDoc;
    if (type && type.id) {
      eventTypeDoc = await db.collection("EventTypes").doc(type.id).get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue; // Skip to the next event if there's an issue with 'type'
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};

    // If there's a selectedUser, email only that user
    if (selectedUser) {
      const selectedUserDoc = await db
        .collection("Users")
        .doc(selectedUser)
        .get();
      const userData = selectedUserDoc.exists ? selectedUserDoc.data() : null;

      if (userData && userData.email) {
        const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;
        await sendEmail(
          userData.email,
          `Event Notification - ${name}`,
          emailContent
        );
        console.log(`Email sent to selected user: ${userData.email}`);
      } else {
        console.error("Selected user not found or invalid.");
      }
    } else {
      // Otherwise, email all users
      const usersSnapshot = await db.collection("Users").get();
      const usersToEmail = usersSnapshot.docs
        .map((userDoc) => {
          const userData = userDoc.data();
          return { email: userData.email, name: userData.name };
        })
        .filter((user) => !!user.email);

      const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;

      for (const user of usersToEmail) {
        await sendEmail(
          user.email,
          `Event Notification - ${name}`,
          emailContent
        );
      }
    }
  }
}

async function fetchWeeklyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    // Check if the event is happening tomorrow
    if (!isEventThisWeek(startDate)) {
      console.log(`Skipping event: ${name}, not happening tomorrow.`);
      continue; // Skip if the event isn't tomorrow
    }

    let eventTypeDoc;
    if (type && type.id) {
      eventTypeDoc = await db.collection("EventTypes").doc(type.id).get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue; // Skip to the next event if there's an issue with 'type'
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};

    // If there's a selectedUser, email only that user
    if (selectedUser) {
      const selectedUserDoc = await db
        .collection("Users")
        .doc(selectedUser)
        .get();
      const userData = selectedUserDoc.exists ? selectedUserDoc.data() : null;

      if (userData && userData.email) {
        const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;
        await sendEmail(
          userData.email,
          `Event Notification - ${name}`,
          emailContent
        );
        console.log(`Email sent to selected user: ${userData.email}`);
      } else {
        console.error("Selected user not found or invalid.");
      }
    } else {
      // Otherwise, email all users
      const usersSnapshot = await db.collection("Users").get();
      const usersToEmail = usersSnapshot.docs
        .map((userDoc) => {
          const userData = userDoc.data();
          return { email: userData.email, name: userData.name };
        })
        .filter((user) => !!user.email);

      const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;

      for (const user of usersToEmail) {
        await sendEmail(
          user.email,
          `Event Notification - ${name}`,
          emailContent
        );
      }
    }
  }
}

// Schedule the cron job to run daily at 8 AM
cron.schedule("0 8 * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchDailyEventsAndSendEmails();
});

// Schedule the cron job to run daily at 7:30 AM at Sun
cron.schedule("30 7 * * Sun", () => {
  console.log("Running weekly cron job to check events and send emails.");
  fetchWeeklyEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
