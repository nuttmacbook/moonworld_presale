# dev/settings/ ⚙️ — ค่าตั้งฝั่ง contract และเครื่องมือ
| ไฟล์ | คืออะไร | commit? |
| --- | --- | --- |
| contracts/<ชื่อ>.env | ค่าของ contract แต่ละตัว (หนึ่งไฟล์ต่อ contract; ไม่มีค่าก็ไม่ต้องมีไฟล์) | ✅ |
| deploy.config.mjs | deploy อะไร ลำดับไหน (หนึ่งบรรทัด `proxied()` ต่อ contract) | ✅ |
| exports.json | contract ไหนส่ง ABI ให้เว็บ ใช้ฟังก์ชันอะไร | ✅ |
| test-tokens.json | token ทดสอบบนเชนในเครื่อง (0, 1 หรือหลายตัว) และค่าไหนที่มันแทน | ✅ |
| local.env | port, ข้อมูลตัวอย่าง, ดีเลย์, จำนวนที่ปุ่ม Fund ให้ | ✅ |
| networks.json | chain id → ชื่อ network, explorer | ✅ |
| deploy.env.example → deploy.env | private key, RPC, owner, API key | ❌ deploy.env เป็นความลับ |
