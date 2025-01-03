# FCTS Calendar Tool

FCTS Calendar Tool is a Node.js-based application that helps manage events and send email notifications to selected users. The tool integrates with Firebase Firestore to store and retrieve event and user data. It periodically checks for upcoming events and sends email notifications based on custom event types and selected users. The project also supports weekly and daily cron jobs to automate the email-sending process.

## Features

- **Event Management**: Stores and retrieves events from Firebase Firestore.
- **User Management**: Sends emails to selected users based on event configuration.
- **Email Notifications**: Automatically sends email notifications for events happening on a weekly or daily basis.
- **Cron Job Scheduling**: Automates checking for upcoming events and sends emails using cron jobs.
- **Customizable Event Types**: Supports custom event types for detailed event notifications.
- **Weekly and Daily Schedules**: Two different modes (daily and weekly) for checking and sending email reminders.

## Technologies Used

- **Node.js**: Backend framework for building the server.
- **Firebase Firestore**: NoSQL database to store events, event types, and user data.
- **Nodemailer**: To send email notifications using Gmail.
- **cron**: For scheduling daily and weekly tasks.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14.x or higher)
- Firebase account with Firestore enabled
- Gmail account for sending emails via Nodemailer
