// Translation dictionary: exact source holiday name -> concise Thai label,
// for display in the calendar's day-cell tooltip and the tap toast.
//
// Keys match the string returned by each data source exactly:
//  - JP/KR: Nager.Date's localName (native-script - Japanese/Korean)
//  - US/SG: Nager.Date's name (localName === name for these two)
//  - TW/IL/MY: the bundled name in js/static-holidays.js
//
// Thailand (TH) has no entries here on purpose - its bundled data already
// comes from a Thai-locale Google Calendar feed, so the source name IS the
// Thai display name already (see scripts/refresh-static-holidays.js).
//
// Style: concise, natural Thai suited to a small calendar cell tooltip -
// not a long formal/official translation. Where a holiday's literal source
// name and its popularly-known alternate name differ (e.g. US "Washington's
// Birthday" vs. "Presidents Day"), this dictionary translates the literal
// source string, not the alternate name.
//
// A name with no entry here falls back to showing the original source
// string as-is (see holidayDisplayName() in js/app.js) - never blank, never
// broken. Add new entries as new holiday names are observed from either
// data source.
window.HOLIDAY_NAMES_TH = {
  // ---- Japan (JP) - Nager.Date, localName is native Japanese ----
  "こどもの日": "วันเด็ก",
  "みどりの日": "วันสีเขียว",
  "スポーツの日": "วันกีฬา",
  "元日": "วันขึ้นปีใหม่",
  "勤労感謝の日": "วันขอบคุณแรงงาน",
  "天皇誕生日": "วันคล้ายวันพระราชสมภพจักรพรรดิ",
  "山の日": "วันภูเขา",
  "建国記念の日": "วันสถาปนาประเทศ",
  "憲法記念日": "วันรัฐธรรมนูญ",
  "成人の日": "วันบรรลุนิติภาวะ",
  "敬老の日": "วันเคารพผู้สูงอายุ",
  "文化の日": "วันวัฒนธรรม",
  "春分の日": "วันวสันตวิษุวัต",
  "昭和の日": "วันโชวะ",
  "海の日": "วันทะเล",
  "秋分の日": "วันศารทวิษุวัต",

  // ---- South Korea (KR) - Nager.Date, localName is native Korean ----
  "3·1절": "วันขบวนการเอกราช 3.1",
  "개천절": "วันสถาปนาชาติ",
  "광복절": "วันปลดแอก",
  "노동절": "วันแรงงาน",
  "부처님 오신 날": "วันประสูติพระพุทธเจ้า",
  "새해": "วันขึ้นปีใหม่",
  "설날": "วันตรุษเกาหลี",
  "어린이날": "วันเด็ก",
  "제헌절": "วันรัฐธรรมนูญ",
  "지방 선거일": "วันเลือกตั้งท้องถิ่น",
  "추석": "วันชูซอก",
  "크리스마스": "วันคริสต์มาส",
  "한글날": "วันฮันกึล",
  "현충일": "วันรำลึกทหารผ่านศึก",

  // ---- United States (US) - Nager.Date ----
  "Christmas Day": "วันคริสต์มาส",
  "Columbus Day": "วันโคลัมบัส",
  "Good Friday": "วันศุกร์ประเสริฐ",
  "Independence Day": "วันประกาศอิสรภาพ",
  "Indigenous Peoples' Day": "วันชนพื้นเมือง",
  "Juneteenth National Independence Day": "วันประกาศอิสรภาพจูนทีนธ์",
  "Labor Day": "วันแรงงาน",
  "Lincoln's Birthday": "วันเกิดลินคอล์น",
  "Martin Luther King, Jr. Day": "วันมาร์ติน ลูเธอร์ คิง จูเนียร์",
  "Memorial Day": "วันรำลึกทหารผ่านศึก",
  "New Year's Day": "วันขึ้นปีใหม่",
  "Thanksgiving Day": "วันขอบคุณพระเจ้า",
  "Truman Day": "วันทรูแมน",
  "Veterans Day": "วันทหารผ่านศึก",
  "Washington's Birthday": "วันเกิดวอชิงตัน",

  // ---- Singapore (SG) - Nager.Date ----
  "Chinese New Year": "วันตรุษจีน",
  "Deepavali": "วันดีปาวลี",
  "Hari Raya Haji": "วันฮารีรายอฮัจญี",
  "Hari Raya Puasa": "วันฮารีรายอปอซอ",
  "Labour Day": "วันแรงงาน",
  "National Day": "วันชาติ",
  "Vesak Day": "วันวิสาขบูชา",

  // ---- Israel (IL) - bundled (js/static-holidays.js), curated allowlist ----
  "Passover (Day 1)": "เทศกาลปัสกา (วันที่ 1)",
  "Passover (Day 7)": "เทศกาลปัสกา (วันที่ 7)",
  "Rosh Hashana": "วันขึ้นปีใหม่ยิว",
  "Rosh Hashana (Day 2)": "วันขึ้นปีใหม่ยิว (วันที่ 2)",
  "Shavuot": "เทศกาลชาวูออต",
  "Shemini Atzeret / Simchat Torah": "เชมินี อัทเซเรต/ซิมหัต โทราห์",
  "Sukkot (Day 1)": "เทศกาลซุกโคต (วันที่ 1)",
  "Yom HaAtzmaut": "วันประกาศอิสรภาพอิสราเอล",
  "Yom Kippur": "วันแห่งการชดใช้บาป",

  // ---- Taiwan (TW) - bundled (js/static-holidays.js) ----
  "Armed Forces Day": "วันกองทัพ",
  "Children's Day": "วันเด็ก",
  "Children's Day Holiday": "วันหยุดวันเด็ก",
  "Constitution Day": "วันรัฐธรรมนูญ",
  "Day off for Children's Day": "วันหยุดชดเชยวันเด็ก",
  "Day off for Constitution Day": "วันหยุดชดเชยวันรัฐธรรมนูญ",
  "Day off for Lunar New Year Holiday": "วันหยุดชดเชยเทศกาลตรุษจีน",
  "Day off for Lunar New Year's Day": "วันหยุดชดเชยวันตรุษจีน",
  "Day off for Republic Day": "วันหยุดชดเชยวันสถาปนาสาธารณรัฐ",
  "Day off for Taiwan's Retrocession Day": "วันหยุดชดเชยวันคืนสู่มาตุภูมิไต้หวัน",
  "Double Ninth Day": "เทศกาลซ้อนเก้า",
  "Dragon Boat Festival": "เทศกาลไหว้บ๊ะจ่าง",
  "Dragon Boat Festival Holiday": "วันหยุดเทศกาลไหว้บ๊ะจ่าง",
  "Dōngzhì Festival": "เทศกาลตังโจ่ย",
  "Farmer's Day": "วันเกษตรกร",
  "Hungry Ghost Festival": "เทศกาลสารทจีน",
  "International Women's Day": "วันสตรีสากล",
  "Labor Day Holiday": "วันหยุดวันแรงงาน",
  "Lantern Festival": "เทศกาลโคมไฟ",
  "Lunar New Year Holiday": "วันหยุดเทศกาลตรุษจีน",
  "Lunar New Year's Day": "วันตรุษจีน",
  "Lunar New Year's Eve": "วันก่อนตรุษจีน",
  "Mid-Autumn Festival": "เทศกาลไหว้พระจันทร์",
  "National Day Holiday": "วันหยุดวันชาติ",
  "Peace Memorial Day": "วันรำลึกสันติภาพ",
  "Peace Memorial Day Holiday": "วันหยุดวันรำลึกสันติภาพ",
  "Republic Day": "วันสถาปนาสาธารณรัฐ",
  "Taiwan's Retrocession Day": "วันคืนสู่มาตุภูมิไต้หวัน",
  "Teachers' Day": "วันครู",
  "Teachers' Day Holiday": "วันหยุดวันครู",
  "Tomb Sweeping Day": "วันเช็งเม้ง",
  "Tomb Sweeping Day Holiday": "วันหยุดวันเช็งเม้ง",
  "Youth Day": "วันเยาวชน",

  // ---- Malaysia (MY) - bundled (js/static-holidays.js) ----
  "Chinese New Year Holiday (regional holiday)": "วันหยุดตรุษจีน (เฉพาะรัฐ)",
  "Chinese New Year's Day": "วันตรุษจีน",
  "Christmas Eve": "วันก่อนคริสต์มาส",
  "Day of Arafat (regional holiday)": "วันอะเราะฟะฮ์ (เฉพาะรัฐ)",
  "Day of Arafat (regional holiday) (tentative)": "วันอะเราะฟะฮ์ (เฉพาะรัฐ, ยังไม่ยืนยัน)",
  "Day off for Thaipusam (regional holiday)": "วันหยุดชดเชยไทปูซัม (เฉพาะรัฐ)",
  "Diwali (regional holiday)": "วันดีปาวลี (เฉพาะรัฐ)",
  "Easter Sunday": "วันอีสเตอร์",
  "Federal Territory Day (regional holiday)": "วันเขตสหพันธ์ (เฉพาะรัฐ)",
  "Federal Territory Day observed (regional holiday)": "วันหยุดชดเชยวันเขตสหพันธ์ (เฉพาะรัฐ)",
  "First Day of Ramadan (regional holiday)": "วันแรกของเดือนรอมฎอน (เฉพาะรัฐ)",
  "First Day of Ramadan (regional holiday) (tentative)": "วันแรกของเดือนรอมฎอน (เฉพาะรัฐ, ยังไม่ยืนยัน)",
  "Good Friday (regional holiday)": "วันศุกร์ประเสริฐ (เฉพาะรัฐ)",
  "Hari Raya Haji (Day 2) (regional holiday)": "วันฮารีรายอฮัจญี (วันที่ 2, เฉพาะรัฐ)",
  "Hari Raya Haji (Day 2) (regional holiday) (tentative)": "วันฮารีรายอฮัจญี (วันที่ 2, เฉพาะรัฐ, ยังไม่ยืนยัน)",
  "Hari Raya Haji (tentative)": "วันฮารีรายอฮัจญี (ยังไม่ยืนยัน)",
  "Hari Raya Puasa (tentative)": "วันฮารีรายอปอซอ (ยังไม่ยืนยัน)",
  "Hari Raya Puasa Holiday": "วันหยุดฮารีรายอปอซอ",
  "Hari Raya Puasa Holiday Day 2": "วันหยุดฮารีรายอปอซอ (วันที่ 2)",
  "Hari Raya Puasa Holiday Day 2 (tentative)": "วันหยุดฮารีรายอปอซอ (วันที่ 2, ยังไม่ยืนยัน)",
  "Harvest Festival (regional holiday)": "เทศกาลเก็บเกี่ยว (เฉพาะรัฐ)",
  "Harvest Festival observed (regional holiday)": "วันหยุดชดเชยเทศกาลเก็บเกี่ยว (เฉพาะรัฐ)",
  "Isra and Mi'raj (regional holiday)": "วันอิสรอ มิอ์รอจญ์ (เฉพาะรัฐ)",
  "Isra and Mi'raj (regional holiday) (tentative)": "วันอิสรอ มิอ์รอจญ์ (เฉพาะรัฐ, ยังไม่ยืนยัน)",
  "Malaysia Day": "วันมาเลเซีย",
  "Malaysia Day Holiday": "วันหยุดวันมาเลเซีย",
  "Malaysia's National Day": "วันชาติมาเลเซีย",
  "Muharram": "วันมุฮัรรอม",
  "Muharram (tentative)": "วันมุฮัรรอม (ยังไม่ยืนยัน)",
  "New Year's Day (regional holiday)": "วันขึ้นปีใหม่ (เฉพาะรัฐ)",
  "New Year's Eve": "วันก่อนขึ้นปีใหม่",
  "Nuzul Al-Quran (regional holiday)": "วันนูซุลอัลกุรอาน (เฉพาะรัฐ)",
  "Nuzul Al-Quran (regional holiday) (tentative)": "วันนูซุลอัลกุรอาน (เฉพาะรัฐ, ยังไม่ยืนยัน)",
  "Second Day of Chinese New Year (regional holiday)": "วันตรุษจีน วันที่ 2 (เฉพาะรัฐ)",
  "Second Day of Harvest Festival (regional holiday)": "เทศกาลเก็บเกี่ยว วันที่ 2 (เฉพาะรัฐ)",
  "Second Day of Harvest Festival observed (regional holiday)": "วันหยุดชดเชยเทศกาลเก็บเกี่ยว วันที่ 2 (เฉพาะรัฐ)",
  "Thaipusam (regional holiday)": "วันไทปูซัม (เฉพาะรัฐ)",
  "The Prophet Muhammad's Birthday": "วันประสูติศาสดามุฮัมหมัด",
  "The Prophet Muhammad's Birthday (tentative)": "วันประสูติศาสดามุฮัมหมัด (ยังไม่ยืนยัน)",
  "The Yang di-Pertuan Agong's Birthday": "วันเฉลิมพระชนมพรรษายังดีเปอร์ตวนอากง",
  "Valentine's Day": "วันวาเลนไทน์",
  "Wesak Day": "วันวิสาขบูชา"
};
