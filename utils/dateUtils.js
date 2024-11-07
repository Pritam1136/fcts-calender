export function isEventToday(startDate, today) {
  const eventDate = startDate.toDate ? startDate.toDate() : new Date(startDate);

  // Check if the event is today
  return (
    eventDate.getDate() === today.getDate() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  );
}

export function isEventThisWeek(startDate, startOfWeek, endOfWeek) {
  const eventDate = startDate.toDate ? startDate.toDate() : new Date(startDate);

  // Check if the event is happening between the start and end of the current week
  return eventDate >= startOfWeek && eventDate <= endOfWeek;
}
