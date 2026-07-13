// supabase/functions/send-event-reminders/index.ts
//
// Edge Function นี้ถูกเรียกโดย pg_cron วันละครั้ง (แนะนำ 07:00 เวลาไทย)
// หน้าที่: เช็คว่ามี work_notes (บันทึกเหตุการณ์ล่วงหน้า) ที่ start_date = พรุ่งนี้
// ที่ยังไม่เคยถูกแจ้งเตือน -> ส่ง push แจ้งเตือนเจ้าของ event นั้น
//
// ต้องมี secrets ตั้งไว้แล้ว: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// (Supabase Edge Functions มี SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ให้อัตโนมัติ)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;

const VAPID_SUBJECT = "mailto:test@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getBangkokTomorrowDate(): string {
  const now = new Date();
  // บวก 1 วันแบบ UTC เพื่อความง่าย แล้วค่อย format เป็นวันที่ Bangkok
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(tomorrow);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`; // YYYY-MM-DD
}

Deno.serve(async (req) => {
  try {
    // Auth check: ต้องมี service role key ใน Authorization header
    // กันคนนอกยิง URL เข้ามาสั่งส่ง push เอง
    const authHeader = req.headers.get("Authorization") ?? "";
    const expected = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
    if (authHeader !== expected) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const tomorrow = getBangkokTomorrowDate();

    // 1) หา event ที่เริ่มพรุ่งนี้ และยังไม่เคยแจ้งเตือน
    const { data: notes, error: notesError } = await supabaseAdmin
      .from("work_notes")
      .select("id, user_id, title, description, start_date")
      .eq("start_date", tomorrow)
      .eq("reminder_sent", false);

    if (notesError) throw notesError;
    if (!notes || notes.length === 0) {
      return jsonResponse({ message: "No events tomorrow", sent: 0 });
    }

    const userIds = [...new Set(notes.map((n) => n.user_id))];

    // 2) ดึง push subscriptions ของ user เหล่านี้ (มี subscription = เปิด Push ไว้แล้ว)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    if (subError) throw subError;

    const subsByUser = new Map<string, typeof subscriptions>();
    for (const sub of subscriptions ?? []) {
      const list = subsByUser.get(sub.user_id) ?? [];
      list.push(sub);
      subsByUser.set(sub.user_id, list);
    }

    let sentCount = 0;
    const errors: string[] = [];
    const notifiedNoteIds: string[] = [];

    for (const note of notes) {
      const userSubs = subsByUser.get(note.user_id) ?? [];
      if (userSubs.length === 0) continue; // ยังไม่เปิด Push เลย ข้าม

      let anySuccess = false;

      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: `พรุ่งนี้มีนัด: ${note.title}`,
              body: note.description || "อย่าลืมเตรียมตัวสำหรับเหตุการณ์นี้",
            }),
          );
          sentCount++;
          anySuccess = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          errors.push(`${sub.id}: ${message}`);

          if (message.includes("410") || message.includes("404")) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }

      // อัปเดต reminder_sent ถ้าส่งสำเร็จอย่างน้อย 1 เครื่อง
      // (ถ้าไม่มีเครื่องไหนส่งสำเร็จเลย ปล่อยให้ลองใหม่ cron รอบถัดไปวันเดียวกัน)
      if (anySuccess) {
        notifiedNoteIds.push(note.id);
      }
    }

    if (notifiedNoteIds.length > 0) {
      await supabaseAdmin
        .from("work_notes")
        .update({ reminder_sent: true })
        .in("id", notifiedNoteIds);
    }

    return jsonResponse({
      message: "Event reminder check complete",
      eventsChecked: notes.length,
      sent: sentCount,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
