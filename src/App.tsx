import React, { useState, useEffect } from 'react';
import { Users, Brain, Target, CheckCircle, AlertTriangle, TrendingUp, Download, Share2, Copy, ExternalLink, Clock, Twitter, X, Mail, MessageSquare } from 'lucide-react';
import html2canvas from 'html2canvas';
import Footer from './components/Footer';

type Question = {
  id: number;
  text: string;
  category: string;
};

type Answer = {
  questionId: number;
  response: string;
};

type FounderData = {
  name: string;
  email: string;
  answers: Answer[];
};

type AnalysisResult = {
  questionId: number;
  theme: string;
  alignmentScore: number;
  insight: string;
  founderAAnswer: string;
  founderBAnswer: string;
};

type CompatibilityReport = {
  overallScore: number;
  redFlags: string[];
  strengths: string[];
  actionableAdvice: string[];
  detailedAnalysis: AnalysisResult[];
};

type SessionStatus = 'A_submitted' | 'B_submitted_analyzing' | 'analysis_complete' | 'not_found';

const questions: Question[] = [
  { id: 1, text: "What is your primary motivation for starting this company?", category: "Vision & Purpose" },
  { id: 2, text: "What does success look like for you in 5 years?", category: "Long-term Goals" },
  { id: 3, text: "What role do you see yourself playing in the company?", category: "Role Definition" },
  { id: 4, text: "How do you handle failure and setbacks?", category: "Resilience" },
  { id: 5, text: "How do you handle high-pressure situations and stress?", category: "Work Style" },
  { id: 6, text: "What are your non-negotiable values in business?", category: "Core Values" },
  { id: 7, text: "How do you approach hiring and team building?", category: "Team Building" },
  { id: 8, text: "What would you do if we had a major disagreement about company direction?", category: "Conflict Resolution" },
  { id: 9, text: "How do you handle equity and ownership discussions?", category: "Equity & Ownership" },
  { id: 10, text: "What are your biggest fears about this partnership?", category: "Partnership Concerns" }
];

function App() {
  const [currentStep, setCurrentStep] = useState<'landing' | 'assessment' | 'shareLink' | 'waitingForCoFounder' | 'waiting' | 'results'>('landing');
  const [sessionId, setSessionId] = useState<string>('');
  const [founderType, setFounderType] = useState<'A' | 'B' | null>(null);
  const [founderData, setFounderData] = useState<FounderData>({
    name: '',
    email: '',
    answers: []
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [compatibilityReport, setCompatibilityReport] = useState<CompatibilityReport | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [shareableUrl, setShareableUrl] = useState<string>('');
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);

  useEffect(() => {
    // Trigger animations on component mount
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if this is a shared session URL with query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    
    if (codeParam) {
      setSessionId(codeParam);
      setFounderType('B');
      setCurrentStep('assessment');
    }
  }, []);

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const startAssessment = () => {
    setAnalysisError('');
    const id = generateSessionId();
    setSessionId(id);
    setFounderType('A');
    setCurrentStep('assessment');
  };

  const callAnalysisApi = async (sessionId: string, founderType: 'A' | 'B', answers: Answer[]): Promise<CompatibilityReport | { shareUrl: string }> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    const requestData = {
      sessionId,
      founderType,
      answers: answers.map((answer, index) => ({
        questionId: answer.questionId,
        question: questions.find(q => q.id === answer.questionId)?.text || '',
        category: questions.find(q => q.id === answer.questionId)?.category || '',
        response: answer.response
      }))
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/analyze-compatibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Analysis request failed with status ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Analysis API Error:', error);
      if (error instanceof Error) {
        throw new Error(`Analysis failed: ${error.message}`);
      }
      throw new Error('Analysis failed: Unknown error occurred');
    }
  };

  const checkSessionStatus = async (sessionId: string): Promise<{ status: SessionStatus; report?: CompatibilityReport }> => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/session-status/${sessionId}`);
      
      if (!response.ok) {
        return { status: 'not_found' };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Session status check error:', error);
      return { status: 'not_found' };
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    const newAnswer: Answer = {
      questionId: questions[currentQuestionIndex].id,
      response: answer
    };

    const updatedAnswers = [...founderData.answers, newAnswer];
    setFounderData({ ...founderData, answers: updatedAnswers });

    const maxQuestions = questions.length;
    if (currentQuestionIndex < maxQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // All questions completed
      if (founderType === 'A') {
        // Founder A completed - store answers and show share link
        handleFounderAComplete(updatedAnswers);
      } else if (founderType === 'B') {
        // Founder B completed - trigger analysis
        handleFounderBComplete(updatedAnswers);
      }
    }
  };

  const handleFounderAComplete = async (answers: Answer[]) => {
    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const result = await callAnalysisApi(sessionId, 'A', answers);
      
      if ('shareUrl' in result) {
        const fullUrl = `${window.location.origin}?code=${sessionId}`;
        setShareableUrl(fullUrl);
        
        // Update browser URL to reflect the session
        window.history.pushState({}, '', `?code=${sessionId}`);
        
        setCurrentStep('shareLink');
      }
    } catch (error) {
      console.error('Error storing Founder A answers:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to store your responses');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFounderBComplete = async (answers: Answer[]) => {
    setCurrentStep('waiting');
    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const result = await callAnalysisApi(sessionId, 'B', answers);
      
      if ('overallScore' in result) {
        setCompatibilityReport(result);
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Error generating compatibility report:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to generate compatibility report');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareOnTwitter = () => {
    if (!compatibilityReport) return;
    
    const tweetText = `Just completed the #FounderFit Challenge with my co-founder!\n\nCheck your founder fit here → https://playful-lebkuchen-dad997.netlify.app\n\n#FounderFit`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleDownloadCard = async () => {
    try {
      const reportCard = document.getElementById('report-card');
      if (!reportCard) {
        console.error('Report card element not found');
        return;
      }

      // Configure html2canvas options for better quality and clarity
      const canvas = await html2canvas(reportCard, {
        backgroundColor: null, // Use transparent background
        scale: 3, // Even higher resolution for crisp text
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000,
        removeContainer: true,
        height: reportCard.scrollHeight,
        width: reportCard.scrollWidth,
        scrollX: 0,
        scrollY: 0,
        windowWidth: reportCard.scrollWidth,
        windowHeight: reportCard.scrollHeight,
        ignoreElements: (element) => {
          // Ignore any overlay elements that might cause issues
          return element.classList.contains('ignore-screenshot');
        }
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'founderfit-compatibility-report.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 0.95); // Slightly compressed for smaller file size

    } catch (error) {
      console.error('Error downloading report card:', error);
    }
  };

  const resetToHomepage = () => {
    setCurrentStep('landing');
    setSessionId('');
    setFounderType(null);
    setFounderData({ name: '', email: '', answers: [] });
    setCurrentQuestionIndex(0);
    setCompatibilityReport(null);
    setAnalysisError('');
    setIsAnalyzing(false);
    setShareableUrl('');
    
    // Clear URL parameters
    window.history.pushState({}, '', '/');
  };

  const HowItWorksModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fadeInScale">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-2xl font-bold text-black">How It Works</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Step 1 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-bold text-black mb-2">Founder A starts the session</h3>
                <p className="text-gray-600 font-medium">
                  Answer 10 quick questions about your values, vision, and working style - no login needed.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-bold text-black mb-2">Share the session with your co-founder</h3>
                <p className="text-gray-600 font-medium mb-3">
                  After submitting, you'll get a unique link.
                </p>
                <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Use the Email button to quickly send the link to your co-founder.</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-bold text-black mb-2">Founder B completes the same 10 questions</h3>
                <p className="text-gray-600 font-medium">
                  Their answers are paired with yours automatically.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="text-lg font-bold text-black mb-2">Get your Co-Founder Compatibility Report Card</h3>
                <p className="text-gray-600 font-medium mb-4">
                  Once both have submitted, our AI instantly generates a personalized report highlighting:
                </p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    <span className="text-gray-600 font-medium">Your alignment score</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    <span className="text-gray-600 font-medium">Red flags</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    <span className="text-gray-600 font-medium">Strengths</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-black rounded-full"></span>
                    <span className="text-gray-600 font-medium">Expert advice</span>
                  </li>
                </ul>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 font-medium mb-3">You'll also get two options:</p>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Twitter className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600 font-medium"><strong>Share on Twitter:</strong> Post your report card directly to Twitter.</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-600 font-medium"><strong>Download Card:</strong> Save a clean copy of your report card as an image.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full bg-black text-white py-3 px-6 rounded-xl font-bold hover:bg-gray-800 transition-all duration-300"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LandingPage = () => (
    <div className="min-h-screen bg-black overflow-hidden">
      <div className="container mx-auto px-4 py-8">
        <nav className={`flex items-center justify-between mb-16 opacity-0 ${isLoaded ? 'animate-fadeInUp animation-delay-100' : ''}`}>
          <div className="flex items-center space-x-2">
            <Users className="h-8 w-8 text-white" />
            <span className="text-2xl font-bold text-white">FounderFit</span>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setShowHowItWorks(true)}
              className="text-gray-400 hover:text-white transition-colors font-medium hover:scale-105 transform duration-300"
            >
              How it Works
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl md:text-6xl font-bold text-white mb-6 leading-tight opacity-0 ${isLoaded ? 'animate-fadeInUp animation-delay-200' : ''}`}>
            Test Your <span className="gradient-text">Co-Founder</span> Compatibility
          </h1>
          <p className={`text-xl text-gray-300 mb-12 max-w-2xl mx-auto font-medium opacity-0 ${isLoaded ? 'animate-fadeInUp animation-delay-300' : ''}`}>
            Use AI-powered analysis to identify alignment gaps, strengths, and red flags.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 text-left border border-gray-800 hover-lift opacity-0 ${isLoaded ? 'animate-slideInLeft animation-delay-400' : ''}`}>
              <Brain className="h-12 w-12 text-white mb-6 animate-float" />
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-300 font-medium">Advanced algorithms analyze behavioral patterns and values alignment between co-founders</p>
            </div>
            <div className={`bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 text-left border border-gray-800 hover-lift opacity-0 ${isLoaded ? 'animate-slideInRight animation-delay-500' : ''}`}>
              <Target className="h-12 w-12 text-white mb-6 animate-float animation-delay-500" />
              <h3 className="text-xl font-bold text-white mb-3">Actionable Insights</h3>
              <p className="text-gray-300 font-medium">Get specific recommendations to strengthen your co-founder relationship and partnership</p>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className={`bg-white rounded-2xl p-8 border border-gray-200 opacity-0 ${isLoaded ? 'animate-fadeInScale animation-delay-600' : ''}`}>
              <h3 className="text-2xl font-bold text-black mb-2">Compatibility Assessment</h3>
              <p className="text-gray-600 mb-6 font-medium">Complete 10-question analysis with detailed insights for both founders</p>
              
              {analysisError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm font-medium">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {analysisError}
                  </p>
                </div>
              )}

              <button
                onClick={startAssessment}
                className="w-full bg-black text-white py-4 px-6 rounded-xl font-bold hover:bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                Start Assessment
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
      
      <Footer />
    </div>
  );

  const AssessmentForm = () => {
    const [currentAnswer, setCurrentAnswer] = useState('');
    const maxQuestions = questions.length;
    const progress = ((currentQuestionIndex + 1) / maxQuestions) * 100;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-fadeInScale">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-black" />
                  <span className="text-lg font-bold text-black">
                    FounderFit Assessment {founderType === 'B' ? '- Co-Founder' : ''}
                  </span>
                </div>
                <span className="text-sm text-gray-500 font-medium">
                  {currentQuestionIndex + 1} of {maxQuestions}
                </span>
              </div>

              {founderType === 'B' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-blue-800 font-medium">
                    Welcome! Your co-founder has invited you to complete this compatibility assessment. 
                    Please answer all questions honestly to generate your compatibility report.
                  </p>
                </div>
              )}

              <div className="w-full bg-gray-200 rounded-full h-2 mb-10">
                <div 
                  className="bg-black h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="mb-10">
                <div className="text-sm text-gray-600 font-bold mb-3 uppercase tracking-wide animate-fadeInUp">
                  {questions[currentQuestionIndex].category}
                </div>
                <h2 className="text-2xl font-bold text-black mb-8 leading-tight animate-fadeInUp animation-delay-100">
                  {questions[currentQuestionIndex].text}
                </h2>
                <textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none font-medium transition-all duration-300 animate-fadeInUp animation-delay-200"
                  placeholder="Share your thoughts in detail..."
                />
              </div>

              <div className="flex justify-between animate-fadeInUp animation-delay-300">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-6 py-3 text-gray-600 hover:text-black transition-colors disabled:opacity-50 font-medium hover:scale-105 transform duration-300"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleAnswerSubmit(currentAnswer)}
                  disabled={!currentAnswer.trim()}
                  className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 hover:scale-105 hover:shadow-lg"
                >
                  {currentQuestionIndex === maxQuestions - 1 ? 'Complete Assessment' : 'Next Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  };

  const ShareLinkScreen = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-fadeInScale text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-black mb-4">Assessment Complete!</h2>
            <p className="text-gray-600 mb-8 font-medium">
              Thanks for completing your FounderFit profile! Now share this link with your co-founder 
              so we can generate your full compatibility report.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2 font-medium">Share this link:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shareableUrl}
                  readOnly
                  className="flex-1 p-2 text-sm bg-white border border-gray-300 rounded-lg font-mono"
                />
                <button
                  onClick={() => copyToClipboard(shareableUrl)}
                  className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex space-x-3 mb-6">
              <button
                onClick={() => copyToClipboard(shareableUrl)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all duration-300 hover:scale-105"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Link</span>
              </button>
              <button
                onClick={() => window.open(`mailto:?subject=FounderFit Compatibility Assessment&body=Hi! I've completed my FounderFit assessment. Please complete yours so we can see our compatibility report: ${shareableUrl}`, '_blank')}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all duration-300 hover:scale-105"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Email</span>
              </button>
            </div>

            <button
              onClick={() => setCurrentStep('waitingForCoFounder')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all duration-300 hover:scale-105"
            >
              <Clock className="h-4 w-4" />
              <span>Wait for Results</span>
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  const WaitingForCoFounderScreen = () => {
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
      // Start polling for session status
      const pollSessionStatus = async () => {
        try {
          const statusResult = await checkSessionStatus(sessionId);
          
          if (statusResult.status === 'analysis_complete' && statusResult.report) {
            setCompatibilityReport(statusResult.report);
            setCurrentStep('results');
            
            // Clear polling interval
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }
          }
        } catch (error) {
          console.error('Error polling session status:', error);
        }
      };

      // Poll immediately and then every 3 seconds
      pollSessionStatus();
      const interval = setInterval(pollSessionStatus, 3000);
      setPollingInterval(interval);

      // Cleanup interval on unmount
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }, [sessionId]);

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center animate-fadeInScale max-w-md mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-black mb-4 animate-fadeInUp animation-delay-200">
                Waiting for Your Co-Founder
              </h2>
              <p className="text-gray-600 font-medium mb-6 animate-fadeInUp animation-delay-300">
                We're waiting for your co-founder to complete their assessment. Once they finish, 
                we'll automatically analyze both responses and show you the results.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-blue-800 text-sm font-medium">
                  💡 Your co-founder will be automatically redirected to the results page once they complete their assessment.
                </p>
              </div>

              <button
                onClick={() => setCurrentStep('shareLink')}
                className="w-full px-4 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all duration-300 hover:scale-105"
              >
                Back to Share Link
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  };

  const WaitingScreen = () => (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center animate-fadeInScale max-w-md mx-auto px-4">
          {analysisError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-800 mb-4">Analysis Failed</h2>
              <p className="text-red-600 mb-6 font-medium">{analysisError}</p>
              <button
                onClick={() => {
                  setCurrentStep('landing');
                  setAnalysisError('');
                  setCurrentQuestionIndex(0);
                  setFounderData({ name: '', email: '', answers: [] });
                  setFounderType(null);
                  setSessionId('');
                  window.history.pushState({}, '', '/');
                }}
                className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all duration-300"
              >
                Start Over
              </button>
            </div>
          ) : (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-black mb-2 animate-fadeInUp animation-delay-200">
                Analyzing Co-Founder Compatibility
              </h2>
              <p className="text-gray-600 font-medium animate-fadeInUp animation-delay-300">
                Our AI is comparing both founders responses and generating your detailed compatibility report...
              </p>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );

  const ResultsScreen = () => {
    if (!compatibilityReport) return null;

    const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };

    const getScoreLabel = (score: number) => {
      if (score >= 80) return 'Excellent Compatibility';
      if (score >= 60) return 'Good Compatibility';
      return 'Needs Attention';
    };

    const getScoreBgColor = (score: number) => {
      if (score >= 80) return 'bg-green-50 border-green-200';
      if (score >= 60) return 'bg-yellow-50 border-yellow-200';
      return 'bg-red-50 border-red-200';
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Report Card Container */}
            <div id="report-card" className={`bg-white rounded-3xl shadow-2xl border-2 ${getScoreBgColor(compatibilityReport.overallScore)} animate-fadeInScale overflow-hidden`}>
              {/* Header */}
              <div className="bg-gray-900 p-8 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <Users className="h-8 w-8 text-white" />
                  <h1 className="text-3xl font-bold text-white">FounderFit Challenge</h1>
                </div>
                <p className="text-gray-300 font-medium">Co-Founder Compatibility Report Card</p>
              </div>

              {/* Score Section */}
              <div className="p-8 text-center border-b border-gray-200">
                <div className="mb-4">
                  <div className={`text-7xl font-black ${getScoreColor(compatibilityReport.overallScore)} mb-2 animate-float`}>
                    {compatibilityReport.overallScore}
                  </div>
                  <div className="text-2xl font-bold text-gray-800">/ 100</div>
                </div>
                <div className="text-xl font-bold text-gray-700 mb-2">FounderFit Score</div>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                  compatibilityReport.overallScore >= 80 ? 'bg-green-100 text-green-800' :
                  compatibilityReport.overallScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getScoreLabel(compatibilityReport.overallScore)}
                </div>
              </div>

              {/* Red Flags Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">⚠️</span>
                  <h3 className="text-lg font-bold text-red-800">Top Red Flags</h3>
                </div>
                <div className="space-y-2">
                  {compatibilityReport.redFlags.slice(0, 3).map((flag, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-red-600 font-bold mr-2 mt-0.5">{index + 1}.</span>
                      <span className="text-red-700 text-sm font-medium leading-relaxed">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🌟</span>
                  <h3 className="text-lg font-bold text-green-800">Strengths</h3>
                </div>
                <div className="space-y-2">
                  {compatibilityReport.strengths.slice(0, 3).map((strength, index) => (
                    <div key={index} className="flex items-start">
                      <span className="text-green-600 mr-2 mt-1">•</span>
                      <span className="text-green-700 text-sm font-medium leading-relaxed">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice Section */}
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">💡</span>
                  <h3 className="text-lg font-bold text-blue-800">Key Advice</h3>
                </div>
                <div className="text-blue-700 text-sm font-medium leading-relaxed">
                  {compatibilityReport.actionableAdvice[0]}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={shareOnTwitter}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all duration-300 hover:scale-105"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>Share on Twitter</span>
                  </button>
                  <button 
                    onClick={handleDownloadCard}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all duration-300 hover:scale-105"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Card</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Back to Home Button */}
            <div className="mt-6 text-center">
              <button
                onClick={resetToHomepage}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all duration-300 hover:scale-105"
              >
                <Users className="h-4 w-4" />
                <span>Back to FounderFit Home</span>
              </button>
            </div>

            {/* Detailed Analysis (Below the Report Card) */}
            <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-fadeInUp animation-delay-600">
              <h3 className="text-2xl font-bold text-black mb-6 text-center">Detailed Compatibility Analysis</h3>
              <div className="space-y-6">
                {compatibilityReport.detailedAnalysis.map((analysis, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6 hover-lift" style={{animationDelay: `${700 + index * 100}ms`}}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-black">{analysis.theme}</h4>
                        <p className="text-sm text-gray-600 font-medium">Question {analysis.questionId}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(analysis.alignmentScore * 10)}`}>
                          {analysis.alignmentScore}/10
                        </div>
                        <div className="text-sm text-gray-600 font-medium">Alignment</div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm font-bold text-black mb-1">Founder A Response</div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded font-medium">{analysis.founderAAnswer}</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-black mb-1">Founder B Response</div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded font-medium">{analysis.founderBAnswer}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 font-medium">{analysis.insight}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  };

  return (
    <div className="App font-sans">
      {currentStep === 'landing' && <LandingPage />}
      {currentStep === 'assessment' && <AssessmentForm />}
      {currentStep === 'shareLink' && <ShareLinkScreen />}
      {currentStep === 'waitingForCoFounder' && <WaitingForCoFounderScreen />}
      {currentStep === 'waiting' && <WaitingScreen />}
      {currentStep === 'results' && <ResultsScreen />}
    </div>
  );
}

export default App;
