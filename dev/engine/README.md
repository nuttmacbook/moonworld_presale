# dev/engine/ 🔧 — ระบบ (ไม่ต้องแก้)
- compiler.mjs, compile.mjs — compile ทุก contract
- settings.mjs — อ่าน dev/settings (ไม่มีค่าสำรองในโค้ด)
- deploy-steps.mjs — `proxied()` / `plain()` ให้ deploy.config สั้น
- local-chain.mjs — deploy token ทดสอบ + ทุก contract ตาม deploy.config บนเชนในเครื่อง
- node.mjs, start.mjs — เชนทดสอบ + เปิดเว็บ (`npm run dev`)
- test-runner.mjs — รันทุกไฟล์ใน dev/project/test (`npm test`)
- deploy-live.mjs, verify.mjs — ขึ้นเชนจริง / verify
- contracts/ — BaseProxyUsed.sol, MockToken.sol
- web/ — แผงทดสอบ + เครื่องมือที่ทุกโปรเจกต์ใช้ (gas, token ทดสอบ, กระเป๋าเดโม, เลื่อนเวลา)
