
import { GoogleGenAI, Type } from "@google/genai";
import { Order, Product, SalesInsight } from "../types";

export class GeminiService {
  // Method updated to initialize GoogleGenAI internally to follow SDK best practices and handle dynamic API keys
  async getSalesInsights(orders: Order[], products: Product[]): Promise<SalesInsight | null> {
    try {
      // Initialize GoogleGenAI right before making the request as per guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const dataStr = JSON.stringify({
        recentOrders: orders.slice(-10),
        lowStock: products.filter(p => p.stock < 5)
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Phân tích dữ liệu bán hàng sau và đưa ra nhận xét ngắn gọn (tiếng Việt). Dữ liệu: ${dataStr}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: 'Tóm tắt tình hình kinh doanh ngắn gọn' },
              suggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: 'Các đề xuất hành động cụ thể'
              }
            },
            required: ["summary", "suggestions"]
          }
        }
      });

      // Directly access .text property as per SDK documentation
      const text = response.text;
      if (!text) return null;
      
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Error:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
