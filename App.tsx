
import React, { useState } from 'react';
import {
    generateSocialPosts,
    generatePostIdeas,
    generateWeeklySchedule,
} from './services/geminiService';
import { GeneratedPosts, ScheduleItem } from './types';
import {
    SparklesIcon,
    LinkedInIcon,
    XIcon,
    CalendarIcon,
    LightbulbIcon,
    ImagePlaceholderIcon,
    LoadingSpinner,
    CopyIcon,
    CheckIcon,
    ResetIcon,
} from './components/icons';
import Chatbot from './components/Chatbot';

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors absolute top-2 right-2"
            aria-label="Copy to clipboard"
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
    );
};

const App: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [generatedContent, setGeneratedContent] = useState<{
        posts: GeneratedPosts;
        image: string;
    } | null>(null);
    const [ideas, setIdeas] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

    const hasResults = generatedContent || ideas.length > 0 || schedule.length > 0;

    const handleGenerateAll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) {
            setError('Please enter a topic to generate content.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedContent(null);
        setIdeas([]);
        setSchedule([]);

        try {
            const [postsResult, ideasResult, scheduleResult] = await Promise.all([
                generateSocialPosts(topic),
                generatePostIdeas(topic),
                generateWeeklySchedule(topic),
            ]);
            setGeneratedContent(postsResult);
            setIdeas(ideasResult);
            setSchedule(scheduleResult);
        } catch (err) {
            console.error("Generation failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGeneratePostsOnly = async (selectedTopic: string) => {
        if (!selectedTopic.trim() || isLoading) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });

        setIsLoading(true);
        setError(null);
        setGeneratedContent(null);
        setTopic(selectedTopic);

        try {
            const postsResult = await generateSocialPosts(selectedTopic);
            setGeneratedContent(postsResult);
        } catch (err) {
            console.error("Generation failed for selected topic:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setTopic('');
        setIsLoading(false);
        setError(null);
        setGeneratedContent(null);
        setIdeas([]);
        setSchedule([]);
    };


    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <main className="container mx-auto px-4 py-8 md:py-16">
                <header className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-2 bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
                        Viral Post Generator AI
                    </h1>
                    <p className="text-lg text-slate-400">
                        Craft compelling social media content, generate ideas, and plan your week with AI.
                    </p>
                </header>

                <form onSubmit={handleGenerateAll} className="max-w-2xl mx-auto mb-12">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="Enter your content topic... (e.g., 'The future of AI in Africa')"
                            className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md flex items-center justify-center transition-colors"
                            disabled={isLoading || !topic.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <LoadingSpinner />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon />
                                    <span className="ml-2">Generate Content</span>
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-300 hover:text-white p-3 rounded-md flex items-center justify-center transition-colors"
                            disabled={isLoading || (!hasResults && !topic.trim())}
                            aria-label="Reset form and results"
                        >
                            <ResetIcon />
                        </button>
                    </div>
                    {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
                </form>

                {isLoading && !hasResults && (
                    <div className="text-center text-slate-400">
                        <p>AI is warming up... Please wait a moment.</p>
                    </div>
                )}
                
                {hasResults && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        {/* Generated Posts Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {generatedContent && (
                                <>
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <h2 className="text-2xl font-bold mb-4 flex items-center"><LinkedInIcon/><span className="ml-2">LinkedIn Post</span></h2>
                                        <CopyButton text={`Title: ${generatedContent.posts.linkedinPost.title}\n\n${generatedContent.posts.linkedinPost.body}\n\nHashtags: ${generatedContent.posts.linkedinPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                        <h3 className="font-semibold text-lg text-blue-400">{generatedContent.posts.linkedinPost.title}</h3>
                                        <p className="text-slate-300 my-4 whitespace-pre-wrap">{generatedContent.posts.linkedinPost.body}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {generatedContent.posts.linkedinPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                            <h2 className="text-2xl font-bold mb-4 flex items-center"><XIcon/><span className="ml-2">X Post</span></h2>
                                            <CopyButton text={`${generatedContent.posts.xPost.body}\n\n${generatedContent.posts.xPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                            <p className="text-slate-300 mb-4 whitespace-pre-wrap">{generatedContent.posts.xPost.body}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {generatedContent.posts.xPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col justify-center items-center">
                                            <h2 className="text-xl font-bold mb-4 text-center">Generated Image</h2>
                                            {generatedContent.image ? (
                                                <img src={`data:image/jpeg;base64,${generatedContent.image}`} alt={generatedContent.posts.imagePrompt} className="rounded-lg object-cover w-full h-full" />
                                            ) : <ImagePlaceholderIcon />}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {/* Ideas and Schedule Column */}
                        <div className="space-y-8">
                            {ideas.length > 0 && (
                                 <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center"><LightbulbIcon/><span className="ml-2">Post Ideas</span></h2>
                                    <ul className="space-y-2 text-slate-300">
                                        {ideas.map((idea, i) => (
                                            <li key={i}>
                                                <button
                                                    onClick={() => handleGeneratePostsOnly(idea)}
                                                    disabled={isLoading}
                                                    className="w-full text-left p-2 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-start disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span className="text-blue-400 mr-2 mt-1">&#8227;</span>
                                                    <span>{idea}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            {schedule.length > 0 && (
                                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                    <h2 className="text-2xl font-bold mb-4 flex items-center"><CalendarIcon/><span className="ml-2">Weekly Schedule</span></h2>
                                    <div className="space-y-4">
                                        {schedule.map((item, i) => (
                                             <div 
                                                key={i} 
                                                onClick={() => !isLoading && handleGeneratePostsOnly(item.topic)}
                                                className={`p-3 bg-slate-700/50 rounded-lg transition-all duration-300 ease-in-out ${isLoading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-700 hover:shadow-md'}`}
                                                role="button"
                                                tabIndex={isLoading ? -1 : 0}
                                                onKeyDown={(e) => { if (!isLoading && (e.key === 'Enter' || e.key === ' ')) handleGeneratePostsOnly(item.topic); }}
                                                aria-label={`Generate post for topic: ${item.topic}`}
                                                aria-disabled={isLoading}
                                            >
                                                <div className="font-bold text-md flex justify-between items-center">
                                                    <span>{item.day} - {item.time}</span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.platform === 'LinkedIn' ? 'bg-blue-200 text-blue-800' : 'bg-slate-600 text-slate-100'}`}>
                                                        {item.platform === 'LinkedIn' ? <LinkedInIcon/> : <XIcon/>}
                                                        <span className="ml-1.5">{item.platform}</span>
                                                    </span>
                                                </div>
                                                <p className="text-slate-300 mt-1">{item.topic}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <Chatbot />
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(1rem); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default App;
