import React, { useState, useEffect, useMemo } from 'react';
import {
    generateCorePostsAndImage,
    generatePostIdeas,
    generateWeeklySchedule,
    regenerateImages,
    generatePodcastAudio,
    generateMeme,
    generateBlogArticle,
    generateLinkedInPoll,
    generateCarousel,
    generateReport,
    generatePodcastScript,
} from './services/geminiService';
import { GeneratedPosts, ScheduleItem, SavedContent, ScheduledPost, LinkedInPoll, CarouselPresentation, PodcastScript } from './types';
import {
    SparklesIcon, LinkedInIcon, XIcon, CalendarIcon, LightbulbIcon, ImagePlaceholderIcon, LoadingSpinner,
    CopyIcon, CheckIcon, ResetIcon, RegenerateIcon, EditIcon, SaveIcon, BookOpenIcon, ClockIcon,
    DocumentTextIcon, ChartBarIcon, CollectionIcon, PlusCircleIcon, TrashIcon, MicrophoneIcon, DownloadIcon, MemeIcon,
} from './components/icons';
import Chatbot from './components/Chatbot';
import Modal from './components/Modal';
import RichTextEditor from './components/RichTextEditor';
import SavedPostsModal from './components/SavedPostsModal';
import ScheduledPostsModal from './components/ScheduledPostsModal';

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

const CopyImageButton: React.FC<{ base64Data: string }> = ({ base64Data }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        if (!base64Data) return;
        try {
            const blob = await (await fetch(`data:image/jpeg;base64,${base64Data}`)).blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy image: ', err);
            alert('Failed to copy image. Your browser might not support this feature.');
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors absolute top-2 right-2"
            aria-label="Copy image to clipboard"
        >
            {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
    );
};


type EditContentType = 'linkedin' | 'x' | 'blog' | 'report' | 'poll' | 'carousel' | 'podcast';

interface EditingState {
    type: EditContentType;
    content: any; // This will hold the specific content object being edited
}

const App: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [activeTopic, setActiveTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [generatedContent, setGeneratedContent] = useState<{
        posts: GeneratedPosts;
        images: string[];
    } | null>(null);
    const [ideas, setIdeas] = useState<string[]>([]);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
    const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
    const [isGeneratingMeme, setIsGeneratingMeme] = useState(false);
    const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
    const [isGeneratingPoll, setIsGeneratingPoll] = useState(false);
    const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);


    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');
    const [carouselSlideIndex, setCarouselSlideIndex] = useState(0);

    const [artisticStyle, setArtisticStyle] = useState('Default');
    const [colorPalette, setColorPalette] = useState('Default');
    const [composition, setComposition] = useState('Default');
    const [mood, setMood] = useState('Default');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    
    const [meme, setMeme] = useState<{ image: string; caption: string; } | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<EditingState | null>(null);

    const [savedPosts, setSavedPosts] = useState<SavedContent[]>([]);
    const [isSavedPostsModalOpen, setIsSavedPostsModalOpen] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [isScheduledPostsModalOpen, setIsScheduledPostsModalOpen] = useState(false);
    const [schedulingPost, setSchedulingPost] = useState<'linkedin' | 'x' | null>(null);
    const [scheduleDateTime, setScheduleDateTime] = useState('');
    const [scheduleSuccess, setScheduleSuccess] = useState(false);

    // Podcast State
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);


    useEffect(() => {
        try {
            const storedPosts = localStorage.getItem('viralPostGeneratorSaved');
            if (storedPosts) setSavedPosts(JSON.parse(storedPosts));
            
            const storedSchedule = localStorage.getItem('viralPostGeneratorScheduled');
            if(storedSchedule) setScheduledPosts(JSON.parse(storedSchedule));

        } catch (error) {
            console.error("Failed to load data from local storage", error);
        }
        
        // Cleanup object URLs on unmount
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, []);

    const hasResults = generatedContent || ideas.length > 0 || schedule.length > 0;

    const formatPostContent = (posts: GeneratedPosts) => {
        const convertToHtml = (text: string | undefined) => {
            if (!text) return '';
            const lines = text.split('\n');
            let html = '';
            let inList = false;
    
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    if (!inList) {
                        html += '<ul>';
                        inList = true;
                    }
                    html += `<li>${trimmedLine.substring(2)}</li>`;
                } else {
                    if (inList) {
                        html += '</ul>';
                        inList = false;
                    }
                    if (trimmedLine) {
                        html += `<p>${trimmedLine}</p>`;
                    }
                }
            }
    
            if (inList) {
                html += '</ul>';
            }
            
            return html;
        };

        return {
            ...posts,
            linkedinPost: { ...posts.linkedinPost, body: convertToHtml(posts.linkedinPost.body) },
            xPost: { ...posts.xPost, body: convertToHtml(posts.xPost.body) },
            ...(posts.blogArticle && { blogArticle: { ...posts.blogArticle, body: convertToHtml(posts.blogArticle.body) } }),
            ...(posts.researchReport && { researchReport: { ...posts.researchReport, body: convertToHtml(posts.researchReport.body) } }),
            ...(posts.podcastScript && { podcastScript: { ...posts.podcastScript, script: convertToHtml(posts.podcastScript.script) } }),
        };
    };

    const handleGeneratePrimaryContent = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentTopic = topic.trim();
        if (!currentTopic) {
            setError('Please enter a topic to generate content.');
            return;
        }
        handleReset();
        setIsLoading(true);
        setActiveTopic(currentTopic);
        try {
            const postsResult = await generateCorePostsAndImage(currentTopic, artisticStyle, colorPalette, composition, mood, aspectRatio);
            setGeneratedContent({ 
                posts: formatPostContent(postsResult.posts),
                images: postsResult.images
            });
        } catch (err) {
            console.error("Generation failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGenerateIdeas = async () => {
        if (!activeTopic || isGeneratingIdeas) return;
        setIsGeneratingIdeas(true);
        setError(null);
        try {
            const ideasResult = await generatePostIdeas(activeTopic);
            setIdeas(ideasResult);
        } catch (err) {
            console.error("Failed to generate ideas:", err);
            setError(err instanceof Error ? err.message : 'Failed to generate ideas.');
        } finally {
            setIsGeneratingIdeas(false);
        }
    };

    const handleGenerateSchedule = async () => {
        if (!activeTopic || isGeneratingSchedule) return;
        setIsGeneratingSchedule(true);
        setError(null);
        try {
            const scheduleResult = await generateWeeklySchedule(activeTopic);
            setSchedule(scheduleResult);
        } catch (err) {
            console.error("Failed to generate schedule:", err);
            setError(err instanceof Error ? err.message : 'Failed to generate schedule.');
        } finally {
            setIsGeneratingSchedule(false);
        }
    };
    
    const handleGenerateMeme = async () => {
        if (!activeTopic || isGeneratingMeme) return;
        setIsGeneratingMeme(true);
        setError(null);
        try {
            const memeResult = await generateMeme(activeTopic);
            setMeme(memeResult);
        } catch (err) {
            console.error("Failed to generate meme:", err);
            setError(err instanceof Error ? err.message : 'Failed to generate meme.');
        } finally {
            setIsGeneratingMeme(false);
        }
    };
    
    const createContentGenerator = <T,>(
        generatorFn: (topic: string) => Promise<T>,
        setLoading: (loading: boolean) => void,
        contentKey: keyof GeneratedPosts
    ) => async () => {
        if (!activeTopic) return;
        setLoading(true);
        setError(null);
        try {
            const result = await generatorFn(activeTopic);
            setGeneratedContent(prev => {
                if (!prev) return null;
                const updatedPosts = {
                    ...prev.posts,
                    [contentKey]: result,
                };
                return {
                    ...prev,
                    posts: formatPostContent(updatedPosts),
                };
            });
        } catch (err) {
            console.error(`Failed to generate ${contentKey}:`, err);
            setError(err instanceof Error ? err.message : `Failed to generate ${contentKey}.`);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBlog = createContentGenerator(generateBlogArticle, setIsGeneratingBlog, 'blogArticle');
    const handleGeneratePoll = createContentGenerator(generateLinkedInPoll, setIsGeneratingPoll, 'linkedinPoll');
    const handleGenerateCarousel = createContentGenerator(generateCarousel, setIsGeneratingCarousel, 'carouselPresentation');
    const handleGenerateReport = createContentGenerator(generateReport, setIsGeneratingReport, 'researchReport');
    const handleGeneratePodcast = createContentGenerator(generatePodcastScript, setIsGeneratingPodcast, 'podcastScript');

    const handleGeneratePostsOnly = async (selectedTopic: string) => {
        if (!selectedTopic.trim() || isLoading) return;

        window.scrollTo({ top: 0, behavior: 'smooth' });
        handleReset();
        setIsLoading(true);
        setTopic(selectedTopic);
        setActiveTopic(selectedTopic);

        try {
            const postsResult = await generateCorePostsAndImage(selectedTopic, artisticStyle, colorPalette, composition, mood, aspectRatio);
             setGeneratedContent({ 
                posts: formatPostContent(postsResult.posts),
                images: postsResult.images
            });
        } catch (err) {
            console.error("Generation failed for selected topic:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during content generation.');
        } finally {
            setIsLoading(false);
        }
    };

    const constructEnhancedPrompt = (basePrompt: string) => {
        let enhancedPrompt = basePrompt;
        if (artisticStyle !== 'Default') {
            enhancedPrompt += `, in a ${artisticStyle.toLowerCase()} style`;
        }
        if (colorPalette !== 'Default') {
            enhancedPrompt += `, with a ${colorPalette.toLowerCase().replace(' ', '-')} color palette`;
        }
        if (composition !== 'Default') {
            enhancedPrompt += `, with ${composition.toLowerCase()} composition`;
        }
        if (mood !== 'Default') {
            enhancedPrompt += `, evoking a ${mood.toLowerCase()} mood`;
        }
        return enhancedPrompt;
    };
    
    const handleRegenerateImages = async () => {
        if (!generatedContent || isRegeneratingImage) return;

        setIsRegeneratingImage(true);
        setError(null);
        try {
            const finalPrompt = constructEnhancedPrompt(generatedContent.posts.imagePrompt);
            const newImages = await regenerateImages(finalPrompt, aspectRatio);
            setGeneratedContent(prev => prev ? { ...prev, images: newImages } : null);
            setSelectedImageIndex(0);
        } catch (err) {
            console.error("Image regeneration failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during image regeneration.');
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleUpdatePromptAndRegenerate = async () => {
        if (!generatedContent || isRegeneratingImage || !editedPrompt.trim()) {
            if (!editedPrompt.trim()) setError("Prompt cannot be empty.");
            return;
        }

        setIsRegeneratingImage(true);
        setError(null);
        try {
            const finalPrompt = constructEnhancedPrompt(editedPrompt);
            const newImages = await regenerateImages(finalPrompt, aspectRatio);
            setGeneratedContent(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    images: newImages,
                    posts: {
                        ...prev.posts,
                        imagePrompt: editedPrompt,
                    }
                };
            });
            setSelectedImageIndex(0);
            setIsEditingPrompt(false);
        } catch (err)
 {
            console.error("Image regeneration with new prompt failed:", err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred during image regeneration.');
        } finally {
            setIsRegeneratingImage(false);
        }
    };

    const handleReset = () => {
        setTopic('');
        setActiveTopic('');
        setIsLoading(false);
        setError(null);
        setGeneratedContent(null);
        setSelectedImageIndex(0);
        setIdeas([]);
        setSchedule([]);
        setMeme(null);
        setIsEditingPrompt(false);
        setEditedPrompt('');
        setSchedulingPost(null);
        setCarouselSlideIndex(0);
        setIsGeneratingIdeas(false);
        setIsGeneratingSchedule(false);
        setIsGeneratingMeme(false);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setAudioError(null);
        setIsGeneratingAudio(false);
    };

    const handleOpenEditModal = (type: EditContentType) => {
        if (!generatedContent) return;
        let contentToEdit;
        switch(type) {
            case 'linkedin': contentToEdit = generatedContent.posts.linkedinPost; break;
            case 'x': contentToEdit = generatedContent.posts.xPost; break;
            case 'blog': contentToEdit = generatedContent.posts.blogArticle; break;
            case 'report': contentToEdit = generatedContent.posts.researchReport; break;
            case 'poll': contentToEdit = generatedContent.posts.linkedinPoll; break;
            case 'carousel': contentToEdit = generatedContent.posts.carouselPresentation; break;
            case 'podcast': contentToEdit = generatedContent.posts.podcastScript; break;
            default: return;
        }
        setEditingPost({ type, content: JSON.parse(JSON.stringify(contentToEdit)) }); // Deep copy
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingPost(null);
    };

    const handleSaveEdit = () => {
        if (!editingPost || !generatedContent) return;
        
        setGeneratedContent(prev => {
            if (!prev) return null;
            const newPosts = { ...prev.posts };
            switch(editingPost.type) {
                case 'linkedin': newPosts.linkedinPost = editingPost.content; break;
                case 'x': newPosts.xPost = editingPost.content; break;
                case 'blog': newPosts.blogArticle = editingPost.content; break;
                case 'report': newPosts.researchReport = editingPost.content; break;
                case 'poll': newPosts.linkedinPoll = editingPost.content; break;
                case 'carousel': newPosts.carouselPresentation = editingPost.content; break;
                case 'podcast': 
                    newPosts.podcastScript = editingPost.content;
                    // If script is edited, invalidate the old audio
                    if (audioUrl) URL.revokeObjectURL(audioUrl);
                    setAudioUrl(null);
                    setAudioError(null);
                    break;
            }
            return { ...prev, posts: newPosts };
        });

        handleCloseEditModal();
    };

    const handleSaveCurrentContent = () => {
        if (!generatedContent) return;

        const newSave: SavedContent = {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            topic: activeTopic,
            posts: generatedContent.posts,
        };

        const updatedSavedPosts = [newSave, ...savedPosts];
        setSavedPosts(updatedSavedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedSavedPosts));

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const handleDeletePost = (idToDelete: string) => {
        const updatedSavedPosts = savedPosts.filter(p => p.id !== idToDelete);
        setSavedPosts(updatedSavedPosts);
        localStorage.setItem('viralPostGeneratorSaved', JSON.stringify(updatedSavedPosts));
    };

    const handleLoadPost = (contentToLoad: SavedContent) => {
        handleReset();
        setTopic(contentToLoad.topic);
        setActiveTopic(contentToLoad.topic);
        setGeneratedContent({
            posts: formatPostContent(contentToLoad.posts),
            images: [], // Images are not saved, require regeneration
        });
        setIsSavedPostsModalOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const convertHtmlToPlainTextForCopy = (html: string) => {
        const tempDiv = document.createElement('div');
        const htmlWithBreaks = html.replace(/<\/p>/g, '</p>\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/li>/g, '</li>\n');
        tempDiv.innerHTML = htmlWithBreaks;
        // A simple way to format lists for plain text
        tempDiv.querySelectorAll('li').forEach(li => {
            li.textContent = `* ${li.textContent}`;
        });
        return tempDiv.innerText.trim();
    };

    const handleScheduleClick = (platform: 'linkedin' | 'x') => {
        if (schedulingPost === platform) {
            setSchedulingPost(null); // Toggle off if already open
        } else {
            setSchedulingPost(platform);
            const now = new Date();
            now.setHours(now.getHours() + 1);
            now.setMinutes(0);
            now.setSeconds(0);
            const isoString = now.toISOString().slice(0, 16);
            setScheduleDateTime(isoString);
        }
    };

    const handleConfirmSchedule = () => {
        if (!schedulingPost || !generatedContent || !scheduleDateTime) return;
        
        const contentToSchedule = schedulingPost === 'linkedin'
            ? generatedContent.posts.linkedinPost
            : generatedContent.posts.xPost;

        const newScheduledPost: ScheduledPost = {
            id: crypto.randomUUID(),
            platform: schedulingPost === 'linkedin' ? 'LinkedIn' : 'X',
            scheduledAt: new Date(scheduleDateTime).toISOString(),
            content: contentToSchedule,
            topic: activeTopic,
        };

        const updatedSchedule = [...scheduledPosts, newScheduledPost].sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));
        
        setSchedulingPost(null);
        setScheduleDateTime('');
        setScheduleSuccess(true);
        setTimeout(() => setScheduleSuccess(false), 3000);
    };
    
    const handleUnschedule = (id: string) => {
        const updatedSchedule = scheduledPosts.filter(p => p.id !== id);
        setScheduledPosts(updatedSchedule);
        localStorage.setItem('viralPostGeneratorScheduled', JSON.stringify(updatedSchedule));
    };

    const handleGenerateAudio = async () => {
        if (!generatedContent?.posts.podcastScript || isGeneratingAudio) return;
        
        setIsGeneratingAudio(true);
        setAudioError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const audioBlob = await generatePodcastAudio(generatedContent.posts.podcastScript.script);
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
        } catch (err) {
            console.error("Audio generation failed:", err);
            setAudioError(err instanceof Error ? err.message : 'An unexpected error occurred during audio generation.');
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const scheduledLinkedInPost = useMemo(() => {
        if(!generatedContent) return null;
        return scheduledPosts.find(p => 
            p.platform === 'LinkedIn' && 
            p.topic === activeTopic &&
            (p.content as any).title === generatedContent.posts.linkedinPost.title
        ) || null;
    }, [scheduledPosts, generatedContent, activeTopic]);

    const scheduledXPost = useMemo(() => {
        if(!generatedContent) return null;
        return scheduledPosts.find(p => 
            p.platform === 'X' &&
            p.topic === activeTopic &&
            p.content.body === generatedContent.posts.xPost.body
        ) || null;
    }, [scheduledPosts, generatedContent, activeTopic]);

    const getModalTitle = () => {
        if (!editingPost) return '';
        switch (editingPost.type) {
            case 'linkedin': return 'Edit LinkedIn Post';
            case 'x': return 'Edit X Post';
            case 'blog': return 'Edit Blog Article';
            case 'report': return 'Edit Research Report';
            case 'poll': return 'Edit LinkedIn Poll';
            case 'carousel': return 'Edit Carousel Presentation';
            case 'podcast': return 'Edit Podcast Script';
            default: return 'Edit Content';
        }
    };

    const renderEditModalContent = () => {
        if (!editingPost) return null;

        const { type, content } = editingPost;

        const updateContent = (newContent: any) => {
            setEditingPost(prev => prev ? { ...prev, content: newContent } : null);
        };
        
        const updateField = (field: string, value: any) => {
            updateContent({ ...content, [field]: value });
        };

        switch (type) {
            case 'linkedin':
            case 'blog':
            case 'report':
            case 'podcast':
                const bodyLabel = type === 'podcast' ? 'Script' : 'Body';
                const bodyContent = type === 'podcast' ? content.script : content.body;
                return (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="post-title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                            <input
                                id="post-title" type="text" value={content.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">{bodyLabel}</label>
                            <RichTextEditor
                                initialContent={bodyContent}
                                onContentChange={(html) => updateField(type === 'podcast' ? 'script' : 'body', html)}
                            />
                        </div>
                    </div>
                );
            case 'x':
                 return (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Body</label>
                        <RichTextEditor
                            initialContent={content.body}
                            onContentChange={(html) => updateField('body', html)}
                        />
                    </div>
                );
            case 'poll':
                const poll = content as LinkedInPoll;
                const handleOptionChange = (index: number, value: string) => {
                    const newOptions = [...poll.options];
                    newOptions[index] = value;
                    updateField('options', newOptions);
                };
                const addOption = () => updateField('options', [...poll.options, '']);
                const removeOption = (index: number) => updateField('options', poll.options.filter((_, i) => i !== index));

                return (
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="poll-question" className="block text-sm font-medium text-slate-300 mb-1">Question</label>
                            <input
                                id="poll-question" type="text" value={poll.question}
                                onChange={(e) => updateField('question', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Options</label>
                            <div className="space-y-2">
                            {poll.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="text" value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                    />
                                    <button onClick={() => removeOption(index)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/50 rounded-full"><TrashIcon /></button>
                                </div>
                            ))}
                            </div>
                             <button onClick={addOption} className="mt-3 flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"><PlusCircleIcon/> Add Option</button>
                        </div>
                    </div>
                );
            case 'carousel':
                const carousel = content as CarouselPresentation;
                const handleSlideChange = (index: number, field: 'title' | 'body', value: string) => {
                    const newSlides = [...carousel.slides];
                    newSlides[index] = { ...newSlides[index], [field]: value };
                    updateField('slides', newSlides);
                };
                return (
                     <div className="space-y-6">
                         <div>
                            <label htmlFor="carousel-title" className="block text-sm font-medium text-slate-300 mb-1">Main Title</label>
                            <input
                                id="carousel-title" type="text" value={carousel.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <div className="space-y-4">
                            {carousel.slides.map((slide, index) => (
                                <div key={index} className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
                                    <label className="block text-sm font-bold text-slate-300 mb-2">Slide {index + 1}</label>
                                    <div className="space-y-2">
                                         <input
                                            type="text" placeholder="Slide Title" value={slide.title}
                                            onChange={(e) => handleSlideChange(index, 'title', e.target.value)}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                        <textarea
                                            placeholder="Slide Body" value={slide.body}
                                            onChange={(e) => handleSlideChange(index, 'body', e.target.value)}
                                            rows={3}
                                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            default: return null;
        }
    };


    return (
        <div className="bg-slate-900 text-white min-h-screen font-sans">
            <main className="container mx-auto px-4 py-8 md:py-16">
                <header className="text-center mb-12">
                     <div className="flex justify-center items-center gap-4 mb-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
                            Viral Post Generator AI
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsScheduledPostsModalOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-colors relative"
                                aria-label="View scheduled posts"
                            >
                                <ClockIcon />
                                <span>Scheduled</span>
                                {scheduledPosts.length > 0 && <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{scheduledPosts.length}</span>}
                            </button>
                            <button
                                onClick={() => setIsSavedPostsModalOpen(true)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-colors relative"
                                aria-label="View saved posts"
                            >
                                <BookOpenIcon />
                                <span>Saved</span>
                                {savedPosts.length > 0 && <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{savedPosts.length}</span>}
                            </button>
                        </div>
                    </div>
                    <p className="text-lg text-slate-400">
                        Craft compelling social media content, generate ideas, and plan your week with AI.
                    </p>
                </header>

                <form onSubmit={handleGeneratePrimaryContent} className="max-w-3xl mx-auto mb-12">
                    <div className="flex flex-col sm:flex-row gap-3">
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
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors"
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
                                    <span className="ml-2 whitespace-nowrap">Generate Content</span>
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

                {isLoading && !generatedContent && (
                    <div className="text-center text-slate-400">
                        <p>AI is warming up... Please wait a moment.</p>
                    </div>
                )}
                
                {generatedContent && (
                    <div className="text-center mb-8">
                        <button
                            onClick={handleSaveCurrentContent}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-5 rounded-full flex items-center gap-2 transition-colors mx-auto"
                        >
                            <SaveIcon />
                            Save This Result
                        </button>
                    </div>
                 )}
                
                {(generatedContent || isLoading) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                        {/* Generated Posts Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {generatedContent && (
                                <>
                                    {/* Podcast */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><MicrophoneIcon/><span className="ml-2">Podcast Episode</span></h2>
                                            {generatedContent.posts.podcastScript && <button onClick={() => handleOpenEditModal('podcast')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit Script</button>}
                                        </div>
                                        {isGeneratingPodcast ? (
                                            <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg h-60"> <LoadingSpinner /> <span>Writing your podcast script...</span> </div>
                                        ) : generatedContent.posts.podcastScript ? (
                                            <>
                                                <CopyButton text={`Podcast Title: ${generatedContent.posts.podcastScript.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.podcastScript.script)}`} />
                                                <h3 className="font-semibold text-xl text-purple-400">{generatedContent.posts.podcastScript.title}</h3>
                                                
                                                <div className="my-4">
                                                    {audioError && <p className="text-red-400 text-sm mb-2">{audioError}</p>}
                                                    {isGeneratingAudio ? (
                                                        <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg"> <LoadingSpinner /> <span>Generating audio... This may take a moment.</span> </div>
                                                    ) : audioUrl ? (
                                                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-700/50 p-3 rounded-lg">
                                                            <audio controls src={audioUrl} className="w-full sm:w-auto sm:flex-grow">Your browser does not support the audio element.</audio>
                                                            <a href={audioUrl} download={`${generatedContent.posts.podcastScript.title.replace(/ /g, '_')}.mp3`} className="flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                                                <DownloadIcon/> Download MP3
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md transition-colors">
                                                            <MicrophoneIcon/> Generate Audio
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-slate-300 my-4 prose prose-invert max-w-none max-h-60 overflow-y-auto p-2 border border-slate-700 rounded-md" dangerouslySetInnerHTML={{__html: generatedContent.posts.podcastScript.script }} />
                                            </>
                                        ) : (
                                            <button onClick={handleGeneratePodcast} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingPodcast}>
                                                <SparklesIcon /> <span className="ml-2">Generate Podcast Script</span>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* LinkedIn Post */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><LinkedInIcon/><span className="ml-2">LinkedIn Post</span></h2>
                                            <div className="flex items-center gap-2">
                                                {scheduledLinkedInPost ? (
                                                    <div className="flex items-center gap-2 text-sm text-purple-300">
                                                        <ClockIcon />
                                                        <span>Scheduled</span>
                                                        <button onClick={() => handleUnschedule(scheduledLinkedInPost.id)} className="text-xs text-slate-400 hover:text-white">(Unschedule)</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleScheduleClick('linkedin')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><ClockIcon/> Schedule</button>
                                                )}
                                                <button onClick={() => handleOpenEditModal('linkedin')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                            </div>
                                        </div>
                                        {schedulingPost === 'linkedin' && (
                                            <div className="my-4 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
                                                <label htmlFor="linkedin-schedule" className="block text-sm font-semibold text-slate-300 mb-2">Schedule Date and Time</label>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="datetime-local" 
                                                        id="linkedin-schedule"
                                                        value={scheduleDateTime}
                                                        onChange={(e) => setScheduleDateTime(e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                    />
                                                    <button onClick={handleConfirmSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Confirm</button>
                                                    <button onClick={() => setSchedulingPost(null)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                        {scheduledLinkedInPost && (
                                            <div className="mb-4 text-center text-sm p-2 bg-purple-900/50 border border-purple-700 rounded-md text-purple-300">
                                                Scheduled for: {new Date(scheduledLinkedInPost.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </div>
                                        )}
                                        <CopyButton text={`Title: ${generatedContent.posts.linkedinPost.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.linkedinPost.body)}\n\nHashtags: ${generatedContent.posts.linkedinPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                        <h3 className="font-semibold text-lg text-blue-400">{generatedContent.posts.linkedinPost.title}</h3>
                                        <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.linkedinPost.body }} />
                                        <div className="flex flex-wrap gap-2">
                                            {generatedContent.posts.linkedinPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-2xl font-bold flex items-center"><XIcon/><span className="ml-2">X Post</span></h2>
                                                <div className="flex items-center gap-2">
                                                    {scheduledXPost ? (
                                                        <div className="flex items-center gap-2 text-sm text-purple-300">
                                                            <ClockIcon />
                                                            <span>Scheduled</span>
                                                            <button onClick={() => handleUnschedule(scheduledXPost.id)} className="text-xs text-slate-400 hover:text-white">(Unschedule)</button>
                                                        </div>
                                                    ) : (
                                                       <button onClick={() => handleScheduleClick('x')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><ClockIcon/> Schedule</button>
                                                    )}
                                                    <button onClick={() => handleOpenEditModal('x')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>
                                                </div>
                                            </div>
                                            {schedulingPost === 'x' && (
                                                <div className="my-4 p-4 bg-slate-700/50 rounded-lg animate-fade-in">
                                                    <label htmlFor="x-schedule" className="block text-sm font-semibold text-slate-300 mb-2">Schedule Date and Time</label>
                                                    <div className="flex items-center gap-2">
                                                        <input 
                                                            type="datetime-local" 
                                                            id="x-schedule"
                                                            value={scheduleDateTime}
                                                            onChange={(e) => setScheduleDateTime(e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                                                        />
                                                        <button onClick={handleConfirmSchedule} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors">Confirm</button>
                                                        <button onClick={() => setSchedulingPost(null)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md transition-colors">Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                            {scheduledXPost && (
                                                <div className="mb-4 text-center text-sm p-2 bg-purple-900/50 border border-purple-700 rounded-md text-purple-300">
                                                    Scheduled for: {new Date(scheduledXPost.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            )}
                                            <CopyButton text={`${convertHtmlToPlainTextForCopy(generatedContent.posts.xPost.body)}\n\n${generatedContent.posts.xPost.hashtags.map(h => `#${h}`).join(' ')}`} />
                                            <div className="text-slate-300 mb-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.xPost.body }} />
                                            <div className="flex flex-wrap gap-2">
                                                {generatedContent.posts.xPost.hashtags.map((tag, i) => <span key={i} className="bg-slate-700 text-slate-300 px-2 py-1 rounded-full text-sm">#{tag}</span>)}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-2xl font-bold flex items-center"><ChartBarIcon/><span className="ml-2">LinkedIn Poll</span></h2>
                                                {generatedContent.posts.linkedinPoll && <button onClick={() => handleOpenEditModal('poll')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>}
                                            </div>
                                            {isGeneratingPoll ? (
                                                <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg h-40"> <LoadingSpinner /> <span>Creating your poll...</span> </div>
                                            ) : generatedContent.posts.linkedinPoll ? (
                                                <>
                                                    <CopyButton text={`Poll Question: ${generatedContent.posts.linkedinPoll.question}\n\nOptions:\n${generatedContent.posts.linkedinPoll.options.map(o => `- ${o}`).join('\n')}`} />
                                                    <p className="font-semibold text-lg text-slate-200 mb-4">{generatedContent.posts.linkedinPoll.question}</p>
                                                    <div className="space-y-2">
                                                        {generatedContent.posts.linkedinPoll.options.map((option, i) => (
                                                            <div key={i} className="bg-slate-700/50 text-slate-300 px-4 py-2 rounded-md text-sm border border-slate-700">{option}</div>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <button onClick={handleGeneratePoll} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingPoll}>
                                                    <SparklesIcon /> <span className="ml-2">Generate Poll</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><CollectionIcon/><span className="ml-2">Carousel Presentation</span></h2>
                                            {generatedContent.posts.carouselPresentation && <button onClick={() => handleOpenEditModal('carousel')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>}
                                        </div>
                                        {isGeneratingCarousel ? (
                                             <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg h-40"> <LoadingSpinner /> <span>Designing your carousel...</span> </div>
                                        ) : generatedContent.posts.carouselPresentation ? (
                                            <>
                                                <CopyButton text={`Carousel: ${generatedContent.posts.carouselPresentation.title}\n\n${generatedContent.posts.carouselPresentation.slides.map((s, i) => `Slide ${i + 1}/${generatedContent.posts.carouselPresentation.slides.length}: ${s.title}\n${s.body}`).join('\n\n---\n\n')}`} />
                                                <h3 className="font-semibold text-lg text-purple-400 mb-4">{generatedContent.posts.carouselPresentation.title}</h3>
                                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 min-h-[150px] flex flex-col justify-center">
                                                    <p className="font-bold text-md text-slate-200">{generatedContent.posts.carouselPresentation.slides[carouselSlideIndex].title}</p>
                                                    <p className="text-slate-300 mt-1 text-sm">{generatedContent.posts.carouselPresentation.slides[carouselSlideIndex].body}</p>
                                                </div>
                                                <div className="flex items-center justify-center gap-4 mt-4">
                                                    <button onClick={() => setCarouselSlideIndex(prev => (prev - 1 + 5) % 5)} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-md transition">Prev</button>
                                                    <span className="text-sm text-slate-400">Slide {carouselSlideIndex + 1} / 5</span>
                                                    <button onClick={() => setCarouselSlideIndex(prev => (prev + 1) % 5)} className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-1 rounded-md transition">Next</button>
                                                </div>
                                            </>
                                        ) : (
                                            <button onClick={handleGenerateCarousel} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingCarousel}>
                                                <SparklesIcon /> <span className="ml-2">Generate Carousel</span>
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><DocumentTextIcon/><span className="ml-2">Blog Article</span></h2>
                                            {generatedContent.posts.blogArticle && <button onClick={() => handleOpenEditModal('blog')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>}
                                        </div>
                                        {isGeneratingBlog ? (
                                            <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg h-60"> <LoadingSpinner /> <span>Writing your article...</span> </div>
                                        ) : generatedContent.posts.blogArticle ? (
                                            <>
                                                <CopyButton text={`Title: ${generatedContent.posts.blogArticle.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.blogArticle.body)}`} />
                                                <h3 className="font-semibold text-xl text-blue-400">{generatedContent.posts.blogArticle.title}</h3>
                                                <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.blogArticle.body }} />
                                            </>
                                        ) : (
                                            <button onClick={handleGenerateBlog} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingBlog}>
                                                <SparklesIcon /> <span className="ml-2">Generate Blog Article</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Research Report */}
                                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg relative p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h2 className="text-2xl font-bold flex items-center"><DocumentTextIcon/><span className="ml-2">Research Report</span></h2>
                                            {generatedContent.posts.researchReport && <button onClick={() => handleOpenEditModal('report')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"><EditIcon/> Edit</button>}
                                        </div>
                                        {isGeneratingReport ? (
                                            <div className="flex items-center justify-center gap-2 text-slate-300 bg-slate-700/50 p-4 rounded-lg h-60"> <LoadingSpinner /> <span>Compiling research...</span> </div>
                                        ) : generatedContent.posts.researchReport ? (
                                            <>
                                                <CopyButton text={`Title: ${generatedContent.posts.researchReport.title}\n\n${convertHtmlToPlainTextForCopy(generatedContent.posts.researchReport.body)}`} />
                                                <h3 className="font-semibold text-xl text-purple-400">{generatedContent.posts.researchReport.title}</h3>
                                                <div className="text-slate-300 my-4 prose prose-invert max-w-none" dangerouslySetInnerHTML={{__html: generatedContent.posts.researchReport.body }} />
                                            </>
                                        ) : (
                                            <button onClick={handleGenerateReport} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isGeneratingReport}>
                                                <SparklesIcon /> <span className="ml-2">Generate Report</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                            {isLoading && !generatedContent && <div className="lg:col-span-2" />}
                        </div>

                        {/* Side Column for Image, Ideas, Schedule */}
                        <div className="space-y-8">
                           {generatedContent && (
                            <>
                             {/* Image Generation */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 sticky top-8">
                                <h2 className="text-2xl font-bold mb-4">Generated Image</h2>
                                <div className="aspect-video bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center border border-slate-700 overflow-hidden">
                                     {isRegeneratingImage ? (
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <LoadingSpinner/>
                                            <p className="mt-2 text-sm">Generating new images...</p>
                                        </div>
                                     ) : generatedContent.images.length > 0 ? (
                                        <img
                                            src={`data:image/jpeg;base64,${generatedContent.images[selectedImageIndex]}`}
                                            alt={generatedContent.posts.imagePrompt}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <ImagePlaceholderIcon />
                                            <p className="mt-2 text-sm text-center">Generate content to create an image.</p>
                                        </div>
                                    )}
                                </div>
                                {generatedContent.images.length > 1 && (
                                    <div className="flex justify-center gap-2 mb-4">
                                        {generatedContent.images.map((_, index) => (
                                            <button key={index} onClick={() => setSelectedImageIndex(index)} className={`h-2 w-8 rounded-full transition-colors ${selectedImageIndex === index ? 'bg-blue-500' : 'bg-slate-600 hover:bg-slate-500'}`}></button>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                                    <div>
                                        <label htmlFor="style" className="block mb-1 text-slate-400">Style</label>
                                        <select id="style" value={artisticStyle} onChange={e => setArtisticStyle(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Photorealistic</option><option>Minimalist</option><option>Abstract</option><option>3D Render</option><option>Cartoonish</option><option>Watercolor</option><option>Synthwave</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="color" className="block mb-1 text-slate-400">Color Palette</label>
                                        <select id="color" value={colorPalette} onChange={e => setColorPalette(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Vibrant</option><option>Monochromatic</option><option>Pastel</option><option>Earthy Tones</option><option>Neon</option><option>Warm</option><option>Cool</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="composition" className="block mb-1 text-slate-400">Composition</label>
                                        <select id="composition" value={composition} onChange={e => setComposition(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Close-up</option><option>Wide shot</option><option>Symmetrical</option><option>Asymmetrical</option><option>Top-down</option><option>Low angle</option><option>Dutch angle</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="mood" className="block mb-1 text-slate-400">Mood</label>
                                        <select id="mood" value={mood} onChange={e => setMood(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option>Default</option><option>Inspirational</option><option>Corporate</option><option>Futuristic</option><option>Nostalgic</option><option>Joyful</option><option>Serene</option><option>Dramatic</option>
                                        </select>
                                    </div>
                                     <div className="col-span-2">
                                        <label htmlFor="aspectRatio" className="block mb-1 text-slate-400">Aspect Ratio</label>
                                        <select id="aspectRatio" value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-700 border-slate-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            <option value="16:9">16:9 (Landscape)</option>
                                            <option value="1:1">1:1 (Square)</option>
                                            <option value="9:16">9:16 (Portrait)</option>
                                            <option value="4:3">4:3 (Traditional)</option>
                                            <option value="3:4">3:4 (Tall)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <button
                                        onClick={handleRegenerateImages}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                                        disabled={isRegeneratingImage || !generatedContent?.posts.imagePrompt}
                                    >
                                        <RegenerateIcon /> <span className="ml-2">Regenerate</span>
                                    </button>

                                    {isEditingPrompt ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editedPrompt}
                                                onChange={(e) => setEditedPrompt(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-sm"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={handleUpdatePromptAndRegenerate} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-md text-sm">Save & Regenerate</button>
                                                <button onClick={() => setIsEditingPrompt(false)} className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                         <button
                                            onClick={() => {
                                                setEditedPrompt(generatedContent.posts.imagePrompt);
                                                setIsEditingPrompt(true);
                                            }}
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors"
                                            disabled={isRegeneratingImage || !generatedContent?.posts.imagePrompt}
                                        >
                                            <EditIcon /> <span className="ml-2">Edit Prompt</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                             {/* Meme Section */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold flex items-center mb-4"><MemeIcon /><span className="ml-2">Viral Meme</span></h2>
                                {isGeneratingMeme ? (
                                    <div className="flex justify-center items-center h-32 text-slate-400">
                                        <LoadingSpinner /> <span className="ml-3">Cooking up a fresh meme...</span>
                                    </div>
                                ) : meme ? (
                                    <div className="space-y-4">
                                        <div className="relative aspect-square bg-slate-700 rounded-lg overflow-hidden">
                                            <img src={`data:image/jpeg;base64,${meme.image}`} alt={meme.caption} className="w-full h-full object-cover" />
                                            <CopyImageButton base64Data={meme.image} />
                                        </div>
                                        <div className="relative bg-slate-700/50 p-3 rounded-md border border-slate-700">
                                            <p className="text-slate-300 text-center italic text-sm pr-8">"{meme.caption}"</p>
                                            <CopyButton text={meme.caption} />
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={handleGenerateMeme} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isLoading || isGeneratingMeme}>
                                        <SparklesIcon /> <span className="ml-2">Generate Meme</span>
                                    </button>
                                )}
                            </div>


                            {/* Ideas Section */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold flex items-center mb-4"><LightbulbIcon /><span className="ml-2">Post Ideas</span></h2>
                                {isGeneratingIdeas ? (
                                    <div className="flex justify-center items-center h-32 text-slate-400">
                                        <LoadingSpinner /> <span className="ml-3">Generating fresh ideas...</span>
                                    </div>
                                ) : ideas.length > 0 ? (
                                    <ul className="space-y-3">
                                        {ideas.map((idea, index) => (
                                            <li key={index} className="bg-slate-700/50 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors">
                                                <button onClick={() => handleGeneratePostsOnly(idea)} className="w-full text-left p-3 text-slate-300 text-sm font-medium">
                                                    {idea}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <button onClick={handleGenerateIdeas} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isLoading || isGeneratingIdeas}>
                                        <SparklesIcon /> <span className="ml-2">Generate Ideas</span>
                                    </button>
                                )}
                            </div>

                            {/* Schedule Section */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold flex items-center mb-4"><CalendarIcon /><span className="ml-2">Weekly Schedule</span></h2>
                                {isGeneratingSchedule ? (
                                     <div className="flex justify-center items-center h-32 text-slate-400">
                                        <LoadingSpinner /> <span className="ml-3">Building your content plan...</span>
                                    </div>
                                ) : schedule.length > 0 ? (
                                    <div className="space-y-4">
                                        {schedule.map((item, index) => (
                                            <div key={index} className="bg-slate-700/50 p-3 rounded-md border border-slate-700">
                                                <p className="font-bold text-white">{item.day} <span className="font-normal text-slate-400 text-sm">({item.time})</span></p>
                                                <p className="text-sm text-slate-300 mt-1">{item.topic}</p>
                                                <div className="mt-2">{item.platform === 'LinkedIn' ? <LinkedInIcon/> : <XIcon/>}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <button onClick={handleGenerateSchedule} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors" disabled={isLoading || isGeneratingSchedule}>
                                        <SparklesIcon /> <span className="ml-2">Generate Schedule</span>
                                    </button>
                                )}
                            </div>
                            </>
                           )}
                        </div>
                    </div>
                )}

                <Chatbot />
            </main>

            <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title={getModalTitle()}>
                <div className="space-y-4">{renderEditModalContent()}</div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={handleCloseEditModal} className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-bold py-2 px-4 rounded-md transition-colors">Cancel</button>
                    <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Save Changes</button>
                </div>
            </Modal>
            
            <SavedPostsModal 
                isOpen={isSavedPostsModalOpen}
                onClose={() => setIsSavedPostsModalOpen(false)}
                savedPosts={savedPosts}
                onLoad={handleLoadPost}
                onDelete={handleDeletePost}
            />

            <ScheduledPostsModal
                isOpen={isScheduledPostsModalOpen}
                onClose={() => setIsScheduledPostsModalOpen(false)}
                scheduledPosts={scheduledPosts}
                onUnschedule={handleUnschedule}
            />

            {saveSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg animate-fade-in-out">
                    Content saved successfully!
                </div>
            )}
             {scheduleSuccess && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg animate-fade-in-out">
                    Post scheduled successfully!
                </div>
            )}

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }

                @keyframes fade-in-out {
                    0% { opacity: 0; transform: translateY(1rem) translateX(-50%); }
                    10% { opacity: 1; transform: translateY(0) translateX(-50%); }
                    90% { opacity: 1; transform: translateY(0) translateX(-50%); }
                    100% { opacity: 0; transform: translateY(1rem) translateX(-50%); }
                }
                .animate-fade-in-out { animation: fade-in-out 3s ease-out forwards; }
                
                .prose ul { list-style-position: inside; }
                .prose ul > li::marker { content: '• '; color: #60a5fa; }
            `}</style>
        </div>
    );
};

export default App;