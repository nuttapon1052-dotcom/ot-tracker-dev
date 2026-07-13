// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

// VAPID keys ตั้งค่าผ่าน `supabase secrets set` (ดูคำแนะนำท้ายไฟล์นี้)
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

// SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY เป็น secret ที่ Supabase
// ตั้งให้อัตโนมัติในทุก Edge Function อยู่แล้ว ไม่ต้องตั้งเอง
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:test@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return Response.json(
      { error: "ยังไม่ได้ตั้งค่า VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ใน secrets" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ทดสอบขั้นแรก: ดึง subscription ทั้งหมดในระบบ (ยังไม่กรองตาม user ที่ login)
  // เมื่อพร้อมใช้งานจริงค่อยเปลี่ยนมากรองด้วย user_id ที่ต้องการส่ง
  const { data: subscriptions, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ message: "ไม่พบ subscription ในระบบ", sent: 0 });
  }

  const payload = JSON.stringify({
    title: "ทดสอบแจ้งเตือน",
    body: "นี่คือข้อความทดสอบจาก Edge Function",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      )
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results
    .map((r, i) => ({ r, sub: subscriptions[i] }))
    .filter(({ r }) => r.status === "rejected")
    .map(({ r, sub }) => ({
      endpoint: sub.endpoint,
      error: (r as PromiseRejectedResult).reason?.message ??
        String((r as PromiseRejectedResult).reason),
    }));

  return Response.json({
    message: `ส่งแล้ว ${succeeded}/${subscriptions.length} รายการ`,
    sent: succeeded,
    failed,
  });
});

/* วิธีทดสอบ (local):

  1. รัน `supabase start`
  2. เรียกด้วย curl:

  curl -i --location --request POST \
    'http://127.0.0.1:54321/functions/v1/send-push-test'

  ไม่ต้องแนบ header ใดๆ เพราะ verify_jwt = false (ดู supabase/config.toml)

*/
