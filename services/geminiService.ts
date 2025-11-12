import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { GeneratedPosts, ScheduleItem } from '../types';

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

const socialPostsSchema = {
    type: Type.OBJECT,
    properties: {
        linkedinPost: {
            type: Type.OBJECT,
            description: "Content optimized for a LinkedIn article.",
            properties: {
                title: { type: Type.STRING, description: "A catchy, viral-optimized title for the LinkedIn article." },
                body: { type: Type.STRING, description: "The main content of the article, formatted with paragraphs separated by newline characters (\\n). It should be insightful, provide value, and include an engaging question for the reader." },
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
                body: { type: Type.STRING, description: "The full body of the blog article, at least 400 words, formatted with paragraphs separated by newline characters (\\n). It should be comprehensive, well-structured, and provide deep insights, ending with an open-ended question." },
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
                body: { type: Type.STRING, description: "A summary of research on the topic, formatted with paragraphs separated by newline characters (\\n). It must include at least 3 distinct statistical facts or data points from reliable (though not necessarily cited) sources. The tone should be authoritative and informative." },
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
    required: ["linkedinPost", "xPost", "imagePrompt", "blogArticle", "linkedinPoll", "carouselPresentation", "researchReport", "podcastScript"],
};

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

export async function generateSocialPosts(
    topic: string,
    artisticStyle: string,
    colorPalette: string,
    aspectRatio: string
): Promise<{ posts: GeneratedPosts; images: string[]; }> {
    console.log("Generating a full suite of content...");

    let imagePromptInstructions = "The image prompt must be detailed and descriptive, suitable for an AI image generator, and should be symbolic, optimistic, and represent the topic in a professional context.";
    if (artisticStyle !== 'Default') {
        imagePromptInstructions += ` The artistic style should be ${artisticStyle}.`;
    }
    if (colorPalette !== 'Default') {
        imagePromptInstructions += ` The color palette should be ${colorPalette}.`;
    }

    const prompt = `
        You are a world-class content strategist for professionals in Kenya.
        Generate a comprehensive content package about the topic: "${topic}".
        The content must be optimized for each platform's best practices and written in a concise, precise, and engaging style.
        All text-based content (posts, articles, reports) should include engaging questions to indulge the readers.

        You must generate ALL of the following content types:
        1.  A LinkedIn article and an X (Twitter) post.
        2.  A detailed image prompt based on the topic. ${imagePromptInstructions}.
        3.  A well-structured blog article (minimum 400 words).
        4.  A thought-provoking LinkedIn poll with 3-4 options.
        5.  A 5-slide LinkedIn carousel presentation outline, with a title and body for each slide.
        6.  A brief research report that includes at least 3 distinct statistical facts or data points.
        7.  A 5-7 minute podcast script (750-1050 words) that is fun, engaging, and educational. It must be a conversation between two speakers, clearly marked with 'Host:' and 'Expert:' at the beginning of their respective lines.

        Return a single, complete JSON object that strictly matches the provided schema.
    `;


    const postData: GeneratedPosts = await generateContentWithSchema(prompt, socialPostsSchema);

    console.log("Generating post image with prompt:", postData.imagePrompt);
    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: postData.imagePrompt,
        config: {
            numberOfImages: 3,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64Images = imageResponse.generatedImages.map(img => img.image.imageBytes);

    return { posts: postData, images: base64Images };
}

export async function regenerateImages(imagePrompt: string, aspectRatio: string): Promise<string[]> {
    console.log("Regenerating post images with prompt:", imagePrompt);
    
    if (!imagePrompt) {
        throw new Error("An image prompt is required to regenerate images.");
    }

    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: imagePrompt,
        config: {
            numberOfImages: 3,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image regeneration failed, no images returned.");
    }
    
    const base64Images = imageResponse.generatedImages.map(img => img.image.imageBytes);
    return base64Images;
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