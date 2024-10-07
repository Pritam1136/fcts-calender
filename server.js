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

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fcts-calendar-tool.firebaseio.com",
});

const db = admin.firestore(); // Firestore using Firebase Admin

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

async function fetchEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, createdBy } = eventData;

    // Check if 'type' is a Firestore reference
    let eventTypeDoc;
    if (type && type.id) {
      // 'type' is a Firestore reference, get its ID and fetch EventType details
      eventTypeDoc = await db.collection("EventTypes").doc(type.id).get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue; // Skip to the next event if there's an issue with 'type'
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};

    // Fetch users for the event
    const usersSnapshot = await db.collection("Users").get();
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
