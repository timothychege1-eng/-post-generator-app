
export interface LinkedInPost {
  title: string;
  body: string;
  hashtags: string[];
}

export interface XPost {
  body: string;
  hashtags: string[];
}

export interface GeneratedPosts {
  linkedinPost: LinkedInPost;
  xPost: XPost;
  imagePrompt: string;
}

export interface ScheduleItem {
    day: string;
    topic: string;
    platform: 'LinkedIn' | 'X';
    time: string;
}
