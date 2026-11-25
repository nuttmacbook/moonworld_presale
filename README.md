# Moon World — Claim page ($MWLD)

หน้าเคลมเหรียญ MWLD สำหรับคนที่ซื้อพรีเซล (ICO) ใช้แทนหน้าเดิม โฮสต์แยกจาก landing page
(ตั้งโดเมนใน `VITE_SITE_URL`, ค่าในไฟล์คือ presale.moonworld.app) สไตล์เดียวกับ landing (ธีมอวกาศ 3 มิติ, การ์ดกระจก, แสงตามเมาส์) แต่มีหน้าเดียว

Vite + JavaScript ธรรมดา + Tailwind v4 + kitbox ตามโครง web3-prod-kit v2

## 1. หน้านี้ทำอะไร

หน้าเดียว ไม่มีคำอธิบายโปรเจกต์ (landing อธิบายแล้ว) มีการ์ดเคลมใบเดียว รายละเอียดเท่าหน้าพรีเซลเดิม:

| ในการ์ด | มาจาก |
| --- | --- |
| Bought ($ USDT) | `presale.getUserInfo(paymentToken, [account])[0].totalBuy` |
| Balance ($ USDT) | `paymentToken.balanceOf(account)` |
| วงแหวน % ปลดล็อก + Ready to claim | `unlocked − claimed` จาก `claim.getPersonalData(account)` |
| Your allocated tokens | `supply` |
| Referrer reward / Referrer bonus ($) + ป้าย "Claimed" เมื่อเคยเคลมแล้ว (เหมือนหน้าเดิม) | `refReward` / `kolReward` |
| Total unlocked / Total claimed | `unlocked` / `claimed` |
| ปุ่ม Connect wallet → Claim X MWLD | `claim.unlockToken(account)` (payable, ส่งค่า 0) |

ยังไม่ต่อกระเป๋า: การ์ดแสดง 0.00 ทั้งหมดพร้อมปุ่ม Connect wallet · กระเป๋าที่ไม่มียอด: บอกให้เปลี่ยนกระเป๋า

**สัญญาที่ใช้ (มีอยู่แล้วบน BSC, โปรเจกต์นี้ไม่ deploy อะไร):** Claim `VITE_CLAIM_CONTRACT`, Presale `VITE_PRESALE_CONTRACT`,
MWLD `VITE_TOKEN_ADDRESS`, USDT `VITE_PAYMENT_TOKEN` — symbol/decimals อ่านจากเหรียญเอง
ABI ได้จากเว็บพรีเซลเดิม เขียนเป็น interface ที่ `dev/project/contracts/partner/` และฝั่งเว็บที่ `src/project/chain/claimAbi.js` (เทสตรวจว่าตรงกัน)

**RPC ต่อหน้า:** 1 รอบ = `getPersonalData` + `getUserInfo` + `balanceOf` (3 call) · ครั้งแรกเพิ่ม name/symbol/decimals ของ 2 เหรียญ (6 call, cache 1 ชั่วโมง) · ยังไม่ต่อกระเป๋า = แค่ข้อมูลเหรียญ

## 2. โฟลเดอร์

```
moonworld-claim/
├── settings/.env(.example)          ⚙️  ทุกค่าของเว็บ
├── index.html, public/              ✏️  <head>, รูป brand/mascot/coin, favicon, og-image
├── src/project/
│   ├── settings.js                  ✏️  อ่าน + ตรวจค่าของโปรเจกต์
│   ├── chain/                       ✏️  claimAbi.js, reads.js (getClaimData), viewParse.js, intereacts/claim.js, index.js
│   ├── ui/                          ✏️  main.js, pages/claim.js, componants/ (header มีปุ่มกระเป๋า, footer เล็ก, toast), main.css
│   └── lang/                        ✏️  EN / ไทย
└── dev/
    ├── settings/                    ⚙️  deploy.config.mjs (ว่าง), test-tokens.json (MWLD ก่อน แล้ว USDT), local.env
    └── project/
        ├── contracts/partner/       IMoonClaim.sol, IMoonPresale.sol (interface ของสัญญาจริง)
        ├── contracts/mocks/         MoonClaimMock.sol, MoonPresaleMock.sol (เชนในเครื่องเท่านั้น ห้าม deploy จริง)
        ├── localClaim.mjs           วาง mock ที่แอดเดรสจริงบนเชนในเครื่อง (hardhat_setCode)
        ├── seed.mjs, devActions.js, test/Claim.test.mjs, scripts/check-lang.mjs
```

## 3. ค่าตั้งใน `settings/.env`

| ค่า | ใช้ทำอะไร |
| --- | --- |
| `VITE_PROJECT_ID`, `VITE_CHAIN` | kitbox / network — project id ในไฟล์เป็นของทดสอบ เปลี่ยนเป็นของลูกค้า |
| `VITE_APP_NAME`, `VITE_APP_TAGLINE`, `VITE_APP_DESCRIPTION`, `VITE_SITE_URL` | ชื่อ คำโปรย คำอธิบาย โดเมนของหน้าเคลม |
| `VITE_MAINTENANCE`, `VITE_MAINTENANCE_MESSAGE`, `VITE_MAINTENANCE_BYPASS` | หน้าปิดปรับปรุง |
| `VITE_TOKEN_ADDRESS`, `VITE_CLAIM_CONTRACT`, `VITE_PRESALE_CONTRACT`, `VITE_PAYMENT_TOKEN` | แอดเดรสสัญญาบน BSC |
| `VITE_LANDING_URL`, `VITE_SUPPORT_EMAIL`, `VITE_*_URL` (โซเชียล) | ลิงก์ใน footer |

ขาดค่าหรือรูปแบบผิด → หน้า "Setup is not finished"

## 4. เปิดในเครื่อง

```bash
cp settings/.env.example settings/.env
npm install
npm run dev            # อ่านสัญญาจริงบน BSC (ต่อกระเป๋าที่ซื้อพรีเซลเพื่อดูยอดจริง)
```

ลองเคลมบนเชนในเครื่อง (ไม่เสียเงินจริง):

```bash
cd dev && npm install
npm run dev            # hardhat + MWLD ทดสอบ + mock ที่แอดเดรสเคลมจริง + ยอดตัวอย่าง + เว็บพร้อมแผงทดสอบ
```

ในแผงทดสอบ: เปิด Demo wallet → `+BNB` → **Give me an allocation** (ซื้อ 200 USDT ได้ 12,600 MWLD, ปลดล็อก 25%, เคลมแล้ว 10%) → กด Claim บนหน้าเว็บ → **Unlock one more month** แล้วเคลมอีกครั้ง
(`LOCAL_SEED` ใน `dev/settings/local.env` ต้องมากกว่า 0 เพราะ mock ถูกวางตอน seed)

```bash
npm test                                  # ABI ตรงกับ interface ทั้ง 2 สัญญา + flow การเคลมบน mock
node project/scripts/check-lang.mjs       # คำที่ยังไม่แปลไทย
```

## 5. ขึ้น Vercel (โปรเจกต์แยกจาก landing)

1. Import repo นี้เป็นอีกโปรเจกต์ → Vite (`npm run build`, Output `dist`)
2. ใส่ทุกบรรทัดของ `settings/.env` ใน Environment Variables แล้ว Deploy
3. ผูกโดเมน `presale.moonworld.app` (หรือโดเมนที่ตั้งใน `VITE_SITE_URL`)
4. ใน landing ตั้ง `VITE_CLAIM_URL` ให้ชี้มาที่โดเมนนี้

แก้ค่าบน Vercel แล้วต้องกด Redeploy · ปิดเว็บชั่วคราว: `VITE_MAINTENANCE=on` (ปิดแค่เว็บ สัญญายังเคลมได้ทาง BscScan)
