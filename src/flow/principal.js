import { addKeyword } from '@builderbot/bot';
import { readFileSync } from 'fs';
import { join } from 'path';
import { flowOfertas } from './ofertas.js';


// Función de utilidad para delays
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Función para obtener el prompt
const getPrompt = async () => {
    try {
        const pathPrompt = join(process.cwd(), "src/prompts");
        const text = readFileSync(join(pathPrompt,'ia_inicio_chat.txt'),'utf-8')
        return text;
    } catch (error) {
        console.error('Error al leer el prompt:', error);
        return null;
    }
};

// Función para extraer y quitar el marcador de la respuesta
const procesarRespuesta = (texto) => {
    const marcadores = {
        SOPORTE: '[[SOPORTE]]',
        LEAD: '[[LEAD]]',
        OFERTAS: '[[OFERTAS]]',
        RECOMENDACION: '[[RECOMENDACION]]'
    };

    let tipo = null;
    let mensaje = texto;

    for (const [key, marcador] of Object.entries(marcadores)) {
        if (texto.includes(marcador)) {
            tipo = key;
            mensaje = texto.replace(marcador, '').trim();
            break;
        }
    }

    return { tipo, mensaje };
};

export const flowPrincipal = (chatgptClass) => {
    return addKeyword(['piscinas_plh'])
        .addAction(async (ctx, { flowDynamic, provider }) => {
            try {
                console.log("Iniciando flujo principal...");
                const jid = ctx.key.remoteJid;
                const refProvider = await provider.getInstance();
                
                await refProvider.presenceSubscribe(jid);
                await delay(500);
                await refProvider.sendPresenceUpdate("composing", jid);

                // Obtener y configurar el prompt inicial
                const promptBase = await getPrompt();
                
                // Inicializar el contexto de ChatGPT con el prompt base
                await chatgptClass.handleMsgChatGPT(promptBase);
                
                await refProvider.sendPresenceUpdate("paused", jid);

                // Mensaje inicial
                await flowDynamic([
                    "👋 *Bienvenido a Piscinas los Hermanos*",
                    "Soy Sara, la asistente virtual. ¿En qué puedo ayudarte?"
                ]);
            } catch (error) {
                console.error('Error en el mensaje inicial:', error);
                await flowDynamic('Lo siento, estoy teniendo algunos problemas técnicos.');
            }
        })
        .addAnswer(
            null,
            { capture: true },
            async (ctx, { flowDynamic, fallBack, gotoFlow }) => {
                try {
                    
                    // Obtener respuesta de ChatGPT
                    const respuesta = await chatgptClass.handleMsgChatGPT(ctx.body);
                    //const texto = respuesta.text;
                    const {tipo, mensaje} = procesarRespuesta(respuesta.text);
                    console.log(ctx.body);


                     if (tipo != 'OFERTAS') {
                        console.log("GOTOFLOW?", ctx.body);
                        
                        // Enviar la respuesta al usuario
                        await flowDynamic(mensaje);
                        return fallBack();

                    } else {
                        console.log("cambio de FLOW\n");
                        await flowDynamic('Genial, vamos a iniciar el proceso para poder darte el mejor presupuesto, ¿estás de acuerdo?');
                        //await flowDynamic('OFERTAS_INI');
                        return gotoFlow(flowOfertas(chatgptClass));
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje:', error);
                    await flowDynamic('Disculpa, no pude procesar correctamente tu mensaje. ¿Podrías intentarlo de nuevo?');
                }
            }
        );
};