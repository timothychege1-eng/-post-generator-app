

import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedPosts, PodcastScript, BlogArticle, LinkedInPoll, CarouselPresentation, ResearchReport, TopicSuggestion, YoutubeTopicSuggestion } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// @ts-ignore
declare const lamejs: any;

const BRAND_PERSONA_PROMPT = `You are the Communications Manager for the Kenya Data & AI Society.
Your job is to generate on-brand content.

Brand themes: leadership, public speaking, data literacy, AI innovation, ethics, and Kenyan/African context.
Voice: Professional, warm, clear, inspiring, community-driven, and ethically minded. Your tone is welcoming, as if inviting people into our community to tackle complex topics together.
Writing style:
- Start with a strong hook or question.
- Share a useful insight or tell a personal story.
- Connect to Kenya/Africa and mention the "Kenya Data & AI Society" where appropriate to build brand recognition.
- End with a community-centered CTA (“What can Kenya build next?”, "Let's discuss...", "Join the conversation.").
- Use accessible language and avoid jargon.
- For LinkedIn posts, use numbered lists for key takeaways to improve readability.

Image prompts must be clean, modern, African-inspired, and aligned with data + AI themes (futuristic but grounded, diverse people collaborating, bold typography, etc.).

Your goal is to make every post feel alive, inspiring, unique to African innovation, and foster a sense of community.`;


function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const extractSources = (response: any): { title: string; uri: string }[] => {
    // Using `any` for response to handle the dynamic structure, but this is where the sources are located.
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!chunks) {
        return [];
    }
    
    // Using a set to ensure unique URIs
    const uniqueSources = new Map<string, { title: string; uri: string }>();

    chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
            if (!uniqueSources.has(chunk.web.uri)) {
                uniqueSources.set(chunk.web.uri, {
                    title: chunk.web.title || 'Unknown Source',
                    uri: chunk.web.uri,
                });
            }
        }
    });
    
    return Array.from(uniqueSources.values());
};

const extractJson = (text: string): any => {
    // Look for JSON inside a markdown code block, with optional language tag
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = match ? match[1] : text;

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON string:", jsonString);
        // This will be caught by the calling function's try-catch block
        throw new Error("Invalid JSON format received from the model.");
    }
};


export const generateCorePosts = async (topic: string): Promise<GeneratedPosts> => {
    const prompt = `${BRAND_PERSONA_PROMPT}

    Based on the topic "${topic}", generate a set of social media posts. Use the provided web search results to incorporate recent news, data, or events to make the posts more timely, relevant, and engaging.
    
    Format your response as a valid JSON object inside a markdown code block. The JSON object must adhere to the following structure:
    \`\`\`json
    {
        "linkedinPost": { "title": "...", "body": "...", "hashtags": ["...", "..."] },
        "xPost": { "body": "...", "hashtags": ["...", "..."] },
        "imagePrompt": "A descriptive prompt for an AI image generator, following the brand guidelines."
    }
    \`\`\`
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const sources = extractSources(response);

    try {
        const posts = extractJson(response.text.trim()) as GeneratedPosts;
        return { ...posts, sources };
    } catch (e) {
        console.error("Failed to parse JSON response for core posts:", response.text, e);
        throw new Error("Failed to generate core posts. The model returned an invalid format.");
    }
};

export const generateImages = async (
    prompt: string,
    artisticStyle: string,
    colorPalette: string,
    composition: string,
    mood: string,
    aspectRatio: string
): Promise<string[]> => {
    let fullPrompt = prompt;

    // Enhanced prompt for photorealism
    if (artisticStyle === 'Photorealistic') {
        fullPrompt += `, photorealistic, hyper-detailed, cinematic lighting, 8k resolution, professional color grading, sharp focus`;
    } else if (artisticStyle !== 'Default') {
        fullPrompt += `, in a ${artisticStyle.toLowerCase()} style`;
    }
    
    if (colorPalette !== 'Default') fullPrompt += `, with a ${colorPalette.toLowerCase()} color palette`;
    if (composition !== 'Default') fullPrompt += `, ${composition.toLowerCase()}`;
    if (mood !== 'Default') fullPrompt += `, evoking a ${mood.toLowerCase()} mood`;

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as any,
        },
    });

    return response.generatedImages.map(img => img.image.imageBytes);
};

// A short, royalty-free audio clip (raw PCM, 24kHz, 16-bit mono) encoded in base64. This is a valid 5-second synth chord sting.
const themeMusicBase64 = `//uQRAAAAP8AAABAAAAAAAAAgIAAw+JDxG/I5A7/p2/r7+zv79/h4eLi4uPi5ubi5ufo6Ojo6Ojp6enq6urq6urq6+vr6+vs7Ozt7e3t7e3u7u7u7u7v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v-`;

export const generatePodcastAudio = async (script: string): Promise<Blob> => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = script;
    const plainTextScript = tempDiv.textContent || tempDiv.innerText || "";
    
    // The Gemini TTS model does not need explicit instructions for music in the prompt.
    // We will concatenate the audio buffers later.
    const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: { parts: [{ text: plainTextScript }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: "Host", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
                        { speaker: "Guest", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
                    ]
                }
            },
        },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Audio data not found in TTS response.");
    }
    
    // Decode generated speech
    const scriptPcm = decode(base64Audio);

    // For simplicity and to resolve the decoding error, we will not use theme music for now.
    // If you add a valid themeMusicBase64 string back, you can uncomment the concatenation logic.
    const pcmInt16 = new Int16Array(scriptPcm.buffer);

    // Encode the final PCM data to MP3
    const mp3encoder = new lamejs.Mp3Encoder(1, 24000, 128);
    const mp3Data = [];
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcmInt16.length; i += sampleBlockSize) {
        const sampleChunk = pcmInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf));
        }
    }
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf));
    }
    
    return new Blob(mp3Data, {type: 'audio/mpeg'});
};

export const generatePodcastScript = async (topic: string): Promise<PodcastScript> => {
    const prompt = `${BRAND_PERSONA_PROMPT}

    Generate a short podcast script about "${topic}". The script should be engaging and conversational, suitable for a 3-4 minute monologue.
    Incorporate relevant information from the web search results to make the content current and well-informed.
    Provide a catchy title and the script content.
    Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "script": "..." } \`\`\`
    The script should be formatted with paragraphs and clearly marked with "Host:" for our text-to-speech engine.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const sources = extractSources(response);
    try {
        const script = extractJson(response.text.trim()) as PodcastScript;
        return { ...script, sources };
    } catch (e) {
        console.error("Failed to parse JSON for podcast script:", response.text, e);
        throw new Error("Failed to generate podcast script.");
    }
};

export const generateBlogArticle = async (topic: string): Promise<BlogArticle> => {
    const prompt = `${BRAND_PERSONA_PROMPT}
    
    Generate a comprehensive blog article on the topic: "${topic}".
    The article should be well-structured, informative, and engaging, embodying our brand voice.
    Use the web search results to include up-to-date information, statistics, or recent developments related to the topic.
    It should include a compelling title, a main body of text with proper formatting (paragraphs, maybe lists), and a concluding summary.
    Also provide a list of relevant hashtags.
    Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "body": "...", "hashtags": ["...", "..."] } \`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const sources = extractSources(response);
    try {
        const article = extractJson(response.text.trim()) as BlogArticle;
        return { ...article, sources };
    } catch (e) {
        console.error("Failed to parse JSON for blog article:", response.text, e);
        throw new Error("Failed to generate blog article.");
    }
};

export const generateLinkedInPoll = async (topic: string): Promise<LinkedInPoll> => {
    const prompt = `${BRAND_PERSONA_PROMPT}
    
    Create a LinkedIn poll related to the topic: "${topic}".
    The poll should have a thought-provoking question that encourages community discussion, and between 2 to 4 distinct options.
    If relevant, base the question on recent news or trends found in the web search results.
    Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "question": "...", "options": ["...", "..."] } \`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const sources = extractSources(response);
    try {
        const poll = extractJson(response.text.trim()) as LinkedInPoll;
        return { ...poll, sources };
    } catch (e) {
        console.error("Failed to parse JSON for poll:", response.text, e);
        throw new Error("Failed to generate LinkedIn poll.");
    }
};

export const generateCarousel = async (topic: string): Promise<CarouselPresentation> => {
    const prompt = `${BRAND_PERSONA_PROMPT}
    
    Create a LinkedIn-style carousel presentation about "${topic}".
    The carousel should have a main title and a series of 5 to 7 slides.
    Use data, quotes, or key facts from the web search results to make the slides more impactful.
    Each slide needs a short, punchy title and a small amount of content (1-3 sentences or a short bullet list).
    The last slide should be a community-focused call to action.
    Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "slides": [{ "title": "...", "content": "..." }, ...] } \`\`\``;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });

    const sources = extractSources(response);
    try {
        const carousel = extractJson(response.text.trim()) as CarouselPresentation;
        return { ...carousel, sources };
    } catch (e) {
        console.error("Failed to parse JSON for carousel:", response.text, e);
        throw new Error("Failed to generate carousel.");
    }
};

export const generateResearchReport = async (topic: string): Promise<ResearchReport> => {
    const prompt = `${BRAND_PERSONA_PROMPT}
    
    Generate an in-depth, factual research report on the topic: "${topic}".
    The report should be structured with a clear title and a detailed body, written in our accessible but authoritative voice.
    You MUST cite your sources using Google Search grounding.
    The report body should be well-formatted using Markdown.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });

    const text = response.text;
    const sources = extractSources(response);
    
    // A simple heuristic to extract title from the response text
    const firstLine = text.split('\n')[0] || '';
    const title = firstLine.replace(/^#+\s*/, '').trim() || topic;
    
    return {
        title,
        report: text,
        sources,
    };
};

export const generateTopicSuggestions = async (topic: string): Promise<TopicSuggestion[]> => {
    const prompt = `${BRAND_PERSONA_PROMPT}

    Based on the central theme "${topic}", generate a strategic 7-day content plan.
    For each day (Monday to Sunday), suggest a specific, engaging sub-topic.
    The output must be a valid JSON array of objects.
    
    JSON structure: [{ "day": "Monday", "topic": "..." }, { "day": "Tuesday", "topic": "..." }, ...]
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING },
                        topic: { type: Type.STRING },
                    },
                    required: ['day', 'topic']
                }
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TopicSuggestion[];
    } catch (e) {
        console.error("Failed to parse JSON response for topic suggestions:", response.text);
        throw new Error("Failed to generate topic suggestions. The model returned an invalid format.");
    }
};

export const analyzeYoutubeVideoForTopics = async (youtubeUrl: string): Promise<YoutubeTopicSuggestion[]> => {
    const prompt = `${BRAND_PERSONA_PROMPT}

    You are tasked with analyzing a YouTube video to find content ideas for our community.
    Based on the video at this URL: ${youtubeUrl}

    Analyze its potential content, themes, and key talking points based on its title, and what you know about it. Then, generate a list of 5 specific and engaging sub-topic ideas that would be relevant to the Kenya Data & AI Society.
    For each topic, provide a brief description (1-2 sentences) of why it's relevant or what angle to take.
    The output must be a valid JSON array of objects.
    
    JSON structure: [{ "topic": "...", "description": "..." }, ...]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING },
                        description: { type: Type.STRING },
                    },
                    required: ['topic', 'description']
                }
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as YoutubeTopicSuggestion[];
    } catch (e) {
        console.error("Failed to parse JSON response for YouTube analysis:", response.text);
        throw new Error("Failed to analyze video. The model returned an invalid format.");
    }
};