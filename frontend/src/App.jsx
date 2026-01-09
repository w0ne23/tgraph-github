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

  useEffect(() => {
    fetch('http://localhost:8000/api/demo')
      .then(res => res.json())
      .then(data => {
        const zValues = data.nodes.map(n => n.z);
        const minZ = Math.min(...zValues), maxZ = Math.max(...zValues);
        const range = maxZ - minZ || 1;

        const normalizedNodes = data.nodes.map(node => ({
          ...node,
          fz: ((node.z - minZ) / range) * 200,
          baseZ: ((node.z - minZ) / range) * 200
        }));

        setGraphData({ nodes: normalizedNodes, links: data.edges });
        
        if (data.insights) {
          setInsights(data.insights);
        }
        
        setStatus('loaded');
      })
      .catch(err => {
        console.error(err);
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