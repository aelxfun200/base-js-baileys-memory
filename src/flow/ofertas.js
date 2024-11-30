import { addKeyword, EVENTS, addAnswer } from '@builderbot/bot';
import { readFileSync } from 'fs';
import { join } from 'path';

// Función de utilidad para delays
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const REGEX_ANY_CHARACTER = '/^.+$/';
var chatGPT_ON = false;


// Función para extraer datos del mensaje
const extractData = (message) => {
    const data = {};
    
    // Patrones de regex corregidos
    const patterns = {
      email: /[\w.-]+@[\w.-]+\.\w+/i,
      phone: /(\+34|0034|34)?[ -]*(6|7)[ -]*([0-9][ -]*){8}/,
      dimensions: /\d+(?:\.\d+)?(?:\s*x\s*\d+(?:\.\d+)?)?(?:\s*metros?)?/i,
      budget: /\d+(?:\.\d+)?(?:\s*[€kK]|\s*mil|\s*euros?)?/i,
      address: /(calle|avenida|plaza|paseo|camino|carretera|c\/|avda\.)\s+[a-zá-úñ\s,.0-9]+(?:,\s*(?:28|280)\d{3})?(?:,?\s*(?:madrid|alcobendas|pozuelo|las rozas|majadahonda|boadilla|torrelodones))?/i

    };
    
    try {
      if (typeof message !== 'string') {
        console.log('Mensaje recibido no es string:', message);
        return data;
      }

    // Extraer ubicación
    // Primero buscamos una dirección completa
    const addressMatch = message.match(patterns.address);
    if (addressMatch) {
    data.ubicacion = addressMatch[0].trim();
    console.log('Ubicación encontrada (dirección):', data.ubicacion);
    } else {
    // Si no hay una dirección completa, buscamos menciones de localidades de Madrid
    const localidades = [
        'Madrid',
        'Alcobendas',
        'Pozuelo',
        'Las Rozas',
        'Majadahonda',
        'Boadilla',
        'Torrelodones',
        'Alcorcón',
        'Móstoles',
        'Getafe',
        'Leganés',
        'Fuenlabrada',
        'San Sebastián de los Reyes',
        'Tres Cantos'
    ];

    const locationRegex = new RegExp(`\\b(${localidades.join('|')})\\b`, 'i');
    const locationMatch = message.match(locationRegex);
    
    if (locationMatch) {
        // Si solo tenemos la localidad, la guardamos
        data.ubicacion = locationMatch[0];
        console.log('Ubicación encontrada (localidad):', data.ubicacion);
    }
    }

    // Si el mensaje incluye coordenadas GPS
    const coordsMatch = message.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
    data.ubicacion_coords = {
        lat: parseFloat(coordsMatch[1]),
        lng: parseFloat(coordsMatch[2])
    };
    console.log('Coordenadas encontradas:', data.ubicacion_coords);
    }

    // Procesamiento adicional para ubicación
    if (data.ubicacion) {
    // Asegurarnos de que la ubicación incluye "Madrid" si no lo tiene
    if (!data.ubicacion.toLowerCase().includes('madrid')) {
        data.ubicacion += ', Madrid';
    }
    
    // Formatear la dirección para que sea consistente
    data.ubicacion = data.ubicacion
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .trim();
    }
  
      // Extraer email
      const emailMatch = message.match(patterns.email);
      if (emailMatch) {
        data.mail = emailMatch[0];
        console.log('Email encontrado:', data.mail);
      }
      
      // Extraer teléfono
      const phoneMatch = message.match(patterns.phone);
      if (phoneMatch) {
        data.numero_telefono = phoneMatch[0].replace(/\s+/g, '');
        console.log('Teléfono encontrado:', data.numero_telefono);
      }
      
      // Extraer dimensiones
      if (message.toLowerCase().includes('parcela') || message.toLowerCase().includes('metros cuadrados')) {
        const dimensionsMatch = message.match(patterns.dimensions);
        if (dimensionsMatch) {
          data.dimension_parcela = dimensionsMatch[0];
          console.log('Dimensiones parcela encontradas:', data.dimension_parcela);
        }
      }
      
      if (message.toLowerCase().includes('piscina') || message.toLowerCase().includes('x') || message.toLowerCase().includes('*')) {
        const dimensionsMatch = message.match(patterns.dimensions);
        if (dimensionsMatch) {
          data.dimension_piscina = dimensionsMatch[0];
          console.log('Dimensiones piscina encontradas:', data.dimension_piscina);
        }
      }
      
      // Extraer presupuesto si se menciona
      if (message.toLowerCase().includes('presupuesto') || 
          message.toLowerCase().includes('euros') || 
          message.toLowerCase().includes('€')) {
        const budgetMatch = message.match(patterns.budget);
        if (budgetMatch) {
          data.presupuesto = budgetMatch[0];
          console.log('Presupuesto encontrado:', data.presupuesto);
        }
      }
      
      // Extraer material
      if (message.toLowerCase().includes('gresite')) {
        data.material = 'gresite';
        console.log('Material encontrado: gresite');
      } else if (message.toLowerCase().includes('porcelánico') || 
                 message.toLowerCase().includes('porcelanico')) {
        data.material = 'porcelánico';
        console.log('Material encontrado: porcelánico');
      }
      
      // Si el mensaje parece contener un nombre completo (más de una palabra)
      const possibleName = message.match(/[A-ZÁ-Ú][a-zá-ú]+(\s+[A-ZÁ-Ú][a-zá-ú]+)+/);
      if (possibleName) {
        data.nombre_completo = possibleName[0];
        console.log('Nombre encontrado:', data.nombre_completo);
      }
      
      // Extraer tipo de acceso si se menciona
     // Primero verificamos si se menciona algo sobre acceso o accesibilidad
    const texto = message.toLowerCase();
    console.log(texto, "Qué es lo que devuelve aquí");
    if (texto.includes('acceso') || texto.includes('accesibilidad') || texto.includes('accesible') || texto.includes('complicado') || texto.includes('imposible')) {
        // Verificar acceso fácil
        if (texto.includes('fácil') || 
            texto.includes('facil') || 
            texto.includes('sin problema') ||
            texto.includes('bueno') ||
            texto.includes('sencillo') ||
            texto.includes('accesible') || 
            texto.includes('bueno')) {
        data.acceso_parcela = 'Accesible';
        }
        
        // Verificar acceso difícil
        if (texto.includes('difícil') || 
            texto.includes('dificil') || 
            texto.includes('complicado') ||
            texto.includes('complejo') ||
            texto.includes('malo')) {
        data.acceso_parcela =  'Complicado';
        }
        
        // Verificar sin acceso
        if (texto.includes('sin acceso') || 
            texto.includes('no hay acceso') ||
            texto.includes('imposible') ||
            texto.includes('inaccesible')) {
        data.acceso_parcela ='Sin acceso';
        }
            console.log('Tipo de acceso encontrado:', data.acceso_parcela);
        }   
        
      
    } catch (error) {
      console.error('Error al extraer datos:', error);
    }
    
    return data;
  };

/*
 Recuperamos el prompt "ia_piscinas"
 */
const getPrompt = async () => {
    try {
        const pathPrompt = join(process.cwd(), "/src/prompts");
        const text = readFileSync(join(pathPrompt, "ia_piscinas.txt"), "utf-8");
        console.log("FLOW_OFERTAS: devolvemos promt de piscinas");
        return text;
    } catch (error) {
        console.error('Error al leer el prompt:', error);
        return null;
    }
};


export const flowOfertas = (chatgptClass) => {
    console.log("Antes de addKeyword");
    return addKeyword(REGEX_ANY_CHARACTER, {regex: true})
        .addAction( async (ctx, { flowDynamic, provider, state }) => {
            console.log("Iniciando flujo de ofertas...", REGEX_ANY_CHARACTER);    
            try {
                // Obtener JID y configurar presencia
                const jid = ctx.key.remoteJid;
                const refProvider = await provider.getInstance();
                
                await refProvider.presenceSubscribe(jid);
                await delay(500);
                await refProvider.sendPresenceUpdate("composing", jid);
                
                if(chatGPT_ON == false) {

                    // Inicializar estado si es necesario
                    const currentState = state.get('clientData') || {
                        ubicacion: null,
                        dimension_parcela: null,
                        dimension_piscina: null,
                        material: null,
                        presupuesto: null,
                        acceso_parcela: null,
                        nombre_completo: null,
                        numero_telefono: null,
                        mail: null
                    };
                    
                    await state.update({ clientData: currentState });

                    // Obtener y procesar el prompt
                    const promptData = await getPrompt();
                    if (!promptData) {
                        await flowDynamic("Lo siento, hubo un error al procesar tu solicitud");
                        return;
                    }

                    // Procesar con ChatGPT
                    const respuesta_oferta = await chatgptClass.handleMsgChatGPT(promptData);
                    await refProvider.sendPresenceUpdate("paused", jid);

                    // Construir mensaje personalizado
                
                    await flowDynamic(respuesta_oferta.text);
                    console.log(respuesta_oferta.text);
                }

            } catch (error) {
                console.error('Error en el flow de ofertas:', error);
                await flowDynamic("Lo siento, hubo un error. Por favor, intenta más tarde.");
                return;
            }
        })
        .addAnswer(
            null,
            { capture: true },
            async (ctx, { flowDynamic, state, fallBack}) => {
                try {
                    chatGPT_ON = true;
                    const respuesta = await chatgptClass.handleMsgChatGPT(ctx.body);
                    
                    
                    console.log("Mensajes del usuario");

                    // Obtener datos actuales
                    const currentData = state.get('clientData') || {};
                    
                    // Extraer nuevos datos del mensaje
                    const newData = extractData(ctx.body);
                    
                    // Actualizar estado con los nuevos datos
                    const updatedData = {
                        ...currentData,
                        ...newData
                    };
                    
                    await state.update({ clientData: updatedData });

                   // Verificar si tenemos todos los datos necesarios
                    const requiredFields = ['mail', 'nombre_completo', 'numero_telefono'];
                    const hasAllRequiredData = requiredFields.every(field => updatedData[field]);
                    
                    if (hasAllRequiredData) {
                        console.log('Datos completos recopilados:', updatedData);
                        // Aquí puedes agregar la lógica para enviar los datos a tu base de datos
                        await flowDynamic(["¡Perfecto! He recopilado toda la información necesaria.",
                        "Nuestro equipo se pondrá en contacto contigo pronto para proporcionarte un presupuesto detallado."]);
                        // Aquí podrías añadir la lógica para enviar los datos a tu sistema
                    } else {
                        // Procesar respuesta de ChatGPT y continuar el flujo
                        await flowDynamic(respuesta.text);
                        return fallBack();
                    }
                } catch (error) {
                    console.error('Error al procesar mensaje:', error);
                    await flowDynamic('Disculpa, no pude procesar correctamente tu mensaje. ¿Podrías intentarlo de nuevo?');
                }
            }
        );
};
