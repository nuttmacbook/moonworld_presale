# dev/ — contract และเครื่องมือ

ไม่มีอะไรในนี้ขึ้น production (สำเนาสำหรับ production ลบ `dev/` ทิ้งทั้งโฟลเดอร์ได้)

```
dev/
├── settings/     ⚙️  contracts/<ชื่อ>.env, deploy.config.mjs, exports.json, test-tokens.json, local.env, networks.json, deploy.env(.example)
├── project/      ✏️  contracts/ (ของคุณ, mocks/), test/<ชื่อ>.test.mjs, seed.mjs, devActions.js
├── engine/       🔧  compiler.mjs, compile.mjs, settings.mjs, deploy-steps.mjs, local-chain.mjs, node.mjs, start.mjs,
│                     test-runner.mjs, deploy-live.mjs, verify.mjs, contracts/ (BaseProxyUsed, MockToken), web/ (แผงทดสอบ)
└── generated/    🤖  build/, deployments/, verify/, node.log
```
## คำสั่ง

รันใน `dev/` — flag ต้องอยู่หลัง `--` (`npm run deploy:live -- --send`) ไม่งั้น npm ขึ้น `Unknown cli flag`

| คำสั่ง | ทำอะไร |
| --- | --- |
| `npm run compile` | compile `project/contracts` + `engine/contracts` ด้วย solc 0.8.37 → `generated/build/` และ ABI ของเว็บ (`src/generated/`) |
| `npm run compile:watch` | เหมือนข้างบน compile ใหม่ทุกครั้งที่ save (error บอก `ไฟล์:บรรทัด:คอลัมน์` แบบ Remix) |
| `npm run dev` | เชนทดสอบ + deploy + ข้อมูลตัวอย่าง + เปิดเว็บพร้อมแผงทดสอบ (`-- --seed 100`, `-- --port 8546` ทับค่าใน local.env ได้) |
| `npm test` | รันทุกไฟล์ใน `project/test/` บนเชนใหม่ (แต่ละไฟล์เริ่มจากสถานะสะอาด) `-- --only Token` เฉพาะไฟล์, `-- --count 300` เพิ่มจำนวนคน |
| `npm run deploy:live` | ซ้อม deploy กับเชนจริง: เช็กทุกอย่าง ประเมินค่าใช้จ่าย ไม่ส่งอะไร |
| `npm run deploy:live -- --send` | deploy สิ่งที่ยังไม่มีบนเชนนั้น (ให้พิมพ์ chain id ยืนยัน) |
| `npm run deploy:live -- --upgrade <ชื่อ>` | วางแผนอัปเกรด: logic ใหม่ + `upgradeTo`; เติม `--send` เพื่อทำจริง |
| `npm run deploy:live -- --send --redeploy <key>` | deploy `<key>` ใหม่แม้มีในบันทึกแล้ว (ห้ามใช้กับ proxy ที่ใช้งานอยู่) |
| `npm run verify` | เช็กว่าโค้ดบนเชนตรงกับ source และเขียนไฟล์สำหรับ BscScan |
| `npm run verify -- --submit` | ส่งให้ BscScan ผ่าน API ด้วย (ต้องมี `ETHERSCAN_API_KEY`) |

## ค่าตั้ง (`settings/`)

สคริปต์ไม่มีค่าสำรองในโค้ด ขาดค่าไหนจะหยุดและบอกว่า `Set X in dev/settings/<file>`

| ไฟล์ | ค่า | commit |
| --- | --- | --- |
| `contracts/<ชื่อ>.env` | ค่าของ contract แต่ละตัว (เว็บนี้ยังไม่มี contract ของตัวเอง จึงยังไม่มีไฟล์) ทุก key ในไฟล์ต้องมีค่า | ✅ |
| `test-tokens.json` | token ทดสอบบนเชนในเครื่อง (0 ตัวขึ้นไป) และค่าใน `contracts/*.env` ที่แต่ละตัวแทน | ✅ |
| `local.env` | `LOCAL_PORT`, `TEST_PORT`, `LOCAL_SEED`, `LOCAL_RPC_LATENCY`, `LOCAL_FUND_GAS`, `LOCAL_FUND_AMOUNT`, `TEST_PEOPLE` | ✅ |
| `deploy.env` | `DEPLOYER_PRIVATE_KEY`, `DEPLOY_RPC_URL`, `DEPLOY_OWNER`, `ETHERSCAN_API_KEY` | ❌ ความลับ (คัดลอกจาก `deploy.env.example`) |
| `networks.json` | chain id → ชื่อ network (key ใน addresses.json = ค่า `VITE_CHAIN`), explorer, verify API | ✅ |
| `exports.json` | contract ไหนส่ง ABI ให้เว็บ และฟังก์ชันไหน | ✅ |
| `deploy.config.mjs` | deploy อะไร ลำดับไหน ตรวจผลยังไง — หนึ่ง `proxied({...})` ต่อ contract, ค่าอ่านจาก `ctx.settings.<ชื่อ>` ใช้ทั้งเชนในเครื่องและเชนจริง | ✅ |

ค่าตัวแปรสภาพแวดล้อม (environment) ชื่อเดียวกันชนะค่าในไฟล์ (สะดวกตอนรันใน CI)

## Address ของ contract

- อยู่ใน `src/generated/addresses.json` แยกตาม network — `deploy-live` เขียนให้ ห้ามแก้มือ ห้ามใส่ใน `.env`
- เว็บหาด้วย `addressOf("<ชื่อ contract>")` ส่วนเชนทดสอบ `npm run dev` ส่งให้ผ่าน `VITE_LOCAL_ADDRESSES`
- contract ใหม่: เพิ่มใน `settings/deploy.config.mjs` (+ `settings/exports.json` ถ้าเว็บใช้) — เชนในเครื่องและเชนจริงอ่านจากรายการเดียวกัน

## Deploy ขึ้น BSC

1. ตรวจ `settings/contracts/*.env`
2. `cp settings/deploy.env.example settings/deploy.env` แล้วกรอก (`DEPLOY_OWNER` ควรเป็น hardware wallet หรือ multisig)
3. `npm run deploy:live` → อ่านแผนและค่าใช้จ่าย
4. `npm run deploy:live -- --send` → พิมพ์ chain id (56) ยืนยัน
5. commit `src/generated/addresses.json` และ `generated/deployments/bsc.json` แล้ว build เว็บด้วย `VITE_CHAIN=bsc`

สคริปต์บันทึกหลังทุกขั้น ถ้าหยุดกลางทางให้รันซ้ำได้เลย

ถ้าเพิ่ม address ที่ยังไม่รู้ค่าลงใน `.sol` โดยตรง ให้เขียนเป็น `address(uint160(0x7EA5))` — `deploy:live` จะไม่ยอม deploy จนกว่าจะแทน
(แต่วิธีที่แนะนำคือใส่ใน `settings/contracts/<ชื่อ>.env` แล้วรับเข้า `initialize()` แบบ `TOKEN_ADDRESS`)

## Verify บน BscScan

1. `npm run verify` → ทุก contract ต้องขึ้น `matches this source`
2. bscscan.com → Verify & Publish: **`<ชื่อ>Implementation` ก่อน** แล้วค่อย proxy (`<ชื่อ>`)
   Compiler Type **Solidity (Standard-Json-Input)**, compiler `v0.8.37+commit.f401782d`, license MIT,
   อัปโหลด `generated/verify/bsc/<key>.json`, constructor arguments ตามที่สคริปต์พิมพ์
3. หน้า proxy: More Options → **Is this a proxy?** → Verify
4. ทางสำรอง: **Solidity (Single file)**, Optimization Yes, Runs 200, EVM Version **paris**, วางเนื้อหา `.sol` ทั้งไฟล์

หลังอัปเกรดทุกครั้ง verify implementation ตัวใหม่ด้วยวิธีเดียวกัน

## Proxy และการอัปเกรด

- ผู้ใช้และเว็บคุยกับ proxy (`<ชื่อ>`) ส่วน logic คือ `<ชื่อ>Implementation`
- `initialize` รันใน constructor ของ proxy จึงไม่มีใครชิงเรียกก่อนได้
- owner = admin ของ proxy: อัปเกรดได้และ `adminCall` ทำอะไรก็ได้ในนามสัญญา จึงควรเป็น hardware wallet หรือ multisig
- ตัวแปรใหม่ใส่ท้าย `Storage` เท่านั้น ห้ามสลับหรือลบ
- ถ้า deployer ไม่ใช่ admin: `--upgrade` จะ deploy logic ใหม่แล้วพิมพ์คำสั่ง `upgradeTo` ให้ส่งจากกระเป๋า admin จากนั้นรัน `deploy:live` อีกรอบเพื่ออัปเดตบันทึก
- ซ้อมอัปเกรดบนเชนทดสอบก่อนทำจริงเสมอ

## ฟังก์ชันของ owner

| ฟังก์ชัน | ทำอะไร |
| --- | --- |
| `setDepositAmount(uint256)` | เปลี่ยนจำนวนต่อการฝากครั้งถัดไป (หน่วยเล็กสุดของ token: 10 USDT = `10000000000000000000`) ยอดที่ฝากแล้วไม่เปลี่ยน |
| `sendOutETH(address[])` | แบ่ง BNB ทั้งหมดในสัญญาเท่า ๆ กันให้รายชื่อ (เศษ wei ค้างไว้) |
| `transferOwnership(address)` | เปลี่ยน owner (admin ของ proxy แยกกัน: `transferAdmin` บน proxy) |

ทุกฟังก์ชันที่ส่ง transaction เป็น `payable` (กฎของ Nutt) BNB ที่ติดมาค้างในสัญญาจน owner เรียก `sendOutETH`

## แผงทดสอบ

| ส่วน | อยู่ที่ | ปุ่ม |
| --- | --- | --- |
| ใช้ทุกโปรเจกต์ | `engine/web/` | demo wallet (เปิด/ปิด, สร้างใหม่), +BNB gas, +token ทดสอบทุกตัวใน `test-tokens.json`, เลื่อนเวลา +1 ชม./+1 วัน/+7 วัน, ยอดคงเหลือ, เวลาบนเชน, จำนวน RPC reads |
| This project | `project/devActions.js` | ปุ่มของโปรเจกต์นี้ เช่น "5 people deposit" — รับ `tools` (newWallet, fundGas, fundToken, tokenAs, contractAs, skipTime, wallet) |

## ใช้กระเป๋าตัวเองกับเชนทดสอบ

เพิ่ม network ในกระเป๋า: RPC `http://127.0.0.1:<LOCAL_PORT>`, chain id `31337`, สัญลักษณ์ BNB แล้วกด **Fund** ในแผงทดสอบ
หรือเปิด demo wallet ในแผง (key เก็บในเบราว์เซอร์นี้)

key ของเชนทดสอบมาจาก mnemonic สาธารณะของ hardhat ห้ามส่งเงินจริงเข้า หรือใช้บนเชนจริง

## Dependencies

`ethers 6.17.0`, `hardhat 3.20.0` (ใช้เป็นเชนทดสอบอย่างเดียว), `solc 0.8.37` ปักเวอร์ชันไว้
`overrides.tmp = 0.2.7` แทน `tmp` ที่มีช่องโหว่ซึ่ง hardhat ดึงมา ทำให้ `npm audit` = 0
