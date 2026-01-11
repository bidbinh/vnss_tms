import { NextRequest, NextResponse } from "next/server";

// AI Command Interpreter for Voice and Gesture Controls
// This endpoint interprets user commands for slide navigation

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, type, language, currentPage, totalPages, context } = body;

    // Build the prompt for AI
    const systemPrompt = `You are a presentation slide navigation assistant. Your job is to interpret user commands (voice or gesture) and determine the navigation action.

IMPORTANT: You must respond with ONLY a JSON object, no other text.

Response format:
- For next slide: {"action": "next"}
- For previous slide: {"action": "prev"}
- For specific page: {"action": "goto", "page": <number>}
- For no action: {"action": "none"}

Context:
- Current page: ${currentPage} of ${totalPages}
- Language: ${language}
- Input type: ${type}
${context}

Rules:
1. For voice commands:
   - Vietnamese: "tiếp", "sau", "kế tiếp", "tiếp theo", "đi tiếp", "slide sau", "trang sau" = next
   - Vietnamese: "lùi", "trước", "quay lại", "trở lại", "trang trước", "slide trước" = prev
   - English: "next", "forward", "continue", "go ahead", "next slide", "next page" = next
   - English: "back", "previous", "go back", "last slide", "before" = prev
   - Numbers: "trang 5", "page 5", "slide 5", "go to 5" = goto with page number
   - Also understand variations, typos, and similar phrases

2. For gesture data:
   - "left_dominant" means user swiped/moved hand to the left = prev
   - "right_dominant" means user swiped/moved hand to the right = next

3. Ignore commands that don't relate to navigation (questions, greetings, etc.) - return {"action": "none"}`;

    const userMessage = `Input: "${input}"`;

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
          message: `${systemPrompt}\n\n${userMessage}\n\nRespond with ONLY a JSON object.`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.response || "";

        // Try to extract JSON from response
        const jsonMatch = content.match(/\{[^}]+\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]);
            console.log("AI Command Result (Backend):", result);
            return NextResponse.json(result);
          } catch {
            // JSON parse failed, use fallback
          }
        }
      }
    } catch (backendError) {
      console.log("Backend AI not available for command, trying direct API calls...");
    }

    // Direct API calls if backend not available
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback to simple keyword matching if no API key
      return handleFallback(input, type, language);
    }

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
          max_tokens: 50,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content[0]?.text || "";

        try {
          const result = JSON.parse(content.trim());
          console.log("AI Command Result (Claude):", result);
          return NextResponse.json(result);
        } catch {
          console.error("Failed to parse Claude response:", content);
          return handleFallback(input, type, language);
        }
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
            { role: "user", content: userMessage },
          ],
          temperature: 0.1,
          max_tokens: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content || "";

        try {
          const result = JSON.parse(content.trim());
          console.log("AI Command Result (OpenAI):", result);
          return NextResponse.json(result);
        } catch {
          console.error("Failed to parse OpenAI response:", content);
          return handleFallback(input, type, language);
        }
      }
    }

    // Fallback if no API works
    return handleFallback(input, type, language);
  } catch (error) {
    console.error("AI Command error:", error);
    return NextResponse.json({ action: "none", error: "Failed to process command" });
  }
}

// Fallback keyword-based matching
function handleFallback(input: string, type: string, language: string) {
  const text = input.toLowerCase();

  if (type === "gesture") {
    if (text.includes("left_dominant")) {
      return NextResponse.json({ action: "prev" });
    }
    if (text.includes("right_dominant")) {
      return NextResponse.json({ action: "next" });
    }
  }

  // Voice fallback
  const nextWords = ["tiếp", "tiep", "sau", "next", "forward", "continue", "kế tiếp", "tiếp theo"];
  const prevWords = ["lùi", "lui", "trước", "truoc", "back", "previous", "quay lại", "trở lại"];

  for (const word of nextWords) {
    if (text.includes(word)) {
      return NextResponse.json({ action: "next" });
    }
  }

  for (const word of prevWords) {
    if (text.includes(word)) {
      return NextResponse.json({ action: "prev" });
    }
  }

  // Check for page numbers
  const pageMatch = text.match(/(?:trang|page|slide)\s*(\d+)/);
  if (pageMatch) {
    return NextResponse.json({ action: "goto", page: parseInt(pageMatch[1]) });
  }

  return NextResponse.json({ action: "none" });
}
