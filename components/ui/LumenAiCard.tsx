import React, { useState } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationType } from '../../types';
import { UI_TEXT_ROMANIAN } from '../../constants';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { SparklesIcon } from './Icons';
import Spinner from './Spinner';

const LumenAiCard: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [insightText, setInsightText] = useState("Activează pentru a primi o perspectivă rapidă de la Gemini despre datele recente.");
    const { appData } = useData();
    const { addNotification } = useNotifications();

    const handleToggle = async () => {
        if (isLoading || isActive) return;

        if (!process.env.API_KEY) {
          addNotification(UI_TEXT_ROMANIAN.geminiApiKeyMissing, NotificationType.ERROR);
          return;
        }

        setIsLoading(true);
        setInsightText("Gemini analizează datele...");

        try {
            const history = (appData?.dailyHistory || [])
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5) // Get last 5 days
                .map(d => `Data: ${formatDate(d.date, {day: 'numeric', month: 'short'})}, Profit Brut: ${formatCurrency(d.dailyGrossProfit)}`)
                .join('; ');

            if (!history) {
                 setInsightText("Nu există suficiente date istorice pentru o perspectivă.");
                 setIsActive(true); // Mark as "active" to show the text, even if it's a notice.
                 setIsLoading(false);
                 return;
            }

            const prompt = `Bazat pe următoarele date recente de profit/pierdere din istoricul zilnic (${history}), oferă o observație foarte scurtă (maxim 20 de cuvinte), inteligentă și încurajatoare pentru un investitor. Fii ca un oracol financiar înțelept și vorbește direct utilizatorului (folosind persoana a doua singular, 'tu').`;
            
            const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setInsightText(response.text);
            setIsActive(true);
        } catch (error) {
            console.error("Lumen AI Error:", error);
            const errorMessage = "A apărut o eroare la contactarea Gemini. Încearcă din nou mai târziu.";
            setInsightText(errorMessage);
            addNotification(errorMessage, NotificationType.ERROR);
            // Don't set active on error, allow user to retry
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`lumen-card ${isActive ? 'active' : ''}`} role="region" aria-label="Lumen AI Insight">
            <div className="lumen-card-light-layer">
                <div className="lumen-card-slit"></div>
                <div className="lumen-card-lumen">
                    <div className="min"></div>
                    <div className="mid"></div>
                    <div className="hi"></div>
                </div>
                <div className="lumen-card-darken">
                    <div className="sl"></div>
                    <div className="ll"></div>
                    <div className="slt"></div>
                    <div className="srt"></div>
                </div>
            </div>
            <div className="lumen-card-content">
                <div className="lumen-card-icon">
                    <SparklesIcon className="h-[3.2rem] w-[3.2rem] text-neutral-400" />
                </div>
                <div className="lumen-card-bottom">
                    <h4>Lumen AI</h4>
                    <p>{isLoading ? <Spinner size="sm" /> : insightText}</p>
                    <div 
                        className={`lumen-card-toggle ${isActive ? 'active' : ''}`} 
                        onClick={handleToggle}
                        role="switch"
                        aria-checked={isActive}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
                        aria-label={isActive ? "Lumen Activat" : "Activează Lumen"}
                    >
                        <div className="lumen-card-handle"></div>
                        <span>{isActive ? "Lumen Activat" : "Activează Lumen"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LumenAiCard;
