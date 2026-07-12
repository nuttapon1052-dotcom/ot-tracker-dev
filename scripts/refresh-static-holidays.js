// Regenerates js/static-holidays.js - a bundled snapshot of public holidays
// for the 4 countries Nager.Date (date.nager.at) has no data for: Thailand
// (TH), Taiwan (TW), Israel (IL), Malaysia (MY). Verified directly against
// the Nager.Date API (HTTP 204 for all four, every year 2025-2029) before
// adding this fallback.
//
// Source: Google Calendar's public "Holidays in <country>" ICS feeds. These
// can't be fetched at runtime from the browser (Google's calendar server
// sends no Access-Control-Allow-Origin header, so the request is blocked by
// CORS) - confirmed with a live fetch() call in a real browser context. This
// script instead runs the fetch + ICS parse server-side (Node has no CORS
// restriction) and bakes the result into a static JS file the app loads
// like any other asset.
//
// Re-run this whenever the bundled year range needs extending:
//   node scripts/refresh-static-holidays.js
//
// Usage: node scripts/refresh-static-holidays.js [fromYear] [toYear]

var fs = require("fs");
var path = require("path");

var ICS_SOURCES = {
  // th.th (Thai locale) rather than en.th - Google translates VEVENT
  // SUMMARY into Thai for this locale variant, so the bundled names are
  // already in Thai and need no entry in js/holiday-names-th.js.
  TH: "https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics",
  TW: "https://calendar.google.com/calendar/ical/en.taiwan%23holiday%40group.v.calendar.google.com/public/basic.ics",
  IL: "https://calendar.google.com/calendar/ical/en.jewish%23holiday%40group.v.calendar.google.com/public/basic.ics",
  MY: "https://calendar.google.com/calendar/ical/en.malaysia%23holiday%40group.v.calendar.google.com/public/basic.ics"
};

// Thailand's feed mixes real public holidays (DESCRIPTION "วันหยุดนักขัตฤกษ์")
// with non-holiday "important days" (DESCRIPTION starts with "วันสำคัญ" -
// observances like the 2nd day of Chinese New Year, which aren't official
// non-working days). Filtered to the former only, same reasoning as the
// Israel allowlist below.
var THAILAND_HOLIDAY_DESCRIPTION = "วันหยุดนักขัตฤกษ์";

// Google has no dedicated "Israel public holidays" calendar (the natural
// en.israel#holiday@... URL 404s) - only this broad "Jewish Holidays" feed,
// which mixes in ~120 events/year: Christian/Muslim/Armenian observances,
// "International Women's Day", minor fasts, etc. Filtered down here to the
// ~9 holidays that are actually non-working days under Israeli law, so the
// density matches every other supported country instead of drowning the
// calendar in unrelated observances. Exact strings match the feed's SUMMARY
// field - if Google renames one, that entry silently drops out (fails safe:
// under-highlighting, not a crash).
var ISRAEL_HOLIDAY_ALLOWLIST = [
  "Rosh Hashana",
  "Rosh Hashana (Day 2)",
  "Yom Kippur",
  "Sukkot (Day 1)",
  "Shemini Atzeret / Simchat Torah",
  "Passover (Day 1)",
  "Passover (Day 7)",
  "Yom HaAtzmaut",
  "Shavuot"
];

var thisYear = new Date().getFullYear();
var fromYear = Number(process.argv[2]) || thisYear - 1;
var toYear = Number(process.argv[3]) || thisYear + 3;

// Simple RFC5545 ICS parser: pulls out VEVENT blocks and reads DTSTART
// (date-only, "VALUE=DATE") + SUMMARY. Good enough for public-holiday feeds,
// which only use whole-day, non-recurring events - not a general ICS parser.
function parseIcsEvents(icsText) {
  // Unfold: a line starting with a space/tab is a continuation of the
  // previous line (RFC5545 line folding).
  var unfolded = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  var lines = unfolded.split(/\r\n|\n/);

  var events = [];
  var current = null;

  lines.forEach(function (line) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (current && current.date && current.name) events.push(current);
      current = null;
      return;
    }
    if (!current) return;

    var colonIdx = line.indexOf(":");
    if (colonIdx === -1) return;
    var key = line.slice(0, colonIdx); // e.g. "DTSTART;VALUE=DATE"
    var value = line.slice(colonIdx + 1);

    if (key.indexOf("DTSTART") === 0) {
      // "20210213" (date-only) or "20210213T090000Z" (date-time, take date part)
      var m = value.match(/^(\d{4})(\d{2})(\d{2})/);
      if (m) current.date = m[1] + "-" + m[2] + "-" + m[3];
    } else if (key.indexOf("SUMMARY") === 0) {
      current.name = unescapeIcsText(value);
    } else if (key.indexOf("DESCRIPTION") === 0) {
      current.desc = unescapeIcsText(value);
    }
  });

  return events;
}

function unescapeIcsText(s) {
  return s
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function filterAndGroupByYear(events, fromYear, toYear) {
  var byYear = {};
  events.forEach(function (ev) {
    var year = Number(ev.date.slice(0, 4));
    if (year < fromYear || year > toYear) return;
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push({ date: ev.date, name: ev.name });
  });
  Object.keys(byYear).forEach(function (year) {
    byYear[year].sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  });
  return byYear;
}

async function main() {
  var result = {};

  for (var countryCode in ICS_SOURCES) {
    var url = ICS_SOURCES[countryCode];
    process.stdout.write("Fetching " + countryCode + " ... ");
    var res = await fetch(url);
    if (!res.ok) {
      console.log("FAILED (HTTP " + res.status + ")");
      continue;
    }
    var icsText = await res.text();
    var events = parseIcsEvents(icsText);
    if (countryCode === "IL") {
      events = events.filter(function (ev) { return ISRAEL_HOLIDAY_ALLOWLIST.indexOf(ev.name) !== -1; });
    } else if (countryCode === "TH") {
      events = events.filter(function (ev) { return ev.desc === THAILAND_HOLIDAY_DESCRIPTION; });
    }
    var byYear = filterAndGroupByYear(events, fromYear, toYear);
    var total = Object.keys(byYear).reduce(function (n, y) { return n + byYear[y].length; }, 0);
    console.log(total + " events, " + fromYear + "-" + toYear);
    result[countryCode] = byYear;
  }

  var header =
    "// AUTO-GENERATED by scripts/refresh-static-holidays.js on " + new Date().toISOString().slice(0, 10) + ".\n" +
    "// Do not hand-edit - re-run the script instead:\n" +
    "//   node scripts/refresh-static-holidays.js [fromYear] [toYear]\n" +
    "//\n" +
    "// Bundled snapshot of public holidays for TH/TW/IL/MY (Google Calendar ICS),\n" +
    "// covering " + fromYear + "-" + toYear + ". Nager.Date (date.nager.at), which\n" +
    "// powers holidays for every other supported currency's country, has no data\n" +
    "// for these four - and Google's calendar server doesn't send CORS headers,\n" +
    "// so it can't be fetched live from the browser. This file exists so those\n" +
    "// four countries still get holiday highlighting, without a live network\n" +
    "// dependency or a third-party CORS proxy.\n" +
    "//\n" +
    "// Extend the range by re-running this script periodically (e.g. yearly).\n";

  var out = header + "window.STATIC_HOLIDAYS = " + JSON.stringify(result, null, 2) + ";\n";
  var outPath = path.join(__dirname, "..", "js", "static-holidays.js");
  fs.writeFileSync(outPath, out, "utf8");
  console.log("Wrote " + outPath);
}

main().catch(function (err) {
  console.error("Failed to refresh static holidays:", err);
  process.exit(1);
});
