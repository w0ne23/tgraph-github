import { useEffect, useState } from 'react';
import GraphView from './components/GraphView';
import Legend from './components/Legend';
import ControlPanel from './components/ControlPanel';
import DashboardModal from './components/Dashboard';

export default function App() {
  const [status, setStatus] = useState('loading');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [insights, setInsights] = useState(null);
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [viewMode, setViewMode] = useState('all');
  const [showDashboard, setShowDashboard] = useState(false);  // ✨ 대시보드 모달 상태

  // ✨ 주 단위로 시간 매핑하는 함수
  const mapToWeeklyTimestamp = (timestamp, projectStart) => {
    if (!timestamp || timestamp === 0) return 0;
    
    // 1주일 = 7일 = 604800초
    const oneWeek = 7 * 24 * 60 * 60;
    
    // 프로젝트 시작 시간으로부터 몇 주차인지 계산
    const weeksSinceStart = Math.floor((timestamp - projectStart) / oneWeek);
    
    // 해당 주의 시작 시간으로 변환
    return projectStart + (weeksSinceStart * oneWeek);
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/load-json')
      .then(res => res.json())
      .then(data => {
        console.log("📊 받은 데이터:", data);
        
        // ✨ contributor를 제외한 모든 노드의 z 값 사용
        const zValues = data.nodes
          .filter(n => n.type !== 'contributor')  // contributor 제외
          .map(n => n.z)
          .filter(z => z > 0);  // z=0도 제외 (예외 케이스)
        
        if (zValues.length === 0) {
          console.error("❌ 시간 데이터가 없습니다!");
          setStatus('error');
          return;
        }
        
        const projectStart = Math.min(...zValues);
        
        console.log("⏰ 원본 z 값 분포:", {
          count: zValues.length,
          min: projectStart,
          max: Math.max(...zValues),
          sample: zValues.slice(0, 10),
          types: data.nodes.reduce((acc, n) => {
            if (n.z > 0) {
              acc[n.type] = (acc[n.type] || 0) + 1;
            }
            return acc;
          }, {})
        });
        
        // ✨ 주 단위로 매핑
        const mappedNodes = data.nodes.map(node => ({
          ...node,
          originalZ: node.z,  // 원본 보존
          z: mapToWeeklyTimestamp(node.z, projectStart)  // 주 단위로 변환
        }));
        
        // 매핑된 z 값 확인
        const mappedZValues = mappedNodes
          .filter(n => n.z > 0)
          .map(n => n.z);
        
        // 주차별 노드 개수 계산
        const weekCounts = {};
        mappedNodes.forEach(node => {
          if (node.z > 0) {
            const weekKey = node.z;
            weekCounts[weekKey] = (weekCounts[weekKey] || 0) + 1;
          }
        });
        
        console.log("📅 주 단위 매핑 후:", {
          uniqueWeeks: new Set(mappedZValues).size,
          totalNodesWithTime: mappedZValues.length,
          weeks: [...new Set(mappedZValues)].sort((a, b) => a - b).map((z, idx) => ({
            week: idx + 1,
            timestamp: z,
            date: new Date(z * 1000).toLocaleDateString('ko-KR'),
            nodeCount: weekCounts[z],
            nodes: mappedNodes.filter(n => n.z === z).map(n => `${n.type}:${n.label}`).slice(0, 3)
          }))
        });
        
        const minZ = Math.min(...mappedZValues);
        const maxZ = Math.max(...mappedZValues);
        const range = maxZ - minZ || 1;
        
        console.log("📏 정규화 범위:", { minZ, maxZ, range });

        const normalizedNodes = mappedNodes.map(node => {
          // ✨ contributor만 z=0으로 고정, 나머지는 정규화
          if (node.type === 'contributor') {
            return {
              ...node,
              fz: 0,
              baseZ: 0
            };
          }
          
          if (node.z === 0) {
            console.warn('⚠️  시간 정보가 없는 노드:', node);
            return {
              ...node,
              fz: 0,
              baseZ: 0
            };
          }
          
          const normalizedZ = ((node.z - minZ) / range) * 200;
          return {
            ...node,
            fz: normalizedZ,
            baseZ: normalizedZ
          };
        });
        
        // ✨ 노드 타입 분포 확인
        const typeDistribution = {};
        normalizedNodes.forEach(n => {
          typeDistribution[n.type] = (typeDistribution[n.type] || 0) + 1;
        });
        console.log("🏷️  노드 타입 분포:", typeDistribution);
        
        // ✨ 정규화된 z 값 분포 확인
        const fzValues = normalizedNodes
          .filter(n => n.fz > 0)
          .map(n => n.fz);
        console.log("📐 정규화된 z 값 분포:", {
          min: Math.min(...fzValues),
          max: Math.max(...fzValues),
          unique: new Set(fzValues).size,
          sample: [...new Set(fzValues)].slice(0, 10).sort((a, b) => a - b)
        });

        setGraphData({ nodes: normalizedNodes, links: data.edges });
        
        if (data.insights) {
          setInsights(data.insights);
        }
        
        setStatus('loaded');
      })
      .catch(err => {
        console.error("❌ 데이터 로드 실패:", err);
        setStatus('error');
      });
  }, []);

  const handleDomainClick = (domain) => {
    setSelectedDomain(domain);
  };

  const contributors = graphData.nodes.filter(n => n.type === 'contributor');

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* UI 컴포넌트 */}
      <Legend status={status} />
      
      <ControlPanel 
        viewMode={viewMode}
        setViewMode={setViewMode}
        contributors={contributors}
        selectedContributor={selectedContributor}
        onContributorSelect={setSelectedContributor}
        onShowDashboard={() => setShowDashboard(true)}  // ✨ 대시보드 열기
      />

      {/* 그래프 시각화 엔진 */}
      <GraphView 
        data={graphData} 
        selectedContributor={selectedContributor} 
        selectedDomain={selectedDomain}
        onContributorClick={setSelectedContributor}
      />

      {/* 대시보드 모달 */}
      {showDashboard && (
        <DashboardModal 
          insights={insights} 
          onClose={() => setShowDashboard(false)} 
        />
      )}
    </div>
  );
}