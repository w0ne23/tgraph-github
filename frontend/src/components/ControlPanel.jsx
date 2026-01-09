export default function ControlPanel({ 
  viewMode, setViewMode, contributors, 
  selectedContributor, onContributorSelect,
  onShowDashboard  // ✨ 새로 추가
}) {
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'all') onContributorSelect(null);
  };

  return (
    <div style={{
      position: 'absolute', top: 16, right: 16, zIndex: 10,
      padding: '16px', background: 'rgba(255,255,255,0.95)',
      borderRadius: 12, border: '1px solid #d0d7de',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '260px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
        🎯 뷰 모드
      </h4>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <ModeButton active={viewMode === 'all'} onClick={() => handleViewModeChange('all')} label="🌐 전체 뷰" />
        <ModeButton active={viewMode === 'contributor-focused'} onClick={() => handleViewModeChange('contributor-focused')} label="👥 기여자 중심" />
      </div>

      {/* ✨ 프로젝트 분석 버튼 추가 */}
      <button
        onClick={onShowDashboard}
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '13px',
          fontWeight: 'bold',
          borderRadius: '8px',
          border: '2px solid #0969da',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        📊 프로젝트 분석 보기
      </button>

      {viewMode === 'contributor-focused' && (
        <>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 12, color: '#57606a' }}>기여자 선택 (클릭하여 필터링)</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {contributors.map(c => (
              <button
                key={c.id}
                onClick={() => onContributorSelect(c.id)}
                style={{
                  padding: '8px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                  border: selectedContributor === c.id ? '2px solid #e3b341' : '1px solid #d0d7de',
                  background: selectedContributor === c.id ? '#fff8e6' : 'white',
                }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#e3b341' }} />
                <span style={{ fontWeight: selectedContributor === c.id ? 'bold' : 'normal' }}>{c.label}</span>
                {selectedContributor === c.id && <span style={{ marginLeft: 'auto', color: '#e3b341' }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
        border: active ? '2px solid #0969da' : '1px solid #d0d7de',
        background: active ? '#ddf4ff' : 'white',
        color: active ? '#0969da' : '#24292f',
        fontWeight: active ? 'bold' : 'normal',
      }}
    >
      {label}
    </button>
  );
}