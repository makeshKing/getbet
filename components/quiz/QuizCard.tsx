import React, { useState } from 'react';
import { QuizQuestion, QuizAnswer } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Clock, CheckCircle, XCircle, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface QuizCardProps {
  quiz: QuizQuestion;
  existingAnswer?: QuizAnswer;
  onAnswerSubmit: () => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ quiz, existingAnswer, onAnswerSubmit }) => {
  const { answerQuiz } = useApp();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean, reward: number } | null>(
      existingAnswer ? { isCorrect: existingAnswer.isCorrect, reward: existingAnswer.isCorrect ? quiz.rewardCents : 0 } : null
  );

  // If already answered, show the selected index from history
  const displayIndex = existingAnswer ? existingAnswer.selectedIndex : selectedIndex;

  const handleSubmit = async () => {
    if (selectedIndex === null) return;
    try {
        const res = await answerQuiz(quiz.id, selectedIndex);
        setResult({ isCorrect: res.isCorrect, reward: res.rewardCents });
        onAnswerSubmit();
    } catch (e: any) {
        alert(e.message);
    }
  };

  const isLocked = !!existingAnswer || !!result;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                <Badge className="bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                    Daily Trivia
                </Badge>
                <div className="flex items-center text-xs text-slate-400">
                    <Clock size={14} className="mr-1" />
                    Expires {new Date(quiz.activeTill).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
             </div>
             <h2 className="text-xl font-bold mb-2 leading-relaxed">{quiz.question}</h2>
             <div className="flex items-center text-sm text-slate-400">
                <Award size={16} className="text-emerald-400 mr-1" />
                <span>Reward: </span>
                <span className="text-emerald-400 font-bold ml-1">${(quiz.rewardCents/100).toFixed(2)}</span>
             </div>
        </div>
        {/* Decorative circle */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl"></div>
      </div>

      <div className="p-6 space-y-3">
        {quiz.options.map((opt, idx) => {
            let itemClass = "w-full text-left p-4 rounded-lg border-2 transition-all flex justify-between items-center ";
            
            if (isLocked) {
                if (idx === quiz.correctIndex) {
                    itemClass += "border-emerald-500 bg-emerald-50 text-emerald-900"; // Correct answer highlight
                } else if (idx === displayIndex && idx !== quiz.correctIndex) {
                    itemClass += "border-red-500 bg-red-50 text-red-900"; // Wrong selected answer
                } else {
                    itemClass += "border-slate-100 text-slate-400 opacity-60"; // Other options
                }
            } else {
                if (displayIndex === idx) {
                    itemClass += "border-slate-900 bg-slate-50 shadow-sm";
                } else {
                    itemClass += "border-slate-100 hover:border-slate-300 hover:bg-slate-50";
                }
            }

            return (
                <button
                    key={idx}
                    disabled={isLocked}
                    onClick={() => setSelectedIndex(idx)}
                    className={itemClass}
                >
                    <span className="font-medium">{opt}</span>
                    {isLocked && idx === quiz.correctIndex && <CheckCircle className="text-emerald-600" size={20} />}
                    {isLocked && idx === displayIndex && idx !== quiz.correctIndex && <XCircle className="text-red-600" size={20} />}
                </button>
            );
        })}

        {!isLocked ? (
             <Button className="w-full mt-4 h-12 text-lg" disabled={selectedIndex === null} onClick={handleSubmit}>
                Submit Answer
             </Button>
        ) : (
            <div className={`mt-6 p-4 rounded-lg text-center ${result?.isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}>
                {result?.isCorrect ? (
                    <div>
                        <p className="font-bold text-lg">Correct!</p>
                        <p className="text-sm">You earned ${(result.reward/100).toFixed(2)}.</p>
                    </div>
                ) : (
                    <div>
                        <p className="font-bold">Incorrect</p>
                        <p className="text-sm">Better luck next time!</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
