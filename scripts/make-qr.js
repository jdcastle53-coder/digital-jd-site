const QRCode = require("qrcode")
const path = require("path")

const url = "https://digitaljd.org"
const outFile = path.join(__dirname, "..", "public", "digitaljd-qr.png")

QRCode.toFile(
  outFile,
  url,
  {
    errorCorrectionLevel: "H", // high error correction - survives logos/print smudges
    type: "png",
    width: 1200, // large for crisp printing
    margin: 4,
    color: {
      dark: "#0b1223", // your deep navy
      light: "#ffffff", // white background for max scan contrast
    },
  },
  (err) => {
    if (err) {
      console.error("[v0] QR generation failed:", err)
      process.exit(1)
    }
    console.log("[v0] QR code written to:", outFile, "->", url)
  },
)
