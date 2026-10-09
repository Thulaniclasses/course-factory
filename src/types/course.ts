export interface CourseModule {
  id: string;
  title: string;
  content: string[];
  scenario: {
    prompt: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      feedback: string;
    }[];
  };
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
  }[];
}

export interface GeneratedCourse {
  title: string;
  description: string;
  modules: CourseModule[];
  generatedAt: string;
}
