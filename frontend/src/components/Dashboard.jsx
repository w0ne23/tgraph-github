import { useState } from 'react';

const DOMAIN_COLORS = {
  backend_api: '#FF6B6B',
  frontend_ui: '#4ECDC4',
  database: '#45B7D1',
  visualization: '#FFA07A',
  authentication: '#98D8C8',
  uncategorized: '#95A5A6'
};

export default function DashboardModal({ insights, onClose }) {
  const [selectedDomain, setSelectedDomain] = useState(null);

  if (!insights) {
    return null;
  }

  const handleDomainClick = (domain) => {
    setSelectedDomain(domain === selectedDomain ? null : domain);
  };

  return (
    <div style={styles.overlay}>
      {/* 모달 컨테이너 */}
      <div style={styles.modal}>
        {/* 헤더 */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📊 프로젝트 분석</h2>
            <div style={styles.subtitle}>Repository Insights Dashboard</div>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        {/* 스크롤 가능한 컨텐츠 */}
        <div style={styles.content}>
          {/* 통계 카드 (상단) */}
          <div style={styles.statsGrid}>
            <StatCard 
              icon="📄" 
              label="전체 파일" 
              value={insights.total_files || 0}
              color="#667eea"
            />
            <StatCard 
              icon="👥" 
              label="기여자" 
              value={insights.total_contributors || 0}
              color="#764ba2"
            />
            <StatCard 
              icon="💬" 
              label="커밋" 
              value={insights.total_commits || 0}
              color="#f093fb"
            />
          </div>

          {/* 도메인 분포 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>🎯 도메인 구성</h3>
            <div style={styles.domainGrid}>
              {Object.entries(insights.domain_distribution || {}).map(([domain, count]) => (
                <DomainCard
                  key={domain}
                  domain={domain}
                  count={count}
                  expert={insights.domain_experts?.[domain]}
                  isSelected={selectedDomain === domain}
                  onClick={() => handleDomainClick(domain)}
                />
              ))}
            </div>
          </section>

          {/* 2열 레이아웃: 활발한 파일 + 복잡도 */}
          <div style={styles.twoColumns}>
            {/* 활발한 파일 */}
            <section style={styles.section}>
              <h3 style={styles.sectionTitle}>🔥 활발한 파일 TOP 5</h3>
              <div style={styles.fileList}>
                {(insights.most_active_files || []).map((file, idx) => (
                  <FileItem key={idx} rank={idx + 1} file={file} />
                ))}
              </div>
            </section>

            {/* 복잡도 높은 파일 */}
            {insights.complexity_ranking && insights.complexity_ranking.length > 0 && (
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>⚠️ 복잡도 높은 파일</h3>
                <div style={styles.complexityList}>
                  {insights.complexity_ranking.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={styles.complexityItem}>
                      <span style={styles.complexityScore}>{item.score.toFixed(1)}</span>
                      <span style={styles.complexityPath}>{item.path}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 통계 카드
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{...styles.statCard, borderTop: `4px solid ${color}`}}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

// 도메인 카드
function DomainCard({ domain, count, expert, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.domainCard,
        ...(isSelected ? styles.domainCardActive : {}),
        borderLeft: `4px solid ${DOMAIN_COLORS[domain] || '#95A5A6'}`
      }}
    >
      <div style={styles.domainHeader}>
        <span style={styles.domainIcon}>{getDomainIcon(domain)}</span>
        <span style={styles.domainName}>{formatDomainName(domain)}</span>
      </div>
      <div style={styles.domainStats}>
        <span style={styles.fileCount}>{count}개 파일</span>
        {expert && (
          <span style={styles.expertBadge}>👤 {expert}</span>
        )}
      </div>
    </div>
  );
}

// 파일 아이템
function FileItem({ rank, file }) {
  return (
    <div style={styles.fileItem}>
      <div style={styles.fileRank}>{rank}</div>
      <div style={styles.fileInfo}>
        <div style={styles.filePath} title={file.path}>
          {file.path.split('/').pop()}
        </div>
        <div style={styles.fileDetails}>
          <span>{file.commits} commits</span>
          {file.lines && <span> · {file.lines} lines</span>}
        </div>
      </div>
    </div>
  );
}

// 유틸리티 함수
function getDomainIcon(domain) {
  const icons = {
    backend_api: '🔧',
    frontend_ui: '🎨',
    database: '💾',
    visualization: '📊',
    authentication: '🔐',
    uncategorized: '📦'
  };
  return icons[domain] || '📄';
}

function formatDomainName(domain) {
  const names = {
    backend_api: 'Backend API',
    frontend_ui: 'Frontend UI',
    database: 'Database',
    visualization: 'Visualization',
    authentication: 'Auth',
    uncategorized: 'Others'
  };
  return names[domain] || domain;
}

// 스타일
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  header: {
    padding: '24px 32px',
    borderBottom: '2px solid #e1e4e8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#24292f'
  },
  subtitle: {
    fontSize: '14px',
    color: '#57606a',
    marginTop: '4px'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '32px',
    color: '#57606a',
    cursor: 'pointer',
    padding: '8px',
    lineHeight: 1,
    transition: 'color 0.2s',
    ':hover': {
      color: '#24292f'
    }
  },
  content: {
    padding: '32px',
    overflowY: 'auto',
    flex: 1
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    background: 'white',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    transition: 'transform 0.2s',
    cursor: 'default'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#24292f',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#57606a',
    fontWeight: '500'
  },
  section: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#24292f',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  domainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  domainCard: {
    padding: '16px',
    background: 'white',
    border: '1px solid #d0d7de',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  domainCardActive: {
    background: '#f6f8fa',
    borderColor: '#0969da',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  domainHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px'
  },
  domainIcon: {
    fontSize: '20px'
  },
  domainName: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#24292f'
  },
  domainStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px'
  },
  fileCount: {
    color: '#57606a',
    fontWeight: '500'
  },
  expertBadge: {
    fontSize: '11px',
    background: '#fff8e6',
    padding: '4px 10px',
    borderRadius: '12px',
    color: '#6f4e1e',
    fontWeight: '500'
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '32px'
  },
  fileList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'white',
    border: '1px solid #d0d7de',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  fileRank: {
    minWidth: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  fileInfo: {
    flex: 1,
    minWidth: 0
  },
  filePath: {
    fontSize: '13px',
    color: '#24292f',
    fontFamily: 'Monaco, Consolas, monospace',
    fontWeight: '500',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px'
  },
  fileDetails: {
    fontSize: '12px',
    color: '#57606a'
  },
  complexityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  complexityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'white',
    border: '1px solid #d0d7de',
    borderRadius: '8px'
  },
  complexityScore: {
    minWidth: '50px',
    padding: '8px',
    background: '#fff4e6',
    color: '#d97706',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  complexityPath: {
    fontSize: '12px',
    color: '#24292f',
    fontFamily: 'Monaco, Consolas, monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
};