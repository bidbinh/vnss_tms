import { NextRequest, NextResponse } from "next/server";

// AI Chat endpoint - proxies to backend which has the API keys configured
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, language } = body;

    // Get backend URL from environment
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Try to use backend AI endpoint first (which has ANTHROPIC_API_KEY configured)
    try {
      const response = await fetch(`${backendUrl}/api/v1/ai/quick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `[Context: ${context || "9log.tech company profile presentation"}]\n[Language: ${language === "vi" ? "Vietnamese" : "English"}]\n\nUser question: ${message}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ response: data.response });
      }
    } catch (backendError) {
      console.log("Backend AI not available, trying direct API calls...");
    }

    // Build system prompt for direct API calls
    const systemPrompt = `You are a helpful assistant for 9log.tech, an AI-powered ERP Logistics platform made in Vietnam.

About 9log.tech:
- AI-Powered ERP for Logistics companies
- Made in Vietnam for Vietnam market
- Modules: TMS (Transport Management), WMS (Warehouse Management), FMS (Freight Forwarding), HRM, CRM, Accounting
- Founded in 2026, based in Hanoi
- Founder/CEO: Trần Trọng Bình
- Target: 100 enterprise customers by end of 2026
- Key features: AI-powered optimization, real-time tracking, cloud-native, mobile-first

${context ? `Additional context: ${context}` : ""}

Instructions:
- Respond in ${language === "vi" ? "Vietnamese" : "English"}
- Keep responses concise (2-3 sentences for voice)
- Be helpful and professional
- Focus on 9log.tech's value proposition`;

    // Try Anthropic (Claude) first - preferred
    if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: "user", content: message }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.content[0]?.text || "";
        return NextResponse.json({ response: reply });
      }
    }

    // Fallback to OpenAI if Claude not available
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices[0]?.message?.content || "";
        return NextResponse.json({ response: reply });
      }
    }

    // Fallback response
    const fallbackResponses: Record<string, string> = {
      vi: "9log.tech là nền tảng ERP Logistics tích hợp AI, được phát triển tại Việt Nam. Chúng tôi cung cấp giải pháp quản lý vận tải, kho bãi và giao nhận hàng hóa.",
      en: "9log.tech is an AI-powered ERP Logistics platform developed in Vietnam. We provide transport management, warehouse, and freight forwarding solutions.",
    };

    return NextResponse.json({
      response: fallbackResponses[language] || fallbackResponses.vi,
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({
      response: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
    });
  }
}
