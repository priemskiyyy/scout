const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export const formatClockTime = (timestamp: number) => CLOCK.format(timestamp);
