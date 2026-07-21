import React, { useState, useEffect, useRef } from 'react';
import { SYSTEM_PROMPTS, VIBE_PROFILES } from './prompts';
import { resolveInstitutionVibeContext } from './institutionVibeSelection';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import './App.css';

const DEFAULT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const aiPhotoDatabase = {
  bachur: {
    litvish: {
      light:
        'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200&h=200',
    },
    sephardic: {
      light:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&q=80&w=200&h=200',
    },
    chassidish: {
      light:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1489980508314-941910ded1f4?auto=format&fit=crop&q=80&w=200&h=200',
    },
  },
  bachura: {
    litvish: {
      light:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200&h=200',
    },
    sephardic: {
      light:
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200&h=200',
    },
    chassidish: {
      light:
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=200&h=200',
      dark: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200&h=200',
      medium:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
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
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);
  const [continuationEvaluation, setContinuationEvaluation] = useState(null);
  const [advanceState, setAdvanceState] = useState('ready');
  const [isTransitioningToNextMeeting, setIsTransitioningToNextMeeting] = useState(false);
  const [transitionStage, setTransitionStage] = useState('idle');
  const [transitionSecondsLeft, setTransitionSecondsLeft] = useState(0);

  /* Metrics */
  const [goodAnswers, setGoodAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [arrivalMode, setArrivalMode] = useState('לבד');
  const [sessionVibeContext, setSessionVibeContext] = useState({
    vibeId: '',
    source: 'random',
    backgroundSummary: '',
    blacklistedVibeIds: [],
  });

  const chatBoxRef = useRef(null);
  const advanceTimeoutRef = useRef(null);
  const transitionPhaseTimeoutRef = useRef(null);

  const handleVoiceTranscript = (transcript) => {
    setInputValue(transcript);
    processUserMsg(transcript);
  };

  const { isListening, startListening } = useSpeechRecognition({
    language: 'he-IL',
    onTranscriptReady: handleVoiceTranscript,
  });

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
      if (transitionPhaseTimeoutRef.current) {
        clearTimeout(transitionPhaseTimeoutRef.current);
      }
    };
  }, []);

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

  function normalizeDisplayValue(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeDisplayValue(item))
        .filter(Boolean)
        .join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  function normalizeStringList(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => normalizeDisplayValue(item)).filter(Boolean);
  }

  const startSimulation = async (activeMeetingNumber = meetingNumber) => {
    const resolvedMeetingNumber =
      Number.isFinite(activeMeetingNumber) && activeMeetingNumber > 0
        ? activeMeetingNumber
        : meetingNumber;

    let arrival = 'לבד';
    // Only calculate arrival with parents if it's the very first meeting
    if (resolvedMeetingNumber === 1) {
      if (partnerAge <= 21) {
        arrival = Math.random() > 0.5 ? 'עם אבא ואמא' : 'עם אבא';
      } else if (partnerAge <= 24) {
        arrival = 'עם אבא';
      }
    }

    setArrivalMode(arrival);
    setIsSimActive(true);
    setIsFinished(false);
    setIsTransitioningToNextMeeting(false);
    setTransitionStage('idle');
    setTransitionSecondsLeft(0);
    setContinuationEvaluation(null);
    setAdvanceState('ready');
    setMinutes(0);
    setHints([]);
    setPhase('opening');
    setMeetingNumber(resolvedMeetingNumber);

    const initialMessages = [
      {
        type: 'sys',
        text:
          resolvedMeetingNumber === 1 && arrival !== 'לבד'
            ? `פגישה ראשונה. המועמד הגיע בליווי ${arrival}. ההורים יצאו וכעת אתם לבד.`
            : `פגישה מספר ${resolvedMeetingNumber} מתחילה באווירה מוכרת ונעימה יותר.`,
      },
      {
        type: 'meta',
        text: `${genderKey === 'בחור' ? 'הבחור פותח את השיחה.' : 'הפגישה מתחילה.'}`,
      },
    ];

    setMessages(initialMessages);
    const vibeContext = resolveInstitutionVibeContext({ institution });
    setSessionVibeContext(vibeContext);

    await runEngine(initialMessages, arrival, vibeContext, resolvedMeetingNumber, 0);
  };

  const runEngine = async (
    currentMessages,
    currentArrival = arrivalMode,
    vibeContext = sessionVibeContext,
    currentMeetingNumber = meetingNumber,
    currentMinutes = minutes,
  ) => {
    if (currentMinutes >= 12) {
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
        minutes: currentMinutes,
        meetingNumber: currentMeetingNumber,
        arrivalMode: currentArrival,
        history,
        vibeId: vibeContext.vibeId,
        vibeSource: vibeContext.source,
        institutionBackground: vibeContext.backgroundSummary,
        blacklistedVibeIds: vibeContext.blacklistedVibeIds,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
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

      setPhase(normalizeDisplayValue(jsonData.phase) || 'conversation');

      if (jsonData.botResponse) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            sender: partnerName,
            text: normalizeDisplayValue(jsonData.botResponse),
          },
        ]);
      }

      setHints(normalizeStringList(jsonData.hints));

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

  const processUserMsg = async (overrideText) => {
    const rawText = typeof overrideText === 'string' ? overrideText : inputValue;
    const text = rawText.trim();

    if (!text || isLoading) return;

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
    const nextMinutes = minutes + addTime;
    await runEngine(nextMessages, arrivalMode, sessionVibeContext, meetingNumber, nextMinutes);
  };

  const endSimulation = () => {
    setIsFinished(true);
  };

  const evaluateContinuation = async () => {
    if (isDecisionLoading || isLoading || advanceState !== 'ready') {
      return null;
    }

    setIsDecisionLoading(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.type === 'user' || m.type === 'bot')
        .map((m) => `${m.sender}: ${normalizeDisplayValue(m.text)}`)
        .join('\n');

      const meaningfulAnswerRate = totalAnswers ? goodAnswers / totalAnswers : 0;
      const prompt = SYSTEM_PROMPTS.evaluateContinuationPrompt({
        partnerName,
        partnerAge,
        sectorLabel,
        institution,
        genderKey,
        meetingNumber,
        history: conversationHistory,
        calculatedInterest: interest,
        meaningfulAnswerRate,
        totalAnswers,
        goodAnswers,
        vibeId: sessionVibeContext.vibeId,
        vibeSource: sessionVibeContext.source,
        institutionBackground: sessionVibeContext.backgroundSummary,
        blacklistedVibeIds: sessionVibeContext.blacklistedVibeIds,
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.35,
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  shouldContinue: { type: 'BOOLEAN' },
                  reply: { type: 'STRING' },
                  assessment: { type: 'STRING' },
                },
                required: ['shouldContinue', 'reply', 'assessment'],
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

      const shouldContinue = Boolean(jsonData.shouldContinue);
      const reply = normalizeDisplayValue(jsonData.reply).trim();
      const assessment = normalizeDisplayValue(jsonData.assessment).trim();

      const evaluation = {
        shouldContinue,
        reply,
        assessment,
      };

      setContinuationEvaluation(evaluation);
      setAdvanceState(shouldContinue ? 'pending' : 'declined');

      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'bot',
            sender: partnerName,
            text: reply,
          },
        ]);
      }

      return evaluation;
    } catch (error) {
      console.error(error);
      const fallbackEvaluation = {
        shouldContinue: false,
        reply: 'אני חושב שכדאי לעצור כאן ולהשאיר את זה כך.',
        assessment: 'הערכת ההמשך נכשלה, ולכן בחרתי שלא להמשיך אוטומטית.',
      };
      setContinuationEvaluation(fallbackEvaluation);
      setAdvanceState('declined');
      setMessages((prev) => [
        ...prev,
        {
          type: 'sys',
          text: 'לא הצלחנו להעריך את רצון ההמשך של הדמות.',
        },
      ]);
      return fallbackEvaluation;
    } finally {
      setIsDecisionLoading(false);
    }
  };

  const handleAdvanceMeeting = async () => {
    if (isDecisionLoading || isLoading || advanceState !== 'ready') {
      return;
    }

    const evaluation = await evaluateContinuation();
    if (!evaluation?.shouldContinue) {
      return;
    }

    const nextMeetingNumber = meetingNumber + 1;
    setIsFinished(false);
    setIsTransitioningToNextMeeting(true);
    setTransitionStage('enter');
    setTransitionSecondsLeft(6);

    const countdownInterval = setInterval(() => {
      setTransitionSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    transitionPhaseTimeoutRef.current = countdownInterval;

    setTimeout(() => {
      setTransitionStage('exit');
    }, 4000);

    advanceTimeoutRef.current = setTimeout(() => {
      clearInterval(countdownInterval);
      setIsTransitioningToNextMeeting(false);
      setTransitionStage('idle');
      setTransitionSecondsLeft(0);
      startSimulation(nextMeetingNumber);
      advanceTimeoutRef.current = null;
      transitionPhaseTimeoutRef.current = null;
    }, 6000);
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
              <button className="btn btn-gold" disabled={!apiKey} onClick={() => setStep(1)}>
                המשך
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="form-control">
              <label>בחר תפקיד</label>
              <select value={role} onChange={handleRoleChange}>
                <option value="בחורה">👩 אני בחורה </option>
                <option value="בחור">👨 אני בחור </option>
              </select>
              <button className="btn btn-gold" onClick={() => setStep(2)}>
                המשך
              </button>
            </div>
          )}

          {step === 2 && (
            <div
              className="form-control"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <label>שם המועמד/ת</label>
              <input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                style={{
                  width: '95%',
                  margin: '10px 0',
                  height: '30px',
                  border: '1px solid #ccc',
                  borderRadius: '15px',
                  padding: '10px',
                }}
              />
              <button className="btn btn-gold" onClick={() => setStep(3)}>
                המשך
              </button>
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
              <button className="btn btn-gold" onClick={() => setStep(4)}>
                המשך
              </button>
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
              <button className="btn btn-gold" onClick={() => setStep(5)}>
                המשך
              </button>
            </div>
          )}

          {step === 5 && (
            <div className="form-control">
              <label>גיל</label>
              <input
                type="number"
                value={partnerAge}
                onChange={(e) => setPartnerAge(Number(e.target.value))}
              />
              <button className="btn btn-gold" onClick={() => setStep(6)}>
                המשך
              </button>
            </div>
          )}

          {step === 6 && (
            <div
              className="form-control"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              <label>
                {role === 'בחורה'
                  ? `באיזו ישיבה ${partnerName} לומד?`
                  : `באיזה סמינר ${partnerName} לומדת?`}
              </label>
              <input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                style={{
                  width: '95%',
                  margin: '10px 0',
                  height: '30px',
                  border: '1px solid #ccc',
                  borderRadius: '15px',
                  padding: '10px',
                }}
              />
              <button className="btn btn-gold" onClick={() => startSimulation()}>
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
        <div className="status-item">
          🎭{' '}
          {VIBE_PROFILES.find((profile) => profile.id === sessionVibeContext.vibeId)?.label ||
            'אופי'}
        </div>
        <div className="status-item">📅 פגישה {meetingNumber}</div>
      </div>

      <div className="chat-arena">
        <div className="chat-profile-bar">
          <img
            src={partnerImage}
            className="chat-profile-img"
            style={{ opacity: 0.4 }}
            alt="profile"
          />
          <div>
            <strong>{partnerName}</strong>
            <div>
              {sectorLabel} | גיל {partnerAge} | {institution}
            </div>
          </div>
          {!isFinished && (
            <button className="btn btn-gold" onClick={endSimulation}>
              סיום מוקדם
            </button>
          )}
        </div>

        <div className="chat-container" ref={chatBoxRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`msg msg-${msg.type}`}>
              {msg.sender && <strong>{msg.sender}:</strong>} {normalizeDisplayValue(msg.text)}
            </div>
          ))}

          {isLoading && (
            <div className="msg msg-sys">
              {role === 'בחורה'
                ? `הבחור ${partnerName} מנסח תשובה...`
                : `הבחורה ${partnerName} מנסחת תשובה...`}
            </div>
          )}

          {isFinished && !isTransitioningToNextMeeting && (
            <div className="summary-box">
              <h3>📋 סיכום פגישה מספר {meetingNumber}</h3>
              <div className="score-badge">{finalSummary.score}%</div>
              <h4>{finalSummary.title}</h4>
              <p>{finalSummary.desc}</p>
              {continuationEvaluation?.reply && (
                <p style={{ marginTop: '12px', fontWeight: 600 }}>
                  תגובת הצד השני: {continuationEvaluation.reply}
                </p>
              )}
              {continuationEvaluation?.assessment && (
                <p style={{ marginTop: '8px', opacity: 0.8 }}>
                  {continuationEvaluation.assessment}
                </p>
              )}

              <div
                className="action-buttons-group"
                style={{ display: 'flex', gap: '10px', marginTop: '15px' }}
              >
                <button
                  className="btn btn-gold"
                  disabled={isDecisionLoading || advanceState !== 'ready'}
                  onClick={handleAdvanceMeeting}
                >
                  {isDecisionLoading
                    ? 'בודק אם יש רצון להמשיך...'
                    : advanceState === 'pending'
                      ? 'ממשיכים לפגישה הבאה...'
                      : advanceState === 'declined'
                        ? 'הדמות לא מעוניינת להמשיך'
                        : `➡️ המשך לפגישה הבאה (פגישה ${meetingNumber + 1})`}
                </button>
                <button
                  className="btn"
                  style={{ borderColor: '#ccc' }}
                  onClick={() => window.location.reload()}
                >
                  🔄 התחל הכל מחדש
                </button>
              </div>
            </div>
          )}

          {isTransitioningToNextMeeting && (
            <div className={`summary-box summary-box--transition summary-box--${transitionStage}`}>
              <h3>📋 מעבירים לפגישה הבאה</h3>
              <p>הדמות אישרה המשך, והמערכת סוגרת את הסיכום ומתחילה את הפגישה הבאה.</p>
              <p style={{ marginTop: '10px', fontWeight: 700 }}>
                מתחיל בעוד {transitionSecondsLeft} שניות
              </p>
            </div>
          )}
        </div>

        {!isFinished && !isTransitioningToNextMeeting && (
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
                placeholder="הקלד/י תגובה ..."
              />
              <button className="send-btn" onClick={() => processUserMsg()}>
                שלח
              </button>
              <button className="mic-btn" onClick={startListening}>
                {isListening ? '🎙️ Listening...' : '🎤'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
