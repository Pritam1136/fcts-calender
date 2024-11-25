import dotenv from "dotenv";
import {
  fetchDailyEventsAndSendEmails,
  fetchWeeklyEventsAndSendEmails,
} from "./services/eventService.js";

dotenv.config();

const args = process.argv.slice(2);

if (args.includes("--daily")) {
  console.log("Running daily event task...");
  fetchDailyEventsAndSendEmails();
}

if (args.includes("--weekly")) {
  console.log("Running weekly event task...");
  fetchWeeklyEventsAndSendEmails();
}

export default {
  fetchDailyEventsAndSendEmails,
  fetchWeeklyEventsAndSendEmails,
};
