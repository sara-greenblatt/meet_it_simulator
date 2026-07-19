import React, { useState, useEffect, useRef } from 'react';
import { SYSTEM_PROMPTS } from './prompts';
import './App.css';

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const aiPhotoDatabase = {
  bachur: {
    litvish: {
      light: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    },
    sephardic: {
      light: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200',
    },
    chassidish: {
      light: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=200&h=200',
    },
  },
  bachura: {
    litvish: {
      light: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
    },
    sephardic: {
      light: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    },
    chassidish: {
      light: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200&h=200',
      medium: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
    },
  },
};

export default function App() {
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY ?? '');
  const [step, setStep] = useState(DEFAULT_API_KEY ? 1 : 0);

  /* Match Settings */
  const [role, setRole] = useState('בחורה');
  const [partnerName, setPartnerName] = useState('חיים');
  const [sector, setSector] = useState('litvish');
  const [tone, setTone] = useState('medium');
  const [partnerAge, setPartnerAge] = useState(21);
  const [institution, setInstitution] = useState('חברון');
  const [meetingNumber, setMeetingNumber] = useState(1); // Track consecutive meetings

  /* Simulation Engine State */
  const [isSimActive, setIsSimActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [interest, setInterest] = useState(55);
  const [phase, setPhase] = useState('opening');
  const [messages, setMessages] = useState([]);
  const [hints, setHints] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /* Metrics */
  const [goodAnswers, setGoodAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [arrivalMode, setArrivalMode] = useState('לבד');

  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sectorLabel = {
    litvish: 'ליטאי שמרני',
    sephardic: 'ספרדי / בני תורה',
    chassidish: 'חסידי אותנטי',
  }[sector];

  const genderKey = role === 'בחורה' ? 'בחור' : 'בחורה';
  const genderImgKey = role === 'בחורה' ? 'bachur' : 'bachura';
  const partnerImage = aiPhotoDatabase[genderImgKey]?.[sector]?.[tone] || '';

  const handleRoleChange = (e) => {
    const value = e.target.value;
    setRole(value);
    if (value === 'בחורה') {
      setPartnerName('חיים');
      setInstitution('חברון');
    } else {
      setPartnerName('מיכל');
      setInstitution('החדש');
    }
  };

  function safeParseGeminiJSON(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      console.warn('Gemini returned invalid JSON structure:', text);
      let cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return {
          botResponse: 'נשמע מעניין מאוד. תרצה/י לספר לי קצת על סדר היום שלך?',
          hints: ['איך נראה יום טיפוסי?', 'מה אתה אוהב לעשות בזמן הפנוי?'],
          phase: 'conversation',
          shouldEnd: false,
        };
      }
    }
  }

  const startSimulation = async () => {
    let arrival = 'לבד';
    // Only calculate arrival with parents if it's the very first meeting
    if (meetingNumber === 1) {
      if (partnerAge <= 21) {
        arrival = Math.random() > 0.5 ? 'עם אבא ואמא' : 'עם אבא';
      } else if (partnerAge <= 24) {
        arrival = 'עם אבא';
      }
    }

    setArrivalMode(arrival);
    setIsSimActive(true);
    setIsFinished(false);
    setMinutes(0);

    const initialMessages = [
      {
        type: 'sys',
        text: meetingNumber === 1 && arrival !== 'לבד'
          ? `פגישה ראשונה. המועמד הגיע בליווי ${arrival}. ההורים יצאו וכעת אתם לבד.`
          : `פגישה מספר ${meetingNumber} מתחילה באווירה מוכרת ונעימה יותר.`,
      },
      {
        type: 'meta',
        text: `${genderKey === 'בחור' ? 'הבחור פותח את השיחה.' : 'הפגישה מתחילה.'}`,
      },
    ];

    setMessages(initialMessages);
    await runEngine(initialMessages, arrival);
  };

  const nextMeetingSetup = () => {
    setMeetingNumber((prev) => prev + 1);
    // Dynamic initialization for successive turns
    startSimulation();
  };

  const runEngine = async (currentMessages, currentArrival = arrivalMode) => {
    if (minutes >= 35) {
      endSimulation();
      return;
    }

    setIsLoading(true);

    try {
      const history = currentMessages
        .filter((m) => m.type === 'user' || m.type === 'bot')
        .map((m) => `${m.sender}: ${m.text}`)
        .join('\n');

      const prompt = SYSTEM_PROMPTS.generatePrompt({
        partnerName,
        partnerAge,
        sectorLabel,
        institution,
        genderKey,
        minutes,
        meetingNumber,
        arrivalMode: currentArrival,
        history
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  botResponse: { type: 'STRING' },
                  hints: { type: 'ARRAY', items: { type: 'STRING' } },
                  phase: { type: 'STRING' },
                  shouldEnd: { type: 'BOOLEAN' },
                },
                required: ['botResponse', 'hints', 'phase', 'shouldEnd'],
              },
            },
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      const text = result.candidates[0].content.parts[0].text;
      const jsonData = safeParseGeminiJSON(text);

      setPhase(jsonData.phase);

      if (jsonData.botResponse) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            sender: partnerName,
            text: jsonData.botResponse,
          },
        ]);
      }

      setHints(jsonData.hints || []);

      if (jsonData.shouldEnd) {
        setTimeout(() => {
          endSimulation();
        }, 3500);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          type: 'sys',
          text: 'שגיאה בתקשורת עם מנוע ה-AI.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const processUserMsg = async () => {
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue.trim();
    setInputValue('');
    setTotalAnswers((prev) => prev + 1);

    const userName = role === 'בחור' ? 'אני (הבחור)' : 'אני (הבחורה)';
    const nextMessages = [
      ...messages,
      {
        type: 'user',
        sender: userName,
        text,
      },
    ];

    setMessages(nextMessages);

    // Scoring heuristics based on length of response
    if (text.length > 25) {
      setGoodAnswers((prev) => prev + 1);
      setInterest((prev) => Math.min(100, prev + 6));
    } else if (text.length < 12) {
      setInterest((prev) => Math.max(10, prev - 4));
    }

    let addTime = 4;
    if (minutes < 10) addTime = 3;
    else if (minutes < 25) addTime = 5;

    setMinutes((prev) => prev + addTime);
    await runEngine(nextMessages);
  };

  const endSimulation = () => {
    setIsFinished(true);
  };

  const getFinalMetrics = () => {
    let score = Math.round((interest + (goodAnswers / (totalAnswers || 1)) * 100) / 2);
    score = Math.max(15, Math.min(100, score));

    let title = '👟 כדאי להשתפשף יותר לפעם הבאה';
    let desc = 'השיחה הרגישה קצת קטועה או רשמית מדי. כדאי לפתח שיח חופשי יותר.';

    if (score >= 75) {
      title = `✨ פגישה ${meetingNumber} הסתיימה בהצלחה מרובה!`;
      desc = 'השיחה זרמה בצורה טבעית, מכובדת ואנושית. התנהלות מעולה.';
    } else if (score >= 50) {
      title = '🤔 יש פוטנציאל חיובי';
      desc = 'השיחה הייתה בסך הכל בסדר, אך מומלץ להעמיק במענה ולא להיצמד לשבלונות.';
    }

    return { score, title, desc };
  };

  /* UI Setup View Flow */
  if (!isSimActive) {
    return (
      <div className="main-card">
        <div className="header-app">
          <h1>טרקלין שידוכי העלית - AI Edition</h1>
          <p>סימולציית פגישה מבוססת תפקידים והתקדמות כרונולוגית</p>
        </div>

        <div className="content-flow">
          {step === 0 && (
            <div className="form-control">
              <label>הזן Gemini API Key</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <button className="btn btn-gold" disabled={!apiKey} onClick={() => setStep(1)}>המשך</button>
            </div>
          )}

          {step === 1 && (
            <div className="form-control">
              <label>בחר תפקיד</label>
              <select value={role} onChange={handleRoleChange}>
                <option value="בחורה">👩 אני בחורה </option>
                <option value="בחור">👨 אני בחור </option>
              </select>
              <button className="btn btn-gold" onClick={() => setStep(2)}>המשך</button>
            </div>
          )}

          {step === 2 && (
            <div className="form-control">
              <label>שם המועמד/ת</label>
              <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
              <button className="btn btn-gold" onClick={() => setStep(3)}>המשך</button>
            </div>
          )}

          {step === 3 && (
            <div className="form-control">
              <label>סגנון המגזר</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="litvish">ליטאי</option>
                <option value="sephardic">ספרדי</option>
                <option value="chassidish">חסידי</option>
              </select>
              <button className="btn btn-gold" onClick={() => setStep(4)}>המשך</button>
            </div>
          )}

          {step === 4 && (
            <div className="form-control">
              <label>גוון מראה</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="light">בהיר</option>
                <option value="medium">בינוני</option>
                <option value="dark">כהה</option>
              </select>
              <button className="btn btn-gold" onClick={() => setStep(5)}>המשך</button>
            </div>
          )}

          {step === 5 && (
            <div className="form-control">
              <label>גיל</label>
              <input type="number" value={partnerAge} onChange={(e) => setPartnerAge(Number(e.target.value))} />
              <button className="btn btn-gold" onClick={() => setStep(6)}>המשך</button>
            </div>
          )}

          {step === 6 && (
            <div className="form-control">
              <label>
                {role === 'בחורה' ? `באיזו ישיבה ${partnerName} לומד?` : `באיזה סמינר ${partnerName} לומדת?`}
              </label>
              <input value={institution} onChange={(e) => setInstitution(e.target.value)} />
              <button className="btn btn-gold" onClick={startSimulation}>
                🚀 כניסה לפגישה מספר {meetingNumber}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const finalSummary = getFinalMetrics();

  return (
    <div className="main-card">
      <div className="header-app">
        <h1>טרקלין שידוכי העלית</h1>
        <p>פגישה {meetingNumber} מתוך רצף ההיכרות</p>
      </div>

      <div className="status-bar">
        <div className="status-item">⏱️ {minutes} דק׳</div>
        <div className="status-item">❤️ {interest}% עניין</div>
        <div className="status-item">🗣️ {phase}</div>
        <div className="status-item">📅 פגישה {meetingNumber}</div>
      </div>

      <div className="chat-arena">
        <div className="chat-profile-bar">
          <img src={partnerImage} className="chat-profile-img" style={{ opacity: 0.4 }} alt="profile" />
          <div>
            <strong>{partnerName}</strong>
            <div>{sectorLabel} | גיל {partnerAge} | {institution}</div>
          </div>
          {!isFinished && (
            <button className="btn btn-gold" onClick={endSimulation}>סיום מוקדם</button>
          )}
        </div>

        <div className="chat-container" ref={chatBoxRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`msg msg-${msg.type}`}>
              {msg.sender && <strong>{msg.sender}:</strong>} {msg.text}
            </div>
          ))}

          {isLoading && (
            <div className="msg msg-sys">
              {role === 'בחורה' ? `הבחור ${partnerName} מנסח תשובה...` : `הבחורה ${partnerName} מנסחת תשובה...`}
            </div>
          )}

          {isFinished && (
            <div className="summary-box">
              <h3>📋 סיכום פגישה מספר {meetingNumber}</h3>
              <div className="score-badge">{finalSummary.score}%</div>
              <h4>{finalSummary.title}</h4>
              <p>{finalSummary.desc}</p>
              
              <div className="action-buttons-group" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="btn btn-gold" onClick={nextMeetingSetup}>
                  ➡️ המשך לפגישה הבאה (פגישה {meetingNumber + 1})
                </button>
                <button className="btn" style={{ borderColor: '#ccc' }} onClick={() => window.location.reload()}>
                  🔄 התחל הכל מחדש
                </button>
              </div>
            </div>
          )}
        </div>

        {!isFinished && (
          <>
            <div className="hints-box">
              {hints.map((h, index) => (
                <span key={index} className="hint-tag" onClick={() => setInputValue(h)}>
                  {h}
                </span>
              ))}
            </div>

            <div className="input-area">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processUserMsg()}
                placeholder="הקלד/י תגובה מכובדת..."
              />
              <button className="send-btn" onClick={processUserMsg}>שלח</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
