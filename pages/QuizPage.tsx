import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { QuizQuestion, QuizAnswer } from '../types';
import { QuizCard } from '../components/quiz/QuizCard';
import { BrainCircuit } from 'lucide-react';

export const QuizPage: React.FC = () => {
  const { activeQuiz, getUserQuizAnswer } = useApp();
  const [userAnswer, setUserAnswer] = useState<QuizAnswer | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (activeQuiz) {
        const answer = await getUserQuizAnswer(activeQuiz.id);
        setUserAnswer(answer || undefined);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeQuiz]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-100 text-indigo-600 rounded-full mb-4">
            <BrainCircuit size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Daily Quiz</h1>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto">
            Test your knowledge and earn play-money credits instantly. A new question drops every day.
        </p>
      </div>

      {activeQuiz ? (
        <QuizCard 
            quiz={activeQuiz} 
            existingAnswer={userAnswer} 
            onAnswerSubmit={fetchData}
        />
      ) : (
        <div className="text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
            <h3 className="text-lg font-medium text-slate-900">No active quiz right now</h3>
            <p className="text-slate-500">Please come back tomorrow for a new challenge!</p>
        </div>
      )}
    </div>
  );
};
