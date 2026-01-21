import { GoogleGenAI } from "@google/genai";
import { Arete, EstadoArete } from "../types";

// Helper to format data for the AI
const formatDataForPrompt = (aretes: Arete[]) => {
  return JSON.stringify(aretes.map(a => ({
    codigo: a.codigo,
    fecha: new Date(a.fechaEscaneo).toLocaleDateString(),
    estado: a.estado
  })));
};

export const GeminiService = {
  analizarLote: async (aretes: Arete[]): Promise<string> => {
    try {
      if (!process.env.API_KEY) {
        return "Error: No se ha configurado la API Key de Gemini.";
      }

      if (aretes.length === 0) {
        return "No hay datos para analizar. Escanea algunos aretes primero.";
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Actúa como un experto veterinario y administrador ganadero en México.
        Analiza la siguiente lista de aretes de ganado (SINIIGA) en formato JSON.
        
        Datos: ${formatDataForPrompt(aretes)}

        Por favor, genera un reporte breve y útil en texto plano (Markdown) que incluya:
        1. Un resumen total de animales escaneados.
        2. Cuántos están confirmados (ALTA), cuántos pendientes y cuántos con problemas (NO_REGISTRADO o BAJA).
        3. Recomendaciones sobre qué hacer con los aretes marcados como NO_REGISTRADO basándote en las normas generales de SINIIGA (ej. verificar reareteo, contactar ventanilla).
        4. Cualquier anomalía en las fechas si las hubiera.
        
        Sé conciso y profesional.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      return response.text || "No se pudo generar el análisis.";
    } catch (error) {
      console.error("Error consultando a Gemini:", error);
      return "Ocurrió un error al intentar comunicar con el asistente inteligente. Verifica tu conexión.";
    }
  }
};