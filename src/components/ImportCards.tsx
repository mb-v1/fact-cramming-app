import React from 'react';
import { Card } from '../types';

interface ImportCardsProps {
  onImport: (cards: Card[]) => void;
}

function ImportCards({ onImport }: ImportCardsProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const cardsData = JSON.parse(e.target?.result as string);
        const cards = cardsData.map((card: Omit<Card, 'id'>, index: number) => ({
          ...card,
          id: crypto.randomUUID()
        }));
        onImport(cards);
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const exampleJson = `[
    {
      "id": "1",
      "prompt": "What is the capital of France?",
      "answer": "Paris",
      "promptImage": "https://example.com/eiffel-tower.jpg",
      "answerImage": "https://example.com/paris-map.jpg"
    },
    {
      "id": "2",
      "prompt": "What does this kanji mean? (hover for pronunciation)",
      "promptImage": "https://example.com/kanji-water.jpg",
      "answer": "Water (みず, mizu)"
    },
    {
      "id": "3",
      "prompt": "Identify this constellation:",
      "promptImage": "https://example.com/orion-stars.jpg",
      "answer": "Orion's Belt",
      "answerImage": "https://example.com/orion-connected.jpg"
    }
  ]`;

  return (
    <div className="import-cards" style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '20px 0'
    }}>
      <h3>Import Cards</h3>
      <input
        type="file"
        accept=".json"
        onChange={handleFileUpload}
      />
      <p className="import-instructions">
        Upload a JSON file with the following format:
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          overflowX: 'auto'
        }}>
          {exampleJson}
        </pre>
      </p>
    </div>
  );
}

export default ImportCards; 