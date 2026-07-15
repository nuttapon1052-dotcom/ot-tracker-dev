// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// VAPID keys ตั้งค่าผ่าน `supabase secrets set` (เหมือนกับ send-push-test)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

// SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY เป็น secret ที่ Supabase
// ตั้งให้อัตโนมัติในทุก Edge Function อยู่แล้ว ไม่ต้องตั้งเอง
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// key แยกต่างหากสำหรับตรวจสอบสิทธิ์เรียก endpoint นี้ (pg_cron ใช้ค่านี้)
// ไม่ใช้ SUPABASE_SERVICE_ROLE_KEY ตรงนี้อีกต่อไป เพื่อไม่ให้ service role key
// หลุดไปอยู่ในที่ที่ไม่จำเป็น
const REMINDER_AUTH_KEY = Deno.env.get("REMINDER_AUTH_KEY");

// ค่าเริ่มต้น timezone เมื่อ user ยังไม่เคยตั้งไว้ใน ot_settings.timezone
const DEFAULT_TIMEZONE = "Asia/Bangkok";

// ยอมให้ "เลยเวลาเลิกงาน" มาได้กี่นาทีแล้วยังนับว่าต้องเตือน - ตั้งไว้ 15 นาที
// ให้เท่ากับความถี่ของ pg_cron (ทุก 15 นาที) ไม่ใช่ 5-10 นาที เพราะถ้า cron
// รันทุก 15 นาทีแต่ window แคบกว่านั้น จะมีบางเวลาเลิกงานที่ตกหล่นไปเลย (เช่น
// เลิกงาน 17:01 แต่ cron รอบถัดไปคือ 17:15 ห่างไป 14 นาที ถ้า window = 10
// นาทีก็จะพลาดรอบนั้นไปเฉยๆ) ปรับได้ผ่าน secret REMINDER_WINDOW_MINUTES
// แต่ควรตั้งให้ >= ความถี่ cron เสมอ
const REMINDER_WINDOW_MINUTES = Number(Deno.env.get("REMINDER_WINDOW_MINUTES")) || 15;

// รอกี่นาทีหลัง "เวลาเลิกงาน/เวลาสิ้นสุด OT บังคับ" ถึงจะเตือน - ตั้งไว้ 15 นาที
// ตามที่ผู้ใช้ต้องการ (เลิกงาน 20:00 -> เตือน 20:15) ไม่ใช่เตือนตอน 20:00 พอดี
// จุดสำคัญ: ค่านี้ควรเป็นจำนวนเท่าของความถี่ cron (15 นาที) เพื่อให้เวลาเป้าหมาย
// (end + delay) ตกลงบนจังหวะที่ cron รันพอดีเมื่อเวลาเลิกงานเป็นจำนวนเท่าของ 15
// เตือนได้แค่วันละครั้งอยู่แล้วผ่าน last_reminder_sent_date ด้านล่าง
const REMINDER_DELAY_MINUTES = Number(Deno.env.get("REMINDER_DELAY_MINUTES")) || 15;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:test@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

interface OtSettingsRow {
  user_id: string;
  data: {
    notifyEnabled?: boolean;
    normalEnd?: string;
    hasMandatoryOt?: boolean;
    mandatoryOtEnd?: string;
  } | null;
  timezone: string | null;
  last_reminder_sent_date: string | null;
}

interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// แปลงเวลาปัจจุบันเป็นวันที่/เวลาตาม timezone ของ user นั้นๆ โดยไม่พึ่ง
// library เสริม - ใช้ Intl ที่ Deno runtime มีให้ในตัวอยู่แล้ว
function getZonedDateAndMinutes(now: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const dateISO = `${get("year")}-${get("month")}-${get("day")}`;
  const minutesOfDay = Number(get("hour")) * 60 + Number(get("minute"));
  return { dateISO, minutesOfDay };
}

function parseTimeToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

// ระยะห่าง (นาที) นับจาก targetMinutes มาถึง nowMinutes แบบวนข้ามเที่ยงคืนได้
// เช่น target 23:55, now 00:05 -> ห่างกัน 10 นาที ไม่ใช่ -1430 นาที
function minutesSince(targetMinutes: number, nowMinutes: number): number {
  return ((nowMinutes - targetMinutes) % 1440 + 1440) % 1440;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // ป้องกันไม่ให้ใครก็ได้ (เช่น ผู้ถือ anon key ฝั่งหน้าเว็บ) มายิง endpoint
  // นี้เพื่อสั่งส่ง push ให้ user ทุกคนได้ตามใจชอบ (pg_cron เรียกด้วย
  // REMINDER_AUTH_KEY ตามคำแนะนำท้ายไฟล์)
  //
  // ใช้ header ชื่อเอง "X-Reminder-Auth" แทน "Authorization" เพราะ Supabase
  // gateway จะตรวจสอบค่าใน Authorization header เองก่อนโค้ดเราจะได้ทำงานเสมอ
  // (ไม่ว่า verify_jwt จะปิดไว้หรือไม่) แล้ว reject ค่าที่ไม่ใช่ JWT/apikey ที่
  // ถูกต้อง ทำให้ REMINDER_AUTH_KEY (เป็น plain string ไม่ใช่ JWT) ผ่านไม่ถึง
  // โค้ดเราเลย ตาม Supabase docs endpoint ที่ทำ custom auth เองไม่ควรใช้
  // Authorization header เลย
  const reminderAuthHeader = req.headers.get("X-Reminder-Auth") ?? "";
  if (!REMINDER_AUTH_KEY || reminderAuthHeader !== REMINDER_AUTH_KEY) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ใน secrets" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  // ขั้น 1: ดึงเฉพาะ user ที่เปิด notifyEnabled ไว้ใน ot_settings.data
  const { data: settingsRows, error: settingsError } = await supabaseAdmin
    .from("ot_settings")
    .select("user_id, data, timezone, last_reminder_sent_date")
    .eq("data->>notifyEnabled", "true");

  if (settingsError) {
    return Response.json({ error: settingsError.message }, { status: 500 });
  }

  const summary = {
    checked: 0,
    dueForReminder: 0,
    alreadyHasEntryToday: 0,
    alreadySentToday: 0,
    noSubscription: 0,
    sent: 0,
    failedPushes: [] as { user_id: string; endpoint: string; error: string }[],
    errors: [] as { user_id: string; error: string }[],
  };

  const rows = (settingsRows ?? []) as OtSettingsRow[];

  await Promise.allSettled(rows.map(async (row) => {
    summary.checked++;

    const normalEnd = row.data?.normalEnd;
    if (!normalEnd) return; // ยังไม่ได้ตั้งเวลาเลิกงานปกติ

    // ถ้าเปิด "บังคับ OT" ไว้ เวลาที่ควรเตือนคือเวลาสิ้นสุด OT บังคับ
    // (mandatoryOtEnd) ไม่ใช่เวลาเลิกงานปกติ - ต้องคำนวณให้ตรงกับที่ client
    // ใช้ใน effectiveSchedule() (js/app.js) ไม่งั้นคนที่ติ๊กบังคับ OT จะไม่มี
    // ทางได้รับแจ้งเตือนเลย เพราะ window 15 นาทีปิดไปตั้งแต่เวลาเลิกงานปกติแล้ว
    const effectiveEnd = row.data?.hasMandatoryOt && row.data?.mandatoryOtEnd
      ? row.data.mandatoryOtEnd
      : normalEnd;

    const endMinutes = parseTimeToMinutes(effectiveEnd);
    if (endMinutes === null) return;

    // เตือน "หลังเลิกงาน REMINDER_DELAY_MINUTES นาที" ไม่ใช่ตอนเลิกงานพอดี
    // เลื่อนเป้าหมายไปข้างหน้าตาม delay แล้ว mod 1440 กันข้ามเที่ยงคืน
    const targetMinutes = (endMinutes + REMINDER_DELAY_MINUTES) % 1440;

    const timeZone = row.timezone || DEFAULT_TIMEZONE;
    let dateISO: string;
    let minutesOfDay: number;
    try {
      ({ dateISO, minutesOfDay } = getZonedDateAndMinutes(now, timeZone));
    } catch {
      ({ dateISO, minutesOfDay } = getZonedDateAndMinutes(now, DEFAULT_TIMEZONE));
    }

    // ยังไม่ถึงเวลาเตือน (เลิกงาน + delay) หรือเลยมาเกิน window ที่ยอมรับแล้ว
    const elapsed = minutesSince(targetMinutes, minutesOfDay);
    if (elapsed > REMINDER_WINDOW_MINUTES) return;

    // เคยส่งเตือนของวันนี้ (ตามเวลาท้องถิ่นของ user) ไปแล้ว - กันส่งซ้ำ
    if (row.last_reminder_sent_date === dateISO) {
      summary.alreadySentToday++;
      return;
    }

    summary.dueForReminder++;

    // บันทึกเวลาออกงาน (time_out) ของวันนี้แล้ว - ไม่ต้องเตือน
    // หมายเหตุ: อาจมี row ของวันนี้อยู่แล้วแต่ time_out ยังเป็น null (clock in
    // แล้วแต่ยังไม่ clock out) กรณีนี้ต้องยังเตือนอยู่ จึงเช็คที่ time_out
    // โดยตรงแทนที่จะเช็คแค่ว่ามี row หรือไม่
    const { count: entryCount, error: entryError } = await supabaseAdmin
      .from("ot_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .eq("date", dateISO)
      .not("time_out", "is", null);

    if (entryError) {
      summary.errors.push({ user_id: row.user_id, error: entryError.message });
      return;
    }
    if (entryCount && entryCount > 0) {
      summary.alreadyHasEntryToday++;
      return;
    }

    // หา subscription ของ user คนนี้ (อาจมีหลายอุปกรณ์)
    const { data: subs, error: subsError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", row.user_id);

    if (subsError) {
      summary.errors.push({ user_id: row.user_id, error: subsError.message });
      return;
    }
    if (!subs || subs.length === 0) {
      summary.noSubscription++;
      return;
    }

    const payload = JSON.stringify({
      title: "OT Fast",
      body: "⏰ ถึงเวลาเลิกงานแล้ว อย่าลืมบันทึกเวลาทำงานวันนี้",
    });

    const staleSubIds: string[] = [];
    let anySuccess = false;
    const results = await Promise.allSettled(
      (subs as PushSubscriptionRow[]).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      ),
    );

    results.forEach((r, i) => {
      const sub = (subs as PushSubscriptionRow[])[i];
      if (r.status === "fulfilled") {
        summary.sent++;
        anySuccess = true;
        return;
      }
      const reason = r.reason as { statusCode?: number; message?: string };
      // subscription หมดอายุ/ถูกยกเลิกฝั่ง browser แล้ว - ลบทิ้งกันค้างไว้ยิงซ้ำทุกรอบ
      if (reason?.statusCode === 404 || reason?.statusCode === 410) {
        staleSubIds.push(sub.id);
      }
      summary.failedPushes.push({
        user_id: row.user_id,
        endpoint: sub.endpoint,
        error: reason?.message ?? String(reason),
      });
    });

    if (staleSubIds.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("id", staleSubIds);
    }

    // มาร์ค "เตือนวันนี้แล้ว" เฉพาะเมื่อส่งสำเร็จอย่างน้อย 1 เครื่องเท่านั้น
    // ถ้าทุกเครื่องล้มเหลว (เช่น subscription เดียวที่มีหมดอายุไปแล้ว) อย่าเพิ่ง
    // มาร์ค เพื่อให้ cron รอบถัดไปในช่วง window เดิมยังลองใหม่ได้ - เผื่ออุปกรณ์
    // เพิ่ง self-heal สมัคร subscription ใหม่เข้ามา (ดู ensurePushSubscription
    // ฝั่ง client) ก็จะยิงถึงในรอบถัดไปได้ ไม่ตกหล่นทั้งวัน
    if (anySuccess) {
      await supabaseAdmin
        .from("ot_settings")
        .update({ last_reminder_sent_date: dateISO })
        .eq("user_id", row.user_id);
    }
  }));

  return Response.json({ message: "ตรวจสอบและส่งแจ้งเตือนเสร็จสิ้น", ...summary });
});

/* วิธีทดสอบ (local):

  1. รัน `supabase start`
  2. เรียกด้วย curl พร้อมแนบ REMINDER_AUTH_KEY ใน header ชื่อ X-Reminder-Auth:

  curl -i --location --request POST \
    'http://127.0.0.1:54321/functions/v1/send-push-reminders' \
    --header 'X-Reminder-Auth: <REMINDER_AUTH_KEY>'

  ต้องแนบ REMINDER_AUTH_KEY ผ่าน X-Reminder-Auth เท่านั้น เพราะฟังก์ชันนี้เช็ค
  header นี้เองภายใน (ดูโค้ดด้านบน) โดยไม่สนใจว่า verify_jwt จะผ่านหรือไม่ -
  ป้องกันไม่ให้ใครก็ได้ที่ถือ anon key มายิงส่ง push แทน user อื่นได้ (ไม่ใช้
  Authorization header เพราะ Supabase gateway จะดักตรวจค่านั้นเองก่อนถึงโค้ดเรา)

  ดูวิธีตั้งค่า pg_cron ให้เรียกฟังก์ชันนี้อัตโนมัติทุก 15 นาทีได้ที่
  supabase/migrations/20260712000000_push_reminders.sql

*/
