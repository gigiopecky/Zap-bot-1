const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs")
const qrcode = require("qrcode-terminal") // Biblioteca para mostrar o QR no console

// Inicialização de arquivos
if (!fs.existsSync("admins.json")) fs.writeFileSync("admins.json", "[]")
if (!fs.existsSync("rifas.json")) fs.writeFileSync("rifas.json", "{}")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Vamos imprimir manualmente para garantir que apareça
        browser: ["Ubuntu", "Chrome", "20.0.0"],
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update

        // Mostra o QR Code quando gerado
        if (qr) {
            console.log("📌 ESCANEIE O QR CODE ABAIXO:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut

            console.log("Conexão fechada. Reconectando...", shouldReconnect)
            if (shouldReconnect) startBot()
        }

        if (connection === "open") {
            console.log("Bot conectado com sucesso! ✅")
        }
    })

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return // Ignora mensagens do próprio bot

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text

        if (!text) return

        // Carregar dados
        const admins = JSON.parse(fs.readFileSync("admins.json"))
        const isAdmin = admins.includes(sender)

        // ===== COMANDO: /AJUDA =====
        if (text === "/ajuda") {
            const menu = `🤖 *Comandos do Bot de Rifa*:\n\n` +
                         `*/lista* titulo|qtd|pix|valor\n` +
                         `*/verlista* - Ver números\n` +
                         `*/pago* numero - (Admin)\n` +
                         `*/remover* numero - (Admin)\n\n` +
                         `*Para reservar:* Digite os números separados por espaço (ex: 5 12 20)`
            return sock.sendMessage(from, { text: menu })
        }

        // ===== COMANDO: /ADDADMIN =====
        if (text.startsWith("/addadmin")) {
            let numero = text.split(" ")[1]
            if (!numero) return sock.sendMessage(from, { text: "Use: /addadmin 5511999999999" })

            numero = numero.replace(/\D/g, "") + "@s.whatsapp.net"
            if (!admins.includes(numero)) {
                admins.push(numero)
                fs.writeFileSync("admins.json", JSON.stringify(admins, null, 2))
            }
            return sock.sendMessage(from, { text: "✅ Admin adicionado!" })
        }

        // ===== COMANDO: /LISTA (CRIAR RIFA) =====
        if (text.startsWith("/lista")) {
            const args = text.replace("/lista ", "").split("|")
            if (args.length < 4) return sock.sendMessage(from, { text: "❌ Formato: /lista Título|Qtd|Pix|Valor" })

            const titulo = args[0]
            const quantidade = parseInt(args[1])
            const pix = args[2]
            const valor = args[3]

            let numeros = {}
            for (let i = 1; i <= quantidade; i++) {
                numeros[i] = "disponível"
            }

            let data = JSON.parse(fs.readFileSync("rifas.json"))
            data[from] = { titulo, numeros, valor, pix }
            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: `✅ Rifa "${titulo}" criada com ${quantidade} números!` })
        }

        // ===== COMANDO: /VERLISTA =====
        if (text === "/verlista") {
            const data = JSON.parse(fs.readFileSync("rifas.json"))
            const rifa = data[from]
            if (!rifa) return sock.sendMessage(from, { text: "❌ Nenhuma rifa ativa neste grupo." })

            let lista = `🎟️ *${rifa.titulo}*\n💰 Valor: ${rifa.valor}\n🔑 PIX: ${rifa.pix}\n\n`
            for (let n in rifa.numeros) {
                const status = rifa.numeros[n] === "disponível" ? "🟢" : `🔴 (${rifa.numeros[n]})`
                lista += `${n}: ${status}\n`
            }
            return sock.sendMessage(from, { text: lista })
        }

        // ===== LÓGICA DE RESERVA DE NÚMEROS =====
        if (/^\d+( \d+)*$/.test(text)) {
            const data = JSON.parse(fs.readFileSync("rifas.json"))
            const rifa = data[from]
            if (!rifa) return

            const nums = text.split(" ")
            const nome = msg.pushName || "Cliente"
            const final = sender.replace(/\D/g, "").slice(-4)
            let resposta = ""

            nums.forEach(n => {
                if (rifa.numeros[n] === "disponível") {
                    rifa.numeros[n] = `${nome} - ${final}`
                    resposta += `✅ Número ${n} reservado!\n`
                } else if (rifa.numeros[n]) {
                    resposta += `❌ Número ${n} já está ocupado.\n`
                }
            })

            if (resposta) {
                fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))
                return sock.sendMessage(from, { text: resposta })
            }
        }
    })
}

startBot()
