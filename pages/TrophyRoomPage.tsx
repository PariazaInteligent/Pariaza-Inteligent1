import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useData } from '../contexts/DataContext';
import { UI_TEXT_ROMANIAN } from '../constants';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Role, ReferralStatus, BetStatus, BetType } from '../types';

interface TrophyData {
    topInvestor: { name: string; profit: number };
    recordProfit: { amount: number; date: string };
    highRoller: { name: string; amount: number };
    topAmbassador: { name: string; count: number };
    veteranInvestor: { name: string; joinDate: string };
    winningStreak: { days: number; endDate: string };
    platformMilestone: { investors: number; target: number };
}

interface TrophyRoomOutletContext {
  setSidebarForceHidden: (isHidden: boolean) => void;
}


const TrophyRoomPage: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { appData } = useData();
    const { setSidebarForceHidden } = useOutletContext<TrophyRoomOutletContext>();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<{ title: string; body: React.ReactNode }>({ title: '', body: null });

    const trophyData = useMemo((): TrophyData => {
        const defaultData: TrophyData = {
            topInvestor: { name: 'N/A', profit: 0 },
            recordProfit: { amount: 0, date: '' },
            highRoller: { name: 'N/A', amount: 0 },
            topAmbassador: { name: 'N/A', count: 0 },
            veteranInvestor: { name: 'N/A', joinDate: '' },
            winningStreak: { days: 0, endDate: '' },
            platformMilestone: { investors: 0, target: 100 },
        };

        if (!appData) return defaultData;

        // Top Investor (by total profit)
        const investors = appData.users.filter(u => u.role === Role.USER && u.isActive);
        if (investors.length > 0) {
            const top = [...investors].sort((a, b) => (b.profileData.totalProfitEarned || 0) - (a.profileData.totalProfitEarned || 0))[0];
            if(top) {
                defaultData.topInvestor = { name: top.name, profit: top.profileData.totalProfitEarned || 0 };
            }
        }

        // Record Profit Day
        if (appData.dailyHistory && appData.dailyHistory.length > 0) {
            const recordDay = [...appData.dailyHistory].sort((a, b) => b.dailyGrossProfit - a.dailyGrossProfit)[0];
            if(recordDay) {
                 defaultData.recordProfit = { amount: recordDay.dailyGrossProfit, date: recordDay.date };
            }
        }
        
        // High Roller (largest single deposit)
        let highRoller = { name: 'N/A', amount: 0 };
        investors.forEach(inv => {
            (inv.profileData.investmentHistory || []).forEach(tx => {
                if (tx.type === 'DEPOSIT' && tx.amount > highRoller.amount) {
                    highRoller = { name: inv.name, amount: tx.amount };
                }
            });
        });
        defaultData.highRoller = highRoller;
        
        // Winning Streak
        let currentStreak = 0;
        let maxStreak = 0;
        let streakEndDate = '';
        if (appData.dailyHistory && appData.dailyHistory.length > 0) {
            const sortedHistory = [...appData.dailyHistory].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            for(const day of sortedHistory) {
                if (day.dailyGrossProfit > 0) {
                    currentStreak++;
                } else {
                    if (currentStreak > maxStreak) {
                        maxStreak = currentStreak;
                        streakEndDate = day.date; 
                    }
                    currentStreak = 0;
                }
            }
             if (currentStreak > maxStreak) { // Check streak at the end
                maxStreak = currentStreak;
                streakEndDate = sortedHistory[sortedHistory.length - 1].date;
            }
        }
        defaultData.winningStreak = { days: maxStreak, endDate: streakEndDate };

        // Platform Milestone
        if(appData.globalStats) {
            defaultData.platformMilestone.investors = appData.globalStats.activeInvestors;
        }


        return defaultData;
    }, [appData]);

    const handleCardClick = (trophyKey: keyof TrophyData | 'tip' | 'category', categoryName?: string) => {
        let title: string = '';
        let body: React.ReactNode = null;
        
        if (trophyKey === 'category' && categoryName) {
            title = `Categorie: ${categoryName}`;
            
            switch(categoryName) {
                case "Investitori":
                    const topInvestors = (appData?.users || [])
                        .filter(u => u.role === Role.USER && u.isActive)
                        .sort((a, b) => (b.profileData.totalProfitEarned || 0) - (a.profileData.totalProfitEarned || 0))
                        .slice(0, 5);
                    
                    body = (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Top 5 Investitori (după Profit Total)</h3>
                            {topInvestors.length > 0 ? (
                                <ol className="list-decimal list-inside space-y-2">
                                    {topInvestors.map((investor) => (
                                        <li key={investor.id}>
                                            <span className="font-semibold">{investor.name}</span> - <span className="text-green-500 font-bold">{formatCurrency(investor.profileData.totalProfitEarned)}</span>
                                        </li>
                                    ))}
                                </ol>
                            ) : <p>Nu există date suficiente.</p>}
                        </div>
                    );
                    break;
                
                case "Profituri":
                    const history = appData?.dailyHistory || [];
                    const globalStats = appData?.globalStats;
                    const bestDay = history.length > 0 ? [...history].sort((a, b) => b.dailyGrossProfit - a.dailyGrossProfit)[0] : null;
                    const worstDay = history.length > 0 ? [...history].sort((a, b) => a.dailyGrossProfit - b.dailyGrossProfit)[0] : null;

                    body = (
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Sumar Profituri</h3>
                            {history.length > 0 && globalStats ? (
                                <ul className="list-disc list-inside space-y-2">
                                    <li>Profit Total Distribuit: <span className="font-bold text-green-500">{formatCurrency(globalStats.totalProfitDistributed)}</span></li>
                                    {bestDay && <li>Cea mai bună zi: <span className="font-semibold">{formatDate(bestDay.date, {day:'numeric', month:'long', year:'numeric'})}</span> cu un profit de <span className="font-bold text-green-500">{formatCurrency(bestDay.dailyGrossProfit)}</span></li>}
                                    {worstDay && <li>Cea mai slabă zi: <span className="font-semibold">{formatDate(worstDay.date, {day:'numeric', month:'long', year:'numeric'})}</span> cu un profit de <span className="font-bold text-red-500">{formatCurrency(worstDay.dailyGrossProfit)}</span></li>}
                                </ul>
                            ) : <p>Nu există date suficiente.</p>}
                        </div>
                    );
                    break;
                
                case "Recomandări":
                     body = <p>Informații despre recomandări vor fi disponibile în curând.</p>;
                    break;


                case "Mize Record":
                    const bets = appData?.bets || [];
                    const highestStakeBet = bets.length > 0 ? [...bets].sort((a, b) => b.stake - a.stake)[0] : null;
                    const highestOddsWonBet = bets.length > 0 ? [...bets].filter(b => b.status === BetStatus.WON).sort((a, b) => b.odds - a.odds)[0] : null;

                    body = (
                         <div>
                            <h3 className="text-lg font-semibold mb-2">Recorduri Pariuri</h3>
                             {bets.length > 0 ? (
                                <ul className="list-disc list-inside space-y-2">
                                    {highestStakeBet && <li>Cea mai mare miză: <span className="font-bold">{formatCurrency(highestStakeBet.stake)}</span> pe <span className="italic">"{highestStakeBet.selection}"</span></li>}
                                    {highestOddsWonBet && <li>Cea mai mare cotă câștigată: <span className="font-bold">{highestOddsWonBet.odds.toFixed(2)}</span> pe <span className="italic">"{highestOddsWonBet.selection}"</span></li>}
                                    {!highestStakeBet && !highestOddsWonBet && <li>Nu există date suficiente.</li>}
                                </ul>
                            ) : <p>Nu există date despre pariuri.</p>}
                        </div>
                    );
                    break;
                
                case "Milestones":
                    const stats = appData?.globalStats;
                    const milestones = [
                        { target: 10000, label: "Total Investit", value: stats?.totalInvested || 0, type: 'currency' as const },
                        { target: 50000, label: "Total Investit", value: stats?.totalInvested || 0, type: 'currency' as const },
                        { target: 50, label: "Investitori Activi", value: stats?.activeInvestors || 0, type: 'count' as const },
                        { target: 100, label: "Investitori Activi", value: stats?.activeInvestors || 0, type: 'count' as const },
                    ];
                    
                    body = (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Progres Obiective Platformă</h3>
                            {stats ? (
                                <ul className="list-disc list-inside space-y-2">
                                    {milestones.map((m, i) => {
                                        const displayValue = m.type === 'currency' ? formatCurrency(m.value) : m.value.toLocaleString('ro-RO');
                                        const displayTarget = m.type === 'currency' ? formatCurrency(m.target) : m.target.toLocaleString('ro-RO');
                                        
                                        return (
                                            <li key={i} className={m.value >= m.target ? 'text-green-500' : ''}>
                                                {m.label}: {m.value >= m.target 
                                                    ? <span className="font-bold">Atins ({displayValue})</span>
                                                    : <span>{displayValue} / {displayTarget}</span>
                                                }
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <p>Nu există date suficiente.</p>}
                        </div>
                    );
                    break;
                
                case "Longevitate":
                    const veterans = (appData?.users || [])
                        .filter(u => u.role === Role.USER)
                        .sort((a, b) => new Date(a.profileData.joinDate).getTime() - new Date(b.profileData.joinDate).getTime())
                        .slice(0, 5);

                    body = (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Cei mai vechi investitori</h3>
                             {veterans.length > 0 ? (
                                <ol className="list-decimal list-inside space-y-2">
                                    {veterans.map(v => <li key={v.id}><span className="font-semibold">{v.name}</span> - membru din {formatDate(v.profileData.joinDate, { year: 'numeric', month: 'long', day: 'numeric' })}</li>)}
                                </ol>
                            ) : <p>Nu există date suficiente.</p>}
                        </div>
                    );
                    break;
                
                case "Strategii":
                     body = <p>Informații despre strategii vor fi disponibile în curând.</p>;
                    break;

                case "Comunitate":
                    const allUsers = appData?.users || [];
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const newUsers = allUsers.filter(u => new Date(u.profileData.joinDate) >= thirtyDaysAgo).length;

                    body = (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Sumar Comunitate</h3>
                            {allUsers.length > 0 ? (
                                <ul className="list-disc list-inside space-y-2">
                                    <li>Total utilizatori înregistrați: <span className="font-bold">{allUsers.length}</span></li>
                                    <li>Utilizatori noi (ultimele 30 zile): <span className="font-bold">{newUsers}</span></li>
                                    <li>Investitori activi curent: <span className="font-bold">{appData?.globalStats?.activeInvestors || 0}</span></li>
                                </ul>
                            ) : <p>Nu există date suficiente.</p>}
                        </div>
                    );
                    break;

                default:
                    body = <p>{`Informații pentru categoria "${categoryName}" vor fi disponibile în curând.`}</p>;
            }
        } else {
             let bodyText = '';
             switch(trophyKey) {
                case 'topInvestor':
                    title = 'Investitorul Lunii';
                    bodyText = `Felicitări lui ${trophyData.topInvestor.name} pentru obținerea celui mai mare profit total: ${formatCurrency(trophyData.topInvestor.profit)}. O performanță remarcabilă!`;
                    break;
                case 'recordProfit':
                    title = 'Profit Record Zilnic';
                    bodyText = `Cel mai mare profit înregistrat într-o singură zi este de ${formatCurrency(trophyData.recordProfit.amount)}, realizat pe data de ${formatDate(trophyData.recordProfit.date)}.`;
                    break;
                case 'highRoller':
                    title = 'High Roller';
                    bodyText = `Cea mai mare investiție singulară a fost făcută de ${trophyData.highRoller.name}, în valoare de ${formatCurrency(trophyData.highRoller.amount)}.`;
                    break;
                 case 'winningStreak':
                    title = 'Serie de Victorii';
                    bodyText = `Cea mai lungă serie de zile consecutive pe profit a fost de ${trophyData.winningStreak.days} zile.`;
                    break;
                case 'platformMilestone':
                    title = 'Milestone Platformă';
                    bodyText = `Am atins ${trophyData.platformMilestone.investors} investitori activi din obiectivul de ${trophyData.platformMilestone.target}. Mulțumim comunității!`;
                    break;
                case 'tip':
                     title = 'Sfatul Săptămânii';
                     bodyText = `"Disciplina este podul dintre obiective și realizări. Rămâi consecvent în strategia ta, chiar și atunci când emoțiile încearcă să preia controlul." - Admin`;
                     break;
                case 'topAmbassador':
                    title = 'Ambasador Top';
                    bodyText = `Informații despre cel mai bun ambasador vor fi disponibile în curând.`;
                    break;
                case 'veteranInvestor':
                    title = 'Investitor Veteran';
                    bodyText = `Informații despre cei mai longevivi investitori vor fi disponibile în curând.`;
                    break;
            }
            body = <p>{bodyText}</p>
        }

        setModalContent({ title, body });
        setIsModalOpen(true);
    };

    useEffect(() => {
        // Only run desktop animation on screens wider than 768px
        if (!window.matchMedia("(min-width: 769px)").matches) {
            return;
        }

        gsap.registerPlugin(CustomEase);
        
        // Add special class to body for this page's duration
        document.body.classList.add('trophy-page-body');

        const container = containerRef.current;
        if (!container) return;

        // --- GSAP Animation Setup ---
        const gridContainer = container.querySelector("#gridContainer");
        const centerCard = container.querySelector("#centerCard");
        const categoriesMenu = container.querySelector("#categoriesMenu");
        const allCategories = container.querySelectorAll(".trophy-category");
        const logoChars = container.querySelectorAll(".trophy-logo .trophy-char");
        const vChar = container.querySelector(".trophy-logo .v-char"); // 'S' in SALA
        const sChar = container.querySelector(".trophy-logo .s-char"); // 'T' in TROFEELOR
        const spacer = container.querySelector(".trophy-logo .trophy-spacer");

        if (!gridContainer || !centerCard || !categoriesMenu || !vChar || !sChar || !spacer) return;
        
        CustomEase.create("customEase", "0.86,0,0.07,1");
        const duration = 0.64;
        const expandTimeline = gsap.timeline({ paused: true });
        const logoTimeline = gsap.timeline({ paused: true });

        expandTimeline
            .to(".trophy-card-1", { top: 0, left: 0, xPercent: 0, yPercent: 0, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.05 }, 0)
            .to(".trophy-card-2", { top: 0, left: "50%", xPercent: -50, yPercent: 0, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.1 }, 0)
            .to(".trophy-card-3", { top: 0, left: "100%", xPercent: -100, yPercent: 0, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.15 }, 0)
            .to(".trophy-card-4", { top: "50%", left: 0, xPercent: 0, yPercent: -50, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.2 }, 0)
            .to(".trophy-card-6", { top: "50%", left: "100%", xPercent: -100, yPercent: -50, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.25 }, 0)
            .to(".trophy-card-7", { top: "100%", left: 0, xPercent: 0, yPercent: -100, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.3 }, 0)
            .to(".trophy-card-8", { top: "100%", left: "50%", xPercent: -50, yPercent: -100, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.35 }, 0)
            .to(".trophy-card-9", { top: "100%", left: "100%", xPercent: -100, yPercent: -100, opacity: 1, scale: 1, visibility: "visible", ease: "customEase", duration, delay: 0.4 }, 0);
        
        const hideSequence = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13];
        hideSequence.forEach((index, i) => {
            const char = container.querySelector(`.trophy-char[data-index="${index}"]`);
            if (char) logoTimeline.to(char, { opacity: 0, filter: "blur(8px)", duration: 0.15 }, i * 0.05);
        });
        if (spacer) logoTimeline.to(spacer, { opacity: 0, filter: "blur(8px)", duration: 0.15 }, hideSequence.length * 0.05);
        if (sChar && vChar) {
            logoTimeline.to(sChar, { x: () => -(sChar.getBoundingClientRect().left - vChar.getBoundingClientRect().right), duration: 0.5 }, hideSequence.length * 0.05 + 0.05);
        }

        gsap.set(allCategories, { opacity: 0, y: 20, visibility: "hidden" });
        gsap.set(logoChars, { opacity: 1, filter: "blur(0px)" });

        let isExpanded = false;
        const showMenu = () => gsap.timeline().staggerTo(Array.from(allCategories).reverse(), 0.64, { opacity: 1, y: 0, visibility: "visible", ease: "customEase", stagger: 0.08 });
        const hideMenu = () => gsap.timeline().staggerTo(allCategories, 0.48, { opacity: 0, y: 20, visibility: "hidden", ease: "customEase", stagger: 0.05 });
        
        const expandGrid = () => { if (!isExpanded) { isExpanded = true; setSidebarForceHidden(true); expandTimeline.play(); showMenu(); logoTimeline.play(); } };
        const collapseGrid = () => { if (isExpanded) { isExpanded = false; setSidebarForceHidden(false); expandTimeline.reverse(); hideMenu(); logoTimeline.reverse(); } };
        
        centerCard.addEventListener("mouseenter", expandGrid);
        gridContainer.addEventListener("mouseleave", collapseGrid);
        categoriesMenu.addEventListener("mouseenter", expandGrid);
        categoriesMenu.addEventListener("mouseleave", collapseGrid);

        return () => {
            document.body.classList.remove('trophy-page-body');
            gsap.globalTimeline.clear();
            expandTimeline.kill();
            logoTimeline.kill();
            if (setSidebarForceHidden) {
                setSidebarForceHidden(false);
            }
            // Clean up event listeners to prevent memory leaks
            centerCard.removeEventListener("mouseenter", expandGrid);
            gridContainer.removeEventListener("mouseleave", collapseGrid);
            categoriesMenu.removeEventListener("mouseenter", expandGrid);
            categoriesMenu.removeEventListener("mouseleave", collapseGrid);
        };
    }, [appData, setSidebarForceHidden]);

    const categories = ["Investitori", "Profituri", "Recomandări", "Mize Record", "Milestones", "Longevitate", "Strategii", "Comunitate"];

    return (
        <div ref={containerRef} className="w-full h-full flex justify-center items-center">
            <div className="trophy-grid-container" id="gridContainer">
                <div className="trophy-card trophy-card-1" onClick={() => handleCardClick('topInvestor')}><img src="https://i.ibb.co/jZPj0jgt/Chat-GPT-Image-20-sept-2025-20-30-06.png" alt="Top Investor" /><div className="trophy-card-content"><h2>INVESTITORUL LUNII</h2><p>{trophyData.topInvestor.name}</p></div></div>
                <div className="trophy-card trophy-card-2" onClick={() => handleCardClick('recordProfit')}><img src="https://i.ibb.co/21c9xkV0/Chat-GPT-Image-20-sept-2025-20-39-47.png" alt="Record Profit" /><div className="trophy-card-content"><h2>PROFIT RECORD</h2><p>{formatCurrency(trophyData.recordProfit.amount)}</p></div></div>
                <div className="trophy-card trophy-card-3" onClick={() => handleCardClick('platformMilestone')}><img src="https://i.ibb.co/HLKQmKJn/Chat-GPT-Image-20-sept-2025-20-42-04.png" alt="Platform Milestone" /><div className="trophy-card-content"><h2>MILESTONE PLATFORMĂ</h2><p>{trophyData.platformMilestone.investors} Investitori Activi</p></div></div>
                <div className="trophy-card trophy-card-4" onClick={() => handleCardClick('topAmbassador')}><img src="https://i.ibb.co/QvkkMLQ7/Chat-GPT-Image-20-sept-2025-20-43-20.png" alt="Top Referral" /><div className="trophy-card-content"><h2>AMBASADOR TOP</h2><p>Coming Soon...</p></div></div>
                <div className="trophy-card trophy-card-5" id="centerCard"><img src="https://i.ibb.co/jZfMTLGq/Chat-GPT-Image-20-sept-2025-20-44-10.png" alt="Trophy Room Center" id="centerImage" /><div className="trophy-card-content"><h2>{UI_TEXT_ROMANIAN.trophyRoom}</h2><p>Explorează realizările comunității</p></div></div>
                <div className="trophy-card trophy-card-6" onClick={() => handleCardClick('highRoller')}><img src="https://i.ibb.co/Xxbh26T7/Chat-GPT-Image-20-sept-2025-20-50-27.png" alt="High Roller" /><div className="trophy-card-content"><h2>HIGH ROLLER</h2><p>{trophyData.highRoller.name}</p></div></div>
                <div className="trophy-card trophy-card-7" id="flipCard" onClick={() => handleCardClick('tip')}><div className="trophy-card-inner" id="cardInner"><div className="trophy-card-front"><img src="https://i.ibb.co/3m1Q5B9r/Chat-GPT-Image-20-sept-2025-20-46-19.png" alt="Pro Tip" /><div className="trophy-card-content"><h2>SFATUL SĂPTĂMÂNII</h2><p>Înțelepciune de la admin</p></div></div><div className="trophy-card-back"><div className="trophy-quote"><p>"Disciplina este podul dintre obiective și realizări. Rămâi consecvent în strategia ta, chiar și atunci când emoțiile încearcă să preia controlul."</p><span className="trophy-author">Admin</span></div></div></div></div>
                <div className="trophy-card trophy-card-8" onClick={() => handleCardClick('veteranInvestor')}><img src="https://i.ibb.co/rrxwJhf/Chat-GPT-Image-20-sept-2025-20-47-43.png" alt="Veteran Investor" /><div className="trophy-card-content"><h2>INVESTITOR VETERAN</h2><p>Coming Soon...</p></div></div>
                <div className="trophy-card trophy-card-9" onClick={() => handleCardClick('winningStreak')}><img src="https://i.ibb.co/fzCtk8MB/Chat-GPT-Image-20-sept-2025-20-48-39.png" alt="Winning Streak" /><div className="trophy-card-content"><h2>SERIE DE VICTORII</h2><p>{trophyData.winningStreak.days} Zile Consecutive</p></div></div>
            </div>

            <div className="trophy-categories" id="categoriesMenu">
                {categories.map((cat, i) => (
                    <div key={i} className="trophy-category" onClick={() => handleCardClick('category', cat)}>{cat}</div>
                ))}
            </div>

            <Link to="/" className="trophy-logo" id="logoContainer">
                <div className="trophy-logo-wrapper">
                    <span className="trophy-char v-char" data-index="0">S</span>
                    <span className="trophy-char" data-index="1">A</span>
                    <span className="trophy-char" data-index="2">L</span>
                    <span className="trophy-char" data-index="3">A</span>
                    <span className="trophy-char trophy-spacer" data-index="4"> </span>
                    <span className="trophy-char s-char" data-index="5">T</span>
                    <span className="trophy-char" data-index="6">R</span>
                    <span className="trophy-char" data-index="7">O</span>
                    <span className="trophy-char" data-index="8">F</span>
                    <span className="trophy-char" data-index="9">E</span>
                    <span className="trophy-char" data-index="10">E</span>
                    <span className="trophy-char" data-index="11">L</span>
                    <span className="trophy-char" data-index="12">O</span>
                    <span className="trophy-char" data-index="13">R</span>
                </div>
            </Link>

            <Link to="/desert-oasis" className="trophy-mysterious-message" id="mysteriousMessage">Numele tău poate fi următorul...</Link>
            <div className="trophy-interactive-area" id="interactiveArea"></div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalContent.title}>
                <div className="text-neutral-700 dark:text-neutral-200">{modalContent.body}</div>
                 <div className="mt-6 flex justify-end">
                    <Button onClick={() => setIsModalOpen(false)}>Închide</Button>
                </div>
            </Modal>
        </div>
    );
};

export default TrophyRoomPage;