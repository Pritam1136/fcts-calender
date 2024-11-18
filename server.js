import express from "express";
import cron from "node-cron";
import dotenv from "dotenv";
import {
  fetchDailyEventsAndSendEmails,
  fetchWeeklyEventsAndSendEmails,
} from "./services/eventService.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());

app.get("/daily-events", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchDailyEventsAndSendEmails();
});

app.get("/weekly-events", () => {
  console.log("Running weekly cron job to check events and send emails.");
  fetchWeeklyEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});
