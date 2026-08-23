const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Conectar a Gemini (Reemplaza "TU_API_KEY_AQUI" con la clave de AI Studio)
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6IoQw_Ty40IbSQMwKUgwzamqpGgDgBL6FTLftt--Hbwrg"); 
const ia = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

// 2. Configuración obligatoria para servidores en la nube (Render)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    // Genera un enlace web con la imagen limpia del código QR para escanear fácilmente
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('--- ESCANEA ESTE CÓDIGO QR DESDE TU NAVEGADOR ---');
    console.log(qrImageUrl);
    console.log('------------------------------------------------');
});

client.on('ready', () => {
    console.log('¡Bot conectado a WhatsApp y listo en la NUBE!');
});

// Memoria para guardar a los clientes que piden hablar con un humano
const usuariosEsperandoAsesor = new Set();

client.on('message', async (msg) => {
    // Filtramos para que responda a chats privados normales (@c.us) y a cuentas LID (@lid)
    if(msg.from.endsWith('@c.us') || msg.from.endsWith('@lid')) { 
        
        // Verificamos si este usuario ya pidió un asesor
        if (usuariosEsperandoAsesor.has(msg.from)) {
            console.log('Mensaje ignorado: El usuario está esperando un asesor humano.');
            return; 
        }

        const mensajeCliente = msg.body.toLowerCase();
        
        // Detectar si pide un corte de cable o fraccionado
        const coincidenciaMetros = mensajeCliente.match(/\b(\d+)\s*(mts|metros|mt)\b/);
        const pideCorteEspecífico = coincidenciaMetros && coincidenciaMetros[1] !== '100';
        const pidePalabraCorte = mensajeCliente.includes('corte de') || mensajeCliente.includes('por metro') || mensajeCliente.includes('fraccionado');

        // Detectar si pide hablar con un asesor o persona real
        const pideAsesor = mensajeCliente.includes('asesor') || mensajeCliente.includes('persona real') || mensajeCliente.includes('humano');
        
        if (pideAsesor || pideCorteEspecífico || pidePalabraCorte) {
            console.log('El cliente solicitó un asesor o un corte. Pausando bot por 1 hora...');
            msg.reply("En breve un asesor se comunicará con usted.");
            
            usuariosEsperandoAsesor.add(msg.from); 
            
            setTimeout(() => {
                usuariosEsperandoAsesor.delete(msg.from);
                console.log(`El bot ha vuelto a activarse para el número ${msg.from} tras 1 hora de espera.`);
            }, 60 * 60 * 1000); 

            return;
        }

        try {
            console.log('Enviando a Gemini en la nube...');
            
            const contextoNegocio = `Eres el asistente virtual de ventas de Cables Mendoza especializada en venta de cables y materiales para instalaciones eléctricas domiciliarias. 
            Tu objetivo es atender a los clientes de forma amable, profesional y concisa.
            
            REGLAS DE CONVERSACIÓN:
            - NO saludes con "Hola" en cada mensaje. Ve directo al grano. Solo devuelve el saludo si el cliente te está saludando por primera vez.
            - Mantén las respuestas cortas, ideales para leer en WhatsApp.
            
            Información clave de tu negocio:
            - Horario de atención: Lunes a Viernes de 8:00 a 21:00. Sábados de 9:00 a 20:00, domingo de 10:00 a 19:00.
            - Si el cliente pregunta por precios o modelos, busca en la LISTA DE PRECIOS abajo y responde. 
            - SIEMPRE indica que "antes de confirmar el pedido, un asesor se comunicará para confirmar stock".
            - NUNCA inventes precios ni ofrezcas descuentos que no estén aquí escritos.
            - NUNCA envíes la lista de precios completa. Responde solo lo que el cliente pregunta.
            
            Información de envíos y ubicación:
            - Sede principal: Hipólito Vieytes 3914. Mapa: https://www.google.com/maps/place/Hip%C3%B3lito+Vieytes+3914,+M5533+Mendoza/@-32.8694396,-68.7835105,17z/data=!3m1!4b1!4m6!3m5!1s0x967e0f1e4e547fe9:0x9dde0e16a879c88c!8m2!3d-32.8694396!4d-68.7835105!16s%2Fg%2F11jgxnjlzs!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D
            - Puntos de retiro de pedidos (son 2): 
              1. Sanchez 1889. Mapa: https://www.google.com/maps/place/Barrio+Las+Rosas+3/@-32.9015111,-68.7366511,17z/data=!4m6!3m5!1s0x967e0f42efbf55d9:0xd685e82bed94ee30!8m2!3d-32.9015111!4d-68.7366511!16s%2Fg%2F11pz459w7m!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D
              2. Calle Bolivia 414, casi Bandera de los Andes, a pocas cuadras del Shopping. Mapa: https://www.google.com/maps/place/E.T.I+Guaymall%C3%A9n/@-32.8957952,-68.7177728,13z/data=!4m6!3m5!1s0x967e0eb852769733:0xba66a030bb40bafe!8m2!3d-32.8976354!4d-68.7967014!16s%2Fg%2F11h0mw4w1c
            - Entregas en Guaymallén con pedido previo.
            
            --- LISTA DE PRECIOS ACTUALIZADA ---
            CABLES UNIPOLARES (100m): 1.5mm $25000 | 2.5mm $30000 | 4mm $44000 | 6mm $55000
            CABLES TIPO TALLER (100m): 2x1.5mm $81500 | 2x2.5mm $99000 | 2x4mm $137000 | 2x6mm $174000 | 3x1.5mm $120000 | 3x2.5mm $146000 | 3x6mm $254000
            CABLES SUBTERRÁNEOS (100m): 2x1.5mm $112500 | 2x2.5mm $137500 | 2x4mm $177000 | 2x6mm $215000 | 3x2.5mm $207000 | 3x4mm $255000
            CABLES BIPOLARES: 1mm $38000 | 1.5mm $43000 | 2.5mm $52000
            TÉRMICAS Y DISYUNTORES: Térmica unipolar $7000 | Térmica bipolar SICA $8500 | Térmica 40amp SICA $10000 | Disyuntor 2x25 SICA $29000 | Disyuntor 2x40 SICA $32000 | Térmica bipolar JELUZ $9000 | Térmica 40 amp JELUZ $11000 | Disyuntor 25 amp JELUZ $30000 | Disyuntor 40 amp JELUZ $34000
            MEDIDORES: digital chico $38000 | digital grande $50000 | analógico grande $58000
            CAJAS: 2 modulos $2700 | 4 mod $4500 | 8 mod $6500 | 12 mod $10000 | PRESTIGE 8 mod $10000 | PRESTIGE 12 mod $12500 | PRESTIGE 24 mod $26000 | Caja medidor $11000 | Caja PVC $600 | Caja PVC economica $500 | Caja metálica $700 | Caja octogonal grande $1500
            LLAVES Y TOMAS SICA/JELUZ: Llave 1 punto $2300 | 1 toma $2500 | 2 puntos $3000 | 1 punto y 1 toma $3200 | Combinada $2500 | Módulo JELUZ toma $1200 | Módulo JELUZ punto $1000
            EXTERIOR: Toma EXTERIOR $2000 | Punto EXTERIOR $2000 | Punto y toma EXTERIOR $2500
            ILUMINACIÓN: Foco 9w/10w $1000 | Foco 15w $1500 | Foco 20w $3200 | Foco 30w $4000 | Foco 40w $5000 | Foco 50w $6500 | Reflector 10w $4500 | Reflector 50w $9500 | Reflector 100w $15500 | Tubo 18w $4500
            CAÑOS (Tiras): 16mm $1800 | 20mm $2200 | 22mm KALOP $2800 | 25mm $3000 (Conectores y uniones rondan los $200-$300)
            JABALINAS: 3/8x1 metro $9000 | 3/8x1,5 metros $12000 | 1/2x1 metro $13000 | 1/2x1,5 metros $18000
            OTROS: Zapatilla 5 metros $11000 | Cinta 20m $2000 | Buscapolo SICA $3000`;
            
            const promptFinal = contextoNegocio + "\n\nCliente dice: " + msg.body;
            
            const result = await ia.generateContent(promptFinal);
            const respuesta = result.response.text();
            
            console.log('Respuesta generada, enviando a WhatsApp...');
            msg.reply(respuesta);
            
        } catch (error) {
            console.error('Error con IA:', error);
        }
    } else {
        console.log('Mensaje ignorado: No es un chat privado normal (@c.us o @lid)');
    }
});

client.initialize();
