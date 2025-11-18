

import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedPosts, PodcastScript, BlogArticle, LinkedInPoll, CarouselPresentation, ResearchReport, TopicSuggestion, YoutubeTopicSuggestion } from '../types';

let ai: GoogleGenAI | null = null;

// Lazily initialize the GoogleGenAI client to prevent app crashes on load.
// FIX: Export the getAiClient function to make it accessible to other modules.
export const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    if (!process.env.API_KEY) {
        // This error will be caught by the calling function's try-catch block.
        throw new Error("API_KEY environment variable is not set. Please configure it to generate content.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    return ai;
}

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
- For LinkedIn posts, keep the body concise and impactful. Use bullet points or numbered lists for key takeaways to make the content easy to scan and digest.

Image prompts must describe clean, modern, and vibrant scenes of diverse African professionals collaborating on data + AI projects. The style should be photorealistic and cinematic, featuring futuristic elements like holographic interfaces and glowing data visualizations, grounded in a recognizable Kenyan/Nairobi context. Emphasize innovation, community, and a positive, forward-looking mood. The aesthetic should be 'Nairobi tech-chic'.

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

const handleApiError = (error: any, context: string): Error => {
    console.error(`Error in ${context}:`, error);
    let message = `An unexpected error occurred while trying to ${context.replace(/([A-Z])/g, ' $1').toLowerCase()}.`;
    if (error instanceof Error) {
        if (error.message.includes("API_KEY")) {
            message = "Your API key is not valid or has not been set. Please configure your API key to continue.";
        } else if (error.message.includes("Invalid JSON")) {
            message = "The model returned an invalid format. Could not parse the response.";
        } else {
            message = error.message;
        }
    }
    return new Error(message);
};

const extractSources = (response: any): { title: string; uri: string }[] => {
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (!chunks) return [];
    
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
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = match ? match[1] : text;

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Invalid JSON format received from the model.");
    }
};

export const generateCorePosts = async (topic: string): Promise<GeneratedPosts> => {
    try {
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

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const sources = extractSources(response);
        const posts = extractJson(response.text.trim()) as GeneratedPosts;
        return { ...posts, sources };
    } catch (e) {
        throw handleApiError(e, 'generateCorePosts');
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
    try {
        let fullPrompt = `${prompt}, featuring diverse Kenyan professionals in a modern Nairobi tech setting`;

        if (artisticStyle === 'Photorealistic' || artisticStyle === 'Default') {
            fullPrompt += `, photorealistic, cinematic, high-resolution professional photography, hyper-detailed, sharp focus, dynamic lighting, vibrant colors with deep navy and turquoise accents, glowing data visualizations, modern corporate aesthetic`;
        } else if (artisticStyle !== 'Default') {
            fullPrompt += `, in a ${artisticStyle.toLowerCase()} style`;
        }
        
        if (colorPalette !== 'Default') fullPrompt += `, with a ${colorPalette.toLowerCase()} color palette`;
        if (composition !== 'Default') fullPrompt += `, ${composition.toLowerCase()}`;
        if (mood !== 'Default') fullPrompt += `, evoking a ${mood.toLowerCase()} mood`;

        const response = await getAiClient().models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio as any,
            },
        });

        return response.generatedImages.map(img => img.image.imageBytes);
    } catch (e) {
        throw handleApiError(e, 'generateImages');
    }
};

// Helper function to write a string to a DataView
const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
};

// Helper function to convert raw PCM data to a WAV file blob
const pcmToWavBlob = (pcmData: Int16Array, sampleRate: number, numChannels: number): Blob => {
    const headerSize = 44;
    const dataSize = pcmData.length * 2; // 16-bit samples = 2 bytes per sample
    const buffer = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, headerSize + dataSize - 8, true); // file-size - 8
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
    view.setUint16(20, 1, true); // audio format (1 for PCM)
    view.setUint16(22, numChannels, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(headerSize + i * 2, pcmData[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
};

export const generatePodcastAudio = async (script: string): Promise<Blob> => {
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = script;
        const plainTextScript = tempDiv.textContent || tempDiv.innerText || "";
        
        const ttsResponse = await getAiClient().models.generateContent({
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
        
        const scriptPcmBytes = decode(base64Audio);
        const pcmInt16 = new Int16Array(scriptPcmBytes.buffer);
        return pcmToWavBlob(pcmInt16, 24000, 1);
    } catch(e) {
        throw handleApiError(e, 'generatePodcastAudio');
    }
};


export const generatePodcastScript = async (topic: string): Promise<PodcastScript> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}

        Generate a short podcast script about "${topic}". The script should be engaging and conversational, suitable for a 3-4 minute monologue.
        Incorporate relevant information from the web search results to make the content current and well-informed.
        Provide a catchy title and the script content.
        Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "script": "..." } \`\`\`
        The script should be formatted with paragraphs and clearly marked with "Host:" for our text-to-speech engine.`;

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const sources = extractSources(response);
        const script = extractJson(response.text.trim()) as PodcastScript;
        return { ...script, sources };
    } catch (e) {
        throw handleApiError(e, 'generatePodcastScript');
    }
};

export const generateBlogArticle = async (topic: string): Promise<BlogArticle> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}
        
        Generate a comprehensive blog article on the topic: "${topic}".
        The article should be well-structured, informative, and engaging, embodying our brand voice.
        Use the web search results to include up-to-date information, statistics, or recent developments related to the topic.
        It should include a compelling title, a main body of text with proper formatting (paragraphs, maybe lists), and a concluding summary.
        Also provide a list of relevant hashtags.
        Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "body": "...", "hashtags": ["...", "..."] } \`\`\``;

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const sources = extractSources(response);
        const article = extractJson(response.text.trim()) as BlogArticle;
        return { ...article, sources };
    } catch (e) {
        throw handleApiError(e, 'generateBlogArticle');
    }
};

export const generateLinkedInPoll = async (topic: string): Promise<LinkedInPoll> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}
        
        Create a LinkedIn poll related to the topic: "${topic}".
        The poll should have a thought-provoking question that encourages community discussion, and between 2 to 4 distinct options.
        If relevant, base the question on recent news or trends found in the web search results.
        Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "question": "...", "options": ["...", "..."] } \`\`\``;

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const sources = extractSources(response);
        const poll = extractJson(response.text.trim()) as LinkedInPoll;
        return { ...poll, sources };
    } catch (e) {
        throw handleApiError(e, 'generateLinkedInPoll');
    }
};

export const generateCarousel = async (topic: string): Promise<CarouselPresentation> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}
        
        Create a LinkedIn-style carousel presentation about "${topic}".
        The carousel should have a main title and a series of 5 to 7 slides.
        Use data, quotes, or key facts from the web search results to make the slides more impactful.
        Each slide needs a short, punchy title and a small amount of content (1-3 sentences or a short bullet list).
        The last slide should be a community-focused call to action.
        Format the output as a valid JSON object inside a markdown code block: \`\`\`json { "title": "...", "slides": [{ "title": "...", "content": "..." }, ...] } \`\`\``;

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        const sources = extractSources(response);
        const carousel = extractJson(response.text.trim()) as CarouselPresentation;
        return { ...carousel, sources };
    } catch (e) {
        throw handleApiError(e, 'generateCarousel');
    }
};

export const generateResearchReport = async (topic: string): Promise<ResearchReport> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}
        
        Generate an in-depth, factual research report on the topic: "${topic}".
        The report should be structured with a clear title and a detailed body, written in our accessible but authoritative voice.
        You MUST cite your sources using Google Search grounding.
        The report body should be well-formatted using Markdown.`;

        const response = await getAiClient().models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const text = response.text;
        const sources = extractSources(response);
        
        const firstLine = text.split('\n')[0] || '';
        const title = firstLine.replace(/^#+\s*/, '').trim() || topic;
        
        return {
            title,
            report: text,
            sources,
        };
    } catch(e) {
        throw handleApiError(e, 'generateResearchReport');
    }
};

export const generateTopicSuggestions = async (topic: string): Promise<TopicSuggestion[]> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}

        Based on the central theme "${topic}", generate a strategic 7-day content plan.
        For each day (Monday to Sunday), suggest a specific, engaging sub-topic.
        The output must be a valid JSON array of objects.
        
        JSON structure: [{ "day": "Monday", "topic": "..." }, { "day": "Tuesday", "topic": "..." }, ...]
        `;
        
        const response = await getAiClient().models.generateContent({
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

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TopicSuggestion[];
    } catch (e) {
        throw handleApiError(e, 'generateTopicSuggestions');
    }
};

export const analyzeYoutubeVideoForTopics = async (youtubeUrl: string): Promise<YoutubeTopicSuggestion[]> => {
    try {
        const prompt = `${BRAND_PERSONA_PROMPT}

        You are tasked with analyzing a YouTube video to find content ideas for our community.
        Based on the video at this URL: ${youtubeUrl}

        Analyze its potential content, themes, and key talking points based on its title, and what you know about it. Then, generate a list of 5 specific and engaging sub-topic ideas that would be relevant to the Kenya Data & AI Society.
        For each topic, provide a brief description (1-2 sentences) of why it's relevant or what angle to take.
        The output must be a valid JSON array of objects.
        
        JSON structure: [{ "topic": "...", "description": "..." }, ...]
        `;

        const response = await getAiClient().models.generateContent({
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

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as YoutubeTopicSuggestion[];
    } catch (e) {
        throw handleApiError(e, 'analyzeYoutubeVideo');
    }
};