export function isEventTomorrow(startDate) {
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

export function isEventThisWeek(startDate) {
  const eventDate = startDate.toDate ? startDate.toDate() : new Date(startDate);
  const today = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(today.getDate() + 7);

  return eventDate >= today && eventDate <= oneWeekFromNow;
}

export function dates(startDate, endDate) {
  const newStartDate = new Date(startDate._seconds * 1000).toISOString();
  const newEndDate = new Date(endDate._seconds * 1000).toISOString();
  return { newStartDate, newEndDate };
}
