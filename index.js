const makeWASocket = require("@whiskeysockets/baileys").default
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs")
const express = require('express')
const app = express()

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
const load = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file))
    } catch (e) {
        return file === ADMIN_FILE ? [] : {}
    }
}
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// =====================
// 📱 QR CODE
// =====================
let lastQR = null
let botStatus = "🔴 Desconectado"

app.get('/qr', (req, res) => {
    if (!lastQR) {
        return res.send(`
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zap Bot - QR Code</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        text-align: center;
                        max-width: 500px;
                        width: 100%;
                    }
                    h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
                    .status {
                        font-size: 18px;
                        color: #27ae60;
                        margin: 20px 0;
                        padding: 15px;
                        background: #d5f4e6;
                        border-radius: 10px;
                        border-left: 4px solid #27ae60;
                    }
                    .waiting {
                        font-size: 16px;
                        color: #666;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ Bot Conectado!</h1>
                    <div class="status">
                        ${botStatus}
                    </div>
                    <p class="waiting">O bot está funcionando normalmente.</p>
                </div>
            </body>
            </html>
        `);
    }

    res.send(`
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Zap Bot - QR Code</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
                .qr-container {
                    margin: 30px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 15px;
                }
                .qr-container img {
                    width: 100%;
                    max-width: 400px;
                    height: auto;
                }
                .instructions {
                    font-size: 16px;
                    color: #666;
                    margin: 20px 0;
                    line-height: 1.6;
                }
                .timer {
                    font-size: 14px;
                    color: #e74c3c;
                    margin-top: 20px;
                    font-weight: bold;
                }
                .refresh-info {
                    font-size: 14px;
                    color: #95a5a6;
                    margin-top: 15px;
                }
            </style>
            <script>
                setTimeout(() => location.reload(), 5000);
            </script>
        </head>
        <body>
            <div class="container">
                <h1>📱 Escaneie o QR Code</h1>
                <p class="instructions">Abra o WhatsApp no seu telefone e escaneie o código abaixo:</p>
                <div class="qr-container">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(lastQR)}" alt="QR Code" />
                </div>
                <div class="timer">⏱️ QR Code expira em 120 segundos</div>
                <div class="refresh-info">A página atualiza automaticamente...</div>
            </div>
        </body>
        </html>
    `);
});

// Rota raiz
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Zap Bot</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                h1 { color: #333; margin-bottom: 20px; font-size: 28px; }
                .status {
                    font-size: 18px;
                    color: #e74c3c;
                    margin: 20px 0;
                    padding: 15px;
                    background: #fadbd8;
                    border-radius: 10px;
                    border-left: 4px solid #e74c3c;
                }
                .button {
                    display: inline-block;
                    margin-top: 20px;
                    padding: 15px 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    transition: transform 0.2s;
                }
                .button:hover { transform: scale(1.05); }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 Zap Bot</h1>
                <div class="status">
                    ${botStatus}
                </div>
                <p style="color: #666; margin: 15px 0;">Clique no botão para escanear o QR Code</p>
                <a href="/qr" class="button">📱 Ver QR Code</a>
            </div>
        </body>
        </html>
    `);
});

// controle global
let restarting = false

// =====================
// 🚀 BOT
// =====================
async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["Rifa Bot", "Chrome", "1.0"],
        syncFullHistory: false,
        markOnlineOnConnect: false,
        qrTimeout: 120000
    })

    // salva login
    sock.ev.on("creds.update", saveCreds)

    // =====================
    // 🔐 CONEXÃO
    // =====================
    sock.ev.on("connection.update", (update) => {
        const { connection, qr, lastDisconnect } = update

        // 📱 QR CODE
        if (qr) {
            lastQR = qr
            botStatus = "🟡 Aguardando escanear QR Code"
            console.log("📱 QR Code gerado - acesse http://localhost:3000/qr")
        }

        if (connection === "open") {
            console.log("✅ BOT ONLINE")
            lastQR = null
            botStatus = "🟢 Bot Conectado"
            restarting = false
        }

        if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode

            console.log("⚠️ conexão caiu:", code)

            if (restarting) return

            if (code === DisconnectReason.loggedOut) {
                console.log("❌ logout real — apague a pasta auth")
                botStatus = "🔴 Logout Detectado"
                return
            }

            restarting = true
            botStatus = "🟡 Reconectando..."

            console.log("🔄 reiniciando bot em 5s...")

            setTimeout(() => {
                console.log("♻️ reiniciando bot...")
                startBot()
            }, 5000)
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

        // =====================
        // 📌 AJUDA
        // =====================
        if (text === "/ajuda") {
            return sock.sendMessage(from, {
                text:
`🤖 BOT RIFA

/lista titulo|qtd|pix|valor
/verlista
/addadmin numero

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
                    text: "❌ use: /lista titulo|qtd|pix|valor"
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
`🎟️ ${rifa.titulo}
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

// =====================
// 🌐 SERVIDOR WEB
// =====================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`🌐 Servidor rodando em http://localhost:${PORT}`)
    console.log(`📱 QR Code em http://localhost:${PORT}/qr`)
})

startBot()
