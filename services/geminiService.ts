import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedPosts, ScheduleItem, BlogArticle, LinkedInPoll, CarouselPresentation, ResearchReport, PodcastScript } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
// @ts-ignore
declare const lamejs: any;

// A short, royalty-free audio clip (5 seconds, 24kHz, mono, WAV format) encoded in base64.
// This will be used as the intro/outro music for the podcast.
const themeMusicBase64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-pro';
const imageModel = 'imagen-4.0-generate-001';
const ttsModel = 'gemini-2.5-flash-preview-tts';

const fullSocialPostsSchema = {
    type: Type.OBJECT,
    properties: {
        linkedinPost: {
            type: Type.OBJECT,
            description: "A concise and engaging LinkedIn post.",
            properties: {
                title: { type: Type.STRING, description: "A strong, attention-grabbing hook for the post. Keep it short and impactful." },
                body: { type: Type.STRING, description: "The main content of the post. Format with paragraphs separated by newlines (\\n). Crucially, use bullet points (e.g., '* Point 1') for any lists or key takeaways to maximize readability and engagement. The post should be concise, use storytelling or a surprising fact, and end with a clear call to action (like a question) to encourage comments." },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3 to 5 relevant hashtags for LinkedIn, without the '#' symbol." },
            },
            required: ["title", "body", "hashtags"],
        },
        xPost: {
            type: Type.OBJECT,
            description: "Content optimized for an X (formerly Twitter) post.",
            properties: {
                body: { type: Type.STRING, description: "The content of the post for X. Must be concise, engaging, under 280 characters, and end with a question to drive engagement." },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 2 to 3 relevant hashtags for X, without the '#' symbol." },
            },
            required: ["body", "hashtags"],
        },
        imagePrompt: { type: Type.STRING, description: "A detailed, descriptive prompt for an AI image generator to create a visually appealing and relevant image for this post. The image should be symbolic, optimistic, and represent the topic in a professional context." },
        blogArticle: {
            type: Type.OBJECT,
            description: "A long-form blog article.",
            properties: {
                title: { type: Type.STRING, description: "An SEO-friendly and engaging title for the blog article." },
                body: { type: Type.STRING, description: "The full body of the blog article, at least 400 words. Format with paragraphs separated by newlines (\\n). It is essential to structure the content with bulleted lists (e.g., '* Point 1') for clarity, especially for key points, steps, or data. The article should be comprehensive, provide deep insights, and end with an open-ended question." },
            },
            required: ["title", "body"],
        },
        linkedinPoll: {
            type: Type.OBJECT,
            description: "An engaging poll for LinkedIn.",
            properties: {
                question: { type: Type.STRING, description: "A concise and thought-provoking question for a LinkedIn poll." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3 to 4 short, distinct options for the poll." },
            },
            required: ["question", "options"],
        },
        carouselPresentation: {
            type: Type.OBJECT,
            description: "A 5-slide presentation for a LinkedIn carousel.",
            properties: {
                title: { type: Type.STRING, description: "An overall title for the carousel presentation." },
                slides: {
                    type: Type.ARRAY,
                    description: "An array of exactly 5 slides.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "The title for an individual carousel slide (e.g., 'Slide 1: The Challenge')." },
                            body: { type: Type.STRING, description: "The body content for the slide. Should be concise and impactful, like a bullet point or a short sentence." },
                        },
                        required: ["title", "body"],
                    },
                },
            },
            required: ["title", "slides"],
        },
        researchReport: {
            type: Type.OBJECT,
            description: "A brief research report with statistical facts.",
            properties: {
                title: { type: Type.STRING, description: "A professional title for the research report." },
                body: { type: Type.STRING, description: "A summary of research on the topic. Format with paragraphs separated by newlines (\\n). It must include at least 3 distinct statistical facts or data points, presented clearly in a bulleted list (e.g., '* Fact 1: ...'). The tone should be authoritative and informative." },
            },
            required: ["title", "body"],
        },
        podcastScript: {
            type: Type.OBJECT,
            description: "A 5-7 minute podcast script.",
            properties: {
                title: { type: Type.STRING, description: "An engaging title for the podcast episode." },
                script: { type: Type.STRING, description: "A fun, engaging, and educative podcast script, approximately 750-1050 words long, formatted with paragraphs separated by newline characters (\\n). The script must be a conversation between two speakers, clearly marked with 'Host:' and 'Expert:' before their lines." },
            },
            required: ["title", "script"],
        },
    },
};

const corePostsSchema = {
    type: Type.OBJECT,
    properties: {
        linkedinPost: fullSocialPostsSchema.properties.linkedinPost,
        xPost: fullSocialPostsSchema.properties.xPost,
        imagePrompt: fullSocialPostsSchema.properties.imagePrompt,
    },
    required: ["linkedinPost", "xPost", "imagePrompt"],
};

const blogArticleSchema = { type: Type.OBJECT, properties: { blogArticle: fullSocialPostsSchema.properties.blogArticle }, required: ['blogArticle'] };
const linkedinPollSchema = { type: Type.OBJECT, properties: { linkedinPoll: fullSocialPostsSchema.properties.linkedinPoll }, required: ['linkedinPoll'] };
const carouselPresentationSchema = { type: Type.OBJECT, properties: { carouselPresentation: fullSocialPostsSchema.properties.carouselPresentation }, required: ['carouselPresentation'] };
const researchReportSchema = { type: Type.OBJECT, properties: { researchReport: fullSocialPostsSchema.properties.researchReport }, required: ['researchReport'] };
const podcastScriptSchema = { type: Type.OBJECT, properties: { podcastScript: fullSocialPostsSchema.properties.podcastScript }, required: ['podcastScript'] };


const postIdeasSchema = {
    type: Type.OBJECT,
    properties: {
        ideas: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of 3-5 engaging post ideas as strings."
        }
    },
    required: ["ideas"]
};

const weeklyScheduleSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            day: { type: Type.STRING, description: "Day of the week (e.g., 'Monday')." },
            topic: { type: Type.STRING, description: "The specific, engaging topic for the day's post." },
            platform: { type: Type.STRING, description: "The recommended platform for this post ('LinkedIn' or 'X')." },
            time: { type: Type.STRING, description: "The optimal time to post (e.g., '9:30 AM')." }
        },
        required: ["day", "topic", "platform", "time"]
    }
};

const memeSchema = {
    type: Type.OBJECT,
    properties: {
        imagePrompt: {
            type: Type.STRING,
            description: "A detailed, witty, and slightly exaggerated prompt for an AI image generator to create the visual part of a meme. The image should be funny and relatable in a professional context."
        },
        caption: {
            type: Type.STRING,
            description: "A short, punchy, and witty caption for the meme."
        }
    },
    required: ["imagePrompt", "caption"]
};


async function generateContentWithSchema(prompt: string, schema: any) {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("Error generating content with schema:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate content: ${error.message}`);
        }
        throw new Error("An unknown error occurred during content generation.");
    }
}

export async function generateCorePosts(
    topic: string,
): Promise<Pick<GeneratedPosts, 'linkedinPost' | 'xPost' | 'imagePrompt'>> {
    console.log("Generating core content (LinkedIn, X, Image Prompt)...");

    const prompt = `
        You are a world-class content strategist for professionals in Kenya.
        Generate a core content package about the topic: "${topic}".
        The content must be optimized for each platform's best practices and written in a concise, precise, and engaging style.
        All posts should include engaging questions to indulge the readers.

        You must generate ALL of the following:
        1. A LinkedIn post.
        2. An X (Twitter) post.
        3. A detailed image prompt. The image prompt must be descriptive, suitable for an AI image generator, and should be symbolic, optimistic, and represent the topic in a professional context.

        Return a single, complete JSON object that strictly matches the provided schema.
    `;

    return await generateContentWithSchema(prompt, corePostsSchema);
}

export async function generateImages(
    imagePrompt: string,
    artisticStyle: string,
    colorPalette: string,
    composition: string,
    mood: string,
    aspectRatio: string
): Promise<string[]> {
    console.log("Generating images with prompt:", imagePrompt);

    if (!imagePrompt) {
        throw new Error("An image prompt is required to generate images.");
    }

    let enhancedPrompt = imagePrompt;
    if (artisticStyle !== 'Default') enhancedPrompt += `, in a ${artisticStyle.toLowerCase()} style`;
    if (colorPalette !== 'Default') enhancedPrompt += `, with a ${colorPalette.toLowerCase().replace(' ', '-')} color palette`;
    if (composition !== 'Default') enhancedPrompt += `, with ${composition.toLowerCase()} composition`;
    if (mood !== 'Default') enhancedPrompt += `, evoking a ${mood.toLowerCase()} mood`;

    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: enhancedPrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    
    const base64Images = imageResponse.generatedImages.map(img => img.image.imageBytes);
    return base64Images;
}


export async function generateBlogArticle(topic: string): Promise<BlogArticle> {
    console.log("Generating blog article...");
    const prompt = `You are an expert blogger for professionals in Kenya. Generate a comprehensive, well-structured blog article (minimum 400 words) on the topic: "${topic}". The article must be engaging, provide deep insights, and be formatted with paragraphs and bullet points for readability. End with an open-ended question. Return a single JSON object matching the schema.`;
    const result = await generateContentWithSchema(prompt, blogArticleSchema);
    return result.blogArticle;
}

export async function generateLinkedInPoll(topic: string): Promise<LinkedInPoll> {
    console.log("Generating LinkedIn poll...");
    const prompt = `You are a social media expert. Generate a thought-provoking LinkedIn poll with 3-4 distinct options on the topic: "${topic}". The question should be concise and designed to maximize engagement. Return a single JSON object matching the schema.`;
    const result = await generateContentWithSchema(prompt, linkedinPollSchema);
    return result.linkedinPoll;
}

export async function generateCarousel(topic: string): Promise<CarouselPresentation> {
    console.log("Generating carousel presentation...");
    const prompt = `You are a visual content designer. Outline a 5-slide LinkedIn carousel presentation on the topic: "${topic}". Provide a main title for the presentation and a concise title and body for each of the 5 slides. Each slide should convey a single, impactful point. Return a single JSON object matching the schema.`;
    const result = await generateContentWithSchema(prompt, carouselPresentationSchema);
    return result.carouselPresentation;
}

export async function generateReport(topic: string): Promise<ResearchReport> {
    console.log("Generating research report...");
    const prompt = `You are a research analyst. Generate a brief, professional research report on the topic: "${topic}". The report must include a title and a body that summarizes key findings, including at least 3 distinct statistical facts or data points presented in a bulleted list. The tone must be authoritative. Return a single JSON object matching the schema.`;
    const result = await generateContentWithSchema(prompt, researchReportSchema);
    return result.researchReport;
}

export async function generatePodcastScript(topic: string): Promise<PodcastScript> {
    console.log("Generating podcast script...");
    const prompt = `You are a podcast writer. Generate a fun, engaging, and educational 5-7 minute podcast script (approx. 750-1050 words) on the topic: "${topic}". The script must be a conversation between two speakers, clearly marked with 'Host:' and 'Expert:' before their respective lines. Return a single JSON object matching the schema.`;
    const result = await generateContentWithSchema(prompt, podcastScriptSchema);
    return result.podcastScript;
}

export async function generatePostIdeas(topic: string): Promise<string[]> {
    console.log("Generating post ideas...");
    const prompt = `Generate 4 viral post ideas based on the topic '${topic}' for a professional audience in Kenya. The ideas should be distinct and intriguing. Return as a JSON object with an 'ideas' array.`;
    const result = await generateContentWithSchema(prompt, postIdeasSchema);
    return result.ideas;
}

export async function generateWeeklySchedule(topic: string): Promise<ScheduleItem[]> {
    console.log("Generating weekly schedule...");
    const prompt = `You are a social media strategist for professionals in Kenya. Based on the broad topic '${topic}', create a strategic 7-day content plan. For each day, provide a unique, specific post topic, the best platform (LinkedIn or X), and the optimal posting time. The goal is to build momentum and engagement over the week. Return a JSON array matching the provided schema.`;
    return await generateContentWithSchema(prompt, weeklyScheduleSchema) as ScheduleItem[];
}

export async function generateMeme(topic: string): Promise<{ image: string; caption: string; }> {
    console.log("Generating meme...");
    const prompt = `You are a viral meme expert specializing in professional and tech humor for an audience in Kenya. Based on the topic "${topic}", generate a concept for a funny, relatable, and shareable meme. Provide a detailed prompt for an AI image generator and a witty caption. The tone should be humorous but not unprofessional. Return a JSON object matching the schema.`;

    const memeConcept = await generateContentWithSchema(prompt, memeSchema);

    console.log("Generating meme image with prompt:", memeConcept.imagePrompt);
    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: memeConcept.imagePrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: '1:1', // Memes are often square
            outputMimeType: 'image/jpeg'
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Meme image generation failed, no images returned.");
    }

    return {
        image: imageResponse.generatedImages[0].image.imageBytes,
        caption: memeConcept.caption,
    };
}


// Helper function to decode base64 string to Uint8Array
const decodeBase64 = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Helper to convert raw PCM from Gemini to an AudioBuffer
const pcmToAudioBuffer = (pcmData: Uint8Array, ctx: AudioContext): AudioBuffer => {
    const samples = new Int16Array(pcmData.buffer);
    const frameCount = samples.length;
    const audioBuffer = ctx.createBuffer(1, frameCount, 24000); // Gemini TTS is 24kHz mono
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = samples[i] / 32768.0; // Convert 16-bit signed integer to floating point
    }
    return audioBuffer;
};

export async function generatePodcastAudio(script: string): Promise<Blob> {
    console.log("Generating podcast audio with theme music...");

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = script;
    const plainTextScript = tempDiv.textContent || tempDiv.innerText || "";

    // Step 1: Generate the speech from the script
    const ttsResponse = await ai.models.generateContent({
        model: ttsModel,
        contents: [{ parts: [{ text: plainTextScript }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Host', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                        { speaker: 'Expert', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
                    ]
                }
            }
        }
    });

    const base64Speech = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Speech) {
        throw new Error("Audio generation failed, no speech data returned.");
    }

    console.log("Speech data received. Mixing with theme music...");

    // Step 2: Decode speech and theme music into AudioBuffers
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const speechPcm = decodeBase64(base64Speech);
    const speechBuffer = pcmToAudioBuffer(speechPcm, audioCtx);
    
    const themeResponse = await fetch(themeMusicBase64);
    const themeArrayBuffer = await themeResponse.arrayBuffer();
    const themeBuffer = await audioCtx.decodeAudioData(themeArrayBuffer);

    if (themeBuffer.sampleRate !== 24000) {
        console.warn("Theme music sample rate mismatch. This may cause playback issues.");
        // In a real app, we would resample here. For now, we assume it's 24k.
    }

    // Step 3: Mix the audio using an OfflineAudioContext
    const totalDuration = themeBuffer.duration + speechBuffer.duration + themeBuffer.duration;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(totalDuration * 24000), 24000);

    const introSource = offlineCtx.createBufferSource();
    introSource.buffer = themeBuffer;
    introSource.connect(offlineCtx.destination);

    const speechSource = offlineCtx.createBufferSource();
    speechSource.buffer = speechBuffer;
    speechSource.connect(offlineCtx.destination);
    
    const outroSource = offlineCtx.createBufferSource();
    outroSource.buffer = themeBuffer;
    outroSource.connect(offlineCtx.destination);
    
    introSource.start(0);
    speechSource.start(themeBuffer.duration);
    outroSource.start(themeBuffer.duration + speechBuffer.duration);

    const finalBuffer = await offlineCtx.startRendering();

    // Step 4: Encode the final mixed audio to MP3 using lamejs
    console.log("Mixing complete. Encoding to MP3...");
    const pcmFloat32 = finalBuffer.getChannelData(0);
    // lamejs expects 16-bit signed integers
    const pcmInt16 = new Int16Array(pcmFloat32.length);
    for (let i = 0; i < pcmFloat32.length; i++) {
        pcmInt16[i] = pcmFloat32[i] * 32767;
    }

    const mp3Encoder = new lamejs.Mp3Encoder(1, 24000, 128); // 1 channel, 24000 sample rate, 128 kbps
    const mp3Data = [];
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcmInt16.length; i += sampleBlockSize) {
        const sampleChunk = pcmInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    const mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    
    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
    console.log("MP3 encoding complete.");
    return mp3Blob;
}