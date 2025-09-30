import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNotifications } from '../contexts/NotificationContext';
import { FeedbackCategory, NotificationType } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Textarea } from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import { UI_TEXT_ROMANIAN } from '../constants';
import { ChatBubbleLeftEllipsisIcon } from '../components/ui/Icons';

const UserFeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const { appData, addFeedbackItem, loading: dataLoading } = useData();
  const { addNotification } = useNotifications();

  const [category, setCategory] = useState<FeedbackCategory>(FeedbackCategory.GENERAL_FEEDBACK);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (dataLoading || !user || !appData) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      addNotification("Subiectul și descrierea sunt obligatorii.", NotificationType.WARNING);
      return;
    }

    setIsSubmitting(true);
    try {
      const feedbackData = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        category,
        subject,
        description,
      };
      
      const newFeedback = addFeedbackItem(feedbackData);

      if (newFeedback) {
        addNotification(UI_TEXT_ROMANIAN.feedbackSubmittedSuccessfully, NotificationType.SUCCESS);
        // Reset form
        setCategory(FeedbackCategory.GENERAL_FEEDBACK);
        setSubject('');
        setDescription('');
      } else {
        throw new Error("Feedback item was not created.");
      }

    } catch (error) {
      addNotification(UI_TEXT_ROMANIAN.failedToSubmitFeedback, NotificationType.ERROR);
      console.error("Feedback submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
        <ChatBubbleLeftEllipsisIcon className="h-8 w-8 mr-3 text-primary-500" />
        {UI_TEXT_ROMANIAN.feedbackPageTitle}
      </h1>

      <Card title={UI_TEXT_ROMANIAN.feedbackFormTitle}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              {UI_TEXT_ROMANIAN.feedbackCategoryLabel}
            </label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className="w-full px-3 py-2.5 rounded-lg shadow-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={FeedbackCategory.BUG_REPORT}>{UI_TEXT_ROMANIAN.feedbackCategoryBugReport}</option>
              <option value={FeedbackCategory.SUGGESTION}>{UI_TEXT_ROMANIAN.feedbackCategorySuggestion}</option>
              <option value={FeedbackCategory.GENERAL_FEEDBACK}>{UI_TEXT_ROMANIAN.feedbackCategoryGeneral}</option>
            </select>
          </div>

          <Input
            label={UI_TEXT_ROMANIAN.feedbackSubjectLabel}
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={UI_TEXT_ROMANIAN.feedbackSubjectPlaceholder}
            required
            maxLength={100}
          />

          <Textarea
            label={UI_TEXT_ROMANIAN.feedbackDescriptionLabel}
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={UI_TEXT_ROMANIAN.feedbackDescriptionPlaceholder}
            rows={6}
            required
            maxLength={2000}
          />
          
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Feedback-ul tău este anonimizat în sensul că numele tău real nu va fi public vizibil altor utilizatori, dar va fi înregistrat de administratori pentru a putea investiga sau răspunde dacă este cazul.
          </p>

          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
            {UI_TEXT_ROMANIAN.submitFeedbackButton}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default UserFeedbackPage;
