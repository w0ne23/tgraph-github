import { useState } from 'react';

export default function QAPanel({ onClose }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const exampleQuestions = [
    "이 프로젝트의 주요 기여자는 누구인가요?",
    "백엔드 API는 어떤 파일들로 구성되어 있나요?",
    "가장 많이 수정된 파일은 무엇인가요?",
    "프론트엔드와 백엔드 개발자 간의 협업 패턴을 설명해주세요",
    "이 프로젝트의 전체 아키텍처를 설명해주세요"
  ];

  const handleAsk = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'API 요청 실패');
      }

      const data = await response.json();
      setAnswer(data);
      setHistory(prev => [...prev, { question: question.trim(), answer: data }]);
      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (q) => {
    setQuestion(q);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e1e4e8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#24292f' }}>
            AI Q&A - TGraphRAG
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#57606a'
            }}
          >
            x
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Example Questions */}
          {!answer && history.length === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#57606a', fontSize: '13px' }}>
                예시 질문
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {exampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleExampleClick(q)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      background: '#f6f8fa',
                      border: '1px solid #d0d7de',
                      borderRadius: '20px',
                      cursor: 'pointer',
                      color: '#24292f',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#ddf4ff';
                      e.currentTarget.style.borderColor = '#0969da';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#f6f8fa';
                      e.currentTarget.style.borderColor = '#d0d7de';
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {history.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '28px' }}>
              {/* Question */}
              <div style={{
                background: '#1e3a5f',
                padding: '16px 20px',
                borderRadius: '12px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{
                  color: '#60a5fa',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Question</div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>{item.question}</div>
              </div>
              {/* Answer */}
              <div style={{
                background: '#ffffff',
                padding: '20px 24px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Answer</div>
                <div style={{
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.8',
                  fontSize: '15px',
                  fontWeight: '400'
                }}>
                  {item.answer.answer}
                </div>
                {item.answer.citations && item.answer.citations.length > 0 && (
                  <div style={{
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      참조: {item.answer.citations.map(c => c.label || c.path).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Current Answer */}
          {answer && !history.find(h => h.answer === answer) && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                background: '#ffffff',
                padding: '20px 24px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}>
                <div style={{
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>Answer</div>
                <div style={{
                  color: '#1f2937',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.8',
                  fontSize: '15px',
                  fontWeight: '400'
                }}>
                  {answer.answer}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: '#57606a'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                border: '3px solid #e1e4e8',
                borderTop: '3px solid #0969da',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }} />
              AI가 그래프 데이터를 분석 중입니다...
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              background: '#ffebe9',
              border: '1px solid #ff8182',
              borderRadius: '8px',
              padding: '16px',
              color: '#cf222e',
              marginBottom: '16px'
            }}>
              <strong>오류:</strong> {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e1e4e8',
          background: '#f6f8fa'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="그래프 데이터에 대해 질문하세요..."
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #d0d7de',
                fontSize: '14px',
                resize: 'none',
                minHeight: '48px',
                fontFamily: 'inherit'
              }}
              disabled={loading}
            />
            <button
              onClick={handleAsk}
              disabled={loading || !question.trim()}
              style={{
                padding: '12px 24px',
                background: loading || !question.trim()
                  ? '#94d3a2'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading || !question.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {loading ? '...' : '질문하기'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
