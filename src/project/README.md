# src/project/ ✏️ — โค้ดของคุณ (เว็บ)

| โฟลเดอร์/ไฟล์ | คืออะไร | import อะไรได้ |
| --- | --- | --- |
| `chain/` **on-chain** | `claimAbi.js` (ABI ของสัญญาเคลมที่มีอยู่แล้ว + ERC20 getters), `reads.js` (getClaimData), `viewParse.js`, `intereacts/claim.js` (unlockToken), `index.js` (ประตูเดียวที่ UI ใช้) | `engine/chain`, `settings.js` |
| `ui/` **off-chain** | `main.js` (หน้า + ปุ่ม), `pages/claim.js`, `componants/`, `theme.js`, `main.css` | `../chain` (index.js เท่านั้น), `engine/ui`, `engine/settings`, `../settings.js`, `../lang` |
| `settings.js` | ค่าของโปรเจกต์จาก `settings/.env` | `engine/settings` |
| `lang/` | `t("...")` + คำแปลไทย `th.js` | — |
