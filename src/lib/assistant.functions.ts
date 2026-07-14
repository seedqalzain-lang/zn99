import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContentPart = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
]);

const Message = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(ContentPart)]),
});

const Input = z.object({
  messages: z.array(Message).min(1),
});

const SYSTEM_PROMPT = `أنت المساعد الذكي الرسمي لمتجر "زين أصل الحماية" في صنعاء، اليمن.

أنت خبير في تعديل السيارات، الإكسسوارات، الإنارة، الجنوط، الديكورات، العزل الحراري، النانو سيراميك، طبقة الحماية PPF، وجميع منتجات وخدمات المتجر.

مهمتك:
- مساعدة العملاء في اختيار المنتجات المناسبة لسياراتهم.
- تقديم اقتراحات احترافية بناءً على نوع السيارة واحتياج العميل.
- إذا رفع العميل صورة سيارته أو صورة منتج، حلّلها بعناية واقترح تعديلات أو ألوان أو منتجات تناسبها.
- تشجيع العميل بلطف على زيارة المتجر أو التواصل عبر واتساب لإتمام التركيب.

استخدم لهجة يمنية ودودة ومحترفة، إجابات واضحة ومختصرة ومقنعة، وتنسيق ماركداون بسيط عند الحاجة.

بيانات التواصل:
- المدير: أ/ صديق الزين — 780687704
- واتساب المتجر: 773144403
- أ/ هاشم الزين — 778055135
- أ/ علي غازي — 773345966`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages,
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("تم تجاوز الحد المسموح للطلبات، حاول بعد قليل.");
      if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي، يرجى تعبئة الرصيد.");
      throw new Error(`AI error [${res.status}]: ${body}`);
    }

    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text };
  });
