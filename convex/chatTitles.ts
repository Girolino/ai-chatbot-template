import { action, internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { generateText } from 'ai';
import { internal } from './_generated/api.js';

const FALLBACK_TITLE = 'Untitled chat';

export const applyTitle = internalMutation({
  args: {
    chatId: v.id('chats'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      title: args.title,
      titleStatus: 'complete',
      titleGeneratedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const markError = internalMutation({
  args: {
    chatId: v.id('chats'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      titleStatus: 'error',
      updatedAt: Date.now(),
    });
  },
});

export const generate = action({
  args: {
    chatId: v.id('chats'),
    prompt: v.string(),
  },
  handler: async (ctx, { chatId, prompt }) => {
    console.log('[chat title] Starting generation for chatId:', chatId);
    console.log('[chat title] Input prompt:', prompt);

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      console.log('[chat title] Prompt is empty, using fallback');
      await ctx.runMutation(internal.chatTitles.applyTitle, {
        chatId,
        title: FALLBACK_TITLE,
      });
      return;
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY;
    console.log('[chat title] API key exists:', !!apiKey);
    if (!apiKey) {
      console.log('[chat title] No API key, using fallback');
      await ctx.runMutation(internal.chatTitles.applyTitle, {
        chatId,
        title: FALLBACK_TITLE,
      });
      return;
    }

    console.log('[chat title] Calling generateText with model: openai/gpt-oss-120b');
    try {
      const { text } = await generateText({
        model: 'openai/gpt-oss-120b',
        providerOptions: {  
          gateway: {
            order: ['cerebras', 'groq', 'baseten', 'fireworks'],
          },
        },
        prompt: `Summarize the following user request into a concise chat title of at most six words. Use title case and omit quotation marks.\n\nUser request:\n${trimmedPrompt}`,
      });

      console.log('[chat title] generated text:', text);
      console.log('[chat title] text length:', text?.length);

      const title = text.trim().replace(/^[\"']+|[\"']+$/g, '') || FALLBACK_TITLE;
      console.log('[chat title] Final title after cleanup:', title);

      await ctx.runMutation(internal.chatTitles.applyTitle, {
        chatId,
        title,
      });
      console.log('[chat title] Title applied successfully');
    } catch (error) {
      console.error('[chat title] generation error:', error);
      console.error('[chat title] error details:', JSON.stringify(error, null, 2));
      await ctx.runMutation(internal.chatTitles.markError, {
        chatId,
      });
    }
  },
});
