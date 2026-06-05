import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { QuizQuestion } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Trash2, Plus, StopCircle } from 'lucide-react';

interface AdminQuizListProps {
  onNavigate: (page: string) => void;
}

export const AdminQuizList: React.FC<AdminQuizListProps> = ({ onNavigate }) => {
  const { adminGetQuizzes, adminDeleteQuiz, adminEndQuizEarly } = useApp();
  const [quizzes, setQuizzes] = useState<any[]>([]);

  const fetchQuizzes = async () => {
    const data = await adminGetQuizzes();
    setQuizzes(data);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: string) => {
      try {
          if (confirm("Delete this quiz?")) {
            await adminDeleteQuiz(id);
            fetchQuizzes();
          }
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleEndEarly = async (id: string) => {
      if (confirm("End this quiz immediately?")) {
        await adminEndQuizEarly(id);
        fetchQuizzes();
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Daily Quizzes</h1>
        <Button onClick={() => onNavigate('admin-quiz-create')}>
            <Plus size={16} className="mr-2" /> Create New
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Question</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reward</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Active Until</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Answers</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {quizzes.map((q: any) => {
                const isActive = new Date(q.activeTill) > new Date();
                return (
                    <tr key={q.id}>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900 max-w-xs truncate" title={q.question}>{q.question}</div>
                            <div className="text-xs text-slate-500">{q.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            ${(q.rewardCents/100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(q.activeTill).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                                {isActive ? 'Active' : 'Expired'}
                            </Badge>
                        </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {q.answerCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                             {isActive && (
                                <button onClick={() => handleEndEarly(q.id)} className="text-amber-600 hover:text-amber-900" title="End Early">
                                    <StopCircle size={18} />
                                </button>
                             )}
                             <button onClick={() => handleDelete(q.id)} className="text-red-600 hover:text-red-900" title="Delete">
                                <Trash2 size={18} />
                             </button>
                        </td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
