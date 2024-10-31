import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { Card, DeckState } from './types';
import ImportCards from './components/ImportCards';
import Confetti from 'react-confetti';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [deckState, setDeckState] = useState<DeckState>(() => {
    const savedStates = localStorage.getItem('allDeckStates');
    if (savedStates) {
      try {
        const parsed = JSON.parse(savedStates);
        const currentDeckId = localStorage.getItem('currentDeckId');
        if (currentDeckId && parsed[currentDeckId]) {
          return {
            ...parsed[currentDeckId],
            rememberedCards: new Set<string>(parsed[currentDeckId].rememberedCards || [])
          };
        }
      } catch (e) {
        console.error('Error parsing saved states:', e);
      }
    }

    return {
      cards: [],
      queue: [],
      queueSize: 5,
      selectionMode: 'random' as const,
      rememberedCards: new Set<string>()
    };
  });
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    if (deckState.cards.length === 0) return;
    
    const deckId = btoa(JSON.stringify(deckState.cards.map(c => c.id).sort()));
    const savedStates = localStorage.getItem('allDeckStates');
    const allStates = savedStates ? JSON.parse(savedStates) : {};
    
    allStates[deckId] = {
      ...deckState,
      rememberedCards: Array.from(deckState.rememberedCards)
    };
    
    localStorage.setItem('allDeckStates', JSON.stringify(allStates));
  }, [deckState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleReset = () => {
    const newState: DeckState = {
      cards: deckState.cards,
      queue: deckState.cards.slice(0, deckState.queueSize),
      queueSize: deckState.queueSize,
      selectionMode: deckState.selectionMode,
      rememberedCards: new Set<string>()
    };
    setDeckState(newState);
    setShowAnswer(false);
  };

  const handleQueueSizeChange = (newSize: number) => {
    setDeckState(prev => {
      const newQueue = [...prev.queue];
      
      if (newSize > prev.queue.length) {
        const availableCards = prev.cards.filter(
          card => !newQueue.some(qCard => qCard.id === card.id)
        );
        
        while (newQueue.length < newSize && availableCards.length > 0) {
          if (prev.selectionMode === 'random') {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            newQueue.push(availableCards[randomIndex]);
            availableCards.splice(randomIndex, 1);
          } else {
            newQueue.push(availableCards[0]);
            availableCards.splice(0, 1);
          }
        }
      } else {
        newQueue.splice(newSize);
      }

      return {
        ...prev,
        queueSize: newSize,
        queue: newQueue
      };
    });
  };

  const handleSelectionModeChange = (mode: 'random' | 'sequential') => {
    setDeckState(prev => ({
      ...prev,
      selectionMode: mode
    }));
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleResponse = useCallback((remembered: boolean) => {
    if (!currentCard) return;

    if (remembered) {
      setDeckState(prev => {
        const newQueue = prev.queue.filter(card => card.id !== currentCard.id);
        let nextCard = null;
        let newRememberedCards = new Set(prev.rememberedCards);
        
        newRememberedCards.add(currentCard.id);
        
        if (prev.selectionMode === 'sequential') {
          if (newRememberedCards.size === prev.cards.length) {
            newRememberedCards = new Set();
          }
          
          for (let i = 0; i < prev.cards.length; i++) {
            const candidate = prev.cards[i];
            if (!newQueue.some(qCard => qCard.id === candidate.id) && 
                !newRememberedCards.has(candidate.id)) {
              nextCard = candidate;
              break;
            }
          }
        } else {
          const availableCards = prev.cards.filter(
            card => !newQueue.some(qCard => qCard.id === card.id) && 
                   card.id !== currentCard.id
          );
          if (availableCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableCards.length);
            nextCard = availableCards[randomIndex];
          }
        }

        if (nextCard && newQueue.length < prev.queueSize) {
          newQueue.push(nextCard);
        }

        return {
          ...prev,
          queue: newQueue,
          rememberedCards: newRememberedCards
        };
      });
    } else {
      setDeckState(prev => {
        const remainingCards = prev.queue.filter(card => card.id !== currentCard.id);
        const newQueue = [...remainingCards];
        
        if (newQueue.length < prev.queueSize) {
          newQueue.push(currentCard);
        }

        return {
          ...prev,
          queue: newQueue,
        };
      });
    }

    setShowAnswer(false);
    setShowSettings(false);
  }, [currentCard]);

  const handleLoadNewDeck = () => {
    setCurrentCard(null);
    setShowAnswer(false);
    setShowSettings(false);
  };

  const handleImportCards = (newCards: Card[]) => {
    const deckId = btoa(JSON.stringify(newCards.map(c => c.id).sort()));
    const savedStates = localStorage.getItem('allDeckStates');
    const allStates = savedStates ? JSON.parse(savedStates) : {};
    
    if (allStates[deckId]) {
      const savedState = allStates[deckId];
      setDeckState({
        cards: newCards,
        queue: savedState.queue,
        queueSize: savedState.queueSize || 5,
        selectionMode: savedState.selectionMode || 'random',
        rememberedCards: new Set<string>(savedState.rememberedCards || [])
      });
    } else {
      setDeckState({
        cards: newCards,
        queue: newCards.slice(0, 5),
        queueSize: 5,
        selectionMode: 'random',
        rememberedCards: new Set<string>()
      });
    }
    
    localStorage.setItem('currentDeckId', deckId);
  };

  useEffect(() => {
    if (deckState.queue.length > 0) {
      setCurrentCard(deckState.queue[0]);
    } else {
      setCurrentCard(null);
    }
  }, [deckState.queue]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!currentCard) return;

      switch (event.key) {
        case ' ': // Space key
          event.preventDefault(); // Prevent page scroll
          if (!showAnswer) {
            handleShowAnswer();
          } else {
            handleResponse(true);
          }
          break;
        case 'x':
        case 'X':
          if (showAnswer) {
            handleResponse(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentCard, showAnswer, handleResponse]);

  useEffect(() => {
    if (deckState.cards.length > 0 && deckState.rememberedCards.size === deckState.cards.length) {
      console.log('All cards remembered!', {
        totalCards: deckState.cards.length,
        rememberedCards: deckState.rememberedCards.size
      });
      setShowCelebration(true);
      
      // Reset celebration after 5 seconds
      const timer = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [deckState.rememberedCards.size, deckState.cards.length]);

  useEffect(() => {
    console.log('Celebration state changed:', showCelebration);
  }, [showCelebration]);

  const getPublicPath = (path: string) => {
    // This helps resolve paths correctly when deployed to GitHub Pages
    const publicUrl = process.env.PUBLIC_URL || '/fact-cramming-app';
    return `${publicUrl}${path}`;
  };

  return (
    <div className="App">
      {showCelebration && (
        <div className="celebration-container">
          <Confetti
            width={windowDimensions.width}
            height={windowDimensions.height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
            tweenDuration={4000}
          />
          <div className="celebration-message">
            <h2>🎉 Congratulations! 🎉</h2>
            <p>You've successfully remembered all the cards!</p>
          </div>
        </div>
      )}
      <div className="cramming-container">
        {currentCard ? (
          <>
            <div className="controls">
              <div className="settings-dropdown" ref={settingsRef}>
                <button 
                  className="settings-toggle"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  ⚙️ Settings
                </button>
                {showSettings && (
                  <div className="settings-panel">
                    <div className="control-buttons">
                      <button onClick={handleReset}>Reset Queue</button>
                      <button onClick={handleLoadNewDeck}>Load New Deck</button>
                    </div>
                    <div className="queue-size-control">
                      <label>
                        Queue Size:
                        <input
                          type="number"
                          min="1"
                          max={deckState.cards.length}
                          value={deckState.queueSize}
                          onChange={(e) => handleQueueSizeChange(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </label>
                    </div>
                    <div className="selection-mode-control">
                      <label>
                        Card Selection:
                        <select
                          value={deckState.selectionMode}
                          onChange={(e) => handleSelectionModeChange(e.target.value as 'random' | 'sequential')}
                        >
                          <option value="random">Random</option>
                          <option value="sequential">Sequential</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="card-display">
              <div className="progress-indicator">
                <div className="progress-text">
                  {deckState.rememberedCards.size} / {deckState.cards.length} remembered
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${(deckState.rememberedCards.size / deckState.cards.length) * 100}%`
                    }}
                  />
                </div>
              </div>
              
              <div className="prompt" style={{
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <div className="content">{currentCard.prompt}</div>
                {currentCard.promptImage && (
                  <img 
                    src={getPublicPath(currentCard.promptImage)} 
                    alt="Prompt illustration" 
                    className="card-image"
                  />
                )}
              </div>
              
              <div className="answer-section" style={{ visibility: showAnswer ? 'visible' : 'hidden' }}>
                <div className="answer">
                  <div className="content">{currentCard.answer}</div>
                  {currentCard.answerImage && (
                    <img 
                      src={getPublicPath(currentCard.answerImage)} 
                      alt="Answer illustration" 
                      className="card-image"
                    />
                  )}
                </div>
              </div>

              <div className="response-area">
                {!showAnswer ? (
                  <button onClick={handleShowAnswer} className="show-answer-button">
                    Show Answer <span className="key-hint">(Space)</span>
                  </button>
                ) : (
                  <div className="response-buttons">
                    <button onClick={() => handleResponse(true)}>
                      Remembered <span className="key-hint">(Space)</span>
                    </button>
                    <button onClick={() => handleResponse(false)}>
                      Forgot <span className="key-hint">(X)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <ImportCards onImport={handleImportCards} />
        )}
      </div>
    </div>
  );
}

export default App;
