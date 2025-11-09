
import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedPosts, ScheduleItem } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-pro';
const imageModel = 'imagen-4.0-generate-001';

const socialPostsSchema = {
    type: Type.OBJECT,
    properties: {
        linkedinPost: {
            type: Type.OBJECT,
            description: "Content optimized for a LinkedIn article.",
            properties: {
                title: { type: Type.STRING, description: "A catchy, viral-optimized title for the LinkedIn article." },
                body: { type: Type.STRING, description: "The main content of the article, formatted with paragraphs separated by newline characters (\\n). It should be insightful and provide value." },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3 to 5 relevant hashtags for LinkedIn, without the '#' symbol." },
            },
            required: ["title", "body", "hashtags"],
        },
        xPost: {
            type: Type.OBJECT,
            description: "Content optimized for an X (formerly Twitter) post.",
            properties: {
                body: { type: Type.STRING, description: "The content of the post for X. Must be concise, engaging, and under 280 characters." },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 2 to 3 relevant hashtags for X, without the '#' symbol." },
            },
            required: ["body", "hashtags"],
        },
        imagePrompt: { type: Type.STRING, description: "A detailed, descriptive prompt for an AI image generator to create a visually appealing and relevant image for this post. The image should be symbolic, optimistic, and represent the topic in a professional context." },
    },
    required: ["linkedinPost", "xPost", "imagePrompt"],
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

export async function generateSocialPosts(topic: string): Promise<{ posts: GeneratedPosts; image: string; }> {
    console.log("Generating post content for LinkedIn and X...");
    const prompt = `Generate content for a LinkedIn article and an X (Twitter) post about "${topic}". The content must be optimized for each platform's best practices (e.g., character limits for X, professional tone for LinkedIn). The target audience is professionals in Kenya. Return a single JSON object matching the provided schema, including a shared, symbolic image prompt.`;
    const postData: GeneratedPosts = await generateContentWithSchema(prompt, socialPostsSchema);

    console.log("Generating post image with prompt:", postData.imagePrompt);
    const imageResponse = await ai.models.generateImages({
        model: imageModel,
        prompt: postData.imagePrompt,
        config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            outputMimeType: 'image/jpeg'
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("Image generation failed, no images returned.");
    }
    const base64Image = imageResponse.generatedImages[0].image.imageBytes;

    return { posts: postData, image: base64Image };
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
