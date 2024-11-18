import express from "express";
import dotenv from "dotenv";
import {
  fetchDailyEventsAndSendEmails,
  fetchWeeklyEventsAndSendEmails,
} from "./services/eventService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());

app.get("/daily-events", (_req, res) => {
  console.log("Running daily cron job to check events and send emails.");
  fetchDailyEventsAndSendEmails();
  res.json({ status: "sent" });
});

app.get("/weekly-events", (_req, res) => {
  console.log("Running weekly cron job to check events and send emails.");
  fetchWeeklyEventsAndSendEmails();
  res.json({ status: "sent" });
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
