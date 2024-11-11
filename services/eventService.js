import db, { admin } from "../config/firebaseConfig.js";
import { sendEmail } from "../utils/emailUtils.js";
import { isEventToday, isEventThisWeek } from "../utils/dateUtils.js";

function emailContent(name, events, timeFrame) {
  const imageSrc =
    "https://media.licdn.com/dms/image/v2/C4D0BAQH6fJz1s57_eA/company-logo_200_200/company-logo_200_200/0/1630509348990/forwardcode_techstudio_logo?e=1736985600&v=beta&t=nlMSUu3V4zzN6zA9rlbOjdJE7IdnugYYZniJ09UTlNo";

  // Generate event rows for each event
  const eventRows = events
    .map((event) => {
      const formattedStartDate = new Date(
        event.startDate.toDate()
      ).toLocaleDateString("en-IN");
      const formattedEndDate = new Date(
        event.endDate.toDate()
      ).toLocaleDateString("en-IN");

      // Conditionally include date columns based on timeFrame
      const startDateColumn =
        timeFrame !== "today"
          ? `<td style="padding: 0.5rem; border-bottom: 1px solid #ddd;">${formattedStartDate}</td>`
          : "";
      const endDateColumn =
        timeFrame !== "today"
          ? `<td style="padding: 0.5rem; border-bottom: 1px solid #ddd;">${formattedEndDate}</td>`
          : "";

      return `
      <tr>
        <td style="padding: 0.5rem; border-bottom: 1px solid #ddd;">${event.name}</td>
        <td style="padding: 0.5rem; border-bottom: 1px solid #ddd;">${event.eventType}</td>
        ${startDateColumn}
        ${endDateColumn}
      </tr>
      `;
    })
    .join("");

  // Dynamic message based on the timeFrame
  const timeFrameMessage =
    timeFrame === "today"
      ? "Here is a list of events scheduled for today:"
      : "Here is a list of events scheduled for this week:";

  return `
  <body style="background-color: aliceblue; font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0;">
    <table align="center" cellpadding="0" cellspacing="0" style="max-width: 800px; width: 100%; margin: 3rem auto; background-color: aliceblue;">
      <tr>
        <td align="center" style="padding: 1rem;">
          <img src="${imageSrc}" alt="logo" style="width: 90px; height: 90px; background-color: white; border-radius: 50%; margin-bottom: 1rem;">
          <p style="font-size: 1.6rem; margin: 2px; text-align: center;">Hi <strong>${name},</strong></p>
        </td>
      </tr>
      <tr>
        <td style="background-color: #ffffff; border-radius: 1rem; padding: 1rem 2rem; margin: 1.5rem 0;">
          <p style="font-size: 13px; color: #5e5e5e; margin: 1rem 0;">Dear ${name},</p>
          <p style="font-size: 13px; color: #5e5e5e; margin: 1rem 0;">${timeFrameMessage}</p>
          <table width="100%" style="border-collapse: collapse; margin-top: 1rem;">
            <thead>
              <tr>
                <th style="padding: 0.5rem; background-color: #007bff; color: #ffffff;">Event Name</th>
                <th style="padding: 0.5rem; background-color: #007bff; color: #ffffff;">Event Type</th>
                ${
                  timeFrame !== "today"
                    ? `<th style="padding: 0.5rem; background-color: #007bff; color: #ffffff;">Start Date</th>`
                    : ""
                }
                ${
                  timeFrame !== "today"
                    ? `<th style="padding: 0.5rem; background-color: #007bff; color: #ffffff;">End Date</th>`
                    : ""
                }
              </tr>
            </thead>
              <tbody>${eventRows}</tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 1rem;">
          <p style="font-size: 8px; margin: 0;">PLEASE CONSIDER THE ENVIRONMENT BEFORE PRINTING THIS EMAIL.</p>
          <p style="font-size: 8px; margin: 0;">THIS MESSAGE IS INTENDED ONLY FOR THE USE OF THE INDIVIDUAL OR ENTITY TO WHICH IT IS ADDRESSED AND MAY CONTAIN INFORMATION THAT IS PRIVILEGED, CONFIDENTIAL AND EXEMPT FROM DISCLOSURE UNDER APPLICABLE LAW.</p>
        </td>
      </tr>
    </table>
  </body>
  `;
}

export async function fetchDailyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();
  const usersEventsMap = new Map();

  // Get today's date
  const today = new Date();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    // Check if the event is happening today
    if (!isEventToday(startDate, today)) {
      console.log(`Skipping event: ${name}, not happening today.`);
      continue;
    }

    // Retrieve event type details
    let eventTypeDoc;
    if (type instanceof admin.firestore.DocumentReference) {
      eventTypeDoc = await type.get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue;
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};
    const formattedEvent = {
      name,
      eventType: eventTypeData.name || "N/A",
      startDate,
      endDate,
    };

    // If selectedUser exists, add the event to each specific user’s event list
    if (Array.isArray(selectedUser) && selectedUser.length > 0) {
      for (let userRef of selectedUser) {
        const userId = userRef.id;
        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          if (!usersEventsMap.has(userId)) {
            usersEventsMap.set(userId, {
              name: userData.name,
              email: userData.email,
              events: [],
            });
          }
          usersEventsMap.get(userId).events.push(formattedEvent);
        }
      }
    } else {
      // Otherwise, add the event for all users
      const usersSnapshot = await db.collection("Users").get();
      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData && userData.email) {
          if (!usersEventsMap.has(userDoc.id)) {
            usersEventsMap.set(userDoc.id, {
              name: userData.name,
              email: userData.email,
              events: [],
            });
          }
          usersEventsMap.get(userDoc.id).events.push(formattedEvent);
        }
      });
    }
  }

  // Send emails
  for (const [_userId, { name, email, events }] of usersEventsMap) {
    if (events.length > 0) {
      const emailBody = emailContent(name, events, "today");
      await sendEmail(email, "Today's Events", emailBody);
    }
  }
}

export async function fetchWeeklyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();
  const usersEventsMap = new Map();

  // Get the start and end of this week
  const today = new Date();
  const firstDayOfWeek = today.getDate() - today.getDay();
  const lastDayOfWeek = firstDayOfWeek + 6;
  const startOfWeek = new Date(today.setDate(firstDayOfWeek));
  const endOfWeek = new Date(today.setDate(lastDayOfWeek));

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    // Check if the event is happening this week
    if (!isEventThisWeek(startDate, startOfWeek, endOfWeek)) {
      console.log(`Skipping event: ${name}, not happening this week.`);
      continue;
    }

    // Retrieve event type details
    let eventTypeDoc;
    if (type instanceof admin.firestore.DocumentReference) {
      eventTypeDoc = await type.get();
    } else {
      console.error("Invalid event type or reference:", type);
      continue;
    }

    const eventTypeData = eventTypeDoc.exists ? eventTypeDoc.data() : {};
    const formattedEvent = {
      name,
      eventType: eventTypeData.name || "N/A",
      startDate,
      endDate,
    };

    // If selectedUser exists, add the event to each specific user’s event list
    if (Array.isArray(selectedUser) && selectedUser.length > 0) {
      for (let userRef of selectedUser) {
        const userId = userRef.id;
        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          if (!usersEventsMap.has(userId)) {
            usersEventsMap.set(userId, {
              name: userData.name,
              email: userData.email,
              events: [],
            });
          }
          usersEventsMap.get(userId).events.push(formattedEvent);
        }
      }
    } else {
      // Otherwise, add the event for all users
      const usersSnapshot = await db.collection("Users").get();
      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData && userData.email) {
          if (!usersEventsMap.has(userDoc.id)) {
            usersEventsMap.set(userDoc.id, {
              name: userData.name,
              email: userData.email,
              events: [],
            });
          }
          usersEventsMap.get(userDoc.id).events.push(formattedEvent);
        }
      });
    }
  }

  // Send emails
  for (const [userId, { name, email, events }] of usersEventsMap) {
    if (events.length > 0) {
      const emailBody = emailContent(name, events, "week");
      await sendEmail(email, "Upcoming Events This Week", emailBody);
    }
  }
}
