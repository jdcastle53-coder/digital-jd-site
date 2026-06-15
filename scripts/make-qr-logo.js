// Composites the Digital JD blue head into the center of the QR code.
// QR is generated at error-correction level H (~30% recoverable), so a
// centered logo covering ~7% of the area stays reliably scannable.
const sharp = require("sharp")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const QR_SIZE = 1200
const C = QR_SIZE / 2

async function run() {
  // 1. Crop just the head out of the logo (exclude the "Digital JD" wordmark).
  const HEAD_W = 330
  const HEAD_H = 323
  const head = await sharp(path.join(ROOT, "digital-jd-logo.png"))
    .extract({ left: 58, top: 12, width: 478, height: 468 })
    .resize(HEAD_W, HEAD_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // 2. Thin white ring + dark navy badge behind the head. Error-correction
  //    level H tolerates ~30% coverage; this badge stays well under that.
  const whiteRing = Buffer.from(
    `<svg width="${QR_SIZE}" height="${QR_SIZE}"><circle cx="${C}" cy="${C}" r="186" fill="#ffffff"/></svg>`,
  )
  const navyBadge = Buffer.from(
    `<svg width="${QR_SIZE}" height="${QR_SIZE}"><circle cx="${C}" cy="${C}" r="178" fill="#07101f"/></svg>`,
  )

  // 3. Layer everything onto the QR.
  await sharp(path.join(ROOT, "public/digitaljd-qr.png"))
    .composite([
      { input: whiteRing },
      { input: navyBadge },
      { input: head, top: Math.round(C - HEAD_H / 2), left: Math.round(C - HEAD_W / 2) },
    ])
    .png()
    .toFile(path.join(ROOT, "public/digitaljd-qr-logo.png"))

  console.log("Wrote public/digitaljd-qr-logo.png")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
