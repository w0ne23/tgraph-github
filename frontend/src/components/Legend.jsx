const NODE_COLORS = {
  issue: '#f85149',
  pull_request: '#a371f7',
  commit: '#3fb950',
  contributor: '#e3b341',
  file: '#1f6feb'
};

export default function Legend({ status }) {
  return (
    <div style={{
      position: 'absolute', top: 16, left: 16, zIndex: 10,
      padding: '16px', background: 'rgba(255,255,255,0.95)',
      borderRadius: 12, border: '1px solid #d0d7de',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '180px'
    }}>
      <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#021550', borderBottom: '1px solid #eee', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🔍 T-Graph 카테고리
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <LegendItem color={NODE_COLORS.contributor} emoji="👤" label="기여자 (Contributor)" />
        <LegendItem color={NODE_COLORS.file} emoji="📄" label="파일 (File)" />
        <LegendItem color={NODE_COLORS.issue} emoji="🚨" label="이슈 (Issue)" />
        <LegendItem color={NODE_COLORS.pull_request} emoji="🔀" label="PR (Pull Request)" />
        <LegendItem color={NODE_COLORS.commit} emoji="💬" label="커밋 (Commit)" />
      </div>
      <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee', fontSize: '10px', color: status === 'error' ? '#f85149' : '#8b949e' }}>
        {status === 'loading' && '⏳ 데이터 로드 중...'}
        {status === 'loaded' && '✓ 시스템 정상 작동 중'}
        {status === 'error' && '✗ 연결 오류 발생'}
      </div>
    </div>
  );
}

function LegendItem({ color, emoji, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#24292f' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, border: '1px solid rgba(0,0,0,0.1)' }} />
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{emoji} {label}</span>
    </div>
  );
}