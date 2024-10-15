import express from "express";
import cron from "node-cron";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "firebase-admin";
import serviceAccount from "./fcts-calender.json" assert { type: "json" };

const app = express();
const port = 5001;

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

function isEventTomorrow(startDate) {
  const eventDate = startDate.toDate ? startDate.toDate() : new Date(startDate);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return (
    eventDate.getDate() === tomorrow.getDate() &&
    eventDate.getMonth() === tomorrow.getMonth() &&
    eventDate.getFullYear() === tomorrow.getFullYear()
  );
}

function isEventThisWeek(startDate) {
  const eventDate = startDate.toDate ? startDate.toDate() : new Date(startDate);
  const today = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(today.getDate() + 7);

  return eventDate >= today && eventDate <= oneWeekFromNow;
}

function dates(startDate, endDate) {
  const newStartDate = new Date(startDate._seconds * 1000).toISOString();
  const newEndDate = new Date(endDate._seconds * 1000).toISOString();
  return { newStartDate, newEndDate };
}

async function fetchDailyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    if (!isEventTomorrow(startDate)) {
      console.log(`Skipping event: ${name}, not happening tomorrow.`);
      continue;
    }

    // Check if 'type' is a valid DocumentReference
    let eventTypeDoc;
    if (type instanceof admin.firestore.DocumentReference) {
      eventTypeDoc = await type.get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue;
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};

    if (Array.isArray(selectedUser) && selectedUser.length > 0) {
      for (let userRef of selectedUser) {
        let userId;
        userId = userRef.id;

        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        // Fetch user data based on userId
        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          const { newStartDate, newEndDate } = dates(startDate, endDate);
          const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${newStartDate}\nEnd Date: ${newEndDate}`;
          await sendEmail(
            userData.email,
            `Event Notification - ${name}`,
            emailContent
          );
          console.log(`Email sent to selected user: ${userData.email}`);
        } else {
          console.error("Selected user not found or invalid.");
        }
      }
    } else {
      // Send email to all users if no specific users are selected
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

    // Check if the event is happening this week
    if (!isEventThisWeek(startDate)) {
      console.log(`Skipping event: ${name}, not happening this week.`);
      continue;
    }

    let eventTypeDoc;

    // Handle DocumentReference for type
    if (type instanceof admin.firestore.DocumentReference) {
      eventTypeDoc = await type.get(); // Fetch the event type data using DocumentReference
    } else if (typeof type === "string") {
      const typeId = type; // In case type is already a string ID
      eventTypeDoc = await db.collection("EventTypes").doc(typeId).get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue;
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};

    // Handle selected users if available
    if (Array.isArray(selectedUser) && selectedUser.length > 0) {
      for (let userRef of selectedUser) {
        let userId;
        userId = userRef.id;

        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        // Fetch the user data based on userId
        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          const { newStartDate, newEndDate } = dates(startDate, endDate);
          const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${newStartDate}\nEnd Date: ${newEndDate}`;
          await sendEmail(
            userData.email,
            `Event Notification - ${name}`,
            emailContent
          );
          console.log(`Email sent to selected user: ${userData.email}`);
        } else {
          console.error("Selected user not found or invalid.");
        }
      }
    } else {
      // Send email to all users if no specific users are selected
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

cron.schedule("00 8 * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchDailyEventsAndSendEmails();
});

cron.schedule("30 7 * * Sun", () => {
  console.log("Running weekly cron job to check events and send emails.");
  fetchWeeklyEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
