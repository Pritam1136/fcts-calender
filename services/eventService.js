import db, { admin } from "../config/firebaseConfig.js";
import { sendEmail } from "../utils/emailUtils.js";
import { isEventTomorrow, isEventThisWeek, dates } from "../utils/dateUtils.js";

function emailContent(name, eventType, startDate, _endDate) {
  const formattedStartDate = new Date(startDate).toLocaleDateString("en-IN");
  const imageSrc =
    "https://media.licdn.com/dms/image/v2/C4D0BAQH6fJz1s57_eA/company-logo_200_200/company-logo_200_200/0/1630509348990/forwardcode_techstudio_logo?e=1736985600&v=beta&t=nlMSUu3V4zzN6zA9rlbOjdJE7IdnugYYZniJ09UTlNo";

  return `
  <body style="background-color: aliceblue; font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0;">
    <table align="center" cellpadding="0" cellspacing="0" style="max-width: 800px; width: 100%; margin: 3rem auto; background-color: aliceblue;">
      <!-- Header Section -->
      <tr>
        <td align="center" style="padding: 1rem;">
          <img src="${imageSrc}" alt="logo" style="width: 90px; height: 90px; background-color: white; border-radius: 50%; margin-bottom: 1rem;">
          <p style="font-size: 1.6rem; margin: 2px; text-align: center;">Hi <strong>${name},</strong></p>
          <p style="font-size: 1.6rem; margin: 2px; text-align: center;">${eventType} - Save the date</p>
        </td>
      </tr>
      
      <!-- Main Content Section -->
      <tr>
        <td style="background-color: #ffffff; border-radius: 1rem; padding: 1rem 2rem; margin: 1.5rem 0;">
          <p style="font-size: 13px; color: #5e5e5e; margin: 1rem 0;">Dear, ${name}</p>
          <p style="font-size: 13px; color: #5e5e5e; margin: 1rem 0;">
            We are excited to inform you about an upcoming event: <strong>${eventType}</strong> scheduled for 
            <strong>${formattedStartDate}</strong>.
          </p>
          <br/>
          <p style="font-size: 13px; color: #5e5e5e;">We look forward to seeing you there!</p>
          <p style="font-size: 13px; color: #5e5e5e;">In case of any queries or suggestions, please connect.</p>
        </td>
      </tr>

      <!-- Footer Section with HR Info -->
      <tr>
        <td style="padding: 1rem;">
          <table width="100%" style="text-align: start;">
            <tr>
              <td width="90" style="padding-right: 1rem;">
                <img src="${imageSrc}" alt="Forwardcode TechStudio" style="width: 90px; height: 90px; background-color: white; margin-bottom: 1rem;">
              </td>
              <td>
                <p style="font-size: 14px; font-weight: bold; color: #333;">TEAM HR</p>
                <p style="font-size: 12px; color: #5e5e5e;">Forwardcode TechStudio</p>
                <p style="font-size: 12px; color: #5e5e5e;">Jamshedpur, JH - 831018</p>
                <p style="font-size: 12px;">hr@forwardcode.in</p>
                <p style="font-size: 12px; color: black;">
                  Check what's new: 
                  <a href="https://forwardcode.in" style="color: #007bff;">https://forwardcode.in</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Disclaimer Section -->
      <tr>
        <td style="padding: 1rem;">
          <p style="font-size: 8px; margin: 0;">PLEASE CONSIDER THE ENVIRONMENT BEFORE PRINTING THIS EMAIL.</p>
          <p style="font-size: 8px; margin: 0;">
            THIS MESSAGE IS INTENDED ONLY FOR THE USE OF THE INDIVIDUAL OR ENTITY TO WHICH IT IS ADDRESSED AND MAY CONTAIN 
            INFORMATION THAT IS PRIVILEGED, CONFIDENTIAL AND EXEMPT FROM DISCLOSURE UNDER APPLICABLE LAW.
            IF YOU ARE NOT THE INTENDED RECIPIENT, YOU ARE HEREBY NOTIFIED THAT ANY DISSEMINATION OR COPYING IS STRICTLY PROHIBITED.
          </p>
        </td>
      </tr>
    </table>
  </body>
  `;
}

export async function fetchDailyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    if (!isEventTomorrow(startDate)) {
      console.log(`Skipping event: ${name}, not happening tomorrow.`);
      continue;
    }

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
        let userId = userRef.id;

        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          const { newStartDate, newEndDate } = dates(startDate, endDate);
          // const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${newStartDate}\nEnd Date: ${newEndDate}`;
          await sendEmail(
            userData.email,
            `Event Notification - ${name}`,
            emailContent(userData.name, eventTypeData.name, newStartDate)
          );
        }
      }
    } else {
      const usersSnapshot = await db.collection("Users").get();
      const usersToEmail = usersSnapshot.docs
        .map((userDoc) => {
          const userData = userDoc.data();
          return { email: userData.email, name: userData.name };
        })
        .filter((user) => !!user.email);

      // const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;

      for (const user of usersToEmail) {
        await sendEmail(
          user.email,
          `Event Notification - ${name}`,
          emailContent(user.name, eventTypeData.name, startDate)
        );
      }
    }
  }
}

export async function fetchWeeklyEventsAndSendEmails() {
  const eventsSnapshot = await db.collection("Events").get();

  for (const eventDoc of eventsSnapshot.docs) {
    const eventData = eventDoc.data();
    const { type, name, startDate, endDate, selectedUser } = eventData;

    if (!isEventThisWeek(startDate)) {
      console.log(`Skipping event: ${name}, not happening this week.`);
      continue;
    }

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
        let userId = userRef.id;

        if (!userId) {
          console.error("Invalid user reference:", userRef);
          continue;
        }

        const userDoc = await db.collection("Users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        if (userData && userData.email) {
          const { newStartDate, newEndDate } = dates(startDate, endDate);
          // const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${newStartDate}\nEnd Date: ${newEndDate}`;
          await sendEmail(
            userData.email,
            `Event Notification - ${name}`,
            emailContent(
              userData.name,
              eventTypeData.name,
              newStartDate,
              newEndDate
            )
          );
        }
      }
    } else {
      const usersSnapshot = await db.collection("Users").get();
      const usersToEmail = usersSnapshot.docs
        .map((userDoc) => {
          const userData = userDoc.data();
          return { email: userData.email, name: userData.name };
        })
        .filter((user) => !!user.email);

      // const emailContent = `Event: ${name}\nEvent Type: ${eventTypeData.name}\nStart Date: ${startDate}\nEnd Date: ${endDate}`;

      for (const user of usersToEmail) {
        await sendEmail(
          user.email,
          `Event Notification - ${name}`,
          emailContent(user.name, eventTypeData.name, startDate, endDate)
        );
      }
    }
  }
}
