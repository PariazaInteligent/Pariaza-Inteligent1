import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

// Data is self-contained for this decorative widget - TRANSLATED & CONTEXTUALIZED
const chatMessages = [
  { name: "Andrei Popa", message: "Ce zi bună! Profitul de azi e excelent. Felicitări, admin! 🙏", time: "acum 3 min", image: "dlzczfvk.png" },
  { name: "Elena Ionescu", message: "Ați văzut pariurile de azi? Meciul de la ora 19:00 pare riscant...", time: "acum 2 min", image: "omqfaaew.png" },
  { name: "Cristian Vasile", message: "Tocmai am mai făcut o depunere. Sper să prindem o perioadă bună! 🦋", time: "acum 1 min", image: "lxomcrfk.png" },
  { name: "Andrei Popa", message: "Da, am încredere în strategie. Pe termen lung ieșim pe plus.", time: "acum 42 sec", image: "dlzczfvk.png" },
  { name: "Mihai Cojocaru", message: "Cum pot vedea un raport detaliat pe luna trecută?", time: "acum 41 sec", image: "nxmjbpog.png" },
  { name: "Sofia Nistor", message: "Am făcut prima mea retragere. Super rapid procesul! 🎉", time: "acum 39 sec", image: "hjppfxab.png" },
  { name: "Matei Preda", message: "Sfatul de la Lumen AI de azi a fost interesant. Ce părere aveți? ♠️", time: "acum 35 sec", image: "tsqntlqa.png" },
  { name: "Elena Albulescu", message: "Azi am fost pe minus, se mai întâmplă. Mâine e o nouă zi. 🔥", time: "acum 30 sec", image: "lxomcrfk.png" },
  { name: "George Bratu", message: "Răbdare, pe termen lung se vede profitul. Așa funcționează.", time: "acum 25 sec", image: "gplmeerg.png" },
  { name: "Olivia Voicu", message: "Am primit ecusonul de 'Veteran'. Mă simt bătrână pe platformă, haha.", time: "acum 22 sec", image: "citzybgj.png" },
  { name: "Matei Rusu", message: "Încă puțin și îmi ating obiectivul de 1.500 EUR! Mulțumesc, admin! 🍀", time: "acum 18 sec", image: "tzkduupn.png" },
  { name: "Ana Maria Dinu", message: "Confirm, și la mine a intrat repede retragerea. Seriozitate maximă! 🎰", time: "acum 15 sec", image: "kghwqeie.png" },
];

let currentMessageIndex = 4;

const CommunityChatWidget: React.FC = () => {
    const messageListRef = useRef<HTMLDivElement>(null);
    const animationInterval = useRef<number | null>(null);
    const started = useRef(false);

    const getNextMessage = () => {
        currentMessageIndex = (currentMessageIndex + 1) % chatMessages.length;
        return chatMessages[currentMessageIndex];
    };
    
    useEffect(() => {
        // Prevent re-initialization on re-renders
        if (started.current || !messageListRef.current) return;
        started.current = true;

        const messageList = messageListRef.current;
        
        const prepareNextMessage = (): HTMLDivElement => {
            const message = getNextMessage();
            const messageDiv = document.createElement('div');
            messageDiv.className = 'community-chat-message-item';
            
            const isOdd = (messageList.children.length % 2) !== 0;

            messageDiv.innerHTML = `
                <div class="community-chat-message-content ${isOdd ? 'odd' : 'even'}">
                    <img src="https://assets.codepen.io/3685267/betting-app-${message.image}" alt="${message.name}" class="size-9 object-center object-cover shrink-0 rounded-full" />
                    <div class="grow pl-2 text-sm">
                        <div class="text-[#6c6c6c] font-semibold">${message.name}</div>
                        <div class="text-[#807f7f] text-xs">${message.message}</div>
                        <div class="text-right text-[#6c6c6c] text-[10px] mt-1">${message.time}</div>
                    </div>
                    <div class="absolute top-0 size-6 right-3 grid place-items-center text-[#6c6c6c] opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                    </div>
                </div>`;
            messageList.appendChild(messageDiv);
            return messageDiv;
        };
        
        const animateStep = () => {
             const items = messageList.querySelectorAll<HTMLElement>('.community-chat-message-item');
             gsap.to(items, {
                y: (i) => (i - 1) * 112,
                duration: 0.6,
                ease: 'power2.inOut',
                onComplete: () => {
                    if (items.length > 5) { // Keep DOM clean
                        messageList.removeChild(items[0]);
                    }
                }
             });
             // Add a new item to the bottom (off-screen)
             const newItem = prepareNextMessage();
             // Animate it into view
             gsap.fromTo(newItem, { y: 600, opacity: 0 }, { y: (items.length) * 112, opacity: 1, duration: 0.6, ease: 'power2.out' });
        };

        // Initial population
        for (let i = 0; i < 5; i++) {
            prepareNextMessage();
        }
        const initialItems = messageList.querySelectorAll<HTMLElement>('.community-chat-message-item');
        gsap.to(initialItems, {
            y: (i) => i * 112,
            duration: 0.8,
            stagger: 0.1,
            opacity: 1,
            ease: 'power3.out'
        });
        
        animationInterval.current = window.setInterval(animateStep, 4000);

        return () => {
            if (animationInterval.current) {
                clearInterval(animationInterval.current);
            }
            if(messageList) {
                gsap.killTweensOf(messageList.children);
            }
        };
    }, []);

    return (
        <div className="community-chat-widget">
            <header className="community-chat-header">
                <h3 className="text-lg font-bold community-chat-title">Chat Comunitate</h3>
            </header>
            <div ref={messageListRef} className="community-chat-list-container">
                {/* Messages will be appended here by GSAP */}
            </div>
            <footer className="community-chat-footer">
                <input
                    type="text"
                    placeholder="Chat-ul este doar pentru vizualizare"
                    className="w-full focus:outline-none border-2 border-zinc-700 px-3 h-9 rounded-md focus:border-zinc-600 text-zinc-400 caret-zinc-400 bg-zinc-800 text-sm"
                    disabled
                />
            </footer>
        </div>
    );
};

export default CommunityChatWidget;