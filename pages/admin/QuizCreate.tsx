import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';

interface AdminQuizCreateProps {
  onBack: () => void;
}

export const AdminQuizCreate: React.FC<AdminQuizCreateProps> = ({ onBack }) => {
  const { adminCreateQuiz } = useApp();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [reward, setReward] = useState('2.50');
  const [error, setError] = useState('');

  const handleOptionChange = (idx: number, val: string) => {
      const newOpts = [...options];
      newOpts[idx] = val;
      setOptions(newOpts);
  };

  const handleSubmit = async () => {
      setError('');
      if (!question) return setError("Question is required");
      if (options.some(o => !o.trim())) return setError("All 4 options are required");
      
      const rewardCents = parseFloat(reward) * 100;
      if (isNaN(rewardCents) || rewardCents <= 0) return setError("Invalid reward amount");

      try {
          await adminCreateQuiz(question, options, correctIndex, rewardCents);
          onBack();
      } catch (e: any) {
          setError(e.message);
      }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6">
        <ArrowLeft size={16} className="mr-1" /> Back to List
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Quiz Question</h1>

      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6">
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
              <textarea 
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What is the capital of France?"
              />
          </div>

          <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Options (Select the correct answer)</label>
              <div className="space-y-3">
                  {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center">
                          <input 
                            type="radio"
                            name="correctIndex"
                            checked={correctIndex === idx}
                            onChange={() => setCorrectIndex(idx)}
                            className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                            placeholder={`Option ${idx + 1}`}
                          />
                      </div>
                  ))}
              </div>
          </div>

          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reward Amount ($)</label>
              <input 
                type="number"
                step="0.10"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">Daily Max: $5.00</p>
          </div>

          {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>}

          <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button onClick={handleSubmit}>Publish Quiz</Button>
          </div>
      </div>
    </div>
  );
};
