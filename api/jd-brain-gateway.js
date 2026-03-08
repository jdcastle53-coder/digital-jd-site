export default async function handler(req, res) {

if (req.method !== "POST") {
return res.status(405).json({ error: "Method not allowed" })
}

const { message } = req.body

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

try {

const response = await fetch("https://api.openai.com/v1/chat/completions", {

method: "POST",

headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${OPENAI_API_KEY}`
},

body: JSON.stringify({
model: "gpt-4o-mini",
messages: [
{ role: "system", content: "You are Digital JD, a PhD-level leadership advisor helping executives make better decisions." },
{ role: "user", content: message }
],
temperature: 0.7
})

})

const data = await response.json()

const reply = data.choices[0].message.content

res.status(200).json({ reply })

} catch (error) {

console.error(error)

res.status(500).json({ error: "AI request failed" })

}

}
