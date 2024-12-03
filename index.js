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

cron.schedule("00 8 * * *", () => {
  console.log("Running daily cron job to check events and send emails.");
  fetchDailyEventsAndSendEmails();
});

cron.schedule("00 8 * * Mon", () => {
  console.log("Running weekly cron job to check events and send emails.");
  fetchWeeklyEventsAndSendEmails();
});

app.listen(port, () => {
  console.log(`Server started on PORT ${port}`);
});
