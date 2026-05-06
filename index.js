const makeWASocket = require("@whiskeysockets/baileys").default
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs")

// =====================
// 📁 ARQUIVOS BASE
// =====================
const ADMIN_FILE = "admins.json"
const RIFA_FILE = "rifas.json"

if (!fs.existsSync(ADMIN_FILE)) fs.writeFileSync(ADMIN_FILE, "[]")
if (!fs.existsSync(RIFA_FILE)) fs.writeFileSync(RIFA_FILE, "{}")

// =====================
// 🧠 FUNÇÕES AUXILIARES
// =====================
const load = (file) => JSON.parse(fs.readFileSync(file))
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// =====================
// 🚀 BOT
// =====================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Rifa Bot", "Chrome", "1.0"],
        syncFullHistory: false,
        markOnlineOnConnect: false
    })

    // =====================
    // 🔐 AUTENTICAÇÃO
    // =====================
    sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
        console.log("✅ BOT ONLINE")
    }

    if (connection === "close") {
        const code = lastDisconnect?.error?.output?.statusCode

        console.log("⚠️ conexão caiu:", code)

        const isLoggedOut = code === DisconnectReason.loggedOut

        if (isLoggedOut) {
            console.log("❌ Logout real detectado — apaga a pasta auth")
            return
        }

        console.log("🔄 tentando reconectar em 3s...")

        setTimeout(() => {
            startBot()
        }, 3000)
    }
})
    // =====================
    // 💬 MENSAGENS
    // =====================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!text) return

        const admins = load(ADMIN_FILE)
        const rifas = load(RIFA_FILE)
        const isAdmin = admins.includes(sender)

        // =====================
        // 📌 MENU
        // =====================
        if (text === "/ajuda") {
            return sock.sendMessage(from, {
                text:
`🤖 *BOT RIFA*

/lista titulo|qtd|pix|valor
/verlista
/addadmin numero
/pago numero (admin)

📌 reservar:
ex: 1 2 3`
            })
        }

        // =====================
        // 👑 ADD ADMIN
        // =====================
        if (text.startsWith("/addadmin")) {
            let num = text.split(" ")[1]
            if (!num) return

            num = num.replace(/\D/g, "") + "@s.whatsapp.net"

            if (!admins.includes(num)) {
                admins.push(num)
                save(ADMIN_FILE, admins)
            }

            return sock.sendMessage(from, { text: "✅ Admin adicionado" })
        }

        // =====================
        // 🎟️ CRIAR RIFA
        // =====================
        if (text.startsWith("/lista")) {
            const args = text.replace("/lista ", "").split("|")

            if (args.length < 4) {
                return sock.sendMessage(from, {
                    text: "❌ uso: /lista titulo|qtd|pix|valor"
                })
            }

            const [titulo, qtd, pix, valor] = args

            let numeros = {}
            for (let i = 1; i <= parseInt(qtd); i++) {
                numeros[i] = "disponível"
            }

            rifas[from] = { titulo, qtd, pix, valor, numeros }
            save(RIFA_FILE, rifas)

            return sock.sendMessage(from, {
                text: `✅ Rifa criada: ${titulo}`
            })
        }

        // =====================
        // 📊 VER RIFA
        // =====================
        if (text === "/verlista") {
            const rifa = rifas[from]
            if (!rifa) return sock.sendMessage(from, { text: "❌ sem rifa ativa" })

            let out =
`🎟️ *${rifa.titulo}*
💰 ${rifa.valor}
🔑 PIX: ${rifa.pix}

`

            for (let n in rifa.numeros) {
                const status = rifa.numeros[n]
                out += `${n}: ${status === "disponível" ? "🟢" : "🔴 " + status}\n`
            }

            return sock.sendMessage(from, { text: out })
        }

        // =====================
        // 🎯 RESERVA NÚMEROS
        // =====================
        if (/^\d+( \d+)*$/.test(text)) {
            const rifa = rifas[from]
            if (!rifa) return

            const nums = text.split(" ")
            const nome = msg.pushName || "cliente"
            const final = sender.replace(/\D/g, "").slice(-4)

            let resposta = ""

            nums.forEach(n => {
                if (rifa.numeros[n] === "disponível") {
                    rifa.numeros[n] = `${nome} - ${final}`
                    resposta += `✅ ${n} reservado\n`
                } else {
                    resposta += `❌ ${n} ocupado\n`
                }
            })

            save(RIFA_FILE, rifas)

            return sock.sendMessage(from, { text: resposta })
        }
    })
}

startBot()
