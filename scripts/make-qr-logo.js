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
  const HEAD_W = 400
  const HEAD_H = 392
  const head = await sharp(path.join(ROOT, "digital-jd-logo.png"))
    .extract({ left: 58, top: 12, width: 478, height: 468 })
    .resize(HEAD_W, HEAD_H, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  // 2. Solid white badge behind the head (no navy fill). Sized to give the
  //    larger head a clean white surround. Error-correction level H tolerates
  //    ~30% coverage; this badge stays well under that.
  const whiteBadge = Buffer.from(
    `<svg width="${QR_SIZE}" height="${QR_SIZE}"><circle cx="${C}" cy="${C}" r="220" fill="#ffffff"/></svg>`,
  )

  // 3. Layer everything onto the QR.
  await sharp(path.join(ROOT, "public/digitaljd-qr.png"))
    .composite([
      { input: whiteBadge },
      { input: head, top: Math.round(C - HEAD_H / 2), left: Math.round(C - HEAD_W / 2) },
    ])
    .png()
    .toFile(path.join(ROOT, "public/digitaljd-qr-logo.png"))

  console.log("Wrote public/digitaljd-qr-logo.png")

  // 4. Bordered variant for business cards: add a white quiet-zone margin
  //    around the code plus a thin navy border line as a clean cut-guide.
  const PAD = 90 // white quiet zone so phone cameras lock on reliably
  const TOTAL = QR_SIZE + PAD * 2
  const STROKE = 6
  const half = STROKE / 2
  const borderLine = Buffer.from(
    `<svg width="${TOTAL}" height="${TOTAL}">
       <rect x="${half}" y="${half}" width="${TOTAL - STROKE}" height="${TOTAL - STROKE}"
             rx="36" ry="36" fill="none" stroke="#07101f" stroke-width="${STROKE}"/>
     </svg>`,
  )
  await sharp({
    create: { width: TOTAL, height: TOTAL, channels: 4, background: "#ffffff" },
  })
    .composite([
      { input: path.join(ROOT, "public/digitaljd-qr-logo.png"), top: PAD, left: PAD },
      { input: borderLine, top: 0, left: 0 },
    ])
    .png()
    .toFile(path.join(ROOT, "public/digitaljd-qr-logo-bordered.png"))

  console.log("Wrote public/digitaljd-qr-logo-bordered.png")
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
