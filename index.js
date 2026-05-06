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
    }

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
`🤖 *Comandos do Bot*

/lista titulo|quantidade|pix|valor
/verlista
(números: 12 13)
/pago número
/remover número
/reset
/fecharrifa

👑 Admin:
/addadmin numero
/removeadmin numero`
            })
        }

        // ===== ADD ADMIN =====
        if (text.startsWith("/addadmin")) {
            if (!isAdmin && admins.length > 0) {
                return sock.sendMessage(from, { text: "❌ Apenas admin pode usar" })
            }

            let numero = text.split(" ")[1]
            if (!numero) return sock.sendMessage(from, { text: "❌ Use: /addadmin numero" })

            numero = numero.replace(/\D/g, "") + "@s.whatsapp.net"

            if (!admins.includes(numero)) {
                admins.push(numero)
                fs.writeFileSync("admins.json", JSON.stringify(admins, null, 2))
            }

            return sock.sendMessage(from, { text: "👑 Admin adicionado!" })
        }

        // ===== REMOVE ADMIN =====
        if (text.startsWith("/removeadmin")) {
            if (!isAdmin) {
                return sock.sendMessage(from, { text: "❌ Apenas admin pode usar" })
            }

            let numero = text.split(" ")[1]
            if (!numero) return sock.sendMessage(from, { text: "❌ Use: /removeadmin numero" })

            numero = numero.replace(/\D/g, "") + "@s.whatsapp.net"

            const novo = admins.filter(a => a !== numero)
            fs.writeFileSync("admins.json", JSON.stringify(novo, null, 2))

            return sock.sendMessage(from, { text: "🗑️ Admin removido!" })
        }

        // ===== /LISTA =====
        if (text.startsWith("/lista")) {
            if (!isAdmin) return sock.sendMessage(from, { text: "❌ Apenas admin" })

            const args = text.replace("/lista ", "").split("|")

            const titulo = args[0]
            const quantidade = parseInt(args[1])
            let pix = args[2]
            const valor = args[3]

            if (pix === "pixgigi") pix = "711.999.924-96"
            if (pix === "pixgrazi") pix = "11 94600-4484"
            if (pix === "pixalyson") pix = "05655172445"

            if (!titulo || !quantidade || !pix || !valor) {
                return sock.sendMessage(from, {
                    text: "❌ Use:\n/lista titulo|quantidade|pix|valor"
                })
            }

            let numeros = {}
            for (let i = 1; i <= quantidade; i++) {
                numeros[i] = "disponível"
            }

            let data = JSON.parse(fs.readFileSync("rifas.json"))

            data[from] = { titulo, numeros, valor, pix }

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: "✅ Rifa criada!" })
        }

        // ===== /VERLISTA =====
        if (text === "/verlista") {
            const data = JSON.parse(fs.readFileSync("rifas.json"))

            if (!data[from]) {
                return sock.sendMessage(from, {
                    text: "❌ Não tem rifa ativa"
                })
            }

            const rifa = data[from]

            let lista = `🎟️ *${rifa.titulo}*\n\n`

            for (let num in rifa.numeros) {
                lista += `${num} - ${rifa.numeros[num]}\n`
            }

            lista += `\n💰 R$${rifa.valor}\n💳 ${rifa.pix}`

            return sock.sendMessage(from, { text: lista })
        }

        // ===== /PAGO =====
        if (text.startsWith("/pago")) {
            if (!isAdmin) return sock.sendMessage(from, { text: "❌ Apenas admin" })

            const numero = text.split(" ")[1]

            const data = JSON.parse(fs.readFileSync("rifas.json"))
            const rifa = data[from]

            if (!rifa || !rifa.numeros[numero]) {
                return sock.sendMessage(from, { text: "❌ Número inválido" })
            }

            if (rifa.numeros[numero] === "disponível") {
                return sock.sendMessage(from, { text: "❌ Não escolhido" })
            }

            if (!rifa.numeros[numero].includes("✅")) {
                rifa.numeros[numero] += " ✅"
            }

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: "💰 Marcado como pago!" })
        }

        // ===== /REMOVER =====
        if (text.startsWith("/remover")) {
            if (!isAdmin) return sock.sendMessage(from, { text: "❌ Apenas admin" })

            const numero = text.split(" ")[1]

            const data = JSON.parse(fs.readFileSync("rifas.json"))
            const rifa = data[from]

            if (!rifa || !rifa.numeros[numero]) {
                return sock.sendMessage(from, { text: "❌ Número inválido" })
            }

            rifa.numeros[numero] = "disponível"

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: "♻️ Número liberado!" })
        }

        // ===== /RESET =====
        if (text === "/reset") {
            if (!isAdmin) return sock.sendMessage(from, { text: "❌ Apenas admin" })

            const data = JSON.parse(fs.readFileSync("rifas.json"))

            delete data[from]

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: "🗑️ Rifa apagada!" })
        }

        // ===== /FECHARRIFA =====
        if (text === "/fecharrifa") {
            if (!isAdmin) return sock.sendMessage(from, { text: "❌ Apenas admin" })

            const data = JSON.parse(fs.readFileSync("rifas.json"))

            if (!data[from]) {
                return sock.sendMessage(from, { text: "❌ Não tem rifa ativa" })
            }

            const rifa = data[from]
            const valor = parseFloat(rifa.valor)

            let resumo = {}

            for (let num in rifa.numeros) {
                const dono = rifa.numeros[num]

                if (dono !== "disponível") {
                    const pago = dono.includes("✅")
                    const nomeLimpo = dono.replace(" ✅", "")

                    if (!resumo[nomeLimpo]) {
                        resumo[nomeLimpo] = {
                            total: 0,
                            pagos: 0,
                            pendentes: 0
                        }
                    }

                    resumo[nomeLimpo].total++

                    if (pago) {
                        resumo[nomeLimpo].pagos++
                    } else {
                        resumo[nomeLimpo].pendentes++
                    }
                }
            }

            let mensagem = `📊 *Fechamento da Rifa*\n\n`

            for (let pessoa in resumo) {
                const dados = resumo[pessoa]

                const totalValor = dados.total * valor
                const pagoValor = dados.pagos * valor
                const pendenteValor = dados.pendentes * valor

                mensagem += `👤 ${pessoa}\n`
                mensagem += `🎟️ Total: ${dados.total}\n`
                mensagem += `✅ Pagos: ${dados.pagos} (R$${pagoValor})\n`
                mensagem += `⚠️ Pendentes: ${dados.pendentes} (R$${pendenteValor})\n`

                if (dados.pendentes > 0) {
                    mensagem += `🚨 *PENDENTE*\n`
                }

                mensagem += `💰 Total: R$${totalValor}\n\n`
            }

            return sock.sendMessage(from, { text: mensagem })
        }

        // ===== ESCOLHER NÚMEROS =====
        if (/^\d+( \d+)*$/.test(text)) {
            const data = JSON.parse(fs.readFileSync("rifas.json"))

            if (!data[from]) return

            const rifa = data[from]

            const numerosEscolhidos = text.split(" ")
            const nome = msg.pushName || "Sem nome"

            const numeroUser = sender
            const final = numeroUser.replace(/\D/g, "").slice(-4)

            let resposta = ""

            numerosEscolhidos.forEach(n => {
                if (!rifa.numeros[n]) {
                    resposta += `❌ ${n} inválido\n`
                } else if (rifa.numeros[n] === "disponível") {
                    rifa.numeros[n] = `${nome} (${final})`
                    resposta += `✅ ${n} reservado\n`
                } else {
                    resposta += `❌ ${n} já ocupado\n`
                }
            })

            fs.writeFileSync("rifas.json", JSON.stringify(data, null, 2))

            return sock.sendMessage(from, { text: resposta })
        }
    })
}

startBot()
