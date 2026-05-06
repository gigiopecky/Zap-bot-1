const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs")

if (!fs.existsSync("admins.json")) fs.writeFileSync("admins.json", "[]")
if (!fs.existsSync("rifas.json")) fs.writeFileSync("rifas.json", "{}")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ["Ubuntu", "Chrome", "20.0.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut

            if (shouldReconnect) startBot()
        }

        if (connection === "open") {
            console.log("Bot conectado ✅")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text

        if (!text) return

        const admins = JSON.parse(fs.readFileSync("admins.json"))
        const isAdmin = admins.includes(sender)

        // ===== /AJUDA =====
        if (text === "/ajuda") {
            return sock.sendMessage(from, {
                text:
`🤖 Comandos:

/lista titulo|quantidade|pix|valor
/verlista
/pago numero
/remover numero
/reset
/fecharrifa

Admin:
/addadmin numero
/removeadmin numero`
            })
        }

        // ===== ADD ADMIN =====
        if (text.startsWith("/addadmin")) {
            let numero = text.split(" ")[1]
            if (!numero) return sock.sendMessage(from, { text: "Use: /addadmin numero" })

            numero = numero.replace(/\D/g, "") + "@s.whatsapp.net"

            if (!admins.includes(numero)) {
                admins.push(numero)
                fs.writeFileSync("admins.json", JSON.stringify(admins, null, 2))
            }

            return sock.sendMessage(from, { text: "Admin adicionado!" })
        }

        // ===== REMOVE ADMIN =====
        if (text.startsWith("/removeadmin")) {
            let numero = text.split(" ")[1]
            if (!numero) return sock.sendMessage(from, { text: "Use: /removeadmin numero" })

            numero = numero.replace(/\D/g, "") + "@s.whatsapp.net"

            const novo = admins.filter(a => a !== numero)
            fs.writeFileSync("admins.json", JSON.stringify(novo, null, 2))

            return sock.sendMessage(from, { text: "Admin removido!" })
        }

        // ===== LISTA =====
        if (text.startsWith("/lista")) {

            const args = text.replace("/lista ", "").split("|")

            const titulo = args[0]
            const quantidade = parseInt(args[1])
            let pix = args[2]
            const valor = args[3]

            if (!titulo || !quantidade || !pix || !valor) {
                return sock.sendMessage(from, {
                    text: "Use: /lista titulo|quantidade|pix|valor"
                })
            }

            let numeros = {}
            for (let i = 1; i <= quantidade; i++) {
                numeros[i] = "disponível"
            }

            let data = JSON.parse(fs.readFileSync("rifas.json"))

            data[from] = { titulo, numeros, valor, pix }

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: "Rifa criada!" })
        }

        // ===== VER LISTA =====
        if (text === "/verlista") {

            const data = JSON.parse(fs.readFileSync("rifas.json"))
            if (!data[from]) return sock.sendMessage(from, { text: "Sem rifa ativa" })

            const rifa = data[from]

            let lista = `🎟️ ${rifa.titulo}\n\n`

            for (let n in rifa.numeros) {
                lista += `${n} - ${rifa.numeros[n]}\n`
            }

            return sock.sendMessage(from, { text: lista })
        }

        // ===== ESCOLHER NÚMEROS =====
        if (/^\d+( \d+)*$/.test(text)) {

            const data = JSON.parse(fs.readFileSync("rifas.json"))
            if (!data[from]) return

            const rifa = data[from]

            const nums = text.split(" ")
            const nome = msg.pushName || "sem nome"

            const final = sender.replace(/\D/g, "").slice(-4)

            let resposta = ""

            nums.forEach(n => {
                if (!rifa.numeros[n]) {
                    resposta += `❌ ${n} inválido\n`
                } else if (rifa.numeros[n] === "disponível") {
                    rifa.numeros[n] = `${nome} (${final})`
                    resposta += `✅ ${n} reservado\n`
                } else {
                    resposta += `❌ ${n} ocupado\n`
                }
            })

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: resposta })
        }
    })
}

startBot()
