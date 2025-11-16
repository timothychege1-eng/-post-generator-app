export interface LinkedInPost {
  title: string;
  body: string;
  hashtags: string[];
}

export interface XPost {
  body: string;
  hashtags: string[];
}

export interface PodcastScript {
    title: string;
    script: string; // Markdown/HTML content
}

export interface BlogArticle {
    title: string;
    body: string; // Markdown/HTML content
    hashtags: string[];
}

export interface LinkedInPoll {
    question: string;
    options: string[];
}

export interface CarouselSlide {
    title: string;
    content: string;
}

export interface CarouselPresentation {
    title: string;
    slides: CarouselSlide[];
}

export interface ResearchReport {
    title: string;
    report: string; // Markdown/HTML content
    sources: { title: string; uri: string }[];
}


export interface GeneratedPosts {
  linkedinPost: LinkedInPost;
  xPost: XPost;
  imagePrompt: string;
  podcastScript?: PodcastScript;
  blogArticle?: BlogArticle;
  linkedinPoll?: LinkedInPoll;
  carouselPresentation?: CarouselPresentation;
  researchReport?: ResearchReport;
}

export interface SavedContent {
    id: string;
    savedAt: string;
    topic: string;
    posts: GeneratedPosts;
}

export interface ScheduledPost {
    id: string;
    platform: 'LinkedIn' | 'X';
    scheduledAt: string; // ISO date string
    content: LinkedInPost | XPost;
    topic: string;
}

export interface TopicSuggestion {
    day: string;
    topic: string;
}

export interface YoutubeTopicSuggestion {
    topic: string;
    description: string;
}
